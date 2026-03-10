"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { DBContext, loadDB, saveDB, getInitialDB } from "@/lib/store"
import type { AppNotification, DB, Kund, KontaktPost, KontaktTyp, Lead, ObEnrollment, Veckoschema } from "@/lib/types"
import { SCHEMA, KONTAKTER } from "@/lib/data"
import { supabase } from "@/lib/supabase"
import { parseNrDates } from "@/lib/nr-parser"

// ── Onboarding-state: separat Supabase-rad för att undvika överskrivning ──────
async function saveObData(db: { obState: DB["obState"]; obEnrollments: DB["obEnrollments"] }) {
  await supabase
    .from("app_state")
    .upsert({ id: "ob_state", data: { obState: db.obState, obEnrollments: db.obEnrollments }, updated_at: new Date().toISOString() })
    .then((r) => { if (r?.error) console.error("[sync:ob_state] upsert failed:", r.error) })
}

// ── Auto-reset helpers ─────────────────────────────────────────────────────────

// Returns midnight of the most recent occurrence of targetDay (0=Sun…6=Sat)
function getLastWeekday(targetDay: number): Date {
  const now = new Date()
  const daysBack = (now.getDay() - targetDay + 7) % 7
  const d = new Date(now)
  d.setDate(now.getDate() - daysBack)
  d.setHours(0, 0, 0, 0)
  return d
}

// Remove only "confirmed" entries for keys starting with prefix; keep "contacted" (yellow)
function clearConfirmedForType(
  log: Record<string, "contacted" | "confirmed">,
  prefix: string
): Record<string, "contacted" | "confirmed"> {
  const result: Record<string, "contacted" | "confirmed"> = {}
  for (const [key, val] of Object.entries(log)) {
    if (key.startsWith(prefix) && val === "confirmed") continue
    result[key] = val
  }
  return result
}

// Find AKTIV clients whose nr-dates match any of the given dates
function clientsWithRecordingOnDates(clients: Kund[], dates: Date[]): Kund[] {
  const year = new Date().getFullYear()
  const keys = new Set(dates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`))
  return clients.filter((kund) => {
    if (kund.st !== "AKTIV" || !kund.nr) return false
    return parseNrDates(kund.nr, year).some(
      (d) => keys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    )
  })
}

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<DB>(getInitialDB)
  const dbRef = useRef<DB>(getInitialDB())

  useEffect(() => {
    async function init() {
      // 1. Ladda lokalt direkt (ingen flash)
      const local = loadDB()
      setDB(local)
      dbRef.current = local

      // 2. Hämta från Supabase — main + ob_state parallellt
      const [mainRes, obRes] = await Promise.all([
        supabase.from("app_state").select("data").eq("id", "main").single(),
        supabase.from("app_state").select("data").eq("id", "ob_state").single(),
      ])

      let current = local
      if (!mainRes.error && mainRes.data?.data && Object.keys(mainRes.data.data).length > 0) {
        current = mainRes.data.data as DB
      }

      // ob_state-raden är auktoritativ för onboarding — överskriver aldrig av main-reset
      type ObData = { obState?: DB["obState"]; obEnrollments?: DB["obEnrollments"] }
      if (!obRes.error && obRes.data?.data) {
        const ob = obRes.data.data as ObData
        if (ob.obState !== undefined) current = { ...current, obState: ob.obState }
        // Använd ob_state-listan BARA om den är icke-tom, eller om main också är tom
        // → förhindrar att en tom ob_state-rad raderar befintlig data
        if (Array.isArray(ob.obEnrollments)) {
          if (ob.obEnrollments.length > 0 || (current.obEnrollments ?? []).length === 0) {
            current = { ...current, obEnrollments: ob.obEnrollments }
          }
          // annars: ob_state är tom men main har data → behåll main-datan
        }
      } else {
        // Engångsmigration: ob_state-raden finns inte än → seed från main
        await saveObData({ obState: current.obState, obEnrollments: current.obEnrollments ?? [] })
      }

      // Seed contacts from static KONTAKTER if not yet initialized
      if (!current.contacts || current.contacts.length === 0) {
        let id = current.nextContactId ?? 1
        const seeded: KontaktPost[] = [
          ...KONTAKTER.booking.map((k) => ({ ...k, id: id++, typ: "booking" as KontaktTyp })),
          ...KONTAKTER.sms.map((k) => ({ ...k, id: id++, typ: "sms" as KontaktTyp })),
          ...KONTAKTER.quarterly.map((k) => ({ ...k, id: id++, typ: "quarterly" as KontaktTyp })),
        ]
        current = { ...current, contacts: seeded, nextContactId: id }
      }

      // Migration: ensure obEnrollments exists for existing users (run once)
      if (!current.obEnrollments) {
        current = { ...current, obEnrollments: [] }
      }

      // Migration: inject "Syns Nu" internal client for existing users
      if (!current.clients.some(c => c.name === "Syns Nu")) {
        current = {
          ...current,
          clients: [...current.clients, { id: 38, name: "Syns Nu", pkg: "", vg: "", ed: "", cc: "", lr: "", nr: "", ns: "", adr: "", cnt: "Internt", ph: "", em: "", st: "AKTIV", notes: "Internt företag" }],
          nextId: Math.max(current.nextId, 39),
        }
      }

      // ── Boknings-refresh: kunder med nr-datum 2 veckor framåt (daglig) ─────────
      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)

      if (new Date(current.lastWeeklyResetAt ?? 0) < todayMidnight) {
        // today+14 (mån om 2 v) → today+20 (sön om 2 v)
        const twoWeeksAhead: Date[] = []
        for (let i = 14; i <= 20; i++) {
          const d = new Date(todayMidnight)
          d.setDate(todayMidnight.getDate() + i)
          twoWeeksAhead.push(d)
        }

        const bookingClients = clientsWithRecordingOnDates(current.clients, twoWeeksAhead)
        let nextContactId = current.nextContactId ?? 1
        const newBookingContacts: KontaktPost[] = bookingClients.map((kund) => ({
          id: nextContactId++,
          name: kund.name,
          day: "",
          note: kund.ph ?? "",
          typ: "booking" as KontaktTyp,
        }))

        const nonBooking = (current.contacts ?? []).filter((c) => c.typ !== "booking")
        const cleanedLog = clearConfirmedForType(current.contactLog ?? {}, "booking-")
        current = {
          ...current,
          contactLog: cleanedLog,
          contacts: [...nonBooking, ...newBookingContacts],
          nextContactId,
          lastWeeklyResetAt: todayMidnight.toISOString(),
        }
        console.log(`[booking-refresh] ${todayMidnight.toLocaleDateString("sv-SE")} — ${bookingClients.length} bokningskontakter (nr-datum om 2 v)`)
      }
      // ── Slut boknings-refresh ──────────────────────────────────────────────────

      // ── Onsdag-reset: SMS-kontakter för inspelningar mån–ons nästa vecka ─────
      const lastWed = getLastWeekday(3)
      if (new Date(current.lastWedSmsResetAt ?? 0) < lastWed) {
        // Next Monday = lastWed + 5, Tuesday +6, Wednesday +7
        const nextMon = new Date(lastWed); nextMon.setDate(lastWed.getDate() + 5)
        const nextTue = new Date(lastWed); nextTue.setDate(lastWed.getDate() + 6)
        const nextWed2 = new Date(lastWed); nextWed2.setDate(lastWed.getDate() + 7)

        const smsClients = clientsWithRecordingOnDates(current.clients, [nextMon, nextTue, nextWed2])
        let nextContactId = current.nextContactId ?? 1
        const newSmsContacts: KontaktPost[] = smsClients.map((kund) => ({
          id: nextContactId++,
          name: kund.name,
          day: "",
          note: kund.ph ?? "",
          typ: "sms" as KontaktTyp,
        }))

        const nonSms = (current.contacts ?? []).filter((c) => c.typ !== "sms")
        const cleanedLog = clearConfirmedForType(current.contactLog ?? {}, "sms-")
        current = {
          ...current,
          contactLog: cleanedLog,
          contacts: [...nonSms, ...newSmsContacts],
          nextContactId,
          lastWedSmsResetAt: lastWed.toISOString(),
        }
        console.log(`[wednesday-reset] ${lastWed.toLocaleDateString("sv-SE")} — ${smsClients.length} SMS-kontakter (mån–ons nästa vecka)`)
      }
      // ── Slut onsdag-reset ─────────────────────────────────────────────────────

      // ── Fredag-reset: SMS-kontakter för inspelningar tor–fre nästa vecka ─────
      const lastFri = getLastWeekday(5)
      if (new Date(current.lastFriSmsResetAt ?? 0) < lastFri) {
        // Next Thursday = lastFri + 6, Friday +7
        const nextThu = new Date(lastFri); nextThu.setDate(lastFri.getDate() + 6)
        const nextFri2 = new Date(lastFri); nextFri2.setDate(lastFri.getDate() + 7)

        const smsClients = clientsWithRecordingOnDates(current.clients, [nextThu, nextFri2])
        let nextContactId = current.nextContactId ?? 1
        const newSmsContacts: KontaktPost[] = smsClients.map((kund) => ({
          id: nextContactId++,
          name: kund.name,
          day: "",
          note: kund.ph ?? "",
          typ: "sms" as KontaktTyp,
        }))

        const nonSms = (current.contacts ?? []).filter((c) => c.typ !== "sms")
        const cleanedLog = clearConfirmedForType(current.contactLog ?? {}, "sms-")
        current = {
          ...current,
          contactLog: cleanedLog,
          contacts: [...nonSms, ...newSmsContacts],
          nextContactId,
          lastFriSmsResetAt: lastFri.toISOString(),
        }
        console.log(`[friday-reset] ${lastFri.toLocaleDateString("sv-SE")} — ${smsClients.length} SMS-kontakter (tor–fre nästa vecka)`)
      }
      // ── Slut fredag-reset ─────────────────────────────────────────────────────

      setDB(current)
      dbRef.current = current
      saveDB(current)
      await supabase
        .from("app_state")
        .upsert({ id: "main", data: current, updated_at: new Date().toISOString() })
    }

    init()

    // 3. Realtime-prenumerationer
    const channel = supabase
      .channel("app_state_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state", filter: "id=eq.main" },
        (payload) => {
          const row = payload.new as { id?: string; data?: unknown }
          if (row?.id !== "main") return
          const remote = row.data
          if (!remote || typeof remote !== "object" || Array.isArray(remote)) return
          setDB(remote as DB)
          dbRef.current = remote as DB
          saveDB(remote as DB)
        }
      )
      .subscribe()

    const obChannel = supabase
      .channel("ob_state_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state", filter: "id=eq.ob_state" },
        (payload) => {
          const row = payload.new as { id?: string; data?: unknown }
          if (row?.id !== "ob_state") return
          const ob = row.data as { obState?: DB["obState"]; obEnrollments?: DB["obEnrollments"] }
          if (!ob) return
          setDB((prev) => ({
            ...prev,
            ...(ob.obState !== undefined ? { obState: ob.obState } : {}),
            ...(ob.obEnrollments !== undefined ? { obEnrollments: ob.obEnrollments } : {}),
          }))
          dbRef.current = {
            ...dbRef.current,
            ...(ob.obState !== undefined ? { obState: ob.obState } : {}),
            ...(ob.obEnrollments !== undefined ? { obEnrollments: ob.obEnrollments } : {}),
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(obChannel)
    }
  }, [])

  const update = useCallback((updater: (prev: DB) => DB) => {
    const next = updater(dbRef.current)
    saveDB(next)
    dbRef.current = next
    setDB(next)
    supabase
      .from("app_state")
      .upsert({ id: "main", data: next, updated_at: new Date().toISOString() })
      .then((result) => {
        if (result?.error) console.error("[sync:main] upsert failed:", result.error)
      })
  }, [])

  const addKund = useCallback(
    (kund: Omit<Kund, "id">) => {
      update((prev) => ({
        ...prev,
        clients: [...prev.clients, { ...kund, id: prev.nextId }],
        nextId: prev.nextId + 1,
      }))
    },
    [update]
  )

  const updateKund = useCallback(
    (kund: Kund) => {
      update((prev) => {
        const old = prev.clients.find((c) => c.id === kund.id)
        const nameChanged = old && old.name !== kund.name
        let schedule = prev.schedule
        if (nameChanged && schedule) {
          const oldName = old!.name
          const newName = kund.name
          schedule = {
            v1: schedule.v1.map((n) => (n === oldName ? newName : n)),
            v2: schedule.v2.map((n) => (n === oldName ? newName : n)),
            v3: schedule.v3.map((n) => (n === oldName ? newName : n)),
            v4: schedule.v4.map((n) => (n === oldName ? newName : n)),
          }
        }
        return {
          ...prev,
          clients: prev.clients.map((c) => (c.id === kund.id ? kund : c)),
          schedule,
        }
      })
    },
    [update]
  )

  const deleteKund = useCallback(
    (id: number) => {
      update((prev) => {
        const kund = prev.clients.find((c) => c.id === id)
        let schedule = prev.schedule
        if (kund && schedule) {
          const name = kund.name
          schedule = {
            v1: schedule.v1.filter((n) => n !== name),
            v2: schedule.v2.filter((n) => n !== name),
            v3: schedule.v3.filter((n) => n !== name),
            v4: schedule.v4.filter((n) => n !== name),
          }
        }
        return {
          ...prev,
          clients: prev.clients.filter((c) => c.id !== id),
          schedule,
        }
      })
    },
    [update]
  )

  const toggleTask = useCallback(
    (kundId: number, taskId: string) => {
      update((prev) => {
        const state = prev.obState[kundId] ?? {}
        return {
          ...prev,
          obState: { ...prev.obState, [kundId]: { ...state, [taskId]: !state[taskId] } },
        }
      })
      setTimeout(() => saveObData({ obState: dbRef.current.obState, obEnrollments: dbRef.current.obEnrollments ?? [] }), 0)
    },
    [update]
  )

  const resetObState = useCallback(
    (kundId: number) => {
      update((prev) => ({
        ...prev,
        obState: { ...prev.obState, [kundId]: {} },
      }))
      setTimeout(() => saveObData({ obState: dbRef.current.obState, obEnrollments: dbRef.current.obEnrollments ?? [] }), 0)
    },
    [update]
  )

  const toggleContact = useCallback(
    (key: string) => {
      update((prev) => {
        const log = prev.contactLog ?? {}
        const current = log[key]
        let next: "contacted" | "confirmed" | undefined
        if (!current) next = "contacted"
        else if (current === "contacted") next = "confirmed"
        else next = undefined

        const updated = { ...log }
        if (next) updated[key] = next
        else delete updated[key]

        return { ...prev, contactLog: updated }
      })
    },
    [update]
  )

  const moveToVecka = useCallback(
    (kundName: string, from: keyof Veckoschema | null, to: keyof Veckoschema) => {
      update((prev) => {
        const sched: Veckoschema = prev.schedule ?? { ...SCHEMA }
        const updated = {
          v1: [...sched.v1],
          v2: [...sched.v2],
          v3: [...sched.v3],
          v4: [...sched.v4],
        }
        if (from) updated[from] = updated[from].filter((n) => n !== kundName)
        if (!updated[to].includes(kundName)) updated[to] = [...updated[to], kundName]
        return { ...prev, schedule: updated }
      })
    },
    [update]
  )

  const exportData = useCallback(() => {
    setDB((prev) => {
      const blob = new Blob([JSON.stringify(prev, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `kunder-kontroll-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      return prev
    })
  }, [])

  const importData = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as DB
        update(() => parsed)
      } catch {
        alert("Ogiltig fil")
      }
    },
    [update]
  )

  const addLead = useCallback(
    (lead: Omit<Lead, "id">) => {
      update((prev) => ({
        ...prev,
        leads: [...(prev.leads ?? []), { ...lead, id: prev.nextLeadId ?? 1 }],
        nextLeadId: (prev.nextLeadId ?? 1) + 1,
      }))
    },
    [update]
  )

  const updateLead = useCallback(
    (lead: Lead) => {
      update((prev) => ({
        ...prev,
        leads: (prev.leads ?? []).map((l) => (l.id === lead.id ? lead : l)),
      }))
    },
    [update]
  )

  const deleteLead = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        leads: (prev.leads ?? []).filter((l) => l.id !== id),
      }))
    },
    [update]
  )

  const addContact = useCallback(
    (contact: Omit<KontaktPost, "id">) => {
      update((prev) => ({
        ...prev,
        contacts: [...(prev.contacts ?? []), { ...contact, id: prev.nextContactId ?? 1 }],
        nextContactId: (prev.nextContactId ?? 1) + 1,
      }))
    },
    [update]
  )

  const updateContact = useCallback(
    (contact: KontaktPost) => {
      update((prev) => ({
        ...prev,
        contacts: (prev.contacts ?? []).map((c) => (c.id === contact.id ? contact : c)),
      }))
    },
    [update]
  )

  const deleteContact = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        contacts: (prev.contacts ?? []).filter((c) => c.id !== id),
      }))
    },
    [update]
  )

  const removeFromVecka = useCallback(
    (kundName: string, from: keyof Veckoschema) => {
      update((prev) => {
        const sched: Veckoschema = prev.schedule ?? { ...SCHEMA }
        return {
          ...prev,
          schedule: { ...sched, [from]: sched[from].filter((n) => n !== kundName) },
        }
      })
    },
    [update]
  )

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id">) => {
      update((prev) => {
        const notifs = [...(prev.notifications ?? []), { ...n, id: prev.nextNotifId ?? 1 }]
        return {
          ...prev,
          notifications: notifs.slice(-100),
          nextNotifId: (prev.nextNotifId ?? 1) + 1,
        }
      })
    },
    [update]
  )

  const enrollInOnboarding = useCallback(
    (kundId: number, name: string, pkg: string) => {
      update((prev) => {
        const enrollments = prev.obEnrollments ?? []
        if (enrollments.some((e) => e.kundId === kundId)) return prev
        const entry: ObEnrollment = {
          id: Date.now(),
          kundId,
          name,
          pkg,
          addedAt: new Date().toLocaleDateString("sv-SE"),
          priority: "normal",
          order: enrollments.length,
        }
        return { ...prev, obEnrollments: [...enrollments, entry] }
      })
      setTimeout(() => saveObData({ obState: dbRef.current.obState, obEnrollments: dbRef.current.obEnrollments ?? [] }), 0)
    },
    [update]
  )

  const removeFromOnboarding = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        obEnrollments: (prev.obEnrollments ?? []).filter((e) => e.id !== id),
      }))
      setTimeout(() => saveObData({ obState: dbRef.current.obState, obEnrollments: dbRef.current.obEnrollments ?? [] }), 0)
    },
    [update]
  )

  const updateObEnrollments = useCallback(
    (enrollments: ObEnrollment[]) => {
      update((prev) => ({ ...prev, obEnrollments: enrollments }))
      setTimeout(() => saveObData({ obState: dbRef.current.obState, obEnrollments: enrollments }), 0)
    },
    [update]
  )

  const markPageRead = useCallback(
    (page: string, userName: string) => {
      const now = new Date().toISOString()
      update((prev) => ({
        ...prev,
        notifReadAt: {
          ...(prev.notifReadAt ?? {}),
          [userName]: {
            ...((prev.notifReadAt ?? {})[userName] ?? {}),
            [page]: now,
          },
        },
      }))
    },
    [update]
  )

  const importLeads = useCallback(
    (incoming: Omit<Lead, "id">[]): number => {
      let imported = 0
      update((prev) => {
        const existing = new Set((prev.leads ?? []).map((l) => l.name.toLowerCase()))
        const toAdd = incoming.filter((l) => !existing.has(l.name.toLowerCase()))
        imported = toAdd.length
        let nextId = prev.nextLeadId ?? 1
        const newLeads = toAdd.map((l) => ({ ...l, id: nextId++ }))
        return {
          ...prev,
          leads: [...(prev.leads ?? []), ...newLeads],
          nextLeadId: nextId,
        }
      })
      return imported
    },
    [update]
  )

  return (
    <DBContext.Provider
      value={{ db, addKund, updateKund, deleteKund, toggleTask, resetObState, toggleContact, moveToVecka, exportData, importData, addLead, updateLead, deleteLead, importLeads, addContact, updateContact, deleteContact, removeFromVecka, addNotification, markPageRead, enrollInOnboarding, removeFromOnboarding, updateObEnrollments }}
    >
      {children}
    </DBContext.Provider>
  )
}

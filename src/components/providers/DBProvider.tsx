"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { DBContext, loadDB, saveDB, getInitialDB } from "@/lib/store"
import type { AppNotification, DB, GmbReview, Kund, KontaktPost, KontaktTyp, Lead, ObEnrollment, Veckoschema } from "@/lib/types"
import { SCHEMA, KONTAKTER, OB_STEG } from "@/lib/data"
import { supabase } from "@/lib/supabase"
import { parseNrDates } from "@/lib/nr-parser"

// ── Kunder-tabell helpers ──────────────────────────────────────────────────────
function kundToRow(k: Kund) {
  return {
    id: k.id, name: k.name, pkg: k.pkg ?? "", vg: k.vg ?? "", ed: k.ed ?? "",
    cc: k.cc ?? "", lr: k.lr ?? "", nr: k.nr ?? "", ns: k.ns ?? "",
    adr: k.adr ?? "", cnt: k.cnt ?? "", ph: k.ph ?? "", em: k.em ?? "",
    st: k.st ?? "", notes: k.notes ?? "", tema: k.tema ?? null,
    intakt: k.intakt ?? 0,
  }
}

function rowToKund(row: Record<string, unknown>): Kund {
  return {
    id: row.id as number, name: (row.name as string) ?? "",
    pkg: (row.pkg as Kund["pkg"]) ?? "", vg: (row.vg as string) ?? "",
    ed: (row.ed as string) ?? "", cc: (row.cc as string) ?? "",
    lr: (row.lr as string) ?? "", nr: (row.nr as string) ?? "",
    ns: (row.ns as string) ?? "", adr: (row.adr as string) ?? "",
    cnt: (row.cnt as string) ?? "", ph: (row.ph as string) ?? "",
    em: (row.em as string) ?? "", st: (row.st as Kund["st"]) ?? "",
    notes: (row.notes as string) ?? "",
    tema: row.tema ? (row.tema as Kund["tema"]) : undefined,
    intakt: (row.intakt as number) ?? 0,
  }
}

// ── Onboarding-tabeller: sparar till ob_enrollments / ob_task_state ───────────
async function saveEnrollment(e: ObEnrollment) {
  await supabase.from("ob_enrollments").upsert({
    id: e.id, kund_id: e.kundId, name: e.name, pkg: e.pkg,
    added_at: e.addedAt, priority: e.priority, order: e.order,
  }).then((r) => { if (r?.error) console.error("[sync:ob_enrollments] upsert failed:", r.error) })
}

async function saveTaskState(kundId: number, state: Record<string, boolean>) {
  await supabase.from("ob_task_state")
    .upsert({ kund_id: kundId, state, updated_at: new Date().toISOString() })
    .then((r) => { if (r?.error) console.error("[sync:ob_task_state] upsert failed:", r.error) })
}

async function saveLead(lead: Lead) {
  await supabase.from("leads")
    .upsert({ id: lead.id, name: lead.name, status: lead.status, email: lead.email, phone: lead.phone, notes: lead.notes, created_at: lead.createdAt })
    .then((r) => { if (r?.error) console.error("[sync:leads] upsert failed:", r.error) })
}

// ── Vecka-helpers ──────────────────────────────────────────────────────────────

// Dag 1-7 = v1, 8-14 = v2, 15-21 = v3, 22-31 = v4
export function getCurrentVecka(): keyof Veckoschema {
  const d = new Date().getDate()
  if (d <= 7) return "v1"
  if (d <= 14) return "v2"
  if (d <= 21) return "v3"
  return "v4"
}

// 2 veckor framåt med wrap-around: v1→v3, v2→v4, v3→v1, v4→v2
export function getBookingVecka(): keyof Veckoschema {
  const n = parseInt(getCurrentVecka()[1])
  return `v${((n - 1 + 2) % 4) + 1}` as keyof Veckoschema
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

      // 2. Hämta från Supabase — main + ob-tabeller + kunder + leads + veckoschema + kontakter
      const [mainRes, enrollRes, taskStateRes, kunderRes, leadsRes, veckoRes, kontakRes] = await Promise.all([
        supabase.from("app_state").select("data").eq("id", "main").single(),
        supabase.from("ob_enrollments").select("*").order('"order"'),
        supabase.from("ob_task_state").select("*"),
        supabase.from("kunder").select("*").order("id"),
        supabase.from("leads").select("*").order("id"),
        supabase.from("veckoschema").select("*"),
        supabase.from("kontakter").select("*").order("id"),
      ])

      let current = local
      if (!mainRes.error && mainRes.data?.data && Object.keys(mainRes.data.data).length > 0) {
        // Exkludera leads från app_state.main — leads ägs av leads-tabellen
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { leads: _leads, ...mainWithoutLeads } = mainRes.data.data as DB
        current = { ...current, ...mainWithoutLeads }
      }

      // Kunder-tabell: använd som auktoritativ källa för clients
      if (!kunderRes.error && kunderRes.data && kunderRes.data.length > 0) {
        current = { ...current, clients: kunderRes.data.map(rowToKund) }
      }

      // ob_enrollments-tabellen är auktoritativ för onboarding-kön
      if (!enrollRes.error && enrollRes.data) {
        const enrollments: ObEnrollment[] = enrollRes.data.map((r: Record<string, unknown>) => ({
          id: r.id as number,
          kundId: r.kund_id as number,
          name: r.name as string,
          pkg: (r.pkg as string) ?? "",
          addedAt: (r.added_at as string) ?? "",
          priority: (r.priority as ObEnrollment["priority"]) ?? "normal",
          order: (r.order as number) ?? 0,
        }))
        current = { ...current, obEnrollments: enrollments }
      }
      // ob_task_state-tabellen är auktoritativ för uppgiftsstatus
      if (!taskStateRes.error && taskStateRes.data) {
        const obState: DB["obState"] = {}
        for (const row of taskStateRes.data as Array<{ kund_id: number; state: Record<string, boolean> }>) {
          obState[row.kund_id] = row.state
        }
        current = { ...current, obState }
      }

      // leads-tabellen är auktoritativ för leads
      if (!leadsRes.error && leadsRes.data && leadsRes.data.length > 0) {
        const leads: Lead[] = (leadsRes.data as Array<Record<string, unknown>>).map((r) => ({
          id: r.id as number,
          name: r.name as string,
          status: (r.status as Lead["status"]) ?? "Ny lead",
          email: (r.email as string) ?? "",
          phone: (r.phone as string) ?? "",
          notes: (r.notes as string) ?? "",
          createdAt: (r.created_at as string) ?? "",
        }))
        const maxId = Math.max(...leads.map((l) => l.id), current.nextLeadId ?? 1)
        current = { ...current, leads, nextLeadId: maxId + 1 }
      }

      // ── veckoschema-tabell är auktoritativ för schema ──────────────────────────
      if (!veckoRes.error && veckoRes.data) {
        if (veckoRes.data.length > 0) {
          // Table has data — use it as authoritative
          const sched: Veckoschema = { v1: [], v2: [], v3: [], v4: [] }
          for (const row of veckoRes.data as Array<{ vecka: string; name: string }>) {
            const v = row.vecka as keyof Veckoschema
            if (sched[v]) sched[v].push(row.name)
          }
          current = { ...current, schedule: sched }
        } else if (current.schedule) {
          // Migrate from app_state to veckoschema table
          const rows: { vecka: string; name: string }[] = []
          for (const [vecka, names] of Object.entries(current.schedule)) {
            for (const name of names as string[]) {
              rows.push({ vecka, name })
            }
          }
          if (rows.length > 0) {
            await supabase.from("veckoschema").insert(rows)
          }
        }
      }

      // ── kontakter-tabell är auktoritativ för contacts ──────────────────────────
      if (!kontakRes.error && kontakRes.data) {
        if (kontakRes.data.length > 0) {
          // Table has data — use it as authoritative
          const contacts: KontaktPost[] = (kontakRes.data as Array<Record<string, unknown>>).map((r) => ({
            id: r.id as number,
            name: (r.name as string) ?? "",
            day: (r.day as string) ?? "",
            note: (r.note as string) ?? "",
            typ: (r.typ as KontaktTyp) ?? "booking",
          }))
          current = { ...current, contacts }
        } else {
          // Migrate from app_state or seed from KONTAKTER
          let existingContacts = current.contacts ?? []
          if (existingContacts.length === 0) {
            let id = 1
            existingContacts = [
              ...KONTAKTER.booking.map((k) => ({ ...k, id: id++, typ: "booking" as KontaktTyp })),
              ...KONTAKTER.sms.map((k) => ({ ...k, id: id++, typ: "sms" as KontaktTyp })),
              ...KONTAKTER.quarterly.map((k) => ({ ...k, id: id++, typ: "quarterly" as KontaktTyp })),
            ]
          }
          // Insert without ids (let Supabase generate them)
          const insertRows = existingContacts.map(({ id: _id, ...rest }) => ({
            name: rest.name, day: rest.day, note: rest.note, typ: rest.typ,
          }))
          if (insertRows.length > 0) {
            const { data: inserted } = await supabase.from("kontakter").insert(insertRows).select()
            if (inserted) {
              current = {
                ...current,
                contacts: (inserted as Array<Record<string, unknown>>).map((r) => ({
                  id: r.id as number,
                  name: (r.name as string) ?? "",
                  day: (r.day as string) ?? "",
                  note: (r.note as string) ?? "",
                  typ: (r.typ as KontaktTyp) ?? "booking",
                })),
              }
            }
          }
        }
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

      // Auto-migrering: seed kunder-tabellen om den är tom
      if (!kunderRes.error && (!kunderRes.data || kunderRes.data.length === 0) && current.clients.length > 0) {
        console.log("[migration] Seedar kunder-tabellen från app_state...")
        await supabase.from("kunder").upsert(current.clients.map(kundToRow))
      }

      // ── Boknings-vecka-reset: rensa bekräftade bokningar när bokningsveckan byter ─
      const bookingVecka = getBookingVecka()
      if (current.lastBookingVecka !== bookingVecka) {
        current = {
          ...current,
          contactLog: clearConfirmedForType(current.contactLog ?? {}, "booking-"),
          lastBookingVecka: bookingVecka,
        }
        console.log(`[booking-vecka] Ny bokningsvecka: ${bookingVecka}`)
      }
      // ── Slut boknings-vecka-reset ─────────────────────────────────────────────

      // ── Onsdag-reset: SMS-kontakter för inspelningar mån–ons nästa vecka ─────
      const lastWed = getLastWeekday(3)
      if (new Date(current.lastWedSmsResetAt ?? 0) < lastWed) {
        // Next Monday = lastWed + 5, Tuesday +6, Wednesday +7
        const nextMon = new Date(lastWed); nextMon.setDate(lastWed.getDate() + 5)
        const nextTue = new Date(lastWed); nextTue.setDate(lastWed.getDate() + 6)
        const nextWed2 = new Date(lastWed); nextWed2.setDate(lastWed.getDate() + 7)

        const smsClients = clientsWithRecordingOnDates(current.clients, [nextMon, nextTue, nextWed2])
        const newSmsInsert = smsClients.map((kund) => ({
          name: kund.name, day: "", note: kund.ph ?? "", typ: "sms" as KontaktTyp,
        }))

        await supabase.from("kontakter").delete().eq("typ", "sms")
        let newSmsContacts: KontaktPost[] = []
        if (newSmsInsert.length > 0) {
          const { data: inserted } = await supabase.from("kontakter").insert(newSmsInsert).select()
          if (inserted) {
            newSmsContacts = (inserted as Array<Record<string, unknown>>).map((r) => ({
              id: r.id as number, name: (r.name as string) ?? "",
              day: (r.day as string) ?? "", note: (r.note as string) ?? "",
              typ: "sms" as KontaktTyp,
            }))
          }
        }

        const nonSms = (current.contacts ?? []).filter((c) => c.typ !== "sms")
        const cleanedLog = clearConfirmedForType(current.contactLog ?? {}, "sms-")
        current = {
          ...current,
          contactLog: cleanedLog,
          contacts: [...nonSms, ...newSmsContacts],
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
        const newSmsInsert = smsClients.map((kund) => ({
          name: kund.name, day: "", note: kund.ph ?? "", typ: "sms" as KontaktTyp,
        }))

        await supabase.from("kontakter").delete().eq("typ", "sms")
        let newSmsContacts: KontaktPost[] = []
        if (newSmsInsert.length > 0) {
          const { data: inserted } = await supabase.from("kontakter").insert(newSmsInsert).select()
          if (inserted) {
            newSmsContacts = (inserted as Array<Record<string, unknown>>).map((r) => ({
              id: r.id as number, name: (r.name as string) ?? "",
              day: (r.day as string) ?? "", note: (r.note as string) ?? "",
              typ: "sms" as KontaktTyp,
            }))
          }
        }

        const nonSms = (current.contacts ?? []).filter((c) => c.typ !== "sms")
        const cleanedLog = clearConfirmedForType(current.contactLog ?? {}, "sms-")
        current = {
          ...current,
          contactLog: cleanedLog,
          contacts: [...nonSms, ...newSmsContacts],
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
          // Exclude schedule and contacts — those are owned by dedicated tables
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { schedule: _s, contacts: _c, ...remoteRest } = remote as DB
          const next = { ...dbRef.current, ...remoteRest }
          setDB(next)
          dbRef.current = next
          saveDB(next)
        }
      )
      .subscribe()

    const enrollChannel = supabase
      .channel("ob_enrollments_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ob_enrollments" }, async () => {
        const { data } = await supabase.from("ob_enrollments").select("*").order('"order"')
        if (!data) return
        const enrollments: ObEnrollment[] = data.map((r: Record<string, unknown>) => ({
          id: r.id as number,
          kundId: r.kund_id as number,
          name: r.name as string,
          pkg: (r.pkg as string) ?? "",
          addedAt: (r.added_at as string) ?? "",
          priority: (r.priority as ObEnrollment["priority"]) ?? "normal",
          order: (r.order as number) ?? 0,
        }))
        setDB((prev) => ({ ...prev, obEnrollments: enrollments }))
        dbRef.current = { ...dbRef.current, obEnrollments: enrollments }
      })
      .subscribe()

    const taskChannel = supabase
      .channel("ob_task_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ob_task_state" }, async () => {
        const { data } = await supabase.from("ob_task_state").select("*")
        if (!data) return
        const obState: DB["obState"] = {}
        for (const row of data as Array<{ kund_id: number; state: Record<string, boolean> }>) {
          obState[row.kund_id] = row.state
        }
        setDB((prev) => ({ ...prev, obState }))
        dbRef.current = { ...dbRef.current, obState }
      })
      .subscribe()

    const leadsChannel = supabase
      .channel("leads_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, async () => {
        const { data } = await supabase.from("leads").select("*").order("id")
        if (!data) return
        const leads: Lead[] = (data as Array<Record<string, unknown>>).map((r) => ({
          id: r.id as number,
          name: r.name as string,
          status: (r.status as Lead["status"]) ?? "Ny lead",
          email: (r.email as string) ?? "",
          phone: (r.phone as string) ?? "",
          notes: (r.notes as string) ?? "",
          createdAt: (r.created_at as string) ?? "",
        }))
        setDB((prev) => ({ ...prev, leads }))
        dbRef.current = { ...dbRef.current, leads }
      })
      .subscribe()

    const veckoChannel = supabase
      .channel("veckoschema_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "veckoschema" }, async () => {
        const { data } = await supabase.from("veckoschema").select("*")
        if (!data) return
        const sched: Veckoschema = { v1: [], v2: [], v3: [], v4: [] }
        for (const row of data as Array<{ vecka: string; name: string }>) {
          const v = row.vecka as keyof Veckoschema
          if (sched[v]) sched[v].push(row.name)
        }
        setDB((prev) => ({ ...prev, schedule: sched }))
        dbRef.current = { ...dbRef.current, schedule: sched }
      })
      .subscribe()

    const kontakChannel = supabase
      .channel("kontakter_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "kontakter" }, async () => {
        const { data } = await supabase.from("kontakter").select("*").order("id")
        if (!data) return
        const contacts: KontaktPost[] = (data as Array<Record<string, unknown>>).map((r) => ({
          id: r.id as number,
          name: (r.name as string) ?? "",
          day: (r.day as string) ?? "",
          note: (r.note as string) ?? "",
          typ: (r.typ as KontaktTyp) ?? "booking",
        }))
        setDB((prev) => ({ ...prev, contacts }))
        dbRef.current = { ...dbRef.current, contacts }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(enrollChannel)
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(veckoChannel)
      supabase.removeChannel(kontakChannel)
    }
  }, [])

  const update = useCallback((updater: (prev: DB) => DB) => {
    const next = updater(dbRef.current)
    saveDB(next)
    dbRef.current = next
    setDB(next)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { leads: _leads, ...stateForAppState } = next
    supabase
      .from("app_state")
      .upsert({ id: "main", data: stateForAppState, updated_at: new Date().toISOString() })
      .then((result) => {
        if (result?.error) console.error("[sync:main] upsert failed:", result.error)
      })
  }, [])

  const addKund = useCallback(
    (kund: Omit<Kund, "id">) => {
      const newKund = { ...kund, id: dbRef.current.nextId }
      supabase.from("kunder").insert(kundToRow(newKund))
        .then((r) => { if (r?.error) console.error("[sync:kunder] insert failed:", r.error) })
      update((prev) => ({
        ...prev,
        clients: [...prev.clients, newKund],
        nextId: prev.nextId + 1,
      }))
    },
    [update]
  )

  const updateKund = useCallback(
    (kund: Kund) => {
      supabase.from("kunder").upsert(kundToRow(kund))
        .then((r) => { if (r?.error) console.error("[sync:kunder] upsert failed:", r.error) })
      const old = dbRef.current.clients.find((c) => c.id === kund.id)
      const nameChanged = old && old.name !== kund.name
      if (nameChanged) {
        // Update name in veckoschema table
        supabase.from("veckoschema").update({ name: kund.name }).eq("name", old!.name)
          .then((r) => { if (r?.error) console.error("[sync:veckoschema] update name failed:", r.error) })
        // Update name in kontakter table
        supabase.from("kontakter").update({ name: kund.name }).eq("name", old!.name)
          .then((r) => { if (r?.error) console.error("[sync:kontakter] update name failed:", r.error) })
      }
      update((prev) => {
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
      supabase.from("kunder").delete().eq("id", id)
        .then((r) => { if (r?.error) console.error("[sync:kunder] delete failed:", r.error) })
      const kund = dbRef.current.clients.find((c) => c.id === id)
      if (kund) {
        supabase.from("veckoschema").delete().eq("name", kund.name)
          .then((r) => { if (r?.error) console.error("[sync:veckoschema] delete failed:", r.error) })
        supabase.from("kontakter").delete().eq("name", kund.name)
          .then((r) => { if (r?.error) console.error("[sync:kontakter] delete by name failed:", r.error) })
      }
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
      setTimeout(() => saveTaskState(kundId, dbRef.current.obState[kundId] ?? {}), 0)
    },
    [update]
  )

  const resetObState = useCallback(
    (kundId: number) => {
      update((prev) => ({
        ...prev,
        obState: { ...prev.obState, [kundId]: {} },
      }))
      setTimeout(() => saveTaskState(kundId, {}), 0)
    },
    [update]
  )

  const completeAllObTasks = useCallback(
    (kundId: number) => {
      const allTaskIds = OB_STEG.flatMap((s) => s.tasks.map((t) => t.id))
      const completeState = Object.fromEntries(allTaskIds.map((id) => [id, true]))
      update((prev) => ({ ...prev, obState: { ...prev.obState, [kundId]: completeState } }))
      setTimeout(() => saveTaskState(kundId, completeState), 0)
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
      // Optimistic update
      setDB((prev) => {
        const sched: Veckoschema = prev.schedule ?? { ...SCHEMA }
        const updated = {
          v1: [...sched.v1], v2: [...sched.v2],
          v3: [...sched.v3], v4: [...sched.v4],
        }
        if (from) updated[from] = updated[from].filter((n) => n !== kundName)
        if (!updated[to].includes(kundName)) updated[to] = [...updated[to], kundName]
        const next = { ...prev, schedule: updated }
        dbRef.current = next
        return next
      })
      // Sync to veckoschema table: delete old entry, insert new
      supabase.from("veckoschema").delete().eq("name", kundName).then(() => {
        supabase.from("veckoschema").insert({ vecka: to, name: kundName })
          .then((r) => { if (r?.error) console.error("[sync:veckoschema] insert failed:", r.error) })
      })
    },
    []
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
      const newLead = { ...lead, id: dbRef.current.nextLeadId ?? 1 }
      update((prev) => ({
        ...prev,
        leads: [...(prev.leads ?? []), newLead],
        nextLeadId: (prev.nextLeadId ?? 1) + 1,
      }))
      setTimeout(() => saveLead(newLead), 0)
    },
    [update]
  )

  const updateLead = useCallback(
    (lead: Lead) => {
      update((prev) => ({
        ...prev,
        leads: (prev.leads ?? []).map((l) => (l.id === lead.id ? lead : l)),
      }))
      setTimeout(() => saveLead(lead), 0)
    },
    [update]
  )

  const deleteLead = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        leads: (prev.leads ?? []).filter((l) => l.id !== id),
      }))
      setTimeout(async () => {
        await supabase.from("leads").delete().eq("id", id)
          .then((r) => { if (r?.error) console.error("[sync:leads] delete failed:", r.error) })
      }, 0)
    },
    [update]
  )

  const addContact = useCallback(
    (contact: Omit<KontaktPost, "id">) => {
      supabase.from("kontakter")
        .insert({ name: contact.name, day: contact.day, note: contact.note, typ: contact.typ })
        .select().single()
        .then(({ data }) => {
          if (data) {
            const r = data as Record<string, unknown>
            setDB((prev) => {
              const next = {
                ...prev,
                contacts: [...(prev.contacts ?? []), {
                  id: r.id as number, name: (r.name as string) ?? "",
                  day: (r.day as string) ?? "", note: (r.note as string) ?? "",
                  typ: (r.typ as KontaktTyp) ?? "booking",
                }],
              }
              dbRef.current = next
              return next
            })
          }
        })
    },
    []
  )

  const updateContact = useCallback(
    (contact: KontaktPost) => {
      // Optimistic update
      setDB((prev) => {
        const next = { ...prev, contacts: (prev.contacts ?? []).map((c) => (c.id === contact.id ? contact : c)) }
        dbRef.current = next
        return next
      })
      supabase.from("kontakter")
        .update({ name: contact.name, day: contact.day, note: contact.note, typ: contact.typ })
        .eq("id", contact.id)
        .then((r) => { if (r?.error) console.error("[sync:kontakter] update failed:", r.error) })
    },
    []
  )

  const deleteContact = useCallback(
    (id: number) => {
      setDB((prev) => {
        const next = { ...prev, contacts: (prev.contacts ?? []).filter((c) => c.id !== id) }
        dbRef.current = next
        return next
      })
      supabase.from("kontakter").delete().eq("id", id)
        .then((r) => { if (r?.error) console.error("[sync:kontakter] delete failed:", r.error) })
    },
    []
  )

  const removeFromVecka = useCallback(
    (kundName: string, from: keyof Veckoschema) => {
      // Optimistic update
      setDB((prev) => {
        const sched: Veckoschema = prev.schedule ?? { ...SCHEMA }
        const next = { ...prev, schedule: { ...sched, [from]: sched[from].filter((n) => n !== kundName) } }
        dbRef.current = next
        return next
      })
      supabase.from("veckoschema").delete().eq("name", kundName)
        .then((r) => { if (r?.error) console.error("[sync:veckoschema] delete failed:", r.error) })
    },
    []
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
      setTimeout(() => {
        const entry = dbRef.current.obEnrollments?.find((e) => e.kundId === kundId)
        if (entry) saveEnrollment(entry)
      }, 0)
    },
    [update]
  )

  const removeFromOnboarding = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        obEnrollments: (prev.obEnrollments ?? []).filter((e) => e.id !== id),
      }))
      setTimeout(async () => {
        await supabase.from("ob_enrollments").delete().eq("id", id)
          .then((r) => { if (r?.error) console.error("[sync:ob_enrollments] delete failed:", r.error) })
      }, 0)
    },
    [update]
  )

  const updateObEnrollments = useCallback(
    (enrollments: ObEnrollment[]) => {
      update((prev) => ({ ...prev, obEnrollments: enrollments }))
      setTimeout(() => {
        supabase.from("ob_enrollments").upsert(
          enrollments.map((e) => ({
            id: e.id, kund_id: e.kundId, name: e.name, pkg: e.pkg,
            added_at: e.addedAt, priority: e.priority, order: e.order,
          }))
        ).then((r) => { if (r?.error) console.error("[sync:ob_enrollments] upsert failed:", r.error) })
      }, 0)
    },
    [update]
  )

  const updateGmbReviews = useCallback(
    (reviews: GmbReview[]) => {
      update((prev) => ({ ...prev, gmbReviews: reviews }))
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
      let newLeads: Lead[] = []
      update((prev) => {
        const existing = new Set((prev.leads ?? []).map((l) => l.name.toLowerCase()))
        const toAdd = incoming.filter((l) => !existing.has(l.name.toLowerCase()))
        imported = toAdd.length
        let nextId = prev.nextLeadId ?? 1
        newLeads = toAdd.map((l) => ({ ...l, id: nextId++ }))
        return {
          ...prev,
          leads: [...(prev.leads ?? []), ...newLeads],
          nextLeadId: nextId,
        }
      })
      if (newLeads.length > 0) {
        setTimeout(() => {
          supabase.from("leads").upsert(
            newLeads.map((l) => ({ id: l.id, name: l.name, status: l.status, email: l.email, phone: l.phone, notes: l.notes, created_at: l.createdAt }))
          ).then((r) => { if (r?.error) console.error("[sync:leads] import upsert failed:", r.error) })
        }, 0)
      }
      return imported
    },
    [update]
  )

  return (
    <DBContext.Provider
      value={{ db, addKund, updateKund, deleteKund, toggleTask, resetObState, completeAllObTasks, toggleContact, moveToVecka, exportData, importData, addLead, updateLead, deleteLead, importLeads, addContact, updateContact, deleteContact, removeFromVecka, addNotification, markPageRead, enrollInOnboarding, removeFromOnboarding, updateObEnrollments, updateGmbReviews }}
    >
      {children}
    </DBContext.Provider>
  )
}

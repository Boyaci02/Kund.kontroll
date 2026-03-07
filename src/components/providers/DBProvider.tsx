"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { DBContext, loadDB, saveDB, getInitialDB } from "@/lib/store"
import type { AppNotification, DB, Kund, KontaktPost, KontaktTyp, Lead, ObEnrollment, Veckoschema } from "@/lib/types"
import { SCHEMA, KONTAKTER } from "@/lib/data"
import { supabase } from "@/lib/supabase"

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<DB>(getInitialDB)
  const dbRef = useRef<DB>(getInitialDB())

  useEffect(() => {
    async function init() {
      // 1. Ladda lokalt direkt (ingen flash)
      const local = loadDB()
      setDB(local)
      dbRef.current = local

      // 2. Hämta från Supabase (source of truth)
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("id", "main")
        .single()

      let current = local
      if (!error && data?.data && Object.keys(data.data).length > 0) {
        current = data.data as DB
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

      // Migration: ensure obEnrollments exists for existing users
      if (!current.obEnrollments) {
        current = { ...current, obEnrollments: [] }
      }

      // Migration: seed obEnrollments from existing AKTIV clients if queue is empty
      if (current.obEnrollments.length === 0 && current.clients.length > 0) {
        const aktiva = current.clients.filter((c) => c.st === "AKTIV" || c.st === "")
        current = {
          ...current,
          obEnrollments: aktiva.map((c, i) => ({
            id: Date.now() + i,
            kundId: c.id,
            name: c.name,
            pkg: c.pkg || "",
            addedAt: new Date().toLocaleDateString("sv-SE"),
            priority: "normal" as const,
            order: i,
          })),
        }
      }

      // Migration: inject "Syns Nu" internal client for existing users
      if (!current.clients.some(c => c.name === "Syns Nu")) {
        current = {
          ...current,
          clients: [...current.clients, { id: 38, name: "Syns Nu", pkg: "", vg: "", ed: "", cc: "", lr: "", nr: "", ns: "", adr: "", cnt: "Internt", ph: "", em: "", st: "AKTIV", notes: "Internt företag" }],
          nextId: Math.max(current.nextId, 39),
        }
      }

      setDB(current)
      dbRef.current = current
      saveDB(current)
      await supabase
        .from("app_state")
        .upsert({ id: "main", data: current, updated_at: new Date().toISOString() })
    }

    init()

    // 3. Realtime-prenumeration
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

    return () => { supabase.removeChannel(channel) }
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
          obState: {
            ...prev.obState,
            [kundId]: { ...state, [taskId]: !state[taskId] },
          },
        }
      })
    },
    [update]
  )

  const resetObState = useCallback(
    (kundId: number) => {
      update((prev) => ({
        ...prev,
        obState: { ...prev.obState, [kundId]: {} },
      }))
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
    },
    [update]
  )

  const removeFromOnboarding = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        obEnrollments: (prev.obEnrollments ?? []).filter((e) => e.id !== id),
      }))
    },
    [update]
  )

  const updateObEnrollments = useCallback(
    (enrollments: ObEnrollment[]) => {
      update((prev) => ({ ...prev, obEnrollments: enrollments }))
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

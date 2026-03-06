"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { DBContext, loadDB, saveDB, getInitialDB } from "@/lib/store"
import type { DB, Kund, Lead, Veckoschema } from "@/lib/types"
import { SCHEMA } from "@/lib/data"
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

      if (!error && data?.data && Object.keys(data.data).length > 0) {
        const remote = data.data as DB
        setDB(remote)
        dbRef.current = remote
        saveDB(remote)
      } else {
        // Första gången — seed Supabase med lokala data
        await supabase
          .from("app_state")
          .upsert({ id: "main", data: local, updated_at: new Date().toISOString() })
      }
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
      value={{ db, addKund, updateKund, deleteKund, toggleTask, resetObState, toggleContact, moveToVecka, exportData, importData, addLead, updateLead, deleteLead, importLeads }}
    >
      {children}
    </DBContext.Provider>
  )
}

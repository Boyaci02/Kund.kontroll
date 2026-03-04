"use client"

import { useState, useCallback, useEffect } from "react"
import { DBContext, loadDB, saveDB, getInitialDB } from "@/lib/store"
import type { DB, Kund, Veckoschema } from "@/lib/types"
import { SCHEMA } from "@/lib/data"

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<DB>(getInitialDB)

  useEffect(() => {
    setDB(loadDB())
  }, [])

  const update = useCallback((updater: (prev: DB) => DB) => {
    setDB((prev) => {
      const next = updater(prev)
      saveDB(next)
      return next
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
      update((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === kund.id ? kund : c)),
      }))
    },
    [update]
  )

  const deleteKund = useCallback(
    (id: number) => {
      update((prev) => ({
        ...prev,
        clients: prev.clients.filter((c) => c.id !== id),
      }))
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
      update((prev) => ({
        ...prev,
        contactLog: { ...(prev.contactLog ?? {}), [key]: !(prev.contactLog ?? {})[key] },
      }))
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

  return (
    <DBContext.Provider
      value={{ db, addKund, updateKund, deleteKund, toggleTask, resetObState, toggleContact, moveToVecka, exportData, importData }}
    >
      {children}
    </DBContext.Provider>
  )
}

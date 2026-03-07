"use client"

import { createContext, useContext } from "react"
import type { AppNotification, DB, Kund, KontaktPost, Lead, OnboardingTillstand, Veckoschema } from "./types"
import { INIT_KUNDER } from "./data"

export const DB_KEY = "kkv4"

export function getInitialDB(): DB {
  return {
    clients: INIT_KUNDER,
    obState: {},
    contactLog: {},
    schedule: null,
    nextId: 39,
    leads: [],
    nextLeadId: 1,
    contacts: [],
    nextContactId: 1,
    notifications: [],
    nextNotifId: 1,
    notifReadAt: {},
  }
}

export function loadDB(): DB {
  if (typeof window === "undefined") return getInitialDB()
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {}
  return getInitialDB()
}

export function saveDB(db: DB): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {}
}

export interface DBContextValue {
  db: DB
  addKund: (kund: Omit<Kund, "id">) => void
  updateKund: (kund: Kund) => void
  deleteKund: (id: number) => void
  toggleTask: (kundId: number, taskId: string) => void
  resetObState: (kundId: number) => void
  toggleContact: (key: string) => void
  moveToVecka: (kundName: string, from: keyof Veckoschema | null, to: keyof Veckoschema) => void
  exportData: () => void
  importData: (json: string) => void
  addLead: (lead: Omit<Lead, "id">) => void
  updateLead: (lead: Lead) => void
  deleteLead: (id: number) => void
  importLeads: (leads: Omit<Lead, "id">[]) => number
  addContact: (c: Omit<KontaktPost, "id">) => void
  updateContact: (c: KontaktPost) => void
  deleteContact: (id: number) => void
  removeFromVecka: (kundName: string, from: keyof Veckoschema) => void
  addNotification: (n: Omit<AppNotification, "id">) => void
  markPageRead: (page: string, userName: string) => void
}

export const DBContext = createContext<DBContextValue | null>(null)

export function useDB(): DBContextValue {
  const ctx = useContext(DBContext)
  if (!ctx) throw new Error("useDB must be used within DBProvider")
  return ctx
}

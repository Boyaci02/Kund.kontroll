"use client"

import { createContext, useContext, useCallback } from "react"
import { useSyncedState } from "@/lib/use-synced-state"
import {
  INIT_HEMSIDA_CLIENTS, INIT_HEMSIDA_LEADS, INIT_HEMSIDA_TASKS,
} from "@/lib/hemsidor-data"
import type {
  HemsidaClient, Lead, CrmTask, OnboardingSubmission, TaskRequest, ActivityEntry,
} from "@/lib/hemsidor-types"

// ── Consolidated state shape ──────────────────────────────────────────────────

export interface HemsidorDB {
  clients:     HemsidaClient[]
  leads:       Lead[]
  tasks:       CrmTask[]
  activity:    ActivityEntry[]
  submissions: OnboardingSubmission[]
  requests:    TaskRequest[]
}

const HEMSIDOR_KEY = "hemsidor-db"

const INITIAL: HemsidorDB = {
  clients:     INIT_HEMSIDA_CLIENTS,
  leads:       INIT_HEMSIDA_LEADS,
  tasks:       INIT_HEMSIDA_TASKS,
  activity:    [],
  submissions: [],
  requests:    [],
}

// ── Migration: consolidate old crm_* localStorage keys into one object ────────

function migrateHemsidor(raw: unknown): HemsidorDB {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Partial<HemsidorDB>
    if (r.clients || r.leads || r.tasks) {
      // Already in new format
      return {
        clients:     r.clients     ?? INIT_HEMSIDA_CLIENTS,
        leads:       r.leads       ?? INIT_HEMSIDA_LEADS,
        tasks:       r.tasks       ?? INIT_HEMSIDA_TASKS,
        activity:    r.activity    ?? [],
        submissions: r.submissions ?? [],
        requests:    r.requests    ?? [],
      }
    }
  }
  return INITIAL
}

// Load initial state: try new consolidated key first, then fall back to old crm_* keys

function getInitialHemsidor(): HemsidorDB {
  if (typeof window === "undefined") return INITIAL
  try {
    const raw = localStorage.getItem(HEMSIDOR_KEY)
    if (raw) return migrateHemsidor(JSON.parse(raw) as unknown)
    // Migrate from old crm_* keys
    const load = <T,>(key: string, fallback: T): T => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
    }
    return {
      clients:     load("crm_clients",                 INIT_HEMSIDA_CLIENTS),
      leads:       load("crm_leads",                   INIT_HEMSIDA_LEADS),
      tasks:       load("crm_tasks",                   INIT_HEMSIDA_TASKS),
      activity:    load("crm_activity",                []),
      submissions: load("crm_onboarding_submissions",  []),
      requests:    load("crm_task_requests",           []),
    }
  } catch { return INITIAL }
}

// ── Context ───────────────────────────────────────────────────────────────────

type Setter<T> = (v: T | ((prev: T) => T)) => void

interface HemsidorContextValue {
  db: HemsidorDB
  loading: boolean
  setDb: (updater: HemsidorDB | ((prev: HemsidorDB) => HemsidorDB)) => void
  // Convenience updaters (support both direct value and functional update)
  setClients:     Setter<HemsidaClient[]>
  setLeads:       Setter<Lead[]>
  setTasks:       Setter<CrmTask[]>
  setActivity:    Setter<ActivityEntry[]>
  setSubmissions: Setter<OnboardingSubmission[]>
  setRequests:    Setter<TaskRequest[]>
  addActivity:    (message: string, type?: string) => void
}

const HemsidorContext = createContext<HemsidorContextValue | null>(null)

export function useHemsidor() {
  const ctx = useContext(HemsidorContext)
  if (!ctx) throw new Error("useHemsidor must be used inside HemsidorProvider")
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString("sv-SE")
}

export function HemsidorProvider({ children }: { children: React.ReactNode }) {
  const [db, setDbRaw, loading] = useSyncedState<HemsidorDB>(
    "hemsidor",
    HEMSIDOR_KEY,
    getInitialHemsidor(),
    migrateHemsidor,
  )

  const setDb = useCallback(
    (updater: HemsidorDB | ((prev: HemsidorDB) => HemsidorDB)) => setDbRaw(updater),
    [setDbRaw]
  )

  const setClients     = useCallback((v: HemsidaClient[]        | ((p: HemsidaClient[])        => HemsidaClient[]))        => setDbRaw(p => ({ ...p, clients:     typeof v === "function" ? v(p.clients)     : v })), [setDbRaw])
  const setLeads       = useCallback((v: Lead[]                 | ((p: Lead[])                 => Lead[]))                 => setDbRaw(p => ({ ...p, leads:       typeof v === "function" ? v(p.leads)       : v })), [setDbRaw])
  const setTasks       = useCallback((v: CrmTask[]              | ((p: CrmTask[])              => CrmTask[]))              => setDbRaw(p => ({ ...p, tasks:       typeof v === "function" ? v(p.tasks)       : v })), [setDbRaw])
  const setActivity    = useCallback((v: ActivityEntry[]        | ((p: ActivityEntry[])        => ActivityEntry[]))        => setDbRaw(p => ({ ...p, activity:    typeof v === "function" ? v(p.activity)    : v })), [setDbRaw])
  const setSubmissions = useCallback((v: OnboardingSubmission[] | ((p: OnboardingSubmission[]) => OnboardingSubmission[])) => setDbRaw(p => ({ ...p, submissions: typeof v === "function" ? v(p.submissions) : v })), [setDbRaw])
  const setRequests    = useCallback((v: TaskRequest[]          | ((p: TaskRequest[])          => TaskRequest[]))          => setDbRaw(p => ({ ...p, requests:    typeof v === "function" ? v(p.requests)    : v })), [setDbRaw])

  const addActivity = useCallback(
    (message: string, type = "general") => {
      setDbRaw(p => ({
        ...p,
        activity: [{ id: Date.now(), message, type, date: todayStr() }, ...p.activity].slice(0, 100),
      }))
    },
    [setDbRaw]
  )

  return (
    <HemsidorContext.Provider value={{
      db, loading, setDb,
      setClients, setLeads, setTasks, setActivity, setSubmissions, setRequests, addActivity,
    }}>
      {children}
    </HemsidorContext.Provider>
  )
}

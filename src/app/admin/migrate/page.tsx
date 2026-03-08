"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { DB_KEY } from "@/lib/store"
import { TASKS_KEY } from "@/lib/task-types"
import type { DB } from "@/lib/types"
import type { Task } from "@/lib/task-types"

interface LocalSummary {
  clients: number
  leads: number
  contacts: number
  obEnrollments: number
  notifications: number
  tasks: number
}

interface SupabaseStatus {
  mainExists: boolean
  tasksExists: boolean
  mainClients: number
  mainLeads: number
  taskCount: number
}

function readLocalSummary(): LocalSummary {
  try {
    const raw = localStorage.getItem(DB_KEY)
    const db = raw ? (JSON.parse(raw) as DB) : null
    const tasksRaw = localStorage.getItem(TASKS_KEY)
    const tasks = tasksRaw ? (JSON.parse(tasksRaw) as Task[]) : []
    return {
      clients: db?.clients?.length ?? 0,
      leads: db?.leads?.length ?? 0,
      contacts: db?.contacts?.length ?? 0,
      obEnrollments: db?.obEnrollments?.length ?? 0,
      notifications: db?.notifications?.length ?? 0,
      tasks: tasks.length,
    }
  } catch {
    return { clients: 0, leads: 0, contacts: 0, obEnrollments: 0, notifications: 0, tasks: 0 }
  }
}

export default function MigratePage() {
  const [local, setLocal] = useState<LocalSummary | null>(null)
  const [sbStatus, setSbStatus] = useState<SupabaseStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocal(readLocalSummary())
    checkSupabase()
  }, [])

  async function checkSupabase() {
    const [mainRes, tasksRes] = await Promise.all([
      supabase.from("app_state").select("data").eq("id", "main").single(),
      supabase.from("app_state").select("data").eq("id", "tasks").single(),
    ])

    const mainData = mainRes.data?.data as DB | undefined
    const tasksData = tasksRes.data?.data as Task[] | undefined

    setSbStatus({
      mainExists: !mainRes.error && !!mainData,
      tasksExists: !tasksRes.error && !!tasksData,
      mainClients: Array.isArray(mainData?.clients) ? mainData!.clients.length : 0,
      mainLeads: Array.isArray(mainData?.leads) ? mainData!.leads.length : 0,
      taskCount: Array.isArray(tasksData) ? tasksData.length : 0,
    })
  }

  async function migrate() {
    setLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()

      // Read current localStorage data
      const dbRaw = localStorage.getItem(DB_KEY)
      const tasksRaw = localStorage.getItem(TASKS_KEY)

      if (!dbRaw) throw new Error("Ingen DB-data hittades i localStorage (kkv4)")

      const db = JSON.parse(dbRaw) as DB
      const tasks = tasksRaw ? (JSON.parse(tasksRaw) as Task[]) : []

      // Upsert both rows
      const [mainResult, tasksResult] = await Promise.all([
        supabase.from("app_state").upsert({ id: "main", data: db, updated_at: now }),
        supabase.from("app_state").upsert({ id: "tasks", data: tasks, updated_at: now }),
      ])

      if (mainResult.error) throw new Error("main: " + mainResult.error.message)
      if (tasksResult.error) throw new Error("tasks: " + tasksResult.error.message)

      setDone(true)
      await checkSupabase()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Databasmigrering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Synkar lokal data till Supabase. Befintlig data i localStorage rörs inte.
        </p>
      </div>

      {/* Local summary */}
      <Section title="Lokal data (localStorage)">
        {local ? (
          <Table rows={[
            ["Kunder", local.clients],
            ["Leads", local.leads],
            ["Kontakter", local.contacts],
            ["Onboarding-kö", local.obEnrollments],
            ["Notiser", local.notifications],
            ["Uppgifter (tasks)", local.tasks],
          ]} />
        ) : (
          <p className="text-sm text-muted-foreground">Läser...</p>
        )}
      </Section>

      {/* Supabase status */}
      <Section title="Supabase-status">
        {sbStatus ? (
          <Table rows={[
            ["DB-rad (main)", sbStatus.mainExists ? `✓ finns (${sbStatus.mainClients} kunder, ${sbStatus.mainLeads} leads)` : "— saknas"],
            ["Tasks-rad (tasks)", sbStatus.tasksExists ? `✓ finns (${sbStatus.taskCount} uppgifter)` : "— saknas"],
          ]} />
        ) : (
          <p className="text-sm text-muted-foreground">Ansluter till Supabase...</p>
        )}
      </Section>

      {/* Action */}
      <div className="space-y-3">
        {done && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            Synkroniseringen lyckades. All data är nu i Supabase och appen synkar automatiskt
            vid varje ändring.
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
            Fel: {error}
          </div>
        )}
        <button
          onClick={migrate}
          disabled={loading || !local}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {loading ? "Synkar..." : "Synka lokal data till Supabase"}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Observera: appen synkar automatiskt vid varje ändring. Den här knappen behövs
          bara om Supabase-tabellen just skapats och saknar data.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  )
}

function Table({ rows }: { rows: [string, string | number][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-t border-border first:border-0">
            <td className="py-1.5 text-muted-foreground">{label}</td>
            <td className="py-1.5 text-right font-mono text-foreground">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

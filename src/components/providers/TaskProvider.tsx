"use client"

import { createContext, useContext, useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TASKS_KEY } from "@/lib/task-types"
import type { Task, TaskNote, TaskPriority, TaskStatus } from "@/lib/task-types"

// ── Row ↔ Task mapping ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: Record<string, any>): Task {
  return {
    id: row.id as number,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    assignee: (row.assignee as string) ?? "",
    kundId: (row.kund_id as number | null) ?? null,
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    status: ((row.status as TaskStatus) ?? "not_started"),
    priority: ((row.priority as TaskPriority) ?? "") as TaskPriority,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    notes: Array.isArray(row.notes) ? row.notes : [],
  }
}

function taskToRow(t: Partial<Task> & { title: string }) {
  return {
    title: t.title ?? "",
    description: t.description ?? "",
    assignee: t.assignee ?? "",
    kund_id: t.kundId ?? null,
    start_date: t.startDate ?? "",
    end_date: t.endDate ?? "",
    status: t.status ?? "not_started",
    priority: t.priority ?? "",
    created_at: t.createdAt ?? new Date().toISOString(),
    notes: t.notes ?? [],
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface TaskContextValue {
  tasks: Task[]
  tasksLoading: boolean
  addTask: (partial: Partial<Omit<Task, "id" | "createdAt">>) => void
  updateTask: (id: number, patch: Partial<Task>) => void
  deleteTask: (id: number) => void
  setTasks: (tasks: Task[]) => void
  addNote: (taskId: number, note: TaskNote) => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function useTask() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error("useTask must be used inside TaskProvider")
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasksState] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  // ── Mount: migrate localStorage → Supabase, then load ──────────────────────
  useEffect(() => {
    async function init() {
      // One-time migration from localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(TASKS_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const rows = parsed.map((t: Task) => ({ ...taskToRow(t), id: t.id }))
              await supabase.from("tasks").upsert(rows, { onConflict: "id" })
              localStorage.removeItem(TASKS_KEY)
            }
          }
        } catch {}
      }

      // Load from Supabase
      const { data } = await supabase.from("tasks").select("*").order("created_at")
      if (data) setTasksState(data.map(rowToTask))
      setTasksLoading(false)
    }
    init()
  }, [])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("tasks_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasksState(prev => {
            if (prev.find(t => t.id === (payload.new as Record<string, unknown>).id)) return prev
            return [...prev, rowToTask(payload.new as Record<string, unknown>)]
          })
        } else if (payload.eventType === "UPDATE") {
          setTasksState(prev => prev.map(t =>
            t.id === (payload.new as Record<string, unknown>).id ? rowToTask(payload.new as Record<string, unknown>) : t
          ))
        } else if (payload.eventType === "DELETE") {
          setTasksState(prev => prev.filter(t => t.id !== (payload.old as Record<string, unknown>).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (partial: Partial<Omit<Task, "id" | "createdAt">> = {}) => {
    const row = taskToRow({ title: "", ...partial, createdAt: new Date().toISOString() })
    const { data } = await supabase.from("tasks").insert(row).select().single()
    if (data) setTasksState(prev => [...prev, rowToTask(data)])
  }, [])

  const updateTask = useCallback(async (id: number, patch: Partial<Task>) => {
    // Optimistic update
    setTasksState(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const rowPatch: Record<string, unknown> = {}
    if (patch.title !== undefined) rowPatch.title = patch.title
    if (patch.description !== undefined) rowPatch.description = patch.description
    if (patch.assignee !== undefined) rowPatch.assignee = patch.assignee
    if (patch.kundId !== undefined) rowPatch.kund_id = patch.kundId
    if (patch.startDate !== undefined) rowPatch.start_date = patch.startDate
    if (patch.endDate !== undefined) rowPatch.end_date = patch.endDate
    if (patch.status !== undefined) rowPatch.status = patch.status
    if (patch.priority !== undefined) rowPatch.priority = patch.priority
    if (patch.notes !== undefined) rowPatch.notes = patch.notes
    await supabase.from("tasks").update(rowPatch).eq("id", id)
  }, [])

  const deleteTask = useCallback(async (id: number) => {
    setTasksState(prev => prev.filter(t => t.id !== id))
    await supabase.from("tasks").delete().eq("id", id)
  }, [])

  const setTasks = useCallback(async (updated: Task[]) => {
    setTasksState(updated)
    // Bulk upsert
    const rows = updated.map(t => ({ ...taskToRow(t), id: t.id }))
    await supabase.from("tasks").upsert(rows, { onConflict: "id" })
  }, [])

  const addNote = useCallback(async (taskId: number, note: TaskNote) => {
    setTasksState(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updated = { ...t, notes: [...(t.notes ?? []), note] }
      supabase.from("tasks").update({ notes: updated.notes }).eq("id", taskId)
      return updated
    }))
  }, [])

  return (
    <TaskContext.Provider value={{ tasks, tasksLoading, addTask, updateTask, deleteTask, setTasks, addNote }}>
      {children}
    </TaskContext.Provider>
  )
}

// Keep loadTasks export for backward compat
export function loadTasks(): Task[] { return [] }

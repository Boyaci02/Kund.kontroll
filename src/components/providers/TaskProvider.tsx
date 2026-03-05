"use client"

import { createContext, useContext, useCallback } from "react"
import { useSyncedState } from "@/lib/use-synced-state"
import { TASKS_KEY, loadTasks } from "@/lib/task-types"
import type { Task, TaskStatus } from "@/lib/task-types"
import { newTaskId } from "@/lib/task-types"

// ── Migration: convert old localStorage format (done/deadline) to new format ──

function migrateTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (raw as any[]).map(t => ({
    id: t.id ?? Date.now(),
    title: t.title ?? "",
    description: t.description ?? "",
    assignee: t.assignee ?? "",
    kundId: t.kundId ?? null,
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? (t.deadline ?? ""),
    status: (t.status as TaskStatus) ?? (t.done ? "done" : "not_started"),
    priority: t.priority ?? "",
    createdAt: t.createdAt ?? new Date().toISOString(),
  }))
}

// ── Context ───────────────────────────────────────────────────────────────────

interface TaskContextValue {
  tasks: Task[]
  tasksLoading: boolean
  addTask: (partial: Partial<Omit<Task, "id" | "createdAt">>) => void
  updateTask: (id: number, patch: Partial<Task>) => void
  deleteTask: (id: number) => void
  setTasks: (tasks: Task[]) => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function useTask() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error("useTask must be used inside TaskProvider")
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

// Seed from localStorage for initial value so there's no empty flash
function getInitialTasks(): Task[] {
  if (typeof window === "undefined") return []
  return migrateTasks((() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })())
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasksRaw, tasksLoading] = useSyncedState<Task[]>(
    "tasks",
    TASKS_KEY,
    getInitialTasks(),
    migrateTasks,
  )

  const setTasks = useCallback((updated: Task[]) => {
    setTasksRaw(updated)
  }, [setTasksRaw])

  const addTask = useCallback((partial: Partial<Omit<Task, "id" | "createdAt">> = {}) => {
    setTasksRaw(prev => [
      ...prev,
      {
        id: newTaskId(),
        title: "",
        description: "",
        assignee: "",
        kundId: null,
        startDate: "",
        endDate: "",
        status: "not_started",
        priority: "",
        createdAt: new Date().toISOString(),
        ...partial,
      },
    ])
  }, [setTasksRaw])

  const updateTask = useCallback((id: number, patch: Partial<Task>) => {
    setTasksRaw(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }, [setTasksRaw])

  const deleteTask = useCallback((id: number) => {
    setTasksRaw(prev => prev.filter(t => t.id !== id))
  }, [setTasksRaw])

  return (
    <TaskContext.Provider value={{ tasks, tasksLoading, addTask, updateTask, deleteTask, setTasks }}>
      {children}
    </TaskContext.Provider>
  )
}

// Keep loadTasks export for backward compat (used in migration)
export { loadTasks }

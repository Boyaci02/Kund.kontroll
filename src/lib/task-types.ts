export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked"
export type TaskPriority = "low" | "medium" | "high" | ""

export interface Task {
  id: number
  title: string
  description: string
  assignee: string       // TeamMedlem-namn eller ""
  kundId: number | null  // kopplad kund eller null
  startDate: string      // ISO datum eller ""
  endDate: string        // ISO datum eller ""
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
}

export const TASKS_KEY = "tasks-v1"

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any[]
    return parsed.map(t => ({
      id: t.id ?? Date.now(),
      title: t.title ?? "",
      description: t.description ?? "",
      assignee: t.assignee ?? "",
      kundId: t.kundId ?? null,
      startDate: t.startDate ?? "",
      endDate: t.endDate ?? (t.deadline ?? ""),
      status: (t.status as TaskStatus) ?? (t.done ? "done" : "not_started"),
      priority: (t.priority as TaskPriority) ?? "",
      createdAt: t.createdAt ?? new Date().toISOString(),
    }))
  } catch { return [] }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch {}
}

let _nextId = Date.now()
export function newTaskId(): number {
  return _nextId++
}

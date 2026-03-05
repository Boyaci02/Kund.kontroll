export interface Task {
  id: number
  title: string
  assignee: string      // TeamMedlem-namn eller ""
  kundId: number | null // kopplad kund eller null
  deadline: string      // ISO datum eller ""
  done: boolean
  createdAt: string     // ISO datum
}

export const TASKS_KEY = "tasks-v1"

let _nextId = 1

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return []
    const tasks: Task[] = JSON.parse(raw)
    // Sync nextId
    tasks.forEach(t => { if (t.id >= _nextId) _nextId = t.id + 1 })
    return tasks
  } catch { return [] }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch {}
}

export function newTaskId(): number {
  return _nextId++
}

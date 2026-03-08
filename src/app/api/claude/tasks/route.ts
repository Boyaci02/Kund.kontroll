import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"
import type { Task } from "@/lib/task-types"

// Maps app TaskStatus → Claude status string (backwards compat)
function toClaudeStatus(s: string): string {
  if (s === "not_started") return "pending"
  if (s === "in_progress") return "in_progress"
  if (s === "done") return "done"
  return s
}

// Maps Claude status → app TaskStatus
function fromClaudeStatus(s: string): Task["status"] {
  if (s === "pending") return "not_started"
  if (s === "in_progress") return "in_progress"
  if (s === "done") return "done"
  return "not_started"
}

async function readTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", "tasks")
    .single()
  if (error || !data?.data) return []
  return Array.isArray(data.data) ? (data.data as Task[]) : []
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await supabase
    .from("app_state")
    .upsert({ id: "tasks", data: tasks, updated_at: new Date().toISOString() })
}

// GET /api/claude/tasks — Hämta alla uppgifter
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status") // pending | in_progress | done

  const tasks = await readTasks()

  const result = tasks
    .filter((t) => {
      if (!statusFilter) return true
      return toClaudeStatus(t.status) === statusFilter
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assigned_to: t.assignee,
      status: toClaudeStatus(t.status),
      priority: t.priority || "medium",
      start_date: t.startDate || null,
      end_date: t.endDate || null,
      created_at: t.createdAt,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(result)
}

// POST /api/claude/tasks — Skapa ny uppgift (syns direkt i appen)
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { title, description, assigned_to, priority, status, start_date, end_date } = body

  if (!title) {
    return NextResponse.json({ error: "title krävs" }, { status: 400 })
  }

  const tasks = await readTasks()

  const newTask: Task = {
    id: Date.now(),
    title,
    description: description ?? "",
    assignee: assigned_to ?? "",
    kundId: null,
    startDate: start_date ?? "",
    endDate: end_date ?? "",
    status: fromClaudeStatus(status ?? "pending"),
    priority: (priority as Task["priority"]) ?? "medium",
    createdAt: new Date().toISOString(),
    notes: [],
  }

  await writeTasks([...tasks, newTask])

  return NextResponse.json(
    {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      assigned_to: newTask.assignee,
      status: toClaudeStatus(newTask.status),
      priority: newTask.priority,
      created_at: newTask.createdAt,
    },
    { status: 201 }
  )
}

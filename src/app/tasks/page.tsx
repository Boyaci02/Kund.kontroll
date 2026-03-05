"use client"

import { useEffect, useState } from "react"
import { useDB } from "@/lib/store"
import { loadTasks, saveTasks, newTaskId } from "@/lib/task-types"
import type { Task } from "@/lib/task-types"
import { TEAM_MEDLEMMAR, TEAM_FARGER } from "@/lib/types"
import { Plus, Pencil, Trash2, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  initial?: Task
  clients: { id: number; name: string }[]
  onSave: (t: Task) => void
  onClose: () => void
}

function TaskModal({ initial, clients, onSave, onClose }: ModalProps) {
  const [title, setTitle]       = useState(initial?.title ?? "")
  const [assignee, setAssignee] = useState(initial?.assignee ?? "")
  const [kundId, setKundId]     = useState<number | null>(initial?.kundId ?? null)
  const [deadline, setDeadline] = useState(initial?.deadline ?? "")

  const inputCls = "w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1"

  function handleSave() {
    if (!title.trim()) return
    onSave({
      id:        initial?.id ?? newTaskId(),
      title:     title.trim(),
      assignee,
      kundId,
      deadline,
      done:      initial?.done ?? false,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{initial ? "Redigera uppgift" : "Ny uppgift"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Titel *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Vad ska göras?"
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Ansvarig</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className={inputCls}>
              <option value="">— Ingen tilldelad —</option>
              {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Kund (valfritt)</label>
            <select value={kundId ?? ""} onChange={e => setKundId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
              <option value="">— Ingen kund —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="text-sm border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors">
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="text-sm bg-primary text-primary-foreground rounded-xl px-4 py-2 hover:opacity-90 transition-opacity font-medium disabled:opacity-40"
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) }
  catch { return d }
}

function isOverdue(deadline: string, done: boolean) {
  return !done && !!deadline && new Date(deadline) < new Date()
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Filter = "all" | "undone" | "done"

export default function TasksPage() {
  const { db } = useDB()
  const [tasks, setTasks]   = useState<Task[]>([])
  const [modal, setModal]   = useState<"new" | Task | null>(null)
  const [filter, setFilter] = useState<Filter>("undone")
  const [assigneeFilter, setAssigneeFilter] = useState("")
  const [q, setQ] = useState("")

  useEffect(() => { setTasks(loadTasks()) }, [])

  function persist(t: Task[]) { setTasks(t); saveTasks(t) }

  function handleSave(task: Task) {
    const exists = tasks.find(t => t.id === task.id)
    persist(exists ? tasks.map(t => t.id === task.id ? task : t) : [...tasks, task])
    setModal(null)
  }

  function toggleDone(id: number) {
    persist(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id: number) {
    persist(tasks.filter(t => t.id !== id))
  }

  const clients = db.clients.map(c => ({ id: c.id, name: c.name }))

  const filtered = tasks
    .filter(t => filter === "all" ? true : filter === "done" ? t.done : !t.done)
    .filter(t => assigneeFilter ? t.assignee === assigneeFilter : true)
    .filter(t => !q || t.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
      if (a.deadline) return -1
      if (b.deadline) return 1
      return b.createdAt.localeCompare(a.createdAt)
    })

  const filterBtn = (f: Filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      className={cn(
        "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
        filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  )

  return (
    <main className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.filter(t => !t.done).length} ogjorda · {tasks.filter(t => t.done).length} klara
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-xl px-4 py-2 hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-4 h-4" /> Ny uppgift
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          {filterBtn("undone", "Ogjorda")}
          {filterBtn("all", "Alla")}
          {filterBtn("done", "Klara")}
        </div>
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          className="text-xs border border-border rounded-xl px-3 py-1.5 bg-background focus:outline-none"
        >
          <option value="">Alla ansvariga</option>
          {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Sök uppgift…"
          className="text-xs border border-border rounded-xl px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-3 py-2.5" />
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Uppgift</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Ansvarig</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Kund</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Deadline</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Status</th>
              <th className="w-20 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                  {tasks.length === 0 ? "Inga uppgifter — tryck på \"Ny uppgift\" för att lägga till" : "Inga uppgifter matchar filtret"}
                </td>
              </tr>
            )}
            {filtered.map(task => {
              const overdue = isOverdue(task.deadline, task.done)
              const kund = task.kundId ? clients.find(c => c.id === task.kundId) : null
              const color = TEAM_FARGER[task.assignee] ?? "#9CA3AF"
              return (
                <tr key={task.id} className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors last:border-b-0", task.done && "opacity-50")}>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleDone(task.id)}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                        task.done ? "bg-teal-500 border-teal-500 text-white" : "border-border hover:border-primary"
                      )}
                    >
                      {task.done && <Check className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("font-medium text-foreground", task.done && "line-through")}>{task.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {task.assignee ? (
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0" style={{ background: color }}>
                          {task.assignee[0]}
                        </span>
                        <span className="text-sm text-foreground">{task.assignee}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {kund ? (
                      <Link href={`/kunder/${kund.id}`} className="text-sm text-primary hover:underline">
                        {kund.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-sm", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                      {fmtDate(task.deadline)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {task.done ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Klar</span>
                    ) : overdue ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Försenad</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pågående</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(task)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <TaskModal
          initial={modal === "new" ? undefined : modal}
          clients={clients}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  )
}

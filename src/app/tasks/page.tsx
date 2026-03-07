"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import Link from "next/link"
import { useDB } from "@/lib/store"
import { useTask } from "@/components/providers/TaskProvider"
import { newTaskId, STATUS_LABELS, STATUS_COLORS } from "@/lib/task-types"
import type { Task, TaskStatus, TaskPriority } from "@/lib/task-types"
import { TEAM_MEDLEMMAR, TEAM_FARGER } from "@/lib/types"
import { useAuth } from "@/components/providers/AuthProvider"
import { OB_STEG } from "@/lib/data"
import { cn } from "@/lib/utils"
import {
  Plus, ChevronDown, ChevronRight, MoreHorizontal, Check,
  X, Filter, Users, Globe, List, Search, CheckSquare,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// ── Types ─────────────────────────────────────────────────────────────────────

type View = "all_clients" | "by_employee" | "all_tasks"
type DateFilter = "all" | "this_month" | "this_year" | "custom"
type SortKey = "endDate" | "startDate" | "status" | "kundId" | "assignee"
type SortDir = "asc" | "desc"

interface ActiveFilters {
  employees: string[]
  clients: number[]
  statuses: TaskStatus[]
}

const STATUS_OPTIONS: TaskStatus[] = ["not_started", "in_progress", "done", "blocked"]
const OB_STATUS_OPTIONS: TaskStatus[] = ["not_started", "done"]

// ── OB task helpers ────────────────────────────────────────────────────────────

function parseOBTask(task: Task): { kundId: number; obTaskId: string; stepTitle: string } | null {
  if (!task.description.startsWith("__OB__:")) return null
  const parts = task.description.slice(7).split(":")
  return { kundId: Number(parts[0]), obTaskId: parts[1], stepTitle: parts.slice(2).join(":") }
}

// ── Status dropdown (inline) ──────────────────────────────────────────────────

function StatusDropdown({ status, onChange, obTask }: {
  status: TaskStatus
  onChange: (v: TaskStatus) => void
  obTask?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap hover:opacity-80 transition-opacity",
          STATUS_COLORS[status]
        )}
      >
        {STATUS_LABELS[status]}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
          {(obTask ? OB_STATUS_OPTIONS : STATUS_OPTIONS).map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors text-left"
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                s === "not_started" ? "bg-gray-400" :
                s === "in_progress" ? "bg-blue-500" :
                s === "done" ? "bg-teal-500" : "bg-red-500"
              )} />
              {STATUS_LABELS[s]}
              {s === status && <Check className="w-3 h-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Actions menu ──────────────────────────────────────────────────────────────

function ActionsMenu({ onEdit, onDuplicate, onDelete }: {
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 w-36">
          <button onClick={() => { onEdit(); setOpen(false) }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors">Redigera</button>
          <button onClick={() => { onDuplicate(); setOpen(false) }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors">Duplicera</button>
          <div className="h-px bg-border my-1" />
          <button onClick={() => { onDelete(); setOpen(false) }} className="w-full px-3 py-1.5 text-xs text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Ta bort</button>
        </div>
      )}
    </div>
  )
}

// ── Task modal ────────────────────────────────────────────────────────────────

const EMPTY: Omit<Task, "id" | "createdAt"> = {
  title: "", description: "", assignee: "", kundId: null,
  startDate: "", endDate: "", status: "not_started", priority: "",
}

function TaskModal({ open, initial, clients, onSave, onClose }: {
  open: boolean
  initial: Partial<Task> | null
  clients: Array<{ id: number; name: string }>
  onSave: (t: Omit<Task, "id" | "createdAt">) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Task, "id" | "createdAt">>(EMPTY)

  useEffect(() => {
    if (open) setForm({ ...EMPTY, ...initial })
  }, [open, initial])

  function save() {
    if (!form.title.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Redigera task" : "Ny task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Titel *</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Uppgiftens namn..."
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Beskrivning</label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Kort beskrivning..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kund</label>
              <select
                value={form.kundId ?? ""}
                onChange={e => setForm(f => ({ ...f, kundId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen kund</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ansvarig</label>
              <select
                value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen</option>
                {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Startdatum</label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slutdatum</label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioritet</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen prioritet</option>
                <option value="low">Låg</option>
                <option value="medium">Medium</option>
                <option value="high">Hög</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={save} disabled={!form.title.trim()}>Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Table header ──────────────────────────────────────────────────────────────

function TableHead({ sortKey, sortDir, onSort, showAssignee }: {
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  showAssignee: boolean
}) {
  const th = (label: string, key?: SortKey) => (
    <th
      key={label}
      onClick={key ? () => onSort(key) : undefined}
      className={cn(
        "text-left text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 whitespace-nowrap",
        key && "cursor-pointer hover:text-foreground transition-colors select-none"
      )}
    >
      {label}
      {key && sortKey === key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  )

  return (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        {th("Task")}
        {th("Beskrivning")}
        {th("Kund", "kundId")}
        {th("Datum", "startDate")}
        {th("Status", "status")}
        {showAssignee && th("Ansvarig", "assignee")}
        <th className="w-8 px-2" />
      </tr>
    </thead>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, kundName, showAssignee, onStatusChange, onEdit, onDuplicate, onDelete, isOB }: {
  task: Task
  kundName: string
  showAssignee: boolean
  onStatusChange: (s: TaskStatus) => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  isOB?: boolean
}) {
  const color = TEAM_FARGER[task.assignee] ?? "#9CA3AF"
  const isOverdue = task.status !== "done" && !!task.endDate && new Date(task.endDate + "T23:59:59") < new Date()
  const obMeta = isOB ? parseOBTask(task) : null

  function fmt(d: string) {
    if (!d) return ""
    return new Date(d + "T00:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <tr className="group border-b border-border/40 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2">
          {isOB && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">
              <CheckSquare className="w-2.5 h-2.5" />
              OB
            </span>
          )}
          {isOB ? (
            <span className="text-sm font-medium text-foreground">
              {task.title}
            </span>
          ) : (
            <Link
              href={`/tasks/${task.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {task.title || <span className="italic text-muted-foreground text-xs">Utan titel</span>}
            </Link>
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <span className="text-xs text-muted-foreground truncate block">
          {isOB ? (obMeta?.stepTitle ?? "Onboarding") : (task.description || "—")}
        </span>
      </td>
      <td className="px-4 py-3 min-w-[120px]">
        {kundName ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
              {kundName[0]}
            </div>
            <span className="text-xs text-foreground">{kundName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 min-w-[150px]">
        <span className={cn("text-xs whitespace-nowrap", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
          {task.startDate && task.endDate
            ? `${fmt(task.startDate)} → ${fmt(task.endDate)}`
            : task.endDate ? fmt(task.endDate)
            : task.startDate ? fmt(task.startDate)
            : "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusDropdown status={task.status} onChange={onStatusChange} obTask={isOB} />
      </td>
      {showAssignee && (
        <td className="px-4 py-3">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: color }}
              >
                {task.assignee[0]}
              </div>
              <span className="text-xs text-muted-foreground">{task.assignee}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}
      <td className="px-2 py-3">
        {!isOB && <ActionsMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />}
      </td>
    </tr>
  )
}

// ── Mobile task card ──────────────────────────────────────────────────────────

function TaskCard({ task, kundName, onStatusChange, isOB }: {
  task: Task
  kundName: string
  onStatusChange: (s: TaskStatus) => void
  isOB?: boolean
}) {
  const color = TEAM_FARGER[task.assignee] ?? "#9CA3AF"
  const isOverdue = task.status !== "done" && !!task.endDate && new Date(task.endDate + "T23:59:59") < new Date()

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {isOB && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">
              <CheckSquare className="w-2.5 h-2.5" />
              OB
            </span>
          )}
          {isOB ? (
            <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
          ) : (
            <Link href={`/tasks/${task.id}`} className="text-sm font-semibold text-foreground hover:text-primary truncate transition-colors">
              {task.title || <span className="italic text-muted-foreground text-xs">Utan titel</span>}
            </Link>
          )}
        </div>
        <StatusDropdown status={task.status} onChange={onStatusChange} obTask={isOB} />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: color }}>
              {task.assignee[0]}
            </div>
            <span>{task.assignee}</span>
          </div>
        )}
        {kundName && (
          <span className="truncate">{kundName}</span>
        )}
        {task.endDate && (
          <span className={cn("whitespace-nowrap", isOverdue && "text-red-500 font-semibold")}>
            {task.endDate}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Employee group ────────────────────────────────────────────────────────────

function EmployeeGroup({ name, tasks, clients, onStatusChange, onEdit, onDuplicate, onDelete, onAddTask, sortKey, sortDir, onSort }: {
  name: string
  tasks: Task[]
  clients: Array<{ id: number; name: string }>
  onStatusChange: (id: number, s: TaskStatus) => void
  onEdit: (t: Task) => void
  onDuplicate: (t: Task) => void
  onDelete: (id: number) => void
  onAddTask: () => void
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const color = TEAM_FARGER[name] ?? "#9CA3AF"
  const isUnassigned = name === "Ej tilldelad"

  return (
    <div className="rounded-xl border border-border overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-3 w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        }
        {isUnassigned ? (
          <span className="text-sm font-semibold text-muted-foreground">{name}</span>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: color }}
            >
              {name[0]}
            </div>
            <span className="text-sm font-semibold text-foreground">{name}</span>
          </div>
        )}
        <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </button>

      {expanded && (
        <>
          <table className="w-full text-sm border-collapse">
            <TableHead sortKey={sortKey} sortDir={sortDir} onSort={onSort} showAssignee={false} />
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">Inga tasks</td>
                </tr>
              ) : tasks.map(t => {
                const kundName = clients.find(c => c.id === t.kundId)?.name ?? ""
                const isOB = t.description.startsWith("__OB__:")
                return (
                  <TaskRow
                    key={t.id}
                    task={t}
                    kundName={kundName}
                    showAssignee={false}
                    onStatusChange={s => onStatusChange(t.id, s)}
                    onEdit={() => onEdit(t)}
                    onDuplicate={() => onDuplicate(t)}
                    onDelete={() => onDelete(t.id)}
                    isOB={isOB}
                  />
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-border/40 px-4 py-2 bg-muted/10">
            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Ny task
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { db, addNotification, markPageRead, toggleTask } = useDB()
  const { user } = useAuth()
  const { tasks, setTasks } = useTask()

  useEffect(() => {
    if (user?.name) markPageRead("tasks", user.name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Virtual OB tasks (computed from obState, not stored separately) ─────────
  const obVirtualTasks = useMemo<Task[]>(() => {
    const result: Task[] = []
    db.clients.filter(c => c.st === "AKTIV").forEach(client => {
      let localIdx = 0
      OB_STEG.forEach(step => {
        step.tasks.forEach(task => {
          const isDone = (db.obState[client.id] ?? {})[task.id] ?? false
          result.push({
            id: client.id * 100_000 + localIdx,
            title: task.text,
            description: `__OB__:${client.id}:${task.id}:Steg ${step.n}: ${step.title}`,
            assignee: task.who,
            kundId: client.id,
            startDate: "",
            endDate: "",
            status: isDone ? "done" : "not_started",
            priority: "",
            createdAt: "",
          })
          localIdx++
        })
      })
    })
    return result
  }, [db.clients, db.obState])

  const [view, setView] = useState<View>("all_tasks")
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ employees: [], clients: [], statuses: [] })
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("endDate")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  const clients = db.clients.filter(c => c.st === "AKTIV" || c.st === "")


  useEffect(() => {
    if (!showFilterMenu) return
    const h = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowFilterMenu(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [showFilterMenu])

  function persist(updated: Task[]) {
    setTasks(updated)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function openNewTask(assignee = "", kundId: number | null = null) {
    setEditingTask({ assignee, kundId })
    setModalOpen(true)
  }

  function openEditTask(t: Task) {
    if (parseOBTask(t)) return  // OB tasks are not editable via modal
    setEditingTask({ ...t })
    setModalOpen(true)
  }

  function handleSave(form: Omit<Task, "id" | "createdAt">) {
    if (editingTask?.id) {
      const existing = tasks.find(t => t.id === editingTask.id)
      persist(tasks.map(t => t.id === editingTask.id ? { ...t, ...form } : t))
      if (form.status === "done" && existing && existing.status !== "done" && user?.name) {
        addNotification({
          title: `${user.name} slutförde en uppgift`,
          body: form.title,
          page: "tasks",
          createdBy: user.name,
          createdAt: new Date().toISOString(),
        })
      }
    } else {
      persist([...tasks, { ...form, id: newTaskId(), createdAt: new Date().toISOString() }])
    }
  }

  function handleStatusChange(id: number, status: TaskStatus) {
    // OB virtual task — route to toggleTask
    const obTask = obVirtualTasks.find(t => t.id === id)
    if (obTask) {
      const meta = parseOBTask(obTask)
      if (!meta) return
      const currentDone = (db.obState[meta.kundId] ?? {})[meta.obTaskId] ?? false
      const wantDone = status === "done"
      if (currentDone !== wantDone) toggleTask(meta.kundId, meta.obTaskId)
      return
    }
    // Regular task
    const task = tasks.find(t => t.id === id)
    persist(tasks.map(t => t.id === id ? { ...t, status } : t))
    if (status === "done" && task && task.status !== "done" && user?.name) {
      addNotification({
        title: `${user.name} slutförde en uppgift`,
        body: task.title,
        page: "tasks",
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      })
    }
  }

  function handleDuplicate(t: Task) {
    if (parseOBTask(t)) return  // OB tasks cannot be duplicated
    persist([...tasks, { ...t, id: newTaskId(), title: `${t.title} (kopia)`, createdAt: new Date().toISOString() }])
  }

  function handleDelete(id: number) {
    if (obVirtualTasks.some(t => t.id === id)) return  // OB tasks cannot be deleted
    persist(tasks.filter(t => t.id !== id))
  }

  function removeFilter(type: keyof ActiveFilters, value: string | number) {
    setActiveFilters(f => ({ ...f, [type]: (f[type] as (string | number)[]).filter(v => v !== value) }))
  }

  // ── Filtering + sorting ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...tasks, ...obVirtualTasks]

    if (view === "all_clients") result = result.filter(t => t.kundId !== null)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (clients.find(c => c.id === t.kundId)?.name ?? "").toLowerCase().includes(q)
      )
    }

    const now = new Date()
    if (dateFilter === "this_month") {
      result = result.filter(t => {
        const d = t.endDate || t.startDate
        if (!d) return false
        const dt = new Date(d)
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()
      })
    } else if (dateFilter === "this_year") {
      result = result.filter(t => {
        const d = t.endDate || t.startDate
        if (!d) return false
        return new Date(d).getFullYear() === now.getFullYear()
      })
    } else if (dateFilter === "custom" && (customStart || customEnd)) {
      result = result.filter(t => {
        const d = t.endDate || t.startDate
        if (!d) return false
        const dt = new Date(d)
        if (customStart && dt < new Date(customStart)) return false
        if (customEnd && dt > new Date(customEnd + "T23:59:59")) return false
        return true
      })
    }

    if (activeFilters.employees.length > 0)
      result = result.filter(t => activeFilters.employees.includes(t.assignee))
    if (activeFilters.clients.length > 0)
      result = result.filter(t => t.kundId !== null && activeFilters.clients.includes(t.kundId))
    if (activeFilters.statuses.length > 0)
      result = result.filter(t => activeFilters.statuses.includes(t.status))

    result.sort((a, b) => {
      let va = "", vb = ""
      if (sortKey === "endDate") { va = a.endDate || a.startDate; vb = b.endDate || b.startDate }
      else if (sortKey === "startDate") { va = a.startDate; vb = b.startDate }
      else if (sortKey === "status") { va = a.status; vb = b.status }
      else if (sortKey === "kundId") {
        va = clients.find(c => c.id === a.kundId)?.name ?? ""
        vb = clients.find(c => c.id === b.kundId)?.name ?? ""
      }
      else if (sortKey === "assignee") { va = a.assignee; vb = b.assignee }
      const cmp = va.localeCompare(vb, "sv")
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [tasks, obVirtualTasks, view, search, dateFilter, customStart, customEnd, activeFilters, sortKey, sortDir, clients])

  const hasActiveFilters = activeFilters.employees.length + activeFilters.clients.length + activeFilters.statuses.length > 0
  const members = TEAM_MEDLEMMAR.filter(m => m !== "Ingen")
  const unassigned = filtered.filter(t => !t.assignee || !(members as string[]).includes(t.assignee))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage team tasks and client work</p>
        </div>
        <Button size="sm" onClick={() => openNewTask()} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ny task
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 space-y-3">
        {/* Row 1: Views + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-muted/50 rounded-xl p-0.5 gap-0.5">
            {([
              { key: "all_clients" as View, label: "All Client Tasks", icon: Globe },
              { key: "by_employee" as View, label: "By Employee", icon: Users },
              { key: "all_tasks" as View, label: "All Tasks", icon: List },
            ] as { key: View; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  view === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök tasks..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Row 2: Date filters + Add filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all" as DateFilter, label: "Alla datum" },
            { key: "this_month" as DateFilter, label: "Denna månad" },
            { key: "this_year" as DateFilter, label: "Detta år" },
            { key: "custom" as DateFilter, label: "Anpassat" },
          ] as { key: DateFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                dateFilter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {label}
            </button>
          ))}

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Add filter button */}
          <div ref={filterMenuRef} className="relative">
            <button
              onClick={() => setShowFilterMenu(o => !o)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                hasActiveFilters
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Filter className="w-3 h-3" />
              Lägg till filter
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                  {activeFilters.employees.length + activeFilters.clients.length + activeFilters.statuses.length}
                </span>
              )}
            </button>

            {showFilterMenu && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-4 w-72">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Filter</p>

                <div className="mb-3">
                  <p className="text-xs font-medium text-foreground mb-2">Ansvarig</p>
                  <div className="flex flex-wrap gap-1">
                    {members.map(m => (
                      <button
                        key={m}
                        onClick={() => setActiveFilters(f => ({
                          ...f,
                          employees: f.employees.includes(m) ? f.employees.filter(e => e !== m) : [...f.employees, m]
                        }))}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg border transition-colors",
                          activeFilters.employees.includes(m)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-medium text-foreground mb-2">Status</p>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setActiveFilters(f => ({
                          ...f,
                          statuses: f.statuses.includes(s) ? f.statuses.filter(st => st !== s) : [...f.statuses, s]
                        }))}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg border transition-colors",
                          activeFilters.statuses.includes(s)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Kund</p>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setActiveFilters(f => ({
                          ...f,
                          clients: f.clients.includes(c.id) ? f.clients.filter(id => id !== c.id) : [...f.clients, c.id]
                        }))}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg border transition-colors",
                          activeFilters.clients.includes(c.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() => setActiveFilters({ employees: [], clients: [], statuses: [] })}
                    className="mt-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Rensa alla filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Aktiva filter:</span>
            {activeFilters.employees.map(e => (
              <span key={e} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {e}
                <button onClick={() => removeFilter("employees", e)}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {activeFilters.statuses.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {STATUS_LABELS[s]}
                <button onClick={() => removeFilter("statuses", s)}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {activeFilters.clients.map(id => {
              const name = clients.find(c => c.id === id)?.name ?? String(id)
              return (
                <span key={id} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {name}
                  <button onClick={() => removeFilter("clients", id)}><X className="w-3 h-3" /></button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {view === "by_employee" ? (
        <div>
          {members.map(member => {
            const memberTasks = filtered.filter(t => t.assignee === member)
            return (
              <div key={member}>
                {/* Desktop */}
                <div className="hidden md:block">
                  <EmployeeGroup
                    name={member}
                    tasks={memberTasks}
                    clients={clients}
                    onStatusChange={handleStatusChange}
                    onEdit={openEditTask}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onAddTask={() => openNewTask(member)}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </div>
                {/* Mobile */}
                {memberTasks.length > 0 && (
                  <div className="md:hidden mb-4">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: TEAM_FARGER[member] ?? "#9CA3AF" }}>{member[0]}</div>
                      <span className="text-sm font-semibold text-foreground">{member}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{memberTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {memberTasks.map(t => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          kundName={clients.find(c => c.id === t.kundId)?.name ?? ""}
                          onStatusChange={s => handleStatusChange(t.id, s)}
                          isOB={t.description.startsWith("__OB__:")}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {unassigned.length > 0 && (
            <>
              <div className="hidden md:block">
                <EmployeeGroup
                  name="Ej tilldelad"
                  tasks={unassigned}
                  clients={clients}
                  onStatusChange={handleStatusChange}
                  onEdit={openEditTask}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onAddTask={() => openNewTask()}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </div>
              <div className="md:hidden mb-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2 px-1">Ej tilldelad</p>
                <div className="space-y-2">
                  {unassigned.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      kundName={clients.find(c => c.id === t.kundId)?.name ?? ""}
                      onStatusChange={s => handleStatusChange(t.id, s)}
                      isOB={t.description.startsWith("__OB__:")}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <TableHead sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showAssignee />
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-xs text-muted-foreground">
                      {tasks.length === 0 ? "Inga tasks ännu — skapa den första!" : "Inga tasks matchar filtret"}
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const kundName = clients.find(c => c.id === t.kundId)?.name ?? ""
                  const isOB = t.description.startsWith("__OB__:")
                  return (
                    <TaskRow
                      key={t.id}
                      task={t}
                      kundName={kundName}
                      showAssignee
                      onStatusChange={s => handleStatusChange(t.id, s)}
                      onEdit={() => openEditTask(t)}
                      onDuplicate={() => handleDuplicate(t)}
                      onDelete={() => handleDelete(t.id)}
                      isOB={isOB}
                    />
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-border px-4 py-2 bg-muted/10">
              <button
                onClick={() => openNewTask()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <Plus className="w-3 h-3" /> Ny task
              </button>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">
                {tasks.length === 0 ? "Inga tasks ännu — skapa den första!" : "Inga tasks matchar filtret"}
              </p>
            ) : filtered.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                kundName={clients.find(c => c.id === t.kundId)?.name ?? ""}
                onStatusChange={s => handleStatusChange(t.id, s)}
                isOB={t.description.startsWith("__OB__:")}
              />
            ))}
          </div>
        </>
      )}

      <TaskModal
        open={modalOpen}
        initial={editingTask}
        clients={clients}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
      />
    </main>
  )
}

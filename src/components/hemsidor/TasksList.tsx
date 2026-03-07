"use client"

import { useState, useMemo } from "react"
import { Plus, Pencil, X, ChevronDown, ChevronRight, CheckSquare, AlertTriangle, MessageCircle, Archive } from "lucide-react"
import { TASK_STATUS, PRIORITY, PRIORITY_CYCLE, ALL_TASK_STATUSES, todayStr, isOverdue, weekDays, nextDueDate } from "@/lib/hemsidor-data"
import { HModal, HConfirmDialog, HFormField, HFormSelect, HPageHeader } from "./shared"
import type { CrmTask, HemsidaClient } from "@/lib/hemsidor-types"

interface TaskForm {
  clientId: number | null
  title: string
  description: string
  priority: CrmTask["priority"]
  dueDate: string
  assignee: string
  isRecurring: boolean
  recurringInterval: string
}

const EMPTY_TASK: TaskForm = { clientId: null, title: "", description: "", priority: "normal", dueDate: "", assignee: "", isRecurring: false, recurringInterval: "" }

interface Props {
  tasks: CrmTask[]
  setTasks: React.Dispatch<React.SetStateAction<CrmTask[]>>
  clients: HemsidaClient[]
  addActivity: (message: string, type?: string) => void
}

export default function TasksList({ tasks, setTasks, clients, addActivity }: Props) {
  const [filter,     setFilter]     = useState("alla")
  const [sortBy,     setSortBy]     = useState("dueDate")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [editTask,   setEditTask]   = useState<number | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [commentText, setCommentText] = useState("")
  const [form, setForm] = useState<TaskForm>(EMPTY_TASK)

  const openNew  = () => { setForm(EMPTY_TASK); setEditTask(null); setShowModal(true) }
  const openEdit = (t: CrmTask) => { setForm({ clientId: t.clientId, title: t.title, description: t.description, priority: t.priority, dueDate: t.dueDate, assignee: t.assignee, isRecurring: t.isRecurring, recurringInterval: t.recurringInterval }); setEditTask(t.id); setShowModal(true) }

  const save = () => {
    if (!form.title.trim() || !form.clientId) return
    const client = clients.find(c => c.id === Number(form.clientId))
    if (editTask !== null) {
      setTasks(prev => prev.map(t => t.id === editTask
        ? { ...t, ...form, clientId: Number(form.clientId), clientName: client?.name ?? t.clientName, lastUpdated: todayStr() }
        : t
      ))
    } else {
      const newTask: CrmTask = {
        ...form, id: Date.now(), clientId: Number(form.clientId),
        clientName: client?.name ?? "", status: "inkommen",
        created: todayStr(), lastUpdated: todayStr(),
        comments: [], archivedAt: null,
        isRecurring: form.isRecurring || false,
        recurringInterval: form.recurringInterval || "",
      }
      setTasks(prev => [...prev, newTask])
      addActivity(`Ny task skapad: ${form.title}`, "task")
    }
    setShowModal(false)
  }

  const moveStatus = (id: number, status: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, status: status as CrmTask["status"], lastUpdated: todayStr(), ...(status === "klar" ? { completedDate: todayStr() } : {}) }
      if (status === "klar" && t.isRecurring && t.recurringInterval) {
        setTimeout(() => {
          setTasks(p => [...p, {
            ...t, id: Date.now(), status: "inkommen" as const,
            created: todayStr(), lastUpdated: todayStr(),
            dueDate: nextDueDate(t.dueDate, t.recurringInterval),
            completedDate: undefined, archivedAt: null, comments: [],
          }])
        }, 100)
      }
      return updated
    }))
  }

  const deleteTask = () => {
    setTasks(prev => prev.filter(t => t.id !== confirmDel))
    setConfirmDel(null)
    if (expandedId === confirmDel) setExpandedId(null)
  }

  const archiveTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, archivedAt: todayStr() } : t))
    if (expandedId === id) setExpandedId(null)
  }

  const cyclePriority = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: PRIORITY_CYCLE[t.priority] as CrmTask["priority"], lastUpdated: todayStr() } : t))
  }

  const addComment = (taskId: number) => {
    if (!commentText.trim()) return
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, comments: [...(t.comments || []), { text: commentText, date: todayStr() }], lastUpdated: todayStr() }
      : t
    ))
    setCommentText("")
  }

  const days = weekDays()
  const filtered = useMemo(() => {
    let list = tasks
    if (filter === "arkiv") return list.filter(t => t.archivedAt)
    list = list.filter(t => !t.archivedAt)
    if (filter === "veckovy") return list.filter(t => t.dueDate && t.dueDate >= days[0].date && t.dueDate <= days[6].date)
    if (filter !== "alla") list = list.filter(t => t.status === filter)

    return [...list].sort((a, b) => {
      const aOD = isOverdue(a) ? 0 : 1
      const bOD = isOverdue(b) ? 0 : 1
      if (aOD !== bOD) return aOD - bOD
      if (sortBy === "dueDate")  return (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1
      if (sortBy === "priority") { const ord: Record<string,number> = { hog: 0, normal: 1, lag: 2 }; return ord[a.priority] - ord[b.priority] }
      if (sortBy === "created")  return a.created > b.created ? -1 : 1
      return 0
    })
  }, [tasks, filter, sortBy, days])

  const counts = ALL_TASK_STATUSES.reduce<Record<string,number>>((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s && !t.archivedAt).length }), {})
  const archiveCount = tasks.filter(t => t.archivedAt).length
  const openCount    = tasks.filter(t => t.status !== "klar" && !t.archivedAt).length

  const filterOptions: [string, string, number | null][] = [
    ["alla",    "Alla",    tasks.filter(t => !t.archivedAt).length],
    ...ALL_TASK_STATUSES.map(s => [s, TASK_STATUS[s].label, counts[s]] as [string, string, number]),
    ["veckovy", "Veckovy", null],
    ["arkiv",   "Arkiv",   archiveCount],
  ]

  return (
    <div>
      <HPageHeader title="Pågående tasks" sub={`${openCount} öppna tasks`}>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Ny task
        </button>
      </HPageHeader>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(([id, label, count]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === id ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border hover:bg-muted/60"
              }`}>
              {label}{count !== null && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {[["dueDate","Deadline"],["priority","Prioritet"],["created","Skapad"]].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                sortBy === key ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/60"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {filter === "veckovy" ? (
        <div className="space-y-4">
          {days.map(day => {
            const dayTasks = filtered.filter(t => t.dueDate === day.date)
            return (
              <div key={day.date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">{day.label}</p>
                {dayTasks.length === 0
                  ? <p className="text-xs text-muted-foreground/40 pl-2">Inga tasks</p>
                  : <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {dayTasks.map(task => <TaskRow key={task.id} task={task} expandedId={expandedId} setExpandedId={setExpandedId} moveStatus={moveStatus} cyclePriority={cyclePriority} openEdit={openEdit} setConfirmDel={setConfirmDel} archiveTask={archiveTask} addComment={addComment} commentText={commentText} setCommentText={setCommentText} />)}
                  </div>
                }
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} expandedId={expandedId} setExpandedId={setExpandedId}
              moveStatus={moveStatus} cyclePriority={cyclePriority} openEdit={openEdit}
              setConfirmDel={setConfirmDel} archiveTask={archiveTask}
              addComment={addComment} commentText={commentText} setCommentText={setCommentText} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Inga tasks att visa</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <HModal title={editTask !== null ? "Redigera task" : "Ny task"} onClose={() => setShowModal(false)} onSave={save}>
          <HFormSelect label="Kund" required value={String(form.clientId ?? "")} onChange={v => setForm({ ...form, clientId: Number(v) })}
            options={clients.map(c => ({ value: c.id, label: c.name }))} />
          <HFormField label="Titel" required value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <HFormField label="Beskrivning" value={form.description} onChange={v => setForm({ ...form, description: v })} multiline />
          <div className="grid grid-cols-2 gap-3">
            <HFormSelect label="Prioritet" value={form.priority} onChange={v => setForm({ ...form, priority: v as CrmTask["priority"] })}
              options={[{ value: "lag", label: "Låg" }, { value: "normal", label: "Normal" }, { value: "hog", label: "Hög" }]} />
            <HFormField label="Deadline" type="date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} />
          </div>
          <HFormField label="Ansvarig" value={form.assignee} onChange={v => setForm({ ...form, assignee: v })} placeholder="T.ex. Emanuel" />
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <input type="checkbox" id="recurring" checked={form.isRecurring || false}
              onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
              className="w-4 h-4 accent-primary" />
            <label htmlFor="recurring" className="text-sm text-foreground flex-1">Återkommande task</label>
            {form.isRecurring && (
              <select value={form.recurringInterval} onChange={e => setForm({ ...form, recurringInterval: e.target.value })}
                className="text-xs border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20 bg-card text-foreground">
                <option value="">Välj interval</option>
                <option value="weekly">Veckovis</option>
                <option value="monthly">Månadsvis</option>
              </select>
            )}
          </div>
        </HModal>
      )}

      {confirmDel !== null && (
        <HConfirmDialog title="Radera task?" message="Ej åtgärdbart." onConfirm={deleteTask} onClose={() => setConfirmDel(null)} />
      )}
    </div>
  )
}

interface TaskRowProps {
  task: CrmTask
  expandedId: number | null
  setExpandedId: (id: number | null) => void
  moveStatus: (id: number, status: string) => void
  cyclePriority: (id: number) => void
  openEdit: (t: CrmTask) => void
  setConfirmDel: (id: number) => void
  archiveTask: (id: number) => void
  addComment: (taskId: number) => void
  commentText: string
  setCommentText: (v: string) => void
}

function TaskRow({ task, expandedId, setExpandedId, moveStatus, cyclePriority, openEdit, setConfirmDel, archiveTask, addComment, commentText, setCommentText }: TaskRowProps) {
  const expanded = expandedId === task.id
  const overdue  = isOverdue(task)
  const archived = !!task.archivedAt

  return (
    <div className={`border-b border-border/50 last:border-0 ${overdue ? "border-l-2 border-l-red-400" : ""}`}>
      <div className="flex items-center gap-3 py-2.5 px-4 hover:bg-muted/40 transition-colors group">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-red-500" : TASK_STATUS[task.status]?.dot}`} />

        <button onClick={() => setExpandedId(expanded ? null : task.id)} className="flex-1 min-w-0 text-left flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${overdue ? "text-red-700" : "text-foreground"}`}>{task.title}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">· {task.clientName}</span>
          {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
          {(task.comments || []).length > 0 && <MessageCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
        </button>

        {task.dueDate && (
          <span className={`text-xs whitespace-nowrap flex-shrink-0 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
            {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}{task.dueDate}
          </span>
        )}

        <button onClick={() => cyclePriority(task.id)}
          className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 cursor-pointer transition-all hover:opacity-80 ${PRIORITY[task.priority]?.style}`}>
          {PRIORITY[task.priority]?.label}
        </button>

        {!archived && (
          <select value={task.status} onChange={e => moveStatus(task.id, e.target.value)}
            className={`text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0 cursor-pointer focus:outline-none border-0 ${TASK_STATUS[task.status]?.color}`}>
            {ALL_TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS[s]?.label}</option>)}
          </select>
        )}

        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!archived && <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>}
          {!archived && task.status === "klar" && <button onClick={() => archiveTask(task.id)} title="Arkivera" className="text-muted-foreground hover:text-foreground"><Archive className="w-3.5 h-3.5" /></button>}
          <button onClick={() => setConfirmDel(task.id)} className="text-muted-foreground hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {expanded && (
        <div className="px-9 pb-4 space-y-3 bg-muted/30">
          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
            {task.assignee && <span>Ansvarig: <span className="text-foreground font-medium">{task.assignee}</span></span>}
            <span>Skapad: {task.created}</span>
            {task.completedDate && <span className="text-emerald-600">Klar: {task.completedDate}</span>}
            {task.isRecurring && <span className="text-amber-600">Återkommande ({task.recurringInterval === "weekly" ? "veckovis" : "månadsvis"})</span>}
          </div>

          {(task.comments || []).length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              {task.comments.map((c, i) => (
                <div key={i} className="text-xs text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                  <span className="text-muted-foreground mr-2">{c.date}</span>{c.text}
                </div>
              ))}
            </div>
          )}

          {!archived && (
            <div className="flex gap-2 pt-1">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addComment(task.id)}
                placeholder="Lägg till en uppdatering..."
                className="flex-1 text-xs border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20 bg-card text-foreground"
              />
              <button onClick={() => addComment(task.id)}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                Lägg till
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

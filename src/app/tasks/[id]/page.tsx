"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useTask } from "@/components/providers/TaskProvider"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { OB_STEG } from "@/lib/data"
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/task-types"
import type { Task, TaskStatus, TaskNote } from "@/lib/task-types"
import { TEAM_MEDLEMMAR, TEAM_FARGER } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, CheckSquare, Calendar, User, Building2,
  Flag, MessageSquare, Send, Pencil, Check, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: TaskStatus[] = ["not_started", "in_progress", "done", "blocked"]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just nu"
  if (m < 60) return `${m} min sedan`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} tim sedan`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} dag${d > 1 ? "ar" : ""} sedan`
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}

function parseMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) ?? []
  return matches.map(m => m.slice(1))
}

function renderNoteText(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-primary font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// ── Status dropdown ────────────────────────────────────────────────────────────

function StatusDropdown({ status, onChange }: { status: TaskStatus; onChange: (s: TaskStatus) => void }) {
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
        className={cn(
          "text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap hover:opacity-80 transition-opacity",
          STATUS_COLORS[status]
        )}
      >
        {STATUS_LABELS[status]}
      </button>
      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
            >
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                s === "not_started" ? "bg-gray-400" :
                s === "in_progress" ? "bg-blue-500" :
                s === "done" ? "bg-teal-500" : "bg-red-500"
              )} />
              {STATUS_LABELS[s]}
              {s === status && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline editable field ──────────────────────────────────────────────────────

function InlineField({ value, onSave, multiline, placeholder, className }: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  if (editing) {
    if (multiline) {
      return (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder={placeholder}
          />
          <div className="flex gap-2">
            <button onClick={commit} className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:opacity-80">
              <Check className="w-3 h-3" /> Spara
            </button>
            <button onClick={() => { setDraft(value); setEditing(false) }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50">
              <X className="w-3 h-3" /> Avbryt
            </button>
          </div>
        </div>
      )
    }
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false) } }}
        className={cn("w-full bg-transparent border-b border-primary focus:outline-none", className)}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className={cn("text-left group flex items-start gap-2 hover:opacity-80 transition-opacity w-full", className)}
    >
      <span className={value ? "" : "text-muted-foreground italic"}>{value || placeholder || "Klicka för att redigera"}</span>
      <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity mt-1" />
    </button>
  )
}

// ── @mention textarea ──────────────────────────────────────────────────────────

function MentionTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const members = TEAM_MEDLEMMAR.filter(m => m !== "Ingen")

  const suggestions = mentionQuery
    ? members.filter(m => m.toLowerCase().startsWith(mentionQuery.toLowerCase()))
    : members

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    onChange(v)
    const cursor = e.target.selectionStart
    const textBefore = v.slice(0, cursor)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  function insertMention(name: string) {
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const textBefore = value.slice(0, cursor)
    const atIdx = textBefore.lastIndexOf("@")
    const newText = value.slice(0, atIdx) + `@${name} ` + value.slice(cursor)
    onChange(newText)
    setShowSuggestions(false)
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = atIdx + name.length + 2
        textareaRef.current.setSelectionRange(pos, pos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        rows={3}
        placeholder="Skriv en anteckning... Använd @ för att tagga"
        className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-lg py-1 w-48">
          {suggestions.map(m => (
            <button
              key={m}
              onMouseDown={e => { e.preventDefault(); insertMention(m) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors text-left"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: TEAM_FARGER[m] ?? "#9CA3AF" }}
              >
                {m[0]}
              </div>
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { tasks, updateTask, addNote } = useTask()
  const { db } = useDB()

  const taskId = Number(params.id)
  const isOBId = taskId < 4_000_000

  // For OB tasks, recompute virtual task
  const obVirtualTask = useMemo<Task | undefined>(() => {
    if (!isOBId) return undefined
    for (const client of db.clients) {
      let localIdx = 0
      for (const step of OB_STEG) {
        for (const t of step.tasks) {
          const id = client.id * 100_000 + localIdx
          if (id === taskId) {
            const isDone = (db.obState[client.id] ?? {})[t.id] ?? false
            return {
              id,
              title: t.text,
              description: `__OB__:${client.id}:${t.id}:Steg ${step.n}: ${step.title}`,
              assignee: t.who,
              kundId: client.id,
              startDate: "",
              endDate: "",
              status: isDone ? "done" : "not_started",
              priority: "",
              createdAt: "",
              notes: [],
            }
          }
          localIdx++
        }
      }
    }
    return undefined
  }, [taskId, isOBId, db.clients, db.obState])

  const task = isOBId ? obVirtualTask : tasks.find(t => t.id === taskId)

  const [noteText, setNoteText] = useState("")

  if (!task) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Task hittades inte.</p>
          <Link href="/tasks" className="text-primary text-sm mt-2 inline-block hover:underline">← Tillbaka till Tasks</Link>
        </div>
      </main>
    )
  }

  const kundName = db.clients.find(c => c.id === task.kundId)?.name ?? ""
  const color = TEAM_FARGER[task.assignee] ?? "#9CA3AF"
  const isOB = isOBId

  function handleStatusChange(status: TaskStatus) {
    if (isOB || !task) return
    updateTask(task.id, { status })
  }

  function handleAddNote() {
    if (!noteText.trim() || !user?.name || isOB || !task) return
    const note: TaskNote = {
      id: String(Date.now()),
      author: user.name,
      text: noteText.trim(),
      mentions: parseMentions(noteText),
      createdAt: new Date().toISOString(),
    }
    addNote(task.id, note)
    setNoteText("")
  }

  const PRIORITY_LABELS: Record<string, string> = {
    low: "Låg", medium: "Medium", high: "Hög",
  }
  const PRIORITY_COLORS: Record<string, string> = {
    low: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
    medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
    high: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
  }

  const obStepTitle = isOB && task.description.startsWith("__OB__:")
    ? task.description.split(":").slice(3).join(":")
    : null

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Tillbaka till Tasks</span>
        </button>
        <div className="flex items-center gap-2">
          {isOB ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
              <CheckSquare className="w-3 h-3" />
              Onboarding-uppgift
            </span>
          ) : (
            <StatusDropdown status={task.status} onChange={handleStatusChange} />
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Title */}
        <div>
          {isOB ? (
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          ) : (
            <InlineField
              value={task.title}
              onSave={v => updateTask(task.id, { title: v })}
              placeholder="Uppgiftstitel"
              className="text-2xl font-bold text-foreground w-full"
            />
          )}
          {obStepTitle && (
            <p className="text-sm text-muted-foreground mt-1">{obStepTitle}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3">
          {/* Kund */}
          {kundName ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <Building2 className="w-3.5 h-3.5" />
              <span>{kundName}</span>
            </div>
          ) : null}

          {/* Assignee */}
          {task.assignee ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ background: color }}
              >
                {task.assignee[0]}
              </div>
              <span>{task.assignee}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <User className="w-3.5 h-3.5" />
              <span>Ej tilldelad</span>
            </div>
          )}

          {/* Date */}
          {(task.startDate || task.endDate) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {task.startDate && task.endDate
                  ? `${task.startDate} → ${task.endDate}`
                  : task.endDate ?? task.startDate}
              </span>
            </div>
          )}

          {/* Priority */}
          {task.priority && (
            <div className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium",
              PRIORITY_COLORS[task.priority] ?? "text-muted-foreground bg-muted/50"
            )}>
              <Flag className="w-3.5 h-3.5" />
              <span>{PRIORITY_LABELS[task.priority] ?? task.priority}</span>
            </div>
          )}
        </div>

        {/* Edit fields for real tasks */}
        {!isOB && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Ansvarig</p>
              <select
                value={task.assignee}
                onChange={e => updateTask(task.id, { assignee: e.target.value })}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen</option>
                {TEAM_MEDLEMMAR.filter(m => m !== "Ingen").map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Kund</p>
              <select
                value={task.kundId ?? ""}
                onChange={e => updateTask(task.id, { kundId: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen kund</option>
                {db.clients.filter(c => c.st === "AKTIV" || c.st === "").map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Startdatum</p>
              <input
                type="date"
                value={task.startDate}
                onChange={e => updateTask(task.id, { startDate: e.target.value })}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Slutdatum</p>
              <input
                type="date"
                value={task.endDate}
                onChange={e => updateTask(task.id, { endDate: e.target.value })}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Prioritet</p>
              <select
                value={task.priority}
                onChange={e => updateTask(task.id, { priority: e.target.value as Task["priority"] })}
                className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen prioritet</option>
                <option value="low">Låg</option>
                <option value="medium">Medium</option>
                <option value="high">Hög</option>
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Beskrivning</p>
          {isOB ? (
            <p className="text-sm text-muted-foreground">{obStepTitle ?? "Onboarding-uppgift"}</p>
          ) : (
            <InlineField
              value={task.description}
              onSave={v => updateTask(task.id, { description: v })}
              multiline
              placeholder="Lägg till en beskrivning..."
              className="text-sm text-foreground"
            />
          )}
        </div>

        {/* Notes — only for real tasks */}
        {!isOB && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Anteckningar {(task.notes?.length ?? 0) > 0 && `(${task.notes!.length})`}
              </p>
            </div>

            {/* Note list */}
            <div className="space-y-3 mb-5">
              {(task.notes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Inga anteckningar ännu.</p>
              ) : (
                [...(task.notes ?? [])].reverse().map(note => {
                  const noteColor = TEAM_FARGER[note.author] ?? "#9CA3AF"
                  return (
                    <div key={note.id} className="flex gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                        style={{ background: noteColor }}
                      >
                        {note.author[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{note.author}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{renderNoteText(note.text)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Add note */}
            <div className="space-y-2">
              <MentionTextarea value={noteText} onChange={setNoteText} />
              <Button
                size="sm"
                disabled={!noteText.trim()}
                onClick={handleAddNote}
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Lägg till anteckning
              </Button>
            </div>
          </div>
        )}

        {isOB && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Onboarding-uppgifter hanteras på <Link href="/onboarding" className="text-primary hover:underline">Onboarding-sidan</Link>. Status kan ändras därifrån eller direkt i tasks-listan.
          </div>
        )}
      </div>
    </main>
  )
}

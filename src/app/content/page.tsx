"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useDB } from "@/lib/store"
import { useCf } from "@/components/providers/CfProvider"
import type { CFClientState, CFCard, CFCardComment, CFColumn } from "@/lib/contentflow-types"
import { cn } from "@/lib/utils"
import { Plus, X, Trash2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Constants ────────────────────────────────────────────────────────────────

const KB_BG = [
  "bg-violet-50 dark:bg-violet-950/30",
  "bg-sky-50 dark:bg-sky-950/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-rose-50 dark:bg-rose-950/30",
  "bg-indigo-50 dark:bg-indigo-950/30",
  "bg-teal-50 dark:bg-teal-950/30",
]

const KB_FG = [
  "text-violet-700 dark:text-violet-300",
  "text-sky-700 dark:text-sky-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-amber-700 dark:text-amber-300",
  "text-rose-700 dark:text-rose-300",
  "text-indigo-700 dark:text-indigo-300",
  "text-teal-700 dark:text-teal-300",
]

const DEFAULT_COLUMNS = ["Ideer", "Planerat", "Filmning", "Klippning", "Publicerat"]

type CardStatus = "idea" | "planned" | "filming" | "editing" | "published"

const STATUS_OPTS: { value: CardStatus; label: string; color: string }[] = [
  { value: "idea",      label: "Idé",        color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  { value: "planned",   label: "Planerat",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "filming",   label: "Filmning",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "editing",   label: "Klippning",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  { value: "published", label: "Publicerat", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
]

function statusColor(s?: CardStatus) {
  return STATUS_OPTS.find((o) => o.value === s)?.color ?? STATUS_OPTS[0].color
}
function statusLabel(s?: CardStatus) {
  return STATUS_OPTS.find((o) => o.value === s)?.label ?? "Idé"
}

// ─── Default state helpers ────────────────────────────────────────────────────

const DEFAULT_CF_STATE: CFClientState = {
  s: "scheduled",
  qc: [],
  qn: "",
  rev: 0,
  contentBoard: { columns: [] },
  contentTable: [],
  assignee: null,
  deliveredAt: null,
}

let _nextId = Date.now()
function newId() { return ++_nextId }

function makeDefaultColumns(): CFColumn[] {
  return DEFAULT_COLUMNS.map((label) => ({ id: newId(), label, cards: [] }))
}

// ─── Card Panel ───────────────────────────────────────────────────────────────

interface CardPanelProps {
  card: CFCard
  columnLabel: string
  onSave: (updated: CFCard) => void
  onDelete: () => void
  onClose: () => void
}

function CardPanel({ card, columnLabel, onSave, onDelete, onClose }: CardPanelProps) {
  const [title, setTitle] = useState(card.title)
  const [hook, setHook] = useState(card.hook ?? "")
  const [notes, setNotes] = useState(card.notes)
  const [status, setStatus] = useState<CardStatus>(card.status ?? "idea")
  const [assignee, setAssignee] = useState(card.assignee ?? "")
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<CFCardComment[]>(card.comments ?? [])
  const notesRef = useRef<HTMLTextAreaElement>(null)

  function save() {
    onSave({ ...card, title: title.trim() || card.title, hook, notes, status, assignee: assignee.trim(), comments })
  }

  function addComment() {
    if (!commentText.trim()) return
    const c: CFCardComment = {
      id: newId(),
      text: commentText.trim(),
      author: "Team",
      createdAt: new Date().toISOString(),
    }
    setComments((prev) => [...prev, c])
    setCommentText("")
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-card border-l border-border shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{columnLabel}</p>
            <input
              className="text-base font-semibold text-foreground bg-transparent outline-none w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              placeholder="Titel..."
            />
          </div>
          <button onClick={onClose} className="mt-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status + Assignee row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CardStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <Input
                className="h-8 text-xs"
                placeholder="Namn..."
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                onBlur={save}
              />
            </div>
          </div>

          {/* Hook */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Hook / Öppning</label>
            <Input
              className="h-8 text-xs"
              placeholder="Hur börjar videon..."
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              onBlur={save}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
            <Textarea
              ref={notesRef}
              className="text-xs resize-none min-h-[120px]"
              placeholder="Manus, kameravinklar, produktlista, koncept..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={save}
              rows={6}
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">Kommentarer</label>
            </div>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-foreground">{c.author}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="h-7 text-xs flex-1"
                placeholder="Skriv en kommentar..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment() } }}
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={addComment} disabled={!commentText.trim()}>
                Lägg till
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border shrink-0">
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
            Radera
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={save}>
            Spara
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────────────

function ContentBoard() {
  const searchParams = useSearchParams()
  const { db } = useDB()
  const { cfState, updateCfClient } = useCf()

  const activeClients = db.clients.filter((c) => c.st === "AKTIV" || c.st === "")

  // Auto-select from URL param or first client
  const paramClientId = searchParams.get("client") ? Number(searchParams.get("client")) : null
  const defaultId = paramClientId ?? activeClients[0]?.id ?? null
  const [selectedId, setSelectedId] = useState<number | null>(defaultId)

  useEffect(() => {
    if (paramClientId !== null) setSelectedId(paramClientId)
  }, [paramClientId])

  // Board state for selected client
  const clientState = selectedId !== null ? (cfState[selectedId] ?? DEFAULT_CF_STATE) : DEFAULT_CF_STATE
  const columns: CFColumn[] = useMemo(
    () => clientState.contentBoard.columns.length > 0
      ? clientState.contentBoard.columns
      : makeDefaultColumns(),
    [clientState.contentBoard.columns]
  )

  const [dragging, setDragging] = useState<{ colId: number; cardId: number } | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [selectedCard, setSelectedCard] = useState<{ colId: number; card: CFCard } | null>(null)
  const [editingColId, setEditingColId] = useState<number | null>(null)
  const [editingColLabel, setEditingColLabel] = useState("")

  function saveColumns(newCols: CFColumn[]) {
    if (selectedId === null) return
    updateCfClient(selectedId, {
      ...clientState,
      contentBoard: { columns: newCols },
    })
  }

  // ── Column operations ──────────────────────────────────────────────────────

  function addColumn() {
    const label = window.prompt("Kolumnnamn:")
    if (!label?.trim()) return
    const maxId = columns.reduce((m, c) => Math.max(m, c.id), 0)
    saveColumns([...columns, { id: maxId + 1, label: label.trim(), cards: [] }])
  }

  function deleteColumn(colId: number) {
    const col = columns.find((c) => c.id === colId)
    if (!col) return
    if (col.cards.length > 0 && !window.confirm(`Ta bort "${col.label}" och dess ${col.cards.length} kort?`)) return
    saveColumns(columns.filter((c) => c.id !== colId))
  }

  function renameColumn(colId: number, label: string) {
    saveColumns(columns.map((c) => c.id === colId ? { ...c, label } : c))
    setEditingColId(null)
  }

  // ── Card operations ────────────────────────────────────────────────────────

  function addCard(colId: number) {
    const newCard: CFCard = {
      id: newId(),
      title: "Nytt kort",
      notes: "",
      hook: "",
      status: "idea",
      assignee: "",
      comments: [],
      createdAt: new Date().toISOString(),
    }
    saveColumns(columns.map((c) => c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c))
    setSelectedCard({ colId, card: newCard })
  }

  function saveCard(colId: number, updated: CFCard) {
    saveColumns(columns.map((c) =>
      c.id === colId ? { ...c, cards: c.cards.map((k) => k.id === updated.id ? updated : k) } : c
    ))
    setSelectedCard({ colId, card: updated })
  }

  function deleteCard(colId: number, cardId: number) {
    saveColumns(columns.map((c) =>
      c.id === colId ? { ...c, cards: c.cards.filter((k) => k.id !== cardId) } : c
    ))
    setSelectedCard(null)
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  function onDrop(toColId: number) {
    if (!dragging) return
    if (dragging.colId === toColId) { setDragging(null); setDragOver(null); return }
    const fromCol = columns.find((c) => c.id === dragging.colId)
    const card = fromCol?.cards.find((k) => k.id === dragging.cardId)
    if (!card) return
    saveColumns(columns.map((c) => {
      if (c.id === dragging.colId) return { ...c, cards: c.cards.filter((k) => k.id !== dragging.cardId) }
      if (c.id === toColId) return { ...c, cards: [...c.cards, card] }
      return c
    }))
    setDragging(null)
    setDragOver(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Content Creation</h1>
      </div>

      {/* Client tabs */}
      <div className="px-6 py-2.5 border-b border-border shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {activeClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                selectedId === c.id
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Board toolbar */}
      <div className="px-6 py-2 border-b border-border flex items-center gap-3 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={addColumn}
        >
          <Plus className="h-3 w-3" />
          Lägg till kolumn
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        {selectedId === null ? (
          <p className="text-sm text-muted-foreground">Inga aktiva kunder.</p>
        ) : (
          <div className="flex gap-4 h-full items-start pb-6" style={{ minWidth: "max-content" }}>
            {columns.map((col, ci) => {
              const bg = KB_BG[ci % KB_BG.length]
              const fg = KB_FG[ci % KB_FG.length]
              const isOver = dragOver === col.id

              return (
                <div
                  key={col.id}
                  className={cn(
                    "w-72 shrink-0 rounded-2xl flex flex-col transition-all",
                    bg,
                    isOver && "ring-2 ring-primary/40"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(col.id)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    {editingColId === col.id ? (
                      <input
                        autoFocus
                        className="text-xs font-semibold bg-transparent outline-none flex-1 mr-2"
                        value={editingColLabel}
                        onChange={(e) => setEditingColLabel(e.target.value)}
                        onBlur={() => renameColumn(col.id, editingColLabel || col.label)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameColumn(col.id, editingColLabel || col.label)
                          if (e.key === "Escape") setEditingColId(null)
                        }}
                      />
                    ) : (
                      <button
                        className={cn("text-xs font-semibold uppercase tracking-wide truncate flex-1 text-left", fg)}
                        onDoubleClick={() => { setEditingColId(col.id); setEditingColLabel(col.label) }}
                        title="Dubbelklicka för att döpa om"
                      >
                        {col.label}
                      </button>
                    )}
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className={cn("text-[10px] font-medium opacity-60", fg)}>{col.cards.length}</span>
                      <button
                        onClick={() => deleteColumn(col.id)}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        title="Radera kolumn"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 px-2 space-y-2 min-h-[40px]">
                    {col.cards.map((card) => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDragging({ colId: col.id, cardId: card.id })}
                        onDragEnd={() => { setDragging(null); setDragOver(null) }}
                        onClick={() => setSelectedCard({ colId: col.id, card })}
                        className={cn(
                          "rounded-xl bg-card border border-border p-3 cursor-pointer hover:shadow-sm transition-all select-none space-y-1.5",
                          dragging?.cardId === card.id && "opacity-40"
                        )}
                      >
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                          {card.title || <span className="italic text-muted-foreground">Namnlöst kort</span>}
                        </p>
                        {card.hook && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                            {card.hook}
                          </p>
                        )}
                        {card.notes && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {card.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            statusColor(card.status)
                          )}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabel(card.status)}
                          </span>
                          {card.assignee && (
                            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 truncate max-w-[80px]">
                              {card.assignee}
                            </span>
                          )}
                          {(card.comments?.length ?? 0) > 0 && (
                            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <MessageSquare className="h-2.5 w-2.5" />
                              {card.comments!.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add card button */}
                  <button
                    onClick={() => addCard(col.id)}
                    className={cn(
                      "m-2 mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-colors",
                      "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Lägg till
                  </button>
                </div>
              )
            })}

            {/* Add column shortcut */}
            <button
              onClick={addColumn}
              className="w-72 shrink-0 h-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-border/60 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ny kolumn
            </button>
          </div>
        )}
      </div>

      {/* Card panel */}
      {selectedCard && (
        <CardPanel
          card={selectedCard.card}
          columnLabel={columns.find((c) => c.id === selectedCard.colId)?.label ?? ""}
          onSave={(updated) => saveCard(selectedCard.colId, updated)}
          onDelete={() => deleteCard(selectedCard.colId, selectedCard.card.id)}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}

// ─── Page wrapper (Suspense for useSearchParams) ──────────────────────────────

export default function ContentPage() {
  return (
    <Suspense>
      <ContentBoard />
    </Suspense>
  )
}

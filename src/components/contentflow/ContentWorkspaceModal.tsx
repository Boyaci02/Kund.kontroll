"use client"

import { useState } from "react"
import type { CFClient, ContentRow } from "@/lib/contentflow-types"
import { X, Plus, Trash2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Konstanter ─────────────────────────────────────────────────────────

let nextRowId = 10000

function ensureIds(rows: ContentRow[]) {
  rows.forEach(r => { if (r.id >= nextRowId) nextRowId = r.id + 1 })
}

const FORMAT_OPTIONS = ["", "Reel", "Story", "TikTok", "Shorts", "YouTube", "Övrigt"]

const FORMAT_COLORS: Record<string, string> = {
  Reel:    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Story:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  TikTok:  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Shorts:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  YouTube: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Övrigt:  "bg-muted text-muted-foreground",
}

// ── Detail panel ────────────────────────────────────────────────────────

interface DetailPanelProps {
  row: ContentRow
  onChange: (field: keyof ContentRow, value: string) => void
  onDelete: () => void
}

function DetailPanel({ row, onChange, onDelete }: DetailPanelProps) {
  const inputCls = "w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1"

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detaljer</span>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-2 py-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Ta bort
        </button>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Titel */}
        <div>
          <label className={labelCls}>Titel</label>
          <input
            value={row.title}
            onChange={e => onChange("title", e.target.value)}
            placeholder="Videons titel eller konceptnamn…"
            className={inputCls}
          />
        </div>

        {/* Format */}
        <div>
          <label className={labelCls}>Format</label>
          <select
            value={row.format}
            onChange={e => onChange("format", e.target.value)}
            className={inputCls}
          >
            {FORMAT_OPTIONS.map(f => (
              <option key={f} value={f}>{f || "— Välj format —"}</option>
            ))}
          </select>
        </div>

        {/* Publiceringsdatum */}
        <div>
          <label className={labelCls}>Publiceringsdatum</label>
          <input
            type="date"
            value={row.pubDate}
            onChange={e => onChange("pubDate", e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Hook */}
        <div>
          <label className={labelCls}>Hook</label>
          <textarea
            value={row.hook}
            onChange={e => onChange("hook", e.target.value)}
            placeholder="Öppningshook — vad som fångar tittaren direkt…"
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </div>

        {/* Anteckningar / Script */}
        <div className="flex flex-col flex-1">
          <label className={labelCls}>Anteckningar / Script</label>
          <textarea
            value={row.notes}
            onChange={e => onChange("notes", e.target.value)}
            placeholder="Script, kameravinklar, idéer, produktlista…"
            rows={6}
            className={cn(inputCls, "resize-none")}
          />
        </div>

        {/* Kommentarer */}
        <div>
          <label className={labelCls}>Kommentarer</label>
          <textarea
            value={row.comments}
            onChange={e => onChange("comments", e.target.value)}
            placeholder="Intern feedback, revidering, noteringar…"
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main modal ──────────────────────────────────────────────────────────

interface Props {
  client: CFClient
  onUpdate: (rows: ContentRow[]) => void
  onClose: () => void
}

export default function ContentWorkspaceModal({ client, onUpdate, onClose }: Props) {
  ensureIds(client.contentTable ?? [])
  const [rows, setRows] = useState<ContentRow[]>(client.contentTable ?? [])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const selectedRow = rows.find(r => r.id === selectedId) ?? null

  const save = (newRows: ContentRow[]) => {
    setRows(newRows)
    onUpdate(newRows)
  }

  const addRow = () => {
    const newRow: ContentRow = {
      id: nextRowId++,
      title: "",
      format: "",
      pubDate: "",
      hook: "",
      notes: "",
      comments: "",
    }
    const newRows = [...rows, newRow]
    save(newRows)
    setSelectedId(newRow.id)
  }

  const updateRow = (id: number, field: keyof ContentRow, value: string) => {
    save(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const deleteRow = (id: number) => {
    save(rows.filter(r => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const fmtDate = (d: string) => {
    if (!d) return "—"
    try { return new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) }
    catch { return d }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "95vw", maxWidth: "1400px", height: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <div>
            <div className="font-semibold text-foreground">{client.name} — Arbetsyta</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {rows.length} videoidé{rows.length !== 1 ? "er" : ""}
              {client.recordingDate ? ` · Inspelning: ${client.recordingDate}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <X className="w-3 h-3" /> Stäng
          </button>
        </div>

        {/* Body: table + detail panel */}
        <div className="flex flex-1 min-h-0">

          {/* Left: Table */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="w-10 px-3 py-2.5 text-left text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/40">#</th>
                    <th className="min-w-[220px] px-3 py-2.5 text-left text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/40">Titel</th>
                    <th className="w-28 px-3 py-2.5 text-left text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/40">Format</th>
                    <th className="w-28 px-3 py-2.5 text-left text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/40">Publicering</th>
                    <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide">Hook</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl opacity-20">📋</span>
                          <span>Inga videoidéer ännu</span>
                          <button
                            onClick={addRow}
                            className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-xl px-3 py-1.5 hover:bg-primary/5 transition-colors mt-1"
                          >
                            <Plus className="w-3 h-3" /> Lägg till första raden
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : rows.map((row, idx) => {
                    const isSelected = selectedId === row.id
                    const isHovered = hoveredId === row.id
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(isSelected ? null : row.id)}
                        onMouseEnter={() => setHoveredId(row.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          "border-b border-border/40 cursor-pointer transition-colors",
                          isSelected ? "bg-primary/5 dark:bg-primary/10" : isHovered ? "bg-muted/40" : "",
                        )}
                      >
                        {/* # / delete */}
                        <td className="w-10 px-1 py-0 text-center border-r border-border/40">
                          <div className="flex items-center justify-center h-10">
                            {isHovered && !isSelected ? (
                              <button
                                onClick={e => { e.stopPropagation(); deleteRow(row.id) }}
                                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className={cn("text-xs font-mono", isSelected ? "text-primary font-semibold" : "text-muted-foreground")}>
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Titel */}
                        <td className="border-r border-border/40 px-3 py-0">
                          <div className="h-10 flex items-center">
                            <span className={cn("text-sm truncate max-w-[200px]", row.title ? "text-foreground font-medium" : "text-muted-foreground/50 italic")}>
                              {row.title || "Utan titel…"}
                            </span>
                          </div>
                        </td>

                        {/* Format */}
                        <td className="border-r border-border/40 px-3 py-0">
                          <div className="h-10 flex items-center">
                            {row.format ? (
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", FORMAT_COLORS[row.format] ?? "bg-muted text-muted-foreground")}>
                                {row.format}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </div>
                        </td>

                        {/* Datum */}
                        <td className="border-r border-border/40 px-3 py-0">
                          <div className="h-10 flex items-center">
                            <span className="text-xs text-muted-foreground">{fmtDate(row.pubDate)}</span>
                          </div>
                        </td>

                        {/* Hook (truncated) */}
                        <td className="px-3 py-0">
                          <div className="h-10 flex items-center">
                            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {row.hook || <span className="opacity-30 italic">Ingen hook…</span>}
                            </span>
                          </div>
                        </td>

                        {/* Expand indicator */}
                        <td className="px-1 py-0">
                          <div className="h-10 flex items-center justify-center">
                            <ChevronRight className={cn("w-3.5 h-3.5 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/30")} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add row footer */}
            <div className="shrink-0 border-t border-border px-4 py-2 bg-muted/10">
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3 h-3" /> Lägg till rad
              </button>
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="w-[360px] shrink-0 border-l border-border bg-muted/5 flex flex-col">
            {selectedRow ? (
              <DetailPanel
                row={selectedRow}
                onChange={(field, value) => updateRow(selectedRow.id, field, value)}
                onDelete={() => deleteRow(selectedRow.id)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 text-muted-foreground gap-3">
                <span className="text-3xl opacity-20">←</span>
                <p className="text-sm">Klicka på en rad för att redigera detaljer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

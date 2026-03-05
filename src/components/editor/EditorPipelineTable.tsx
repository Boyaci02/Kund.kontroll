"use client"

import { useState } from "react"
import { Plus, Trash2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EditorRow, EditorStatus, ApprovedStatus } from "@/lib/editor-types"
import {
  STATUS_COLORS, APPROVED_COLORS,
  STATUS_OPTIONS, APPROVED_OPTIONS,
  newRow,
} from "@/lib/editor-types"

// ── Cell components ───────────────────────────────────────────────────────────

function StatusSelect({ value, onChange }: { value: EditorStatus; onChange: (v: EditorStatus) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as EditorStatus)}
      className={cn(
        "w-full text-xs font-semibold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent",
        value ? STATUS_COLORS[value] : "text-muted-foreground bg-muted/40"
      )}
    >
      {STATUS_OPTIONS.map(s => (
        <option key={s} value={s}>{s || "— Status —"}</option>
      ))}
    </select>
  )
}

function ApprovedSelect({ value, onChange }: { value: ApprovedStatus; onChange: (v: ApprovedStatus) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ApprovedStatus)}
      className={cn(
        "w-full text-xs font-semibold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent",
        value ? APPROVED_COLORS[value] : "text-muted-foreground bg-muted/40"
      )}
    >
      {APPROVED_OPTIONS.map(s => (
        <option key={s} value={s}>{s || "— —"}</option>
      ))}
    </select>
  )
}

function DateCell({ value, onChange, warn }: { value: string; onChange: (v: string) => void; warn?: boolean }) {
  const isOverdue = warn && value && new Date(value) < new Date()
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "w-full text-xs rounded-lg px-2 py-1.5 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30",
        isOverdue && "border-red-400 text-red-500"
      )}
    />
  )
}

function TextCell({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs rounded-lg px-2 py-1.5 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
    />
  )
}

function LinkCell({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "https://…"}
        className="flex-1 text-xs rounded-lg px-2 py-1.5 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 min-w-0"
      />
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  rows: EditorRow[]
  onChange: (rows: EditorRow[]) => void
  compact?: boolean  // true = max 5 rows (for kundkort)
}

export default function EditorPipelineTable({ rows, onChange, compact }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const displayed = compact ? rows.slice(0, 5) : rows

  function update(id: number, patch: Partial<EditorRow>) {
    onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function addRow() {
    onChange([...rows, newRow()])
  }

  function deleteRow(id: number) {
    onChange(rows.filter(r => r.id !== id))
  }

  const thCls = "text-left text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2 whitespace-nowrap border-r border-border/40 last:border-r-0"

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/60 border-b border-border">
              <th className={cn(thCls, "w-16")}>Video #</th>
              <th className={cn(thCls, "min-w-[160px]")}>Status</th>
              <th className={cn(thCls, "min-w-[160px]")}>Kommentarer</th>
              <th className={cn(thCls, "min-w-[130px]")}>Approved</th>
              <th className={cn(thCls, "w-32")}>Material Uploaded</th>
              <th className={cn(thCls, "w-32")}>Deadline</th>
              <th className={cn(thCls, "min-w-[160px]")}>Video Bank</th>
              <th className={cn(thCls, "min-w-[160px]")}>Feedback & Done</th>
              <th className={cn(thCls, "min-w-[160px]")}>Link to Social</th>
              <th className="w-8 px-1" />
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-xs text-muted-foreground">
                  Inga videos ännu — lägg till en rad nedan
                </td>
              </tr>
            ) : displayed.map((row, idx) => (
              <tr
                key={row.id}
                onMouseEnter={() => setHoveredId(row.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="border-b border-border/40 hover:bg-muted/20 transition-colors"
              >
                {/* Video # */}
                <td className="px-2 py-1.5 border-r border-border/40">
                  <span className="text-xs font-mono text-muted-foreground">Video {idx + 1}</span>
                </td>
                {/* Status */}
                <td className="px-1 py-1 border-r border-border/40">
                  <StatusSelect value={row.status} onChange={v => update(row.id, { status: v })} />
                </td>
                {/* Kommentarer */}
                <td className="px-1 py-1 border-r border-border/40">
                  <TextCell value={row.comments} onChange={v => update(row.id, { comments: v })} placeholder="Kommentar…" />
                </td>
                {/* Approved */}
                <td className="px-1 py-1 border-r border-border/40">
                  <ApprovedSelect value={row.approved} onChange={v => update(row.id, { approved: v })} />
                </td>
                {/* Material date */}
                <td className="px-1 py-1 border-r border-border/40">
                  <DateCell value={row.materialDate} onChange={v => update(row.id, { materialDate: v })} />
                </td>
                {/* Deadline */}
                <td className="px-1 py-1 border-r border-border/40">
                  <DateCell value={row.deadline} onChange={v => update(row.id, { deadline: v })} warn />
                </td>
                {/* Video Bank */}
                <td className="px-1 py-1 border-r border-border/40">
                  <LinkCell value={row.linkBank} onChange={v => update(row.id, { linkBank: v })} placeholder="Video bank…" />
                </td>
                {/* Feedback & Done */}
                <td className="px-1 py-1 border-r border-border/40">
                  <LinkCell value={row.linkFeedback} onChange={v => update(row.id, { linkFeedback: v })} placeholder="Feedback link…" />
                </td>
                {/* Link to Social */}
                <td className="px-1 py-1 border-r border-border/40">
                  <LinkCell value={row.linkSocial} onChange={v => update(row.id, { linkSocial: v })} placeholder="Social link…" />
                </td>
                {/* Delete */}
                <td className="px-1 py-1 text-center">
                  {hoveredId === row.id && (
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="border-t border-border px-3 py-2 bg-muted/10">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" /> Lägg till video
          </button>
        </div>
      )}
    </div>
  )
}

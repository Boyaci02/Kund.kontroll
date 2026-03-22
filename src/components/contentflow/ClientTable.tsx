"use client"

import { useState, useRef, useEffect } from "react"
import { cfDLeft, cfGetList, contentDeadline, STATUS_LABELS, STATUS_STYLES, QC_ITEMS } from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFFilter, CFSortCol, CFTeam } from "@/lib/contentflow-types"
import { ArrowUpDown, ChevronUp, ChevronDown, LayoutGrid, Grid3X3, ExternalLink, Table2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const WEEK_COLORS: Record<string, string> = {
  v1: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  v2: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  v3: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  v4: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

interface Props {
  clients: CFClient[]
  team: CFMember[]
  fil: CFFilter
  q: string
  sortCol: CFSortCol
  sortDir: 1 | -1
  filterAssignee: number | null
  filterTeam: CFTeam | null
  onSort: (col: CFSortCol) => void
  onAdvance: (id: number, to: "inprogress" | "review") => void
  onNewCycle: (id: number) => void
  onReview: (id: number) => void
  onEdit: (id: number) => void
  onBoard: (id: number) => void
  onWorkspace: (id: number) => void
  onAssigneeChange: (clientId: number, assigneeId: number | null) => void
}

function SortIcon({ col, sortCol, sortDir }: { col: CFSortCol; sortCol: CFSortCol; sortDir: 1 | -1 }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 1 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function InlineAssignee({
  clientId, clientAssignee, team, onChange,
}: {
  clientId: number
  clientAssignee: number | null
  team: CFMember[]
  onChange: (clientId: number, assigneeId: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const m = team.find(x => x.id === clientAssignee)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 group hover:bg-muted/60 rounded-lg px-1.5 py-0.5 transition-colors"
      >
        {m ? (
          <>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.55rem] font-bold shrink-0" style={{ background: m.color }}>
              {m.name[0]}
            </span>
            <span className="text-xs font-medium text-foreground">{m.name}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">— Ingen —</span>
        )}
        <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-40 bg-popover border border-border rounded-xl shadow-lg py-1 text-sm">
          <button
            onClick={() => { onChange(clientId, null); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors text-muted-foreground text-xs"
          >
            — Ingen —
          </button>
          {team.map(tm => (
            <button
              key={tm.id}
              onClick={() => { onChange(clientId, tm.id); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors flex items-center gap-2"
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[0.5rem] font-bold shrink-0" style={{ background: tm.color }}>
                {tm.name[0]}
              </span>
              <span className="text-xs">{tm.name}</span>
              {clientAssignee === tm.id && <span className="ml-auto text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientTable({
  clients, team, fil, q, sortCol, sortDir, filterAssignee, filterTeam,
  onSort, onAdvance, onNewCycle, onReview, onEdit, onBoard, onWorkspace, onAssigneeChange,
}: Props) {
  const list = cfGetList(clients, fil, q, sortCol, sortDir, filterAssignee, filterTeam)

  const thCls = (col: CFSortCol) =>
    cn("text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 cursor-pointer hover:text-foreground transition-colors select-none",
      sortCol === col && "text-foreground")

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Grid3X3 className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">Inga kunder matchar filtret</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 w-8">#</th>
            <th className={thCls("name")} onClick={() => onSort("name")}>
              <span className="flex items-center gap-1">Kund <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("status")} onClick={() => onSort("status")}>
              <span className="flex items-center gap-1">Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("recording")} onClick={() => onSort("recording")}>
              <span className="flex items-center gap-1">Inspelning <SortIcon col="recording" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("due")} onClick={() => onSort("due")}>
              <span className="flex items-center gap-1">Content klar <SortIcon col="due" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("week")} onClick={() => onSort("week")}>
              <span className="flex items-center gap-1">Vecka <SortIcon col="week" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Team</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Ansvarig</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">QC</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => {
            const dl = cfDLeft(c)
            const done = c.s === "delivered"
            const isOverdue = !done && dl !== Infinity && dl < 0
            const isCrit   = !done && dl !== Infinity && dl >= 0 && dl <= 7
            const cdl = contentDeadline(c.recordingDate)
            const cdlFmt = cdl ? cdl.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "—"

            return (
              <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-mono text-muted-foreground", isOverdue && "text-red-500 font-bold", isCrit && "text-amber-500 font-semibold")}>
                    {done ? "—" : i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{c.name}</div>
                  {c.tag && <div className="text-xs text-muted-foreground">{c.tag}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_STYLES[c.s])}>
                    {STATUS_LABELS[c.s]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-foreground">{c.recordingDate || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  {done ? (
                    <span className="text-xs text-teal-500 font-medium">Levererat ✓</span>
                  ) : dl === Infinity ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div>
                      <div className="text-xs text-foreground">{cdlFmt}</div>
                      <div className={cn("text-xs", isOverdue ? "text-red-500" : isCrit ? "text-amber-500" : "text-muted-foreground")}>
                        {isOverdue ? `${Math.abs(dl)}d försenat` : `${dl}d kvar`}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.weekSlot ? (
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", WEEK_COLORS[c.weekSlot] ?? "bg-muted text-muted-foreground")}>
                      {c.weekSlot.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {c.vg && <span className="text-xs"><span className="font-medium text-foreground">{c.vg}</span> <span className="text-muted-foreground opacity-60">vg</span></span>}
                    {c.ed && <span className="text-xs"><span className="font-medium text-foreground">{c.ed}</span> <span className="text-muted-foreground opacity-60">ed</span></span>}
                    {c.cc && <span className="text-xs"><span className="font-medium text-foreground">{c.cc}</span> <span className="text-muted-foreground opacity-60">cc</span></span>}
                    {!c.vg && !c.ed && !c.cc && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <InlineAssignee clientId={c.id} clientAssignee={c.assignee} team={team} onChange={onAssigneeChange} />
                </td>
                <td className="px-4 py-3">
                  {c.s === "review" ? (
                    <div>
                      <span className="text-xs text-violet-600 font-medium">{c.qc.length}/{QC_ITEMS.length}</span>
                      <div className="text-xs text-muted-foreground">Inväntar</div>
                    </div>
                  ) : c.s === "delivered" ? (
                    <div>
                      <span className="text-xs text-teal-600 font-medium">✓ OK</span>
                      {c.rev > 0 && <div className="text-xs text-muted-foreground">{c.rev} rev.</div>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {c.s === "scheduled"  && <button onClick={() => onAdvance(c.id, "inprogress")} className="text-xs border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors text-foreground">▷ Start</button>}
                    {c.s === "inprogress" && <button onClick={() => onAdvance(c.id, "review")}     className="text-xs border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors text-foreground">→ Submit</button>}
                    {c.s === "review"     && <button onClick={() => onReview(c.id)}                className="text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-lg px-2.5 py-1 hover:bg-violet-200 transition-colors font-medium">◎ Review</button>}
                    {c.s === "delivered"  && <button onClick={() => onNewCycle(c.id)}              className="text-xs bg-teal-100 text-teal-700 border border-teal-200 rounded-lg px-2.5 py-1 hover:bg-teal-200 transition-colors font-medium">↺ Ny cykel</button>}
                    <button onClick={() => onWorkspace(c.id)} title="Arbetsyta" className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors">
                      <Table2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => onBoard(c.id)} title="Content Board" className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors">
                      <LayoutGrid className="w-3 h-3" />
                    </button>
                    <button onClick={() => onEdit(c.id)} title="CF-status" className="text-xs border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors">✎</button>
                    <Link href="/kunder" title="Redigera kund" className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors inline-flex items-center">
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

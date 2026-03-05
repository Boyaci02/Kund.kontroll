"use client"

import { cfDLeft, cfNextDue, cfPct, cfGetList, STATUS_LABELS, STATUS_STYLES, QC_ITEMS } from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFFilter, CFSortCol } from "@/lib/contentflow-types"
import { ArrowUpDown, ChevronUp, ChevronDown, LayoutGrid, Download, Grid3X3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  clients: CFClient[]
  team: CFMember[]
  fil: CFFilter
  q: string
  sortCol: CFSortCol
  sortDir: 1 | -1
  filterAssignee: number | null
  onSort: (col: CFSortCol) => void
  onAdvance: (id: number, to: "inprogress" | "review") => void
  onNewCycle: (id: number) => void
  onReview: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onBoard: (id: number) => void
  onDownloadPdf: (id: number) => void
}

function SortIcon({ col, sortCol, sortDir }: { col: CFSortCol; sortCol: CFSortCol; sortDir: 1 | -1 }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 1 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function MemberChip({ clientAssignee, team }: { clientAssignee: number | null; team: CFMember[] }) {
  const m = team.find(x => x.id === clientAssignee)
  if (!m) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.55rem] font-bold shrink-0" style={{ background: m.color }}>
        {m.name[0]}
      </span>
      <span className="text-xs font-medium text-foreground">{m.name}</span>
    </span>
  )
}

export default function ClientTable({
  clients, team, fil, q, sortCol, sortDir, filterAssignee,
  onSort, onAdvance, onNewCycle, onReview, onEdit, onDelete, onBoard, onDownloadPdf,
}: Props) {
  const list = cfGetList(clients, fil, q, sortCol, sortDir, filterAssignee)

  const thCls = (col: CFSortCol) =>
    cn("text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 cursor-pointer hover:text-foreground transition-colors select-none",
      sortCol === col && "text-foreground")

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Grid3X3 className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">Inga klienter matchar filtret</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 w-10">#</th>
            <th className={thCls("name")} onClick={() => onSort("name")}>
              <span className="flex items-center gap-1">Klient <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("status")} onClick={() => onSort("status")}>
              <span className="flex items-center gap-1">Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Tilldelad</th>
            <th className={thCls("due")} onClick={() => onSort("due")}>
              <span className="flex items-center gap-1">Nästa datum <SortIcon col="due" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className={thCls("cycle")} onClick={() => onSort("cycle")}>
              <span className="flex items-center gap-1">Dagar kvar <SortIcon col="cycle" sortCol={sortCol} sortDir={sortDir} /></span>
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">QC</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => {
            const dl = cfDLeft(c)
            const pp = cfPct(c)
            const done = c.s === "delivered"
            const isOverdue = !done && dl < 0
            const isCrit = !done && dl <= 7
            const nextDue = cfNextDue(c)
            const dueFmt = nextDue.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })

            return (
              <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-mono text-muted-foreground", isOverdue && "text-red-500 font-bold", isCrit && !isOverdue && "text-amber-500 font-semibold")}>
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
                  <MemberChip clientAssignee={c.assignee} team={team} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground">{dueFmt}</div>
                  <div className={cn("text-xs", done ? "text-teal-500" : isOverdue ? "text-red-500" : dl <= 14 ? "text-amber-500" : "text-muted-foreground")}>
                    {done ? "Levererat ✓" : isOverdue ? `${Math.abs(dl)}d försenat` : `${dl}d kvar`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {done ? (
                    <span className="text-xs text-teal-500 font-medium">Levererat ✓</span>
                  ) : (
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <div className={cn("text-sm font-semibold", isOverdue ? "text-red-500" : dl <= 67 ? "text-red-500" : "text-teal-500")}>
                        {isOverdue ? `${Math.abs(dl)}d` : `${dl}d`}
                      </div>
                      <div className="h-1 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", dl <= 67 ? "bg-red-400" : "bg-teal-500")}
                          style={{ width: `${Math.min(100, pp)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.s === "review" ? (
                    <div>
                      <span className="text-xs text-violet-600 font-medium">{c.qc.length}/{QC_ITEMS.length} checkade</span>
                      <div className="text-xs text-muted-foreground">Inväntar granskning</div>
                    </div>
                  ) : c.s === "delivered" ? (
                    <div>
                      <span className="text-xs text-teal-600 font-medium">✓ Godkänd</span>
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
                    {c.pdf && (
                      <button onClick={() => onDownloadPdf(c.id)} title={c.pdf.name} className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors">
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => onBoard(c.id)} title="Content Board" className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors">
                      <LayoutGrid className="w-3 h-3" />
                    </button>
                    <button onClick={() => onEdit(c.id)} className="text-xs border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors">✎</button>
                    <button onClick={() => onDelete(c.id)} className="text-xs border border-red-200 text-red-500 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors">✕</button>
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

"use client"

import { cfDLeft, cfGetList, STATUS_LABELS } from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFFilter, CFSortCol } from "@/lib/contentflow-types"
import { LayoutGrid, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEK_COLORS: Record<string, string> = {
  v1: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  v2: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  v3: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  v4: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

const BOARD_COLS = ["scheduled", "inprogress", "review", "delivered"] as const
const COL_COLORS: Record<string, string> = {
  scheduled:  "text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "text-sky-600   bg-sky-100   dark:bg-sky-900/40   dark:text-sky-300",
  review:     "text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-300",
  delivered:  "text-teal-600  bg-teal-100  dark:bg-teal-900/40  dark:text-teal-300",
}

interface Props {
  clients: CFClient[]
  team: CFMember[]
  fil: CFFilter
  q: string
  sortCol: CFSortCol
  sortDir: 1 | -1
  filterAssignee: number | null
  onAdvance: (id: number, to: "inprogress" | "review") => void
  onNewCycle: (id: number) => void
  onReview: (id: number) => void
  onEdit: (id: number) => void
  onBoard: (id: number) => void
  onWorkspace: (id: number) => void
}

export default function ClientBoard({
  clients, team, fil, q, sortCol, sortDir, filterAssignee,
  onAdvance, onNewCycle, onReview, onEdit, onBoard, onWorkspace,
}: Props) {
  const list = cfGetList(clients, fil, q, sortCol, sortDir, filterAssignee)

  return (
    <div className="flex gap-4 p-6 overflow-x-auto min-h-[400px]">
      {BOARD_COLS.map(col => {
        const cards = list.filter(c => c.s === col)
        return (
          <div key={col} className="flex flex-col min-w-[260px] w-[260px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{STATUS_LABELS[col]}</h3>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", COL_COLORS[col])}>{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground opacity-50">
                  Tom
                </div>
              ) : cards.map(c => {
                const dl = cfDLeft(c)
                const done = c.s === "delivered"
                const isOverdue = !done && dl !== Infinity && dl < 0
                const m = team.find(x => x.id === c.assignee)
                return (
                  <div
                    key={c.id}
                    onClick={() => onEdit(c.id)}
                    className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-sm hover:border-border/80 transition-all"
                  >
                    <div className="font-semibold text-sm text-foreground mb-0.5">{c.name}</div>
                    {c.tag && <div className="text-xs text-muted-foreground mb-1">{c.tag}</div>}
                    {/* Week slot + recording date */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {c.weekSlot && (
                        <span className={cn("text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full", WEEK_COLORS[c.weekSlot] ?? "bg-muted text-muted-foreground")}>
                          {c.weekSlot.toUpperCase()}
                        </span>
                      )}
                      {c.recordingDate && (
                        <span className="text-[0.65rem] text-muted-foreground">{c.recordingDate}</span>
                      )}
                    </div>
                    {/* Deadline status */}
                    {!done && dl !== Infinity && (
                      <div className={cn("text-xs mb-2", isOverdue ? "text-red-500" : dl <= 14 ? "text-amber-500" : "text-muted-foreground")}>
                        {isOverdue ? `${Math.abs(dl)}d försenat` : `${dl}d kvar`}
                      </div>
                    )}
                    {done && <div className="text-xs text-teal-500 mb-2">Levererat ✓</div>}
                    <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {[c.vg, c.ed, c.cc].filter(Boolean).slice(0, 3).map((name, idx) => (
                          <span key={idx} className="w-4 h-4 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[0.5rem] font-bold" title={name}>
                            {name![0]}
                          </span>
                        ))}
                        {m && (
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[0.5rem] font-bold" style={{ background: m.color }} title={m.name}>
                            {m.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onWorkspace(c.id)} title="Arbetsyta" className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors">
                          <Table2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => onBoard(c.id)} className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors">
                          <LayoutGrid className="w-3 h-3" />
                        </button>
                        {c.s === "scheduled"  && <button onClick={() => onAdvance(c.id, "inprogress")} className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors">▷</button>}
                        {c.s === "inprogress" && <button onClick={() => onAdvance(c.id, "review")}     className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors">→</button>}
                        {c.s === "review"     && <button onClick={() => onReview(c.id)}                className="text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5 hover:bg-violet-200 transition-colors">◎</button>}
                        {c.s === "delivered"  && <button onClick={() => onNewCycle(c.id)}              className="text-xs bg-teal-100 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 hover:bg-teal-200 transition-colors">↺</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

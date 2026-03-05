"use client"

import { cfDLeft, cfPct, cfGetList, STATUS_LABELS } from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFFilter, CFSortCol } from "@/lib/contentflow-types"
import { LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export default function ClientBoard({
  clients, team, fil, q, sortCol, sortDir, filterAssignee,
  onAdvance, onNewCycle, onReview, onEdit, onBoard,
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
                const pp = cfPct(c)
                const done = c.s === "delivered"
                const isOverdue = !done && dl < 0
                const m = team.find(x => x.id === c.assignee)
                return (
                  <div
                    key={c.id}
                    onClick={() => onEdit(c.id)}
                    className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-sm hover:border-border/80 transition-all"
                  >
                    <div className="font-semibold text-sm text-foreground mb-0.5">{c.name}</div>
                    {c.tag && <div className="text-xs text-muted-foreground mb-2">{c.tag}</div>}
                    <div className="mb-2">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", done ? "bg-teal-500" : isOverdue || dl <= 67 ? "bg-red-400" : "bg-teal-500")}
                          style={{ width: `${Math.min(100, done ? 100 : pp)}%` }}
                        />
                      </div>
                      <div className={cn("text-xs mt-1", done ? "text-teal-500" : isOverdue ? "text-red-500" : dl <= 14 ? "text-amber-500" : "text-muted-foreground")}>
                        {done ? "Levererat ✓" : isOverdue ? `${Math.abs(dl)}d försenat` : `${dl}d kvar`}
                      </div>
                    </div>
                    <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                      {m ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[0.5rem] font-bold" style={{ background: m.color }}>{m.name[0]}</span>
                          <span className="text-xs text-muted-foreground">{m.name}</span>
                        </span>
                      ) : <span />}
                      <div className="flex gap-1">
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

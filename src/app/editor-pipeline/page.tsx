"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useDB } from "@/lib/store"
import { loadEpState, STATUS_COLORS } from "@/lib/editor-types"
import type { EditorClientState } from "@/lib/editor-types"
import { Film, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EditorPipelinePage() {
  const { db } = useDB()
  const router = useRouter()
  const [epState, setEpState] = useState<Record<number, EditorClientState>>({})

  useEffect(() => {
    setEpState(loadEpState())
  }, [])

  const clients = db.clients.filter(c => c.st === "AKTIV" || c.st === "")

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Editor Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Översikt över alla kunders videoproduktionstatus
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {clients.map(kund => {
          const rows = epState[kund.id]?.rows ?? []
          const done = rows.filter(r => r.status === "Done").length
          const total = rows.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          // Count by status for mini breakdown
          const statusCounts: Record<string, number> = {}
          rows.forEach(r => {
            if (r.status) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
          })
          const topStatuses = Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)

          return (
            <button
              key={kund.id}
              onClick={() => router.push(`/editor-pipeline/${kund.id}`)}
              className="text-left bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-border/70 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{kund.name}</div>
                  {kund.ed && (
                    <div className="text-xs text-muted-foreground mt-0.5">{kund.ed}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
              </div>

              {total === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Film className="w-3.5 h-3.5 opacity-40" />
                  <span>Inga videos ännu</span>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{total} video{total !== 1 ? "r" : ""}</span>
                      <span className="text-xs font-semibold text-teal-600">{done} klara</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {topStatuses.map(([status, count]) => (
                      <span
                        key={status}
                        className={cn("text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full", STATUS_COLORS[status] ?? "bg-muted text-muted-foreground")}
                      >
                        {count}× {status}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </main>
  )
}

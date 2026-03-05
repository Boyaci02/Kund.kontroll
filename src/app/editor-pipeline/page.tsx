"use client"

import { useRouter } from "next/navigation"
import { useDB } from "@/lib/store"
import { useEp } from "@/components/providers/EpProvider"
import { STATUS_COLORS } from "@/lib/editor-types"
import { cn } from "@/lib/utils"

export default function EditorPipelinePage() {
  const { db } = useDB()
  const router = useRouter()
  const { epState } = useEp()

  const clients = db.clients.filter(c => c.st === "AKTIV" || c.st === "")

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Editor Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Översikt över alla kunders videoproduktionstatus
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Kund</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Redigerare</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Videos pending</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Videos klara</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(kund => {
              const rows = epState[kund.id]?.rows ?? []
              const pending = rows.filter(r => r.status !== "Done").length
              const done    = rows.filter(r => r.status === "Done").length

              // Most common non-done status
              const statusCounts: Record<string, number> = {}
              rows.filter(r => r.status && r.status !== "Done").forEach(r => {
                statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
              })
              const topStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

              return (
                <tr
                  key={kund.id}
                  onClick={() => router.push(`/editor-pipeline/${kund.id}`)}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{kund.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{kund.ed || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {rows.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className={cn("text-sm font-semibold", pending > 0 ? "text-amber-500" : "text-muted-foreground")}>
                        {pending}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rows.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className={cn("text-sm font-semibold", done > 0 ? "text-teal-600" : "text-muted-foreground")}>
                        {done}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rows.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Inga videos</span>
                    ) : topStatus ? (
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[topStatus] ?? "bg-muted text-muted-foreground")}>
                        {topStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-teal-600 font-semibold">Alla klara ✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}

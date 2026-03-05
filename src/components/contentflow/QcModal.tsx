"use client"

import { useState } from "react"
import { QC_ITEMS } from "@/lib/contentflow-data"
import type { CFClient } from "@/lib/contentflow-types"
import { X, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  client: CFClient
  onApprove: (checks: number[], notes: string) => void
  onReject:  (checks: number[], notes: string) => void
  onClose: () => void
}

export default function QcModal({ client, onApprove, onReject, onClose }: Props) {
  const [checks, setChecks] = useState<number[]>([...(client.qc ?? [])])
  const [notes,  setNotes]  = useState(client.qn ?? "")

  const toggle = (i: number) =>
    setChecks(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const pct = Math.round((checks.length / QC_ITEMS.length) * 100)

  const handleApprove = () => {
    if (checks.length < QC_ITEMS.length) {
      if (!confirm(`${checks.length}/${QC_ITEMS.length} checkade. Godkänn ändå?`)) return
    }
    onApprove(checks, notes)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Manager Review</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{checks.length} / {QC_ITEMS.length}</span>
            <span className="text-xs font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* QC items */}
        <div className="px-6 py-4 space-y-2 max-h-[40vh] overflow-y-auto">
          {QC_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                checks.includes(i)
                  ? "border-teal-200 bg-teal-50/50 dark:border-teal-900/40 dark:bg-teal-900/10"
                  : "border-border hover:bg-muted/30",
              )}
            >
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all",
                checks.includes(i) ? "border-teal-500 bg-teal-500 text-white" : "border-muted-foreground/30")}>
                {checks.includes(i) && "✓"}
              </div>
              <span className={cn("text-sm", checks.includes(i) ? "text-teal-700 dark:text-teal-300" : "text-foreground")}>
                {item}
              </span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className="px-6 pb-4">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Granskningsnoteringar</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={2}
            placeholder="Kommentarer till teamet…"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={() => onReject(checks, notes)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
          >
            <XCircle className="w-3.5 h-3.5" /> Begär revision
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Avbryt</button>
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Godkänn
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

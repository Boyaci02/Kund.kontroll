"use client"

import { useState } from "react"
import type { CFClient, CFClientState, CFStatus } from "@/lib/contentflow-types"
import { TEAM_FARGER, TEAM_MEDLEMMAR } from "@/lib/types"
import { X } from "lucide-react"

const ASSIGNEE_OPTIONS = TEAM_MEDLEMMAR.filter(m => m !== "Ingen" && m !== "")

interface Props {
  client: CFClient
  onSave: (patch: Partial<CFClientState>) => void
  onClose: () => void
}

export default function CFStateModal({ client, onSave, onClose }: Props) {
  const [s, setS] = useState<CFStatus>(client.s)
  const [assignee, setAssignee] = useState<string | null>(client.assignee)
  const [qn, setQn] = useState(client.qn ?? "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">CF-status</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
            <select value={s} onChange={e => setS(e.target.value as CFStatus)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="scheduled">Planerad</option>
              <option value="inprogress">Pågår</option>
              <option value="review">Granskning</option>
              <option value="delivered">Levererat</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Ansvarig för content</label>
            <select value={assignee ?? ""} onChange={e => setAssignee(e.target.value || null)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— Ingen —</option>
              {ASSIGNEE_OPTIONS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {assignee && TEAM_FARGER[assignee] && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-4 h-4 rounded-full" style={{ background: TEAM_FARGER[assignee] }} />
                <span className="text-xs text-muted-foreground">{assignee}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Granskningsnoteringar</label>
            <textarea value={qn} onChange={e => setQn(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3} placeholder="Kommentarer…" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Avbryt</button>
          <button
            onClick={() => { onSave({ s, assignee, qn }); onClose() }}
            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium"
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  )
}

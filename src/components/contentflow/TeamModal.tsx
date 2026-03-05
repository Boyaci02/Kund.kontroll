"use client"

import { useState } from "react"
import type { CFMember } from "@/lib/contentflow-types"
import { CF_COLORS } from "@/lib/contentflow-data"
import { X } from "lucide-react"

interface Props {
  team: CFMember[]
  onAdd: (name: string) => void
  onRemove: (id: number) => void
  onClose: () => void
}

export default function TeamModal({ team, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState("")

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Hantera teammedlemmar och färger</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Team list */}
        <div className="p-6 space-y-2 max-h-60 overflow-y-auto">
          {team.length === 0 ? (
            <p className="text-xs text-muted-foreground">Inga teammedlemmar ännu.</p>
          ) : team.map(m => (
            <div key={m.id} className="flex items-center gap-2.5 py-1">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: m.color }}
              >
                {m.name[0]}
              </span>
              <span className="flex-1 text-sm text-foreground">{m.name}</span>
              <button
                onClick={() => onRemove(m.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add member */}
        <div className="px-6 pb-4 flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd() }}
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Namn…"
          />
          <button
            onClick={handleAdd}
            className="text-sm px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium"
          >
            + Lägg till
          </button>
        </div>

        {/* Color preview for next member */}
        {team.length < CF_COLORS.length && (
          <div className="px-6 pb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Nästa färg:</span>
            <span className="w-4 h-4 rounded-full" style={{ background: CF_COLORS[team.length % CF_COLORS.length] }} />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-border">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Stäng</button>
        </div>
      </div>
    </div>
  )
}

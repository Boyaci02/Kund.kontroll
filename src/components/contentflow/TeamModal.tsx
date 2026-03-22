"use client"

import { useState } from "react"
import type { CFTeam } from "@/lib/contentflow-types"
import { TEAM_FARGER, TEAM_MEDLEMMAR } from "@/lib/types"
import { X, Trash2 } from "lucide-react"

const ASSIGNEE_OPTIONS = TEAM_MEDLEMMAR.filter(m => m !== "Ingen" && m !== "")

interface Props {
  teams: CFTeam[]
  onSaveTeams: (teams: CFTeam[]) => void
  onClose: () => void
}

export default function TeamModal({ teams, onSaveTeams, onClose }: Props) {
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamMemberNames, setNewTeamMemberNames] = useState<string[]>([])
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)

  const handleSave = () => {
    const trimmed = newTeamName.trim()
    if (!trimmed) return
    if (editingTeamId != null) {
      onSaveTeams(teams.map(t => t.id === editingTeamId ? { ...t, name: trimmed, memberNames: newTeamMemberNames } : t))
    } else {
      onSaveTeams([...teams, { id: Date.now(), name: trimmed, memberNames: newTeamMemberNames }])
    }
    setNewTeamName("")
    setNewTeamMemberNames([])
    setEditingTeamId(null)
  }

  const handleEdit = (t: CFTeam) => {
    setEditingTeamId(t.id)
    setNewTeamName(t.name)
    setNewTeamMemberNames(t.memberNames)
  }

  const handleDelete = (id: number) => {
    onSaveTeams(teams.filter(t => t.id !== id))
    if (editingTeamId === id) {
      setEditingTeamId(null)
      setNewTeamName("")
      setNewTeamMemberNames([])
    }
  }

  const toggleMember = (name: string) => {
    setNewTeamMemberNames(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Grupper</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Skapa grupper för att filtrera content flow</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Existing teams */}
          {teams.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {t.memberNames.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Inga medlemmar</span>
                      ) : t.memberNames.map(name => (
                        <span key={name} className="flex items-center gap-0.5">
                          <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-white text-[0.45rem] font-bold" style={{ background: TEAM_FARGER[name] ?? "#888" }}>
                            {name[0]}
                          </span>
                          <span className="text-xs text-muted-foreground">{name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleEdit(t)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">✎</button>
                  <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create/edit form */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {editingTeamId != null ? "Redigera grupp" : "Ny grupp"}
            </p>

            <input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave() }}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Gruppnamn…"
            />

            <div className="space-y-1">
              {ASSIGNEE_OPTIONS.map(name => (
                <label key={name} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={newTeamMemberNames.includes(name)}
                    onChange={() => toggleMember(name)}
                    className="rounded"
                  />
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.5rem] font-bold shrink-0" style={{ background: TEAM_FARGER[name] ?? "#888" }}>
                    {name[0]}
                  </span>
                  <span className="text-sm text-foreground">{name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              {editingTeamId != null && (
                <button
                  onClick={() => { setEditingTeamId(null); setNewTeamName(""); setNewTeamMemberNames([]) }}
                  className="text-sm px-3 py-1.5 border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  Avbryt
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!newTeamName.trim()}
                className="flex-1 text-sm px-4 py-1.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingTeamId != null ? "Spara ändringar" : "+ Skapa grupp"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-border">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Stäng</button>
        </div>
      </div>
    </div>
  )
}

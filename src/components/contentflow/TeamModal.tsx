"use client"

import { useState } from "react"
import type { CFMember, CFTeam } from "@/lib/contentflow-types"
import { CF_COLORS } from "@/lib/contentflow-data"
import { X, Trash2, Users, User } from "lucide-react"

interface Props {
  team: CFMember[]
  teams: CFTeam[]
  onAdd: (name: string) => void
  onRemove: (id: number) => void
  onSaveTeams: (teams: CFTeam[]) => void
  onClose: () => void
}

export default function TeamModal({ team, teams, onAdd, onRemove, onSaveTeams, onClose }: Props) {
  const [tab, setTab] = useState<"members" | "teams">("members")
  const [name, setName] = useState("")

  // Team creation state
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<number[]>([])
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName("")
  }

  const handleSaveNewTeam = () => {
    const trimmed = newTeamName.trim()
    if (!trimmed) return
    if (editingTeamId != null) {
      onSaveTeams(teams.map(t => t.id === editingTeamId ? { ...t, name: trimmed, memberIds: newTeamMemberIds } : t))
    } else {
      onSaveTeams([...teams, { id: Date.now(), name: trimmed, memberIds: newTeamMemberIds }])
    }
    setNewTeamName("")
    setNewTeamMemberIds([])
    setEditingTeamId(null)
  }

  const handleEditTeam = (t: CFTeam) => {
    setEditingTeamId(t.id)
    setNewTeamName(t.name)
    setNewTeamMemberIds(t.memberIds)
  }

  const handleDeleteTeam = (id: number) => {
    onSaveTeams(teams.filter(t => t.id !== id))
    if (editingTeamId === id) {
      setEditingTeamId(null)
      setNewTeamName("")
      setNewTeamMemberIds([])
    }
  }

  const toggleMember = (id: number) => {
    setNewTeamMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Hantera teammedlemmar och grupper</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("members")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${tab === "members" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <User className="w-3.5 h-3.5" /> Medlemmar
          </button>
          <button
            onClick={() => setTab("teams")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${tab === "teams" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-3.5 h-3.5" /> Grupper
          </button>
        </div>

        {tab === "members" && (
          <>
            <div className="p-6 space-y-2 max-h-60 overflow-y-auto">
              {team.length === 0 ? (
                <p className="text-xs text-muted-foreground">Inga teammedlemmar ännu.</p>
              ) : team.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 py-1">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: m.color }}>
                    {m.name[0]}
                  </span>
                  <span className="flex-1 text-sm text-foreground">{m.name}</span>
                  <button onClick={() => onRemove(m.id)} className="text-muted-foreground hover:text-red-500 transition-colors text-xs">✕</button>
                </div>
              ))}
            </div>

            <div className="px-6 pb-4 flex gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAdd() }}
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Namn…"
              />
              <button onClick={handleAdd} className="text-sm px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium">
                + Lägg till
              </button>
            </div>

            {team.length < CF_COLORS.length && (
              <div className="px-6 pb-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Nästa färg:</span>
                <span className="w-4 h-4 rounded-full" style={{ background: CF_COLORS[team.length % CF_COLORS.length] }} />
              </div>
            )}
          </>
        )}

        {tab === "teams" && (
          <div className="p-6 space-y-4">
            {/* Existing teams list */}
            {teams.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {teams.map(t => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors">
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.memberIds.length === 0 ? "Inga medlemmar" : t.memberIds.map(id => team.find(m => m.id === id)?.name).filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <button onClick={() => handleEditTeam(t)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">✎</button>
                    <button onClick={() => handleDeleteTeam(t.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create/edit team */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {editingTeamId != null ? "Redigera grupp" : "Ny grupp"}
              </p>
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveNewTeam() }}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Gruppnamn…"
              />

              {team.length > 0 && (
                <div className="space-y-1">
                  {team.map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={newTeamMemberIds.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="rounded"
                      />
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.5rem] font-bold shrink-0" style={{ background: m.color }}>
                        {m.name[0]}
                      </span>
                      <span className="text-sm text-foreground">{m.name}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {editingTeamId != null && (
                  <button
                    onClick={() => { setEditingTeamId(null); setNewTeamName(""); setNewTeamMemberIds([]) }}
                    className="text-sm px-3 py-1.5 border border-border rounded-xl hover:bg-muted transition-colors"
                  >
                    Avbryt
                  </button>
                )}
                <button
                  onClick={handleSaveNewTeam}
                  disabled={!newTeamName.trim()}
                  className="flex-1 text-sm px-4 py-1.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingTeamId != null ? "Spara ändringar" : "+ Skapa grupp"}
                </button>
              </div>
            </div>
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

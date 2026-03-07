"use client"

import { useState, useEffect } from "react"
import { LayoutGrid, List, GripVertical, X, Users } from "lucide-react"
import { HPageHeader, HConfirmDialog } from "./shared"
import type { OnboardingQueueEntry } from "@/lib/hemsidor-types"

const PRIO_ORDER = { hog: 0, normal: 1, lag: 2 }
const PRIO_CYCLE: Record<string, OnboardingQueueEntry["priority"]> = {
  hog: "normal", normal: "lag", lag: "hog",
}
const PRIO_STYLE: Record<string, string> = {
  hog:    "bg-red-100 text-red-700 border-red-200",
  normal: "bg-muted text-muted-foreground border-border",
  lag:    "bg-green-100 text-green-700 border-green-200",
}
const PRIO_LABEL: Record<string, string> = {
  hog: "Hög", normal: "Normal", lag: "Låg",
}

interface Props {
  onboarding:    OnboardingQueueEntry[]
  setOnboarding: (v: OnboardingQueueEntry[] | ((p: OnboardingQueueEntry[]) => OnboardingQueueEntry[])) => void
  setTab:        (tab: string) => void
}

export default function OnboardingQueue({ onboarding, setOnboarding, setTab }: Props) {
  const [viewMode,    setViewMode]    = useState<"cards" | "table">(() => {
    if (typeof window === "undefined") return "cards"
    return (localStorage.getItem("ob-queue-view") as "cards" | "table") ?? "cards"
  })
  const [dragId,      setDragId]      = useState<number | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<number | null>(null)

  useEffect(() => {
    localStorage.setItem("ob-queue-view", viewMode)
  }, [viewMode])

  const sorted = [...onboarding].sort((a, b) =>
    PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.order - b.order
  )

  const cyclePriority = (id: number) => {
    setOnboarding(prev => prev.map(e =>
      e.id === id ? { ...e, priority: PRIO_CYCLE[e.priority] } : e
    ))
  }

  const removeEntry = () => {
    setOnboarding(prev => prev.filter(e => e.id !== confirmDel))
    setConfirmDel(null)
  }

  const onDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const onDragOver = (e: React.DragEvent) => e.preventDefault()

  const onDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); return }

    setOnboarding(prev => {
      const items = [...prev]
      const fromIdx = items.findIndex(x => x.id === dragId)
      const toIdx   = items.findIndex(x => x.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      return items.map((x, i) => ({ ...x, order: i }))
    })
    setDragId(null)
  }

  if (onboarding.length === 0) {
    return (
      <div>
        <HPageHeader title="Onboarding" sub="Kunder i onboarding-processen" />
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-1">Inga kunder i onboarding-kön</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Konvertera en lead till kund för att starta onboarding
          </p>
          <button
            onClick={() => setTab("leads")}
            className="text-xs text-primary hover:underline">
            Gå till Leads →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <HPageHeader title="Onboarding" sub={`${onboarding.length} kunder i processen`}>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Kortvy">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Tabellvy">
            <List className="w-4 h-4" />
          </button>
        </div>
      </HPageHeader>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((entry, idx) => (
            <div
              key={entry.id}
              draggable
              onDragStart={e => onDragStart(e, entry.id)}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, entry.id)}
              className={`bg-card border border-border rounded-2xl p-4 shadow-sm transition-opacity ${dragId === entry.id ? "opacity-40" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground/50 w-5">#{idx + 1}</span>
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{entry.name[0]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                  <button
                    onClick={() => setConfirmDel(entry.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-foreground text-sm leading-tight">{entry.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{entry.plan}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Tillagd: {entry.addedAt}</p>

              <div className="mt-3">
                <button
                  onClick={() => cyclePriority(entry.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all hover:opacity-80 ${PRIO_STYLE[entry.priority]}`}>
                  {PRIO_LABEL[entry.priority]}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3 w-10">#</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Kund</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Plan</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Tillagd</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Prioritet</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3 w-16">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, idx) => (
                <tr
                  key={entry.id}
                  draggable
                  onDragStart={e => onDragStart(e, entry.id)}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, entry.id)}
                  className={`border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing ${dragId === entry.id ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{entry.name[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{entry.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{entry.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{entry.addedAt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => cyclePriority(entry.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all hover:opacity-80 ${PRIO_STYLE[entry.priority]}`}>
                      {PRIO_LABEL[entry.priority]}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDel(entry.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDel !== null && (
        <HConfirmDialog
          title="Ta bort från onboarding?"
          message="Kunden tas bort från onboarding-kön men finns kvar som kund. Ej åtgärdbart."
          onConfirm={removeEntry}
          onClose={() => setConfirmDel(null)}
          confirmLabel="Ta bort"
        />
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import { OB_STEG } from "@/lib/data"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  ChevronDown, RotateCcw, Search, CheckCircle2, Clock,
  LayoutGrid, List, GripVertical, X, Users, Bell,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TEAM_FARGER } from "@/lib/types"
import type { ObEnrollment } from "@/lib/types"

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_TASKS = OB_STEG.reduce((acc, s) => acc + s.tasks.length, 0)

const PRIO_ORDER = { hog: 0, normal: 1, lag: 2 }
const PRIO_CYCLE: Record<string, ObEnrollment["priority"]> = {
  hog: "normal", normal: "lag", lag: "hog",
}
const PRIO_STYLE: Record<string, string> = {
  hog:    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40",
  normal: "bg-muted text-muted-foreground border-border",
  lag:    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/40",
}
const PRIO_LABEL: Record<string, string> = {
  hog: "Hög", normal: "Normal", lag: "Låg",
}

type Tab = "pågående" | "klara"

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 className="font-semibold text-sm text-foreground mb-2">Ta bort från onboarding?</h2>
          <p className="text-xs text-muted-foreground mb-5">
            <span className="font-medium text-foreground">{name}</span> tas bort från onboarding-kön men finns kvar som kund.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>Avbryt</Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onConfirm}>Ta bort</Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { db, toggleTask, resetObState, removeFromOnboarding, updateObEnrollments, addNotification, markPageRead } = useDB()
  const { user } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>("pågående")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [dragId, setDragId] = useState<number | null>(null)
  const [confirmDel, setConfirmDel] = useState<ObEnrollment | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window === "undefined") return "cards"
    return (localStorage.getItem("ob-view") as "cards" | "table") ?? "cards"
  })

  useEffect(() => {
    if (user?.name) markPageRead("onboarding", user.name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem("ob-view", viewMode)
  }, [viewMode])

  const enrollments = db.obEnrollments ?? []

  function getDone(kundId: number): number {
    const state = db.obState[kundId] ?? {}
    return Object.values(state).filter(Boolean).length
  }

  function getProgress(kundId: number): number {
    const done = getDone(kundId)
    return TOTAL_TASKS ? Math.round((done / TOTAL_TASKS) * 100) : 0
  }

  const sorted = [...enrollments].sort((a, b) =>
    PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.order - b.order
  )

  const searchFiltered = search
    ? sorted.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : sorted

  const pågående = searchFiltered.filter((e) => getProgress(e.kundId) < 100)
  const klara    = searchFiltered.filter((e) => getProgress(e.kundId) === 100)
  const current  = tab === "pågående" ? pågående : klara

  function toggleExpand(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleToggleTask(kundId: number, taskId: string, kundName: string, taskText: string) {
    toggleTask(kundId, taskId)
    const state = db.obState[kundId] ?? {}
    const newChecked = !state[taskId]
    const newDone = Object.values({ ...state, [taskId]: newChecked }).filter(Boolean).length

    if (user?.name) {
      addNotification({
        title: newChecked
          ? `${user.name} kryssade av en OB-uppgift`
          : `${user.name} avkryssade en OB-uppgift`,
        body: `${kundName} — ${taskText}`,
        page: "onboarding",
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      })
    }

    if (newDone === TOTAL_TASKS) {
      toast.success(`${kundName} har slutfört onboarding!`, {
        description: "Kom ihåg att schemalägga kunden i veckoplanering.",
        action: { label: "Gå till schema", onClick: () => router.push("/veckoplanering") },
        duration: 6000,
      })
    }
  }

  function handleReset(kundId: number, name: string) {
    resetObState(kundId)
    toast.success(`Onboarding återställd för ${name}`)
  }

  function cyclePriority(id: number) {
    updateObEnrollments(
      enrollments.map((e) => e.id === id ? { ...e, priority: PRIO_CYCLE[e.priority] } : e)
    )
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, id: number) {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault() }

  function onDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); return }

    const items = [...enrollments]
    const fromIdx = items.findIndex((x) => x.id === dragId)
    const toIdx   = items.findIndex((x) => x.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); return }
    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    updateObEnrollments(items.map((x, i) => ({ ...x, order: i })))
    setDragId(null)
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (enrollments.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Checklista per kund</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-1">Inga kunder i onboarding-kön</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Konvertera en vunnen lead till kund för att starta onboarding
          </p>
          <button
            onClick={() => router.push("/leads")}
            className="text-xs text-primary hover:underline"
          >
            Gå till Leads →
          </button>
        </div>
      </div>
    )
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">{enrollments.length} kunder i onboarding</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9 w-48 text-sm"
              placeholder="Sök kund..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={cn("p-1.5 rounded-lg transition-colors", viewMode === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Kortvy"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-1.5 rounded-lg transition-colors", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Tabellvy"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("pågående")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "pågående"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Pågående
          <span className={cn(
            "text-[10px] font-semibold rounded-full px-1.5 py-0.5",
            tab === "pågående" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {pågående.length}
          </span>
        </button>
        <button
          onClick={() => setTab("klara")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "klara"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Klara
          <span className={cn(
            "text-[10px] font-semibold rounded-full px-1.5 py-0.5",
            tab === "klara"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}>
            {klara.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {current.length === 0 ? (
        <div className="py-16 text-center">
          {tab === "klara" ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Inga kunder har slutfört onboarding ännu</p>
            </>
          ) : (
            <>
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Alla kunder har slutfört onboarding!</p>
            </>
          )}
        </div>
      ) : viewMode === "cards" ? (
        // ── Card view ──────────────────────────────────────────────────────────
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {current.map((entry, idx) => {
            const progress = getProgress(entry.kundId)
            const done = getDone(entry.kundId)
            const state = db.obState[entry.kundId] ?? {}
            const isExpanded = expanded[entry.kundId] ?? false

            return (
              <Card
                key={entry.id}
                draggable
                onDragStart={(e) => onDragStart(e, entry.id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, entry.id)}
                className={cn(
                  "border-border transition-opacity",
                  tab === "klara" && "border-emerald-200 dark:border-emerald-900/40",
                  dragId === entry.id && "opacity-40"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground/50 w-5 shrink-0">#{idx + 1}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {tab === "klara" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          <button
                            className="font-semibold text-sm text-foreground truncate hover:underline hover:text-primary transition-colors text-left"
                            onClick={() => router.push(`/kunder/${entry.kundId}`)}
                          >
                            {entry.name}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.pkg || "Inget paket"}</p>
                        <p className="text-xs text-muted-foreground/60">Tillagd: {entry.addedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                      <button
                        onClick={() => setConfirmDel(entry)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Framsteg</span>
                      <span className={cn("font-medium", progress === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                        {done}/{TOTAL_TASKS} ({progress}%)
                      </span>
                    </div>
                    <Progress value={progress} className={cn("h-1.5", progress === 100 && "[&>div]:bg-emerald-500")} />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => cyclePriority(entry.id)}
                      className={cn("text-xs px-2.5 py-1 rounded-full border font-semibold transition-all hover:opacity-80", PRIO_STYLE[entry.priority])}
                    >
                      {PRIO_LABEL[entry.priority]}
                    </button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                        title="Skicka OB-påminnelse till teamet"
                        onClick={() => {
                          if (!user) return
                          addNotification({
                            title: `OB-påminnelse: ${entry.name}`,
                            body: `${user.name}: ${done}/${TOTAL_TASKS} uppgifter klara för ${entry.name}`,
                            page: "onboarding",
                            createdBy: user.name,
                            createdAt: new Date().toISOString(),
                          })
                          toast.success(`Påminnelse skickad för ${entry.name}`)
                        }}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      {tab === "klara" && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={() => handleReset(entry.kundId, entry.name)}
                          title="Återställ"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => toggleExpand(String(entry.kundId))}
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {OB_STEG.map((steg) => {
                      const doneTasks = steg.tasks.filter((t) => state[t.id]).length
                      return (
                        <div key={steg.n} className="rounded-xl border border-border/60 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                doneTasks === steg.tasks.length
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-primary/10 text-primary"
                              )}>
                                {steg.n}
                              </span>
                              <span className="text-xs font-semibold text-foreground">{steg.title}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{doneTasks}/{steg.tasks.length}</span>
                          </div>
                          <div className="divide-y divide-border/40">
                            {steg.tasks.map((task) => {
                              const isDone = !!state[task.id]
                              const whoColor = TEAM_FARGER[task.who] ?? "#9CA3AF"
                              return (
                                <label
                                  key={task.id}
                                  className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                                >
                                  <Checkbox
                                    checked={isDone}
                                    onCheckedChange={() => handleToggleTask(entry.kundId, task.id, entry.name, task.text)}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs leading-relaxed", isDone && "line-through text-muted-foreground")}>
                                      {task.text}
                                    </p>
                                  </div>
                                  <div
                                    className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                    style={{ background: whoColor }}
                                    title={task.who}
                                  >
                                    {task.who[0]}
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        // ── Table view ─────────────────────────────────────────────────────────
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3 w-10">#</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Kund</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Paket</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Tillagd</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Framsteg</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3">Prioritet</th>
                <th className="text-xs font-semibold text-muted-foreground px-4 py-3 w-20">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {current.map((entry, idx) => {
                const progress = getProgress(entry.kundId)
                const done = getDone(entry.kundId)
                return (
                  <tr
                    key={entry.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, entry.id)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, entry.id)}
                    className={cn(
                      "border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing",
                      dragId === entry.id && "opacity-40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-sm font-medium text-foreground hover:underline hover:text-primary transition-colors text-left"
                        onClick={() => router.push(`/kunder/${entry.kundId}`)}
                      >
                        {entry.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{entry.pkg || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{entry.addedAt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={progress}
                          className={cn("h-1.5 w-24", progress === 100 && "[&>div]:bg-emerald-500")}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          progress === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}>
                          {done}/{TOTAL_TASKS}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => cyclePriority(entry.id)}
                        className={cn("text-xs px-2.5 py-1 rounded-full border font-semibold transition-all hover:opacity-80", PRIO_STYLE[entry.priority])}
                      >
                        {PRIO_LABEL[entry.priority]}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                          title="Skicka OB-påminnelse till teamet"
                          onClick={() => {
                            if (!user) return
                            addNotification({
                              title: `OB-påminnelse: ${entry.name}`,
                              body: `${user.name}: ${done}/${TOTAL_TASKS} uppgifter klara för ${entry.name}`,
                              page: "onboarding",
                              createdBy: user.name,
                              createdAt: new Date().toISOString(),
                            })
                            toast.success(`Påminnelse skickad för ${entry.name}`)
                          }}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        {tab === "klara" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => handleReset(entry.kundId, entry.name)}
                            title="Återställ"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <button
                          onClick={() => setConfirmDel(entry)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDel && (
        <ConfirmDialog
          name={confirmDel.name}
          onConfirm={() => { removeFromOnboarding(confirmDel.id); setConfirmDel(null) }}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}

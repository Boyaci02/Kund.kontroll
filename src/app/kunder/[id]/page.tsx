"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useDB } from "@/lib/store"
import { OB_STEG } from "@/lib/data"
import { TEAM_FARGER } from "@/lib/types"
import { paketClass, statusClass } from "@/lib/helpers"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Pencil,
  Video,
  Scissors,
  UserCheck,
  Calendar,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { newRow } from "@/lib/editor-types"
import type { EditorRow } from "@/lib/editor-types"
import EditorPipelineTable from "@/components/editor/EditorPipelineTable"
import { useEp } from "@/components/providers/EpProvider"
import { useTask } from "@/components/providers/TaskProvider"
import { useCf } from "@/components/providers/CfProvider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Kund, Paket, Status } from "@/lib/types"
import { TEAM_MEDLEMMAR, PAKET_LISTA } from "@/lib/types"

const NONE = "__none__"

function TeamRow({
  label,
  name,
  icon,
}: {
  label: string
  name: string
  icon: React.ReactNode
}) {
  if (!name || name === "Ingen") return null
  const color = TEAM_FARGER[name] ?? "#9CA3AF"
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-1.5 w-32 shrink-0">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {name[0]}
        </div>
        <span className="text-sm font-medium text-foreground">{name}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function contentMonthKey(pubDate: string): string {
  if (!pubDate) return ""
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  } catch { return "" }
}

function contentMonthLabel(key: string): string {
  if (!key) return "Ej daterat"
  try {
    const [year, month] = key.split("-")
    return new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString("sv-SE", { year: "numeric", month: "long" })
  } catch { return key }
}

function contentStatusCls(s?: string) {
  if (s === "In progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  if (s === "Done") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  return "bg-muted text-muted-foreground"
}

function contentStatusLbl(s?: string) {
  if (s === "In progress") return "Pågår"
  if (s === "Done") return "Klar"
  return "Att göra"
}

export default function KundkortPage() {
  const params = useParams()
  const router = useRouter()
  const { db, updateKund, toggleTask, resetObState } = useDB()
  const id = Number(params.id)
  const kund = db.clients.find((c) => c.id === id)

  const [notes, setNotes] = useState(kund?.notes ?? "")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const { getClientRows, updateClientRows } = useEp()
  const { tasks, addTask, updateTask } = useTask()
  const epRows = getClientRows(id)
  const kundTaskList = tasks.filter(t => t.kundId === id)
  const { cfState } = useCf()
  const contentTable = cfState[id]?.contentTable ?? []

  // Group content by month for the preview
  const contentMonths = (() => {
    const map = new Map<string, typeof contentTable>()
    contentTable.forEach((r) => {
      const key = contentMonthKey(r.pubDate)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return [...map.entries()]
      .sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b)))
      .map(([key, rows]) => ({ key, label: contentMonthLabel(key), rows }))
  })()

  // Default to current month, or last month with content
  const curKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })()
  const defaultMonthIdx = Math.max(
    contentMonths.findIndex((m) => m.key === curKey),
    contentMonths.length > 0 ? 0 : -1
  )
  const [contentMonthIdx, setContentMonthIdx] = useState(defaultMonthIdx < 0 ? 0 : defaultMonthIdx)

  function addKundTask() {
    addTask({
      kundId: id,
      status: "not_started",
    })
  }

  function toggleKundTask(taskId: number) {
    const t = tasks.find(t => t.id === taskId)
    if (t) updateTask(taskId, { status: t.status === "done" ? "not_started" : "done" })
  }

  function handleEpChange(newRows: EditorRow[]) {
    updateClientRows(id, newRows)
  }

  const [form, setForm] = useState<Omit<Kund, "id">>(
    kund
      ? { ...kund }
      : {
          name: "",
          pkg: "",
          st: "AKTIV",
          vg: "",
          ed: "",
          cc: "Ingen",
          lr: "",
          nr: "",
          ns: "",
          cnt: "",
          ph: "",
          em: "",
          adr: "",
          notes: "",
        }
  )

  if (!kund) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-sm text-muted-foreground">Kunden hittades inte.</p>
        <Button variant="outline" onClick={() => router.push("/kunder")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka till kunder
        </Button>
      </div>
    )
  }

  const obState = db.obState[id] ?? {}
  const allTasks = OB_STEG.flatMap((s) => s.tasks)
  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter((t) => obState[t.id]).length
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Autosave notes 2s after last keystroke
  useEffect(() => {
    if (!kund) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (notes !== kund.notes) {
        updateKund({ ...kund, notes })
      }
    }, 2000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  function handleSaveEdit() {
    if (!form.name.trim()) {
      toast.error("Ange ett kundnamn")
      return
    }
    updateKund({ ...form, id: kund!.id })
    setEditOpen(false)
    toast.success("Kund uppdaterad")
  }

  function openEdit() {
    setForm({ ...kund! })
    setEditOpen(true)
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/kunder")}
            className="h-8 px-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kunder
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{kund.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {kund.pkg && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    paketClass(kund.pkg)
                  )}
                >
                  {kund.pkg}
                </span>
              )}
              {kund.st && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    statusClass(kund.st)
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {kund.st === "AKTIV" ? "Aktiv" : "Inaktiv"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Redigera
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Kundinfo */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Kundinfo
          </h2>
          <InfoRow label="Kontaktperson" value={kund.cnt} />
          <InfoRow label="Telefon" value={kund.ph} />
          {kund.em && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">E-post</span>
              <a href={`mailto:${kund.em}`} className="text-xs text-primary hover:underline">{kund.em}</a>
            </div>
          )}
          <InfoRow label="Adress" value={kund.adr} />
        </div>

        {/* Onboarding */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Onboarding
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {doneTasks}/{totalTasks}
              </span>
              <button
                onClick={() => {
                  resetObState(kund.id)
                  toast.success("Onboarding återställd")
                }}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Återställ onboarding"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Steps */}
          <div className="space-y-3">
            {OB_STEG.map((steg) => {
              const stepDone = steg.tasks.filter((t) => obState[t.id]).length
              return (
                <details key={steg.n} className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none py-1 hover:text-foreground transition-colors">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          stepDone === steg.tasks.length
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {steg.n}
                      </span>
                      <span className="text-xs font-medium text-foreground">{steg.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {stepDone}/{steg.tasks.length}
                    </span>
                  </summary>
                  <div className="mt-1.5 ml-7 space-y-1">
                    {steg.tasks.map((task) => {
                      const isDone = !!obState[task.id]
                      const whoColor = TEAM_FARGER[task.who] ?? "#9CA3AF"
                      return (
                        <label
                          key={task.id}
                          className="flex items-start gap-2 py-1 cursor-pointer hover:bg-muted/30 rounded-lg px-1.5 transition-colors"
                        >
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={() => toggleTask(kund.id, task.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <span
                            className={cn(
                              "text-xs flex-1",
                              isDone && "line-through text-muted-foreground"
                            )}
                          >
                            {task.text}
                          </span>
                          <div
                            className="h-3.5 w-3.5 rounded-full shrink-0 mt-0.5"
                            style={{ background: whoColor }}
                            title={task.who}
                          />
                        </label>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </div>
        </div>

        {/* Team */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Team
          </h2>
          <TeamRow label="Videograf" name={kund.vg} icon={<Video className="h-3.5 w-3.5" />} />
          <TeamRow
            label="Redigerare"
            name={kund.ed}
            icon={<Scissors className="h-3.5 w-3.5" />}
          />
          <TeamRow
            label="Content Creator"
            name={kund.cc}
            icon={<UserCheck className="h-3.5 w-3.5" />}
          />
          {!kund.vg && !kund.ed && (!kund.cc || kund.cc === "Ingen") && (
            <p className="text-xs text-muted-foreground">Inget team tilldelat</p>
          )}
        </div>

        {/* Inspelningar */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Inspelningar
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Senaste inspelning
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">{kund.lr || "–"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Nästa inspelning
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">{kund.nr || "–"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Nästa SMS
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">{kund.ns || "–"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Pipeline */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Editor Pipeline
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEpChange([...epRows, newRow()])}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Lägg till video
            </button>
            <a
              href={`/editor-pipeline/${id}`}
              className="text-xs text-primary hover:underline"
            >
              Visa alla →
            </a>
          </div>
        </div>
        <EditorPipelineTable rows={epRows} onChange={handleEpChange} compact />
        {epRows.length === 0 && (
          <div className="px-5 py-6 text-center text-xs text-muted-foreground">
            Inga videos ännu —{" "}
            <button onClick={() => handleEpChange([...epRows, newRow()])} className="text-primary hover:underline">
              lägg till en
            </button>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uppgifter</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={addKundTask}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Lägg till
            </button>
            <a href="/tasks" className="text-xs text-primary hover:underline">Visa alla →</a>
          </div>
        </div>
        {kundTaskList.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-muted-foreground">
            Inga uppgifter kopplade till denna kund —{" "}
            <button onClick={addKundTask} className="text-primary hover:underline">lägg till en</button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {kundTaskList.map(t => {
              const isDone = t.status === "done"
              const dueDate = t.endDate || ""
              const overdue = !isDone && !!dueDate && new Date(dueDate + "T23:59:59") < new Date()
              const color = TEAM_FARGER[t.assignee] ?? "#9CA3AF"
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <button
                    onClick={() => toggleKundTask(t.id)}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isDone ? "bg-teal-500 border-teal-500 text-white" : "border-border hover:border-primary"
                    )}
                  >
                    {isDone && <span className="text-[8px] font-bold">✓</span>}
                  </button>
                  <span className={cn("flex-1 text-sm text-foreground", isDone && "line-through opacity-50")}>
                    {t.title || <span className="italic text-muted-foreground">Utan titel</span>}
                  </span>
                  {t.assignee && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[0.55rem] font-bold text-white shrink-0" style={{ background: color }} title={t.assignee}>
                      {t.assignee[0]}
                    </span>
                  )}
                  {dueDate && (
                    <span className={cn("text-xs shrink-0", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                      {new Date(dueDate + "T00:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Anteckningar
          </h2>
          <span className="text-[10px] text-muted-foreground">Sparas automatiskt</span>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Skriv anteckningar om kunden här..."
          rows={4}
          className="resize-none text-sm"
        />
      </div>

      {/* Content preview */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Content
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => router.push("/content")}
          >
            Öppna
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {contentMonths.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Inga videos tillagda ännu.</p>
        ) : (
          <>
            {/* Month navigation */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setContentMonthIdx((i) => Math.max(0, i - 1))}
                disabled={contentMonthIdx === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className={cn("text-xs font-medium capitalize flex-1 text-center",
                contentMonths[contentMonthIdx]?.key === curKey ? "text-primary" : "text-foreground"
              )}>
                {contentMonths[contentMonthIdx]?.label ?? "–"}
              </span>
              <button
                onClick={() => setContentMonthIdx((i) => Math.min(contentMonths.length - 1, i + 1))}
                disabled={contentMonthIdx === contentMonths.length - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors text-muted-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Video list for selected month */}
            <div className="space-y-1.5">
              {(contentMonths[contentMonthIdx]?.rows ?? []).slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
                >
                  <span className="text-xs text-foreground truncate flex-1">{row.title || "–"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{row.format}</span>
                  <span className={cn(
                    "text-[10px] rounded-full px-1.5 py-0.5 shrink-0 font-medium whitespace-nowrap",
                    contentStatusCls(row.status)
                  )}>
                    {contentStatusLbl(row.status)}
                  </span>
                </div>
              ))}
              {(contentMonths[contentMonthIdx]?.rows.length ?? 0) > 5 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  +{(contentMonths[contentMonthIdx]?.rows.length ?? 0) - 5} till denna månad
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera kund</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <FormField label="Restaurangnamn *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Paket">
              <Select
                value={form.pkg || NONE}
                onValueChange={(v) => setForm({ ...form, pkg: (v === NONE ? "" : v) as Paket })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Inget paket</SelectItem>
                  {PAKET_LISTA.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select
                value={form.st}
                onValueChange={(v) => setForm({ ...form, st: v as Status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AKTIV">Aktiv</SelectItem>
                  <SelectItem value="INAKTIV">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Videograf">
              <Select value={form.vg || NONE} onValueChange={(v) => setForm({ ...form, vg: v === NONE ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {TEAM_MEDLEMMAR.filter((m) => m !== "Ingen").map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Redigerare">
              <Select value={form.ed || NONE} onValueChange={(v) => setForm({ ...form, ed: v === NONE ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {TEAM_MEDLEMMAR.filter((m) => m !== "Ingen").map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Content Creator">
              <Select value={form.cc} onValueChange={(v) => setForm({ ...form, cc: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_MEDLEMMAR.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Senaste inspelning">
              <Input
                value={form.lr}
                onChange={(e) => setForm({ ...form, lr: e.target.value })}
                placeholder="T.ex. 26 jan"
              />
            </FormField>
            <FormField label="Nästa inspelning">
              <Input
                value={form.nr}
                onChange={(e) => setForm({ ...form, nr: e.target.value })}
                placeholder="T.ex. 10 mars"
              />
            </FormField>
            <FormField label="Nästa SMS">
              <Input
                value={form.ns}
                onChange={(e) => setForm({ ...form, ns: e.target.value })}
                placeholder="T.ex. Mars"
              />
            </FormField>
            <FormField label="Kontaktperson">
              <Input
                value={form.cnt}
                onChange={(e) => setForm({ ...form, cnt: e.target.value })}
                placeholder="Namn"
              />
            </FormField>
            <FormField label="Telefon">
              <Input
                value={form.ph}
                onChange={(e) => setForm({ ...form, ph: e.target.value })}
                placeholder="073-XXX XX XX"
              />
            </FormField>
            <FormField label="E-post">
              <Input
                value={form.em ?? ""}
                onChange={(e) => setForm({ ...form, em: e.target.value })}
                placeholder="namn@foretag.se"
                type="email"
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Adress">
                <Input
                  value={form.adr}
                  onChange={(e) => setForm({ ...form, adr: e.target.value })}
                  placeholder="Gatuadress, stad"
                />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Anteckningar">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSaveEdit}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

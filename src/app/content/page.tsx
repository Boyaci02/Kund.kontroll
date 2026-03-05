"use client"

import { useState, useMemo } from "react"
import { useDB } from "@/lib/store"
import { useCf } from "@/components/providers/CfProvider"
import type { CFClientState, ContentRow } from "@/lib/contentflow-types"
import { cn } from "@/lib/utils"
import { Plus, X, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMATS = ["Reel", "Story", "TikTok", "Shorts", "YouTube", "Övrigt"]
type ContentStatus = "Todo" | "In progress" | "Done"
const STATUS_CYCLE: ContentStatus[] = ["Todo", "In progress", "Done"]

function nextStatus(s: ContentStatus | undefined): ContentStatus {
  const idx = STATUS_CYCLE.indexOf(s ?? "Todo")
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function statusLabel(s?: ContentStatus) {
  if (s === "In progress") return "Pågår"
  if (s === "Done") return "Klar"
  return "Att göra"
}

function statusCls(s?: ContentStatus) {
  if (s === "In progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  if (s === "Done") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  return "bg-muted text-muted-foreground"
}

function monthKey(pubDate: string): string {
  if (!pubDate) return ""
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  } catch { return "" }
}

function monthLabel(key: string): string {
  if (!key) return "Ej daterat"
  try {
    const [year, month] = key.split("-")
    const d = new Date(parseInt(year), parseInt(month) - 1, 1)
    return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long" })
  } catch { return key }
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function groupByMonth(rows: ContentRow[]) {
  const curKey = currentMonthKey()
  const map = new Map<string, ContentRow[]>()
  rows.forEach((r) => {
    const key = monthKey(r.pubDate)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  })
  const sorted = [...map.entries()].sort(([a], [b]) => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    return a.localeCompare(b)
  })
  return sorted.map(([key, rows]) => ({
    key,
    label: monthLabel(key),
    isCurrent: key === curKey,
    rows,
  }))
}

const DEFAULT_CF_STATE: CFClientState = {
  s: "scheduled",
  qc: [],
  qn: "",
  rev: 0,
  contentBoard: { columns: [] },
  contentTable: [],
  assignee: null,
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  title: string
  format: string
  pubDate: string
  status: ContentStatus
  hook: string
  notes: string
}

const EMPTY_FORM: FormState = {
  title: "", format: "Reel", pubDate: "", status: "Todo", hook: "", notes: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { db } = useDB()
  const { cfState, updateCfClient } = useCf()

  const activeClients = db.clients.filter((c) => c.st === "AKTIV" || c.st === "")
  const [selectedId, setSelectedId] = useState<number | null>(activeClients[0]?.id ?? null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [collapsedUndated, setCollapsedUndated] = useState(false)

  const contentTable = useMemo(
    () => (selectedId !== null ? (cfState[selectedId]?.contentTable ?? []) : []),
    [cfState, selectedId]
  )

  const months = useMemo(() => groupByMonth(contentTable), [contentTable])

  function updateTable(newTable: ContentRow[]) {
    if (selectedId === null) return
    const current = cfState[selectedId] ?? DEFAULT_CF_STATE
    updateCfClient(selectedId, { ...current, contentTable: newTable })
  }

  function openAdd(prefillDate = "") {
    setEditId(null)
    setForm({ ...EMPTY_FORM, pubDate: prefillDate })
    setDialogOpen(true)
  }

  function openEdit(row: ContentRow) {
    setEditId(row.id)
    setForm({
      title: row.title,
      format: row.format || "Reel",
      pubDate: row.pubDate,
      status: row.status ?? "Todo",
      hook: row.hook,
      notes: row.notes,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.title.trim()) return
    if (editId !== null) {
      updateTable(
        contentTable.map((r) =>
          r.id === editId
            ? { ...r, title: form.title.trim(), format: form.format, pubDate: form.pubDate, status: form.status, hook: form.hook, notes: form.notes }
            : r
        )
      )
    } else {
      updateTable([
        ...contentTable,
        {
          id: Date.now(),
          title: form.title.trim(),
          format: form.format,
          pubDate: form.pubDate,
          status: form.status,
          hook: form.hook,
          notes: form.notes,
          comments: "",
        },
      ])
    }
    setDialogOpen(false)
  }

  function handleDelete() {
    if (editId === null) return
    updateTable(contentTable.filter((r) => r.id !== editId))
    setDialogOpen(false)
  }

  function toggleStatus(row: ContentRow) {
    updateTable(
      contentTable.map((r) =>
        r.id === row.id ? { ...r, status: nextStatus(r.status) } : r
      )
    )
  }

  const selectedName = activeClients.find((c) => c.id === selectedId)?.name ?? ""

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">Content Creation</h1>
        <p className="text-sm text-muted-foreground mt-1">Månadsvisa videos per kund</p>
      </div>

      {/* Customer pills */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {activeClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                selectedId === c.id
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-8 max-w-4xl">
        {selectedId === null ? (
          <p className="text-sm text-muted-foreground">Inga aktiva kunder.</p>
        ) : months.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              Inga videos ännu för {selectedName}.
            </p>
            <Button
              size="sm"
              onClick={() => openAdd()}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Lägg till första videon
            </Button>
          </div>
        ) : (
          <>
            {months.map(({ key, label, isCurrent, rows }) => {
              const isUndated = key === ""
              const isCollapsed = isUndated && collapsedUndated
              // Prefill first day of the selected month for "add video"
              const addPrefill = key
                ? `${key}-01`
                : ""

              return (
                <section key={key || "__undated"}>
                  <div
                    className={cn(
                      "flex items-center justify-between mb-3 pb-2 border-b",
                      isCurrent ? "border-primary" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <h2
                        className={cn(
                          "text-sm font-semibold capitalize",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}
                      >
                        {label}
                      </h2>
                      {isCurrent && (
                        <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
                          Nu
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{rows.length}</span>
                      {isUndated && (
                        <button
                          onClick={() => setCollapsedUndated((v) => !v)}
                          className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                        >
                          {isCollapsed
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronUp className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAdd(addPrefill)}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Lägg till
                    </Button>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Titel</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Format</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Datum</th>
                            <th className="px-3 py-2 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-3 py-2.5 font-medium text-foreground max-w-[200px] truncate">
                                {row.title || (
                                  <span className="text-muted-foreground italic">Namnlös</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                                {row.format || "–"}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => toggleStatus(row)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer",
                                    statusCls(row.status)
                                  )}
                                  title="Klicka för att byta status"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  {statusLabel(row.status)}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                                {row.pubDate || "–"}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => openEdit(row)}
                                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )
            })}

            <button
              onClick={() => openAdd()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Lägg till video i ny månad
            </button>
          </>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editId !== null ? "Redigera video" : "Lägg till video"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Titel *</label>
              <Input
                className="h-8 text-sm"
                placeholder="Videonamn"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Format</label>
                <Select
                  value={form.format || "Reel"}
                  onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((fmt) => (
                      <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ContentStatus }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todo">Att göra</SelectItem>
                    <SelectItem value="In progress">Pågår</SelectItem>
                    <SelectItem value="Done">Klar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Publiceringsdatum</label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.pubDate}
                onChange={(e) => setForm((f) => ({ ...f, pubDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Hook</label>
              <Input
                className="h-8 text-xs"
                placeholder="Öppningsidé..."
                value={form.hook}
                onChange={(e) => setForm((f) => ({ ...f, hook: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
              <Textarea
                className="text-xs resize-none"
                rows={3}
                placeholder="Manus, vinklar, produktlista..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 h-8 text-xs"
                onClick={handleSave}
                disabled={!form.title.trim()}
              >
                Spara
              </Button>
              {editId !== null && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDelete}
                  title="Ta bort"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="outline"
                className="h-8 text-xs px-3"
                onClick={() => setDialogOpen(false)}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

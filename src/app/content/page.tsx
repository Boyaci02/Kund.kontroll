"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { AIRTABLE_TABLE_MAP } from "@/lib/airtable-config"
import type { AirtableRecord, AirtableStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, X, Loader2, RefreshCw } from "lucide-react"
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
import { toast } from "sonner"

// ─── Swedish month helpers ────────────────────────────────────────────────────

const SWEDISH_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6,
  juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12,
}

function parseMonthFromCategory(cat: string): number | null {
  const lower = cat.toLowerCase()
  for (const [name, num] of Object.entries(SWEDISH_MONTHS)) {
    if (lower.includes(name)) return num
  }
  return null
}

function buildColumns(
  recs: AirtableRecord[],
  getCat: (r: AirtableRecord) => string
): Array<{ key: string; label: string; monthNum: number | null; isCurrent: boolean }> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const seen = new Set<string>()
  recs.forEach((r) => {
    const cat = getCat(r).trim()
    if (cat) seen.add(cat)
  })
  return [...seen]
    .map((cat) => {
      const monthNum = parseMonthFromCategory(cat)
      return { key: cat, label: cat, monthNum, isCurrent: monthNum === currentMonth }
    })
    .sort((a, b) => {
      if (a.monthNum !== null && b.monthNum !== null) return a.monthNum - b.monthNum
      if (a.monthNum !== null) return -1
      if (b.monthNum !== null) return 1
      return a.label.localeCompare(b.label, "sv")
    })
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CYCLE: AirtableStatus[] = ["Todo", "In progress", "Done"]

function nextStatus(s: AirtableStatus): AirtableStatus {
  const idx = STATUS_CYCLE.indexOf(s)
  return idx === -1 ? "Todo" : STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function statusClass(s: AirtableStatus) {
  if (s === "In progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  if (s === "Done") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  if (s === "Todo") return "bg-muted text-muted-foreground"
  return "bg-muted/40 text-muted-foreground"
}

function statusLabel(s: AirtableStatus) {
  if (s === "In progress") return "Pågår"
  if (s === "Done") return "Klar"
  if (s === "Todo") return "Att göra"
  return "–"
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  notes: string
  status: AirtableStatus
}

const EMPTY_FORM: FormState = { name: "", notes: "", status: "Todo" }

export default function ContentPage() {
  const { db } = useDB()
  const { user } = useAuth()

  // Only clients that have an Airtable table
  const contentClients = db.clients.filter((c) => AIRTABLE_TABLE_MAP[c.name])

  const [selectedClient, setSelectedClient] = useState<string>(
    contentClients[0]?.name ?? ""
  )
  const [records, setRecords] = useState<AirtableRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<AirtableRecord | null>(null)
  const [dialogCategory, setDialogCategory] = useState<string>("")
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Notes expand
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Fetch records ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async (clientName: string) => {
    const config = AIRTABLE_TABLE_MAP[clientName]
    if (!config) return
    setLoading(true)
    try {
      const res = await fetch(`/api/airtable?tableId=${config.tableId}`)
      const data = await res.json()
      setRecords(data.records ?? [])
    } catch {
      toast.error("Kunde inte hämta data från Airtable")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedClient) fetchRecords(selectedClient)
  }, [selectedClient, fetchRecords])

  // ── Group records by category ──────────────────────────────────────────────
  const config = AIRTABLE_TABLE_MAP[selectedClient]
  const monthFieldName = config?.monthFieldName ?? ""

  function getCategoryForRecord(r: AirtableRecord): string {
    return (r.fields[monthFieldName] ?? r.fields["Month"] ?? "") as string
  }

  const columns = buildColumns(records, getCategoryForRecord)

  // Records with empty category (truly uncategorized)
  const uncategorizedRecords = records.filter((r) => !getCategoryForRecord(r).trim())

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function openCreate(category: string) {
    setEditRecord(null)
    setDialogCategory(category)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(r: AirtableRecord) {
    setEditRecord(r)
    setDialogCategory(getCategoryForRecord(r))
    setForm({
      name: (r.fields["Name"] ?? "") as string,
      notes: (r.fields["Notes"] ?? "") as string,
      status: (r.fields["Status"] ?? "") as AirtableStatus,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const cfg = AIRTABLE_TABLE_MAP[selectedClient]
    if (!cfg) return
    setSaving(true)
    try {
      if (editRecord) {
        // Update existing
        const patchRes = await fetch("/api/airtable", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: cfg.tableId,
            recordId: editRecord.id,
            fields: {
              Name: form.name,
              Notes: form.notes,
              Status: form.status || undefined,
            },
          }),
        })
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}))
          throw new Error(err?.error ?? `HTTP ${patchRes.status}`)
        }
        toast.success("Uppdaterat!")
      } else {
        // Create new
        const fields: Record<string, string> = {
          Name: form.name,
          Status: form.status || "Todo",
        }
        if (form.notes) fields["Notes"] = form.notes
        if (dialogCategory) fields[cfg.monthFieldName] = dialogCategory
        const postRes = await fetch("/api/airtable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: cfg.tableId, fields }),
        })
        if (!postRes.ok) {
          const err = await postRes.json().catch(() => ({}))
          throw new Error(err?.error ?? `HTTP ${postRes.status}`)
        }
        toast.success("Skapat!")
      }
      setDialogOpen(false)
      fetchRecords(selectedClient)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editRecord) return
    const cfg = AIRTABLE_TABLE_MAP[selectedClient]
    if (!cfg) return
    setSaving(true)
    try {
      const delRes = await fetch("/api/airtable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: cfg.tableId, recordId: editRecord.id }),
      })
      if (!delRes.ok) {
        const err = await delRes.json().catch(() => ({}))
        throw new Error(err?.error ?? `HTTP ${delRes.status}`)
      }
      toast.success("Borttaget")
      setDialogOpen(false)
      fetchRecords(selectedClient)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte ta bort")
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(r: AirtableRecord) {
    const cfg = AIRTABLE_TABLE_MAP[selectedClient]
    if (!cfg) return
    const current = (r.fields["Status"] ?? "") as AirtableStatus
    const next = nextStatus(current)
    // Optimistic update
    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === r.id ? { ...rec, fields: { ...rec.fields, Status: next } } : rec
      )
    )
    await fetch("/api/airtable", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: cfg.tableId,
        recordId: r.id,
        fields: { Status: next },
      }),
    })
  }

  // ── Render a single content card ───────────────────────────────────────────
  function ContentCard({ record }: { record: AirtableRecord }) {
    const status = (record.fields["Status"] ?? "") as AirtableStatus
    const name = (record.fields["Name"] ?? "") as string
    const notes = (record.fields["Notes"] ?? "") as string
    const isExpanded = expandedId === record.id

    return (
      <div className="rounded-xl border border-border bg-card p-3 space-y-2 hover:border-border/80 transition-colors">
        <div className="flex items-start gap-2">
          <button
            onClick={() => toggleStatus(record)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 transition-colors cursor-pointer",
              statusClass(status)
            )}
            title="Klicka för att byta status"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel(status)}
          </button>
        </div>
        <button
          className="text-xs font-medium text-foreground text-left w-full hover:text-primary transition-colors leading-snug"
          onClick={() => openEdit(record)}
        >
          {name || <span className="text-muted-foreground italic">Namnlös</span>}
        </button>
        {notes && (
          <div>
            <button
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? "Dölj" : "Visa anteckningar"}
            </button>
            {isExpanded && (
              <p className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render a month column ──────────────────────────────────────────────────
  function MonthColumn({
    label,
    month,
    isCurrent,
    monthRecords,
    categoryValue,
  }: {
    label: string
    month: number
    isCurrent: boolean
    monthRecords: AirtableRecord[]
    categoryValue: string // value to use when creating new records in this column
  }) {
    return (
      <div className="flex-shrink-0 w-64">
        <div
          className={cn(
            "flex items-center justify-between mb-3 pb-2 border-b",
            isCurrent ? "border-primary" : "border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                isCurrent ? "text-primary" : "text-foreground"
              )}
            >
              {label}
            </span>
            {isCurrent && (
              <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
                Nu
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{monthRecords.length}</span>
        </div>
        <div className="space-y-2">
          {monthRecords.map((r) => (
            <ContentCard key={r.id} record={r} />
          ))}
          <button
            onClick={() => openCreate(categoryValue)}
            className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
  if (contentClients.length === 0) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Inga kunder kopplade till Airtable.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Content Creation</h1>
            <p className="text-sm text-muted-foreground mt-1">Airtable-synkad kanban per kund</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-xs"
            onClick={() => fetchRecords(selectedClient)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Uppdatera
          </Button>
        </div>
      </div>

      {/* Customer horizontal scroll */}
      <div className="px-8 py-3 border-b border-border shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {contentClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.name)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                selectedClient === c.name
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Hämtar från Airtable...</span>
          </div>
        ) : (
          <div className="flex gap-4 min-w-max pb-6">
            {columns.map(({ key, label, isCurrent }) => {
              const colRecords = records.filter((r) => getCategoryForRecord(r).trim() === key)
              return (
                <MonthColumn
                  key={key}
                  label={label}
                  month={0}
                  isCurrent={isCurrent}
                  monthRecords={colRecords}
                  categoryValue={key}
                />
              )
            })}

            {/* Uncategorized column */}
            {uncategorizedRecords.length > 0 && (
              <div className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                  <span className="text-sm font-semibold text-muted-foreground">Ej kategoriserat</span>
                  <span className="text-xs text-muted-foreground">{uncategorizedRecords.length}</span>
                </div>
                <div className="space-y-2">
                  {uncategorizedRecords.map((r) => (
                    <ContentCard key={r.id} record={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editRecord ? "Redigera" : "Nytt innehåll"}
              {dialogCategory && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  — {dialogCategory}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Titel *</label>
              <Input
                className="h-8 text-sm"
                placeholder="Vad ska göras?"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={form.status || "Todo"}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as AirtableStatus }))}
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
              <Textarea
                className="text-xs resize-none"
                rows={4}
                placeholder="Beskrivning, manus, kameravinkel..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 h-8 text-xs"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Spara"}
              </Button>
              {editRecord && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDelete}
                  disabled={saving}
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

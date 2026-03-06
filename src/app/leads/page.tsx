"use client"

import { useState, useCallback } from "react"
import { useDB } from "@/lib/store"
import type { Lead, LeadStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, Search, UserPlus, Pencil, Trash2, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAD_STATUSES: LeadStatus[] = [
  "Ny lead", "Kontaktad", "Möte bokat", "Offert skickad", "Vunnen", "Förlorad",
]

const STATUS_COLORS: Record<LeadStatus, string> = {
  "Ny lead":        "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Kontaktad":      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Möte bokat":     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Offert skickad": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Vunnen":         "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Förlorad":       "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

// ── Notion extraction (only used for one-time import) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(prop: any): string {
  if (!prop) return ""
  switch (prop.type) {
    case "title":      return prop.title?.map((t: { plain_text: string }) => t.plain_text).join("") ?? ""
    case "rich_text":  return prop.rich_text?.map((t: { plain_text: string }) => t.plain_text).join("") ?? ""
    case "select":     return prop.select?.name ?? ""
    case "email":      return prop.email ?? ""
    case "phone_number": return prop.phone_number ?? ""
    case "status":     return prop.status?.name ?? ""
    default:           return ""
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNotionLead(page: { properties: Record<string, any> }): Omit<Lead, "id"> {
  const props = page.properties
  const titleProp = Object.values(props).find((p) => p?.type === "title")
  const name = titleProp ? extractText(titleProp) : "Utan namn"
  const statusProp = Object.values(props).find((p) => p?.type === "status" || p?.type === "select")
  const rawStatus = statusProp ? extractText(statusProp) : ""
  const status: LeadStatus = LEAD_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : "Ny lead"
  const emailProp = Object.values(props).find((p) => p?.type === "email")
  const phoneProp = Object.values(props).find((p) => p?.type === "phone_number")
  return {
    name,
    status,
    email: emailProp ? extractText(emailProp) : "",
    phone: phoneProp ? extractText(phoneProp) : "",
    notes: "",
    createdAt: new Date().toISOString(),
  }
}

// ── Lead form modal ───────────────────────────────────────────────────────────

interface LeadFormProps {
  initial?: Lead
  onSave: (data: Omit<Lead, "id">) => void
  onDelete?: () => void
  onClose: () => void
}

function LeadForm({ initial, onSave, onDelete, onClose }: LeadFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "Ny lead")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), status, email: email.trim(), phone: phone.trim(), notes: notes.trim(), createdAt: initial?.createdAt ?? new Date().toISOString() })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">
              {initial ? "Redigera lead" : "Lägg till lead"}
            </h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Namn *</label>
              <Input
                className="h-8 text-sm"
                placeholder="Företag eller person..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Telefon</label>
                <Input className="h-8 text-xs" placeholder="070-..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">E-post</label>
              <Input className="h-8 text-xs" type="email" placeholder="namn@foretag.se" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
              <Textarea
                className="text-xs resize-none min-h-[80px]"
                placeholder="Kontakthistorik, nästa steg..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
            {onDelete ? (
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={() => { onDelete(); onClose() }}>
                <Trash2 className="h-3 w-3" />
                Radera
              </Button>
            ) : <div />}
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!name.trim()}>
              Spara
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { db, addKund, addLead, updateLead, deleteLead, importLeads } = useDB()
  const leads = db.leads ?? []

  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [converted, setConverted] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const filtered = leads.filter((l) =>
    l.name.toLowerCase().includes(q.toLowerCase()) ||
    l.email.toLowerCase().includes(q.toLowerCase())
  )

  function handleConvert(lead: Lead) {
    addKund({
      name: lead.name,
      pkg: "",
      vg: "", ed: "", cc: "",
      lr: "", nr: "", ns: "",
      adr: "", cnt: "",
      ph: lead.phone,
      em: lead.email,
      st: "AKTIV",
      notes: `Importerad från lead (${new Date().toLocaleDateString("sv-SE")})`,
    })
    setConverted((prev) => new Set([...prev, lead.id]))
  }

  const handleNotionImport = useCallback(async () => {
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await window.fetch("/api/notion/leads")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Okänt fel")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = (data as any[]).map(parseNotionLead)
      const count = importLeads(parsed)
      setImportMsg(
        count > 0
          ? `${count} lead${count !== 1 ? "s" : ""} importerade`
          : "Inga nya leads — alla finns redan"
      )
    } catch (e: unknown) {
      setImportMsg(`Fel: ${e instanceof Error ? e.message : "Kunde inte ansluta till Notion"}`)
    } finally {
      setImporting(false)
    }
  }, [importLeads])

  return (
    <main className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prospekts och inkommande kunder
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleNotionImport}
            disabled={importing}
          >
            <Download className={cn("h-3.5 w-3.5", importing && "animate-bounce")} />
            Importera från Notion
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till lead
          </Button>
        </div>
      </div>

      {/* Import result message */}
      {importMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 border border-border px-4 py-2.5 text-sm text-foreground">
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök lead…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <p className="text-sm">Inga leads ännu.</p>
          <p className="text-xs">Lägg till manuellt eller importera från Notion.</p>
        </div>
      )}

      {/* Table */}
      {leads.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Namn</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">E-post</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Telefon</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Anteckningar</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const isConverted = converted.has(lead.id)
                return (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[lead.status])}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{lead.email || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{lead.phone || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{lead.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isConverted ? (
                          <span className="text-xs text-teal-600 font-medium">✓ Tillagd</span>
                        ) : (
                          <button
                            onClick={() => handleConvert(lead)}
                            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 hover:opacity-90 transition-opacity font-medium"
                          >
                            <UserPlus className="w-3 h-3" />
                            Gör till kund
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(lead)}
                          className="flex items-center justify-center w-7 h-7 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                          title="Redigera"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/10 border-t border-border">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
            {q && ` · filtrerat på "${q}"`}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <LeadForm
          onSave={(data) => addLead(data)}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editing && (
        <LeadForm
          initial={editing}
          onSave={(data) => updateLead({ ...editing, ...data })}
          onDelete={() => deleteLead(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}

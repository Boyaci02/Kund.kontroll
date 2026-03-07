"use client"

import { useState, useCallback, useEffect } from "react"
import { useDB } from "@/lib/store"
import { useTask } from "@/components/providers/TaskProvider"
import { useAuth } from "@/components/providers/AuthProvider"
import type { Lead, LeadStatus, Paket } from "@/lib/types"
import { PAKET_LISTA } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, X, Download, GripVertical } from "lucide-react"
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
import { toast } from "sonner"

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

const COL_ACCENT: Record<LeadStatus, string> = {
  "Ny lead":        "border-t-sky-400",
  "Kontaktad":      "border-t-amber-400",
  "Möte bokat":     "border-t-violet-400",
  "Offert skickad": "border-t-orange-400",
  "Vunnen":         "border-t-teal-400",
  "Förlorad":       "border-t-red-400",
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

// ── Lead form modal (add / edit) ───────────────────────────────────────────────

interface LeadFormProps {
  initial?: Lead
  defaultStatus?: LeadStatus
  onSave: (data: Omit<Lead, "id">) => void
  onDelete?: () => void
  onClose: () => void
}

function LeadForm({ initial, defaultStatus = "Ny lead", onSave, onDelete, onClose }: LeadFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? defaultStatus)
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

// ── Conversion modal (lead → kund) ────────────────────────────────────────────

interface ConversionModalProps {
  lead: Lead
  onConfirm: (pkg: Paket, cnt: string, adr: string, nr: string, notes: string) => void
  onClose: () => void
}

function ConversionModal({ lead, onConfirm, onClose }: ConversionModalProps) {
  const [pkg, setPkg] = useState<Paket>("")
  const [cnt, setCnt] = useState("")
  const [adr, setAdr] = useState("")
  const [nr, setNr] = useState("")
  const [notes, setNotes] = useState("")

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="font-semibold text-sm text-foreground">Lägg till som kund</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{lead.name}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Pre-filled info */}
            <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-1 text-xs text-muted-foreground">
              {lead.email && <p>E-post: <span className="text-foreground">{lead.email}</span></p>}
              {lead.phone && <p>Telefon: <span className="text-foreground">{lead.phone}</span></p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Paket</label>
                <Select value={pkg} onValueChange={(v) => setPkg(v as Paket)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Välj paket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAKET_LISTA.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kontaktperson</label>
                <Input className="h-8 text-xs" placeholder="Namn..." value={cnt} onChange={(e) => setCnt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Adress</label>
              <Input className="h-8 text-xs" placeholder="Gatuadress, stad..." value={adr} onChange={(e) => setAdr(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nästa inspelning</label>
              <Input className="h-8 text-xs" type="date" value={nr} onChange={(e) => setNr(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
              <Textarea
                className="text-xs resize-none min-h-[60px]"
                placeholder="Noteringar om kunden..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
              Avbryt
            </Button>
            <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onConfirm(pkg, cnt, adr, nr, notes)}>
              Bekräfta & lägg till kund
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Lead card ─────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead
  onEdit: (lead: Lead) => void
  onDragStart: (e: React.DragEvent, lead: Lead) => void
}

function LeadCard({ lead, onEdit, onDragStart }: LeadCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className="bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <p className="font-semibold text-sm text-foreground truncate">{lead.name}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(lead) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>

      {(lead.email || lead.phone) && (
        <div className="space-y-0.5 mb-2">
          {lead.email && <p className="text-xs text-muted-foreground truncate">{lead.email}</p>}
          {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
        </div>
      )}

      {lead.notes && (
        <p className="text-xs text-muted-foreground/70 line-clamp-2">{lead.notes}</p>
      )}

      <p className="text-[10px] text-muted-foreground/50 mt-2">
        {new Date(lead.createdAt).toLocaleDateString("sv-SE")}
      </p>
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: LeadStatus
  leads: Lead[]
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onEdit: (lead: Lead) => void
  onDragStart: (e: React.DragEvent, lead: Lead) => void
  onAddLead: () => void
}

function KanbanColumn({ status, leads, isDragOver, onDragOver, onDragLeave, onDrop, onEdit, onDragStart, onAddLead }: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-xl border border-t-2 border-border bg-muted/20 transition-colors",
        COL_ACCENT[status],
        isDragOver && "bg-primary/5 border-primary/40"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[status])}>
            {status}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{leads.length}</span>
        </div>
        <button
          onClick={onAddLead}
          className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
          title={`Lägg till i ${status}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onEdit={onEdit}
            onDragStart={onDragStart}
          />
        ))}
        {isDragOver && leads.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-primary/30 py-8 flex items-center justify-center">
            <p className="text-xs text-primary/50">Släpp här</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { db, addKund, addLead, updateLead, deleteLead, importLeads, addNotification, markPageRead, enrollInOnboarding } = useDB()
  const { addTask } = useTask()
  const { user } = useAuth()
  const leads = db.leads ?? []

  useEffect(() => {
    if (user?.name) markPageRead("leads", user.name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [dragOver, setDragOver] = useState<LeadStatus | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formDefaultStatus, setFormDefaultStatus] = useState<LeadStatus>("Ny lead")
  const [editing, setEditing] = useState<Lead | null>(null)
  const [converting, setConverting] = useState<Lead | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const byStatus = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s)
    return acc
  }, {} as Record<LeadStatus, Lead[]>)

  function handleDragStart(e: React.DragEvent, lead: Lead) {
    e.dataTransfer.setData("leadId", String(lead.id))
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDrop(e: React.DragEvent, toStatus: LeadStatus) {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData("leadId"))
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === toStatus) { setDragOver(null); return }

    if (toStatus === "Vunnen") {
      setConverting(lead)
    } else {
      updateLead({ ...lead, status: toStatus })
      if (user?.name) {
        addNotification({
          title: `${user.name} uppdaterade en lead`,
          body: `${lead.name} → ${toStatus}`,
          page: "leads",
          createdBy: user.name,
          createdAt: new Date().toISOString(),
        })
      }
    }
    setDragOver(null)
  }

  const handleConvert = useCallback((pkg: string, cnt: string, adr: string, nr: string, notes: string) => {
    if (!converting) return
    const newKundId = db.nextId
    const today = new Date().toISOString().split("T")[0]
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    addKund({
      name: converting.name,
      pkg: pkg as import("@/lib/types").Paket,
      vg: "", ed: "", cc: "",
      lr: "", nr, ns: "",
      adr, cnt,
      ph: converting.phone,
      em: converting.email,
      st: "AKTIV",
      notes: notes || `Konverterad från lead (${new Date().toLocaleDateString("sv-SE")})`,
    })

    addTask({ title: `Välj videograf och redigerare för ${converting.name}`, assignee: "Philip", kundId: newKundId, status: "not_started", startDate: today, endDate: in7Days })
    addTask({ title: `Tilldela content creator till ${converting.name}`, assignee: "Jakob", kundId: newKundId, status: "not_started", startDate: today, endDate: in7Days })

    enrollInOnboarding(newKundId, converting.name, pkg || "")

    updateLead({ ...converting, status: "Vunnen" })
    setConverting(null)

    if (user?.name) {
      addNotification({
        title: `${user.name} lade till ny kund`,
        body: converting.name,
        page: "leads",
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      })
    }

    toast.success(`${converting.name} tillagd som kund och onboarding!`, {
      description: "2 uppgifter skapade i Tasks för Philip och Jakob.",
    })
  }, [converting, db.nextId, addKund, addTask, updateLead, addNotification, enrollInOnboarding, user])

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
    <main className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} totalt
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
            onClick={() => { setFormDefaultStatus("Ny lead"); setShowForm(true) }}
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till lead
          </Button>
        </div>
      </div>

      {/* Import message */}
      {importMsg && (
        <div className="mx-6 mt-3 flex items-center justify-between rounded-xl bg-muted/50 border border-border px-4 py-2.5 text-sm text-foreground shrink-0">
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="text-muted-foreground hover:text-foreground ml-4">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-auto p-6">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <p className="text-sm">Inga leads ännu.</p>
            <p className="text-xs">Lägg till manuellt eller importera från Notion.</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full items-start" style={{ minWidth: "max-content" }}>
            {LEAD_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={byStatus[status]}
                isDragOver={dragOver === status}
                onDragOver={(e) => { e.preventDefault(); setDragOver(status) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, status)}
                onEdit={setEditing}
                onDragStart={handleDragStart}
                onAddLead={() => { setFormDefaultStatus(status); setShowForm(true) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <LeadForm
          defaultStatus={formDefaultStatus}
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

      {/* Conversion modal */}
      {converting && (
        <ConversionModal
          lead={converting}
          onConfirm={handleConvert}
          onClose={() => setConverting(null)}
        />
      )}
    </main>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import type { QoplaLead, QoplaStatus, QoplaTjanst } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Phone, Mail, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const QOPLA_USERS = ["Emanuel", "Philip", "Jakob"]

const ACTIVE_STATUSES: QoplaStatus[] = ["Ny lead", "Kontaktad", "Möte bokat", "Offert skickad"]
const ALL_STATUSES: QoplaStatus[] = [...ACTIVE_STATUSES, "Vunnen", "Förlorad"]
const TJANSTER: QoplaTjanst[] = ["Social Media", "Hemsida"]

const STATUS_COLORS: Record<QoplaStatus, string> = {
  "Ny lead":         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Kontaktad":       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Möte bokat":      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Offert skickad":  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Vunnen":          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Förlorad":        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

const TJANST_COLORS: Record<QoplaTjanst, string> = {
  "Social Media": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Hemsida":      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
}

const EMPTY_FORM = {
  name: "",
  company: "",
  phone: "",
  email: "",
  services: [] as QoplaTjanst[],
  signed_services: [] as QoplaTjanst[],
  status: "Ny lead" as QoplaStatus,
  notes: "",
}

export default function QoplaPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<QoplaLead[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"aktiva" | "klara">("aktiva")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QoplaLead | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [forlostExpanded, setForlostExpanded] = useState(false)
  const [dragOver, setDragOver] = useState<QoplaStatus | null>(null)

  const hasAccess = user && QOPLA_USERS.includes(user.name)

  useEffect(() => {
    if (hasAccess) loadLeads()
  }, [hasAccess])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase
      .from("qopla_leads")
      .select("*")
      .order("created_at", { ascending: false })
    setLeads((data as QoplaLead[]) ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(lead: QoplaLead) {
    setEditing(lead)
    setForm({
      name: lead.name,
      company: lead.company ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      services: lead.services,
      signed_services: lead.signed_services ?? [],
      status: lead.status,
      notes: lead.notes ?? "",
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || form.services.length === 0) return
    setSaving(true)

    if (editing) {
      const { data } = await supabase
        .from("qopla_leads")
        .update({
          name: form.name,
          company: form.company,
          phone: form.phone,
          email: form.email,
          services: form.services,
          signed_services: form.signed_services,
          status: form.status,
          notes: form.notes,
        })
        .eq("id", editing.id)
        .select()
        .single()
      if (data) {
        setLeads(prev => prev.map(l => l.id === editing.id ? data as QoplaLead : l))
      }
    } else {
      const { data } = await supabase
        .from("qopla_leads")
        .insert({
          name: form.name,
          company: form.company,
          phone: form.phone,
          email: form.email,
          services: form.services,
          notes: form.notes,
        })
        .select()
        .single()
      if (data) {
        setLeads(prev => [data as QoplaLead, ...prev])
      }
    }

    setSaving(false)
    setModalOpen(false)
  }

  async function handleDelete(id: number) {
    await supabase.from("qopla_leads").delete().eq("id", id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setModalOpen(false)
  }

  async function updateStatus(id: number, status: QoplaStatus) {
    const { data } = await supabase
      .from("qopla_leads")
      .update({ status })
      .eq("id", id)
      .select()
      .single()
    if (data) {
      setLeads(prev => prev.map(l => l.id === id ? data as QoplaLead : l))
    }
  }

  function toggleTjanst(list: QoplaTjanst[], t: QoplaTjanst): QoplaTjanst[] {
    return list.includes(t) ? list.filter(x => x !== t) : [...list, t]
  }

  function handleDragStart(e: React.DragEvent, id: number) {
    e.dataTransfer.setData("leadId", String(id))
  }

  function handleDrop(e: React.DragEvent, status: QoplaStatus) {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData("leadId"))
    if (id) updateStatus(id, status)
    setDragOver(null)
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
        <div className="text-4xl">🔒</div>
        <p className="text-lg font-semibold text-foreground">Ingen åtkomst</p>
        <p className="text-sm text-muted-foreground">Den här sidan är endast tillgänglig för Qopla-användare.</p>
      </div>
    )
  }

  const activeLeads = leads.filter(l => ACTIVE_STATUSES.includes(l.status))
  const wonLeads = leads.filter(l => l.status === "Vunnen")
  const lostLeads = leads.filter(l => l.status === "Förlorad")

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Qopla</h1>
          <p className="text-sm text-muted-foreground">Leads och kunder via Qopla-samarbetet</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Ny lead
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["aktiva", "klara"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "aktiva" ? `Aktiva leads (${activeLeads.length})` : `Klara kunder (${wonLeads.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Laddar...</p>
      ) : tab === "aktiva" ? (
        /* ── Kanban ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTIVE_STATUSES.map(col => {
            const colLeads = activeLeads.filter(l => l.status === col)
            return (
              <div
                key={col}
                className={cn(
                  "rounded-xl border border-border bg-muted/30 p-3 space-y-2 min-h-[200px] transition-colors",
                  dragOver === col && "bg-primary/5 border-primary/40"
                )}
                onDragOver={e => { e.preventDefault(); setDragOver(col) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, col)}
              >
                <div className="flex items-center gap-2 pb-1">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[col])}>
                    {col}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{colLeads.length}</span>
                </div>

                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={e => handleDragStart(e, lead.id)}
                    className="bg-card border border-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
                        {lead.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {lead.company}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(lead)}
                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {lead.services.map(s => (
                        <span key={s} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", TJANST_COLORS[s])}>
                          {s}
                        </span>
                      ))}
                    </div>

                    {lead.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{lead.phone}
                      </p>
                    )}
                    {lead.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />{lead.email}
                      </p>
                    )}
                    {lead.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border/60 pt-1.5">{lead.notes}</p>
                    )}
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Inga leads</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Klara kunder ── */
        <div className="space-y-6">
          {wonLeads.length === 0 && lostLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Inga klara kunder ännu.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wonLeads.map(lead => (
                  <div key={lead.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                        {lead.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />{lead.company}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(lead)}
                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    {(lead.signed_services ?? []).length > 0 ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mb-1">Signerade tjänster</p>
                        <div className="flex flex-wrap gap-1">
                          {(lead.signed_services ?? []).map(s => (
                            <span key={s} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", TJANST_COLORS[s])}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Inga signerade tjänster registrerade</p>
                    )}

                    {lead.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{lead.phone}
                      </p>
                    )}
                    {lead.notes && (
                      <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">{lead.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              {lostLeads.length > 0 && (
                <div>
                  <button
                    onClick={() => setForlostExpanded(e => !e)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    {forlostExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Förlorade leads ({lostLeads.length})
                  </button>

                  {forlostExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lostLeads.map(lead => (
                        <div key={lead.id} className="bg-card border border-border rounded-xl p-4 opacity-60 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3" />{lead.company}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => openEdit(lead)}
                              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                          {lead.notes && <p className="text-xs text-muted-foreground">{lead.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal — Lägg till / redigera */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Redigera lead" : "Ny Qopla-lead"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Namn *</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Namn"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Bolag</label>
              <Input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Bolagsnamn"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Telefon</label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="07X XXX XX XX"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-post</label>
                <Input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@..."
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Tjänster *</label>
              <div className="flex gap-2 mt-1">
                {TJANSTER.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, services: toggleTjanst(f.services, t) }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      form.services.includes(t)
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {editing && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={v => setForm(f => ({ ...f, status: v as QoplaStatus }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Signerade tjänster</label>
                  <div className="flex gap-2 mt-1">
                    {TJANSTER.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, signed_services: toggleTjanst(f.signed_services, t) }))}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          form.signed_services.includes(t)
                            ? "bg-green-600 text-white border-green-600"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Anteckningar</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Fritext..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2 mt-2">
            {editing ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(editing.id)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Ta bort
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Avbryt</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.name.trim() || form.services.length === 0}
              >
                {saving ? "Sparar..." : editing ? "Spara" : "Lägg till"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

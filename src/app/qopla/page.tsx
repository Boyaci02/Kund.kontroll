"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import type { QoplaLead, QoplaComment, QoplaStatus, QoplaTjanst } from "@/lib/types"
import { TEAM_FARGER } from "@/lib/types"
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
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Building2,
  X,
  Flag,
  MessageSquare,
  Send,
} from "lucide-react"
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

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function QoplaPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<QoplaLead[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"aktiva" | "klara">("aktiva")

  // Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QoplaLead | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Side panel
  const [selectedLead, setSelectedLead] = useState<QoplaLead | null>(null)
  const [comments, setComments] = useState<QoplaComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [commentFollowup, setCommentFollowup] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  // followup counts per lead: { [leadId]: count }
  const [followupCounts, setFollowupCounts] = useState<Record<number, number>>({})

  const [forlostExpanded, setForlostExpanded] = useState(false)
  const [dragOver, setDragOver] = useState<QoplaStatus | null>(null)
  const commentEndRef = useRef<HTMLDivElement>(null)

  const hasAccess = user && QOPLA_USERS.includes(user.name)

  useEffect(() => {
    if (hasAccess) {
      loadLeads()
      loadFollowupCounts()
    }
  }, [hasAccess])

  // Scroll to bottom of comments when panel opens or new comment added
  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase
      .from("qopla_leads")
      .select("*")
      .order("created_at", { ascending: false })
    setLeads((data as QoplaLead[]) ?? [])
    setLoading(false)
  }

  async function loadFollowupCounts() {
    const { data } = await supabase
      .from("qopla_comments")
      .select("lead_id")
      .eq("needs_followup", true)
    if (!data) return
    const counts: Record<number, number> = {}
    for (const row of data as { lead_id: number }[]) {
      counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1
    }
    setFollowupCounts(counts)
  }

  async function openPanel(lead: QoplaLead) {
    setSelectedLead(lead)
    setComments([])
    setCommentText("")
    setCommentFollowup(false)
    const { data } = await supabase
      .from("qopla_comments")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
    setComments((data as QoplaComment[]) ?? [])
  }

  async function sendComment() {
    if (!commentText.trim() || !selectedLead || !user) return
    setSendingComment(true)
    const { data } = await supabase
      .from("qopla_comments")
      .insert({
        lead_id: selectedLead.id,
        text: commentText.trim(),
        author: user.name,
        needs_followup: commentFollowup,
      })
      .select()
      .single()
    if (data) {
      setComments(prev => [...prev, data as QoplaComment])
      if (commentFollowup) {
        setFollowupCounts(prev => ({ ...prev, [selectedLead.id]: (prev[selectedLead.id] ?? 0) + 1 }))
      }
    }
    setCommentText("")
    setCommentFollowup(false)
    setSendingComment(false)
  }

  async function toggleFollowup(comment: QoplaComment) {
    const newVal = !comment.needs_followup
    const { data } = await supabase
      .from("qopla_comments")
      .update({ needs_followup: newVal })
      .eq("id", comment.id)
      .select()
      .single()
    if (data) {
      setComments(prev => prev.map(c => c.id === comment.id ? data as QoplaComment : c))
      // recalculate followup count for this lead
      if (selectedLead) {
        setFollowupCounts(prev => {
          const delta = newVal ? 1 : -1
          return { ...prev, [selectedLead.id]: Math.max(0, (prev[selectedLead.id] ?? 0) + delta) }
        })
      }
    }
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(e: React.MouseEvent, lead: QoplaLead) {
    e.stopPropagation()
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
        const updated = data as QoplaLead
        setLeads(prev => prev.map(l => l.id === editing.id ? updated : l))
        if (selectedLead?.id === editing.id) setSelectedLead(updated)
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
    if (selectedLead?.id === id) setSelectedLead(null)
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
      if (selectedLead?.id === id) setSelectedLead(data as QoplaLead)
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

  function LeadCard({ lead, compact = false }: { lead: QoplaLead; compact?: boolean }) {
    const followups = followupCounts[lead.id] ?? 0
    return (
      <div
        draggable={!compact}
        onDragStart={!compact ? e => handleDragStart(e, lead.id) : undefined}
        onClick={() => openPanel(lead)}
        className={cn(
          "bg-card border border-border rounded-lg p-3 space-y-2 transition-colors cursor-pointer",
          !compact && "cursor-grab active:cursor-grabbing",
          selectedLead?.id === lead.id ? "border-primary/60 bg-primary/5" : "hover:border-primary/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
              {followups > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                  <Flag className="h-2.5 w-2.5" />
                  {followups}
                </span>
              )}
            </div>
            {lead.company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3 shrink-0" />
                {lead.company}
              </p>
            )}
          </div>
          <button
            onClick={e => openEdit(e, lead)}
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
    )
  }

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
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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
      ) : (
        <div className="flex gap-4 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {tab === "aktiva" ? (
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
                        <LeadCard key={lead.id} lead={lead} />
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
                        <div
                          key={lead.id}
                          onClick={() => openPanel(lead)}
                          className={cn(
                            "bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer transition-colors",
                            selectedLead?.id === lead.id ? "border-primary/60 bg-primary/5" : "hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                                {(followupCounts[lead.id] ?? 0) > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                    <Flag className="h-2.5 w-2.5" />
                                    {followupCounts[lead.id]}
                                  </span>
                                )}
                              </div>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3" />{lead.company}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={e => openEdit(e, lead)}
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
                            <p className="text-xs text-muted-foreground italic">Inga signerade tjänster</p>
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
                              <div
                                key={lead.id}
                                onClick={() => openPanel(lead)}
                                className="bg-card border border-border rounded-xl p-4 opacity-60 space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                                  <button
                                    onClick={e => openEdit(e, lead)}
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
          </div>

          {/* ── Sidopanel ── */}
          <>
            {/* Backdrop */}
            <div
              className={cn(
                "fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
                selectedLead ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              onClick={() => setSelectedLead(null)}
            />
            <div className={cn(
              "fixed right-0 top-0 h-full z-40 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col",
              "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              selectedLead ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Panel header */}
                <div className="flex items-start justify-between gap-2 p-4 border-b border-border shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{selectedLead.name}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", STATUS_COLORS[selectedLead.status])}>
                        {selectedLead.status}
                      </span>
                    </div>
                    {selectedLead.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />{selectedLead.company}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Lead info */}
                <div className="px-4 py-3 border-b border-border shrink-0 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.services.map(s => (
                      <span key={s} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", TJANST_COLORS[s])}>
                        {s}
                      </span>
                    ))}
                  </div>
                  {selectedLead.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />{selectedLead.phone}
                    </p>
                  )}
                  {selectedLead.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{selectedLead.email}
                    </p>
                  )}
                  {selectedLead.notes && (
                    <p className="text-xs text-muted-foreground">{selectedLead.notes}</p>
                  )}
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Kommentarer ({comments.length})
                  </p>

                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Inga kommentarer ännu</p>
                  )}

                  {comments.map(c => (
                    <div key={c.id} className={cn(
                      "rounded-lg p-2.5 space-y-1.5 border",
                      c.needs_followup
                        ? "border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700"
                        : "border-border bg-muted/30"
                    )}>
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: TEAM_FARGER[c.author] ?? "#9CA3AF" }}
                          >
                            {c.author[0]}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{c.author}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                        </div>
                        <button
                          onClick={() => toggleFollowup(c)}
                          title={c.needs_followup ? "Ta bort uppföljningsflagga" : "Markera för uppföljning"}
                          className={cn(
                            "h-5 w-5 flex items-center justify-center rounded transition-colors",
                            c.needs_followup
                              ? "text-amber-600 hover:text-amber-700"
                              : "text-muted-foreground hover:text-amber-500"
                          )}
                        >
                          <Flag className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{c.text}</p>
                      {c.needs_followup && (
                        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Flag className="h-2.5 w-2.5" /> Kräver uppföljning
                        </p>
                      )}
                    </div>
                  ))}
                  <div ref={commentEndRef} />
                </div>

                {/* Comment form */}
                <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Skriv en kommentar..."
                    className="resize-none text-xs"
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendComment()
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commentFollowup}
                        onChange={e => setCommentFollowup(e.target.checked)}
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Flag className="h-3 w-3 text-amber-500" />
                        Kräver uppföljning
                      </span>
                    </label>
                    <Button
                      size="sm"
                      onClick={sendComment}
                      disabled={!commentText.trim() || sendingComment}
                      className="gap-1.5 h-7 text-xs"
                    >
                      <Send className="h-3 w-3" />
                      Skicka
                    </Button>
                  </div>
                </div>
            </div>
          </>
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

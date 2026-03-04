"use client"

import { useState } from "react"
import { Plus, Pencil, X, MessageSquarePlus, TrendingUp } from "lucide-react"
import { LEAD_STATUS, LEAD_COLUMNS, LEAD_SOURCES, todayStr, formatSEK } from "@/lib/hemsidor-data"
import { HModal, HConfirmDialog, HFormField, HFormSelect, HPageHeader } from "./shared"
import type { Lead, HemsidaClient } from "@/lib/hemsidor-types"

const EMPTY_LEAD: Omit<Lead, "id" | "created"> = {
  name: "", contact: "", email: "", phone: "", source: "Hemsida",
  status: "kontaktad", notes: "", estimatedValue: 0,
  followUpDate: "", lostReason: "", timeline: [],
}

interface Props {
  leads: Lead[]
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>
  clients: HemsidaClient[]
  setClients: React.Dispatch<React.SetStateAction<HemsidaClient[]>>
  addActivity: (message: string, type?: string) => void
  showToast: (msg: string) => void
}

export default function LeadsKanban({ leads, setLeads, clients, setClients, addActivity, showToast }: Props) {
  const [showModal,    setShowModal]    = useState(false)
  const [editLead,     setEditLead]     = useState<number | null>(null)
  const [lostModal,    setLostModal]    = useState<number | null>(null)
  const [lostReason,   setLostReason]   = useState("")
  const [confirmDel,   setConfirmDel]   = useState<number | null>(null)
  const [noteModal,    setNoteModal]    = useState<number | null>(null)
  const [noteText,     setNoteText]     = useState("")
  const [sourceFilter, setSourceFilter] = useState("alla")
  const [form, setForm] = useState<Omit<Lead, "id" | "created">>(EMPTY_LEAD)
  const [dragging, setDragging] = useState<number | null>(null)

  const filteredLeads = sourceFilter === "alla" ? leads : leads.filter(l => l.source === sourceFilter)
  const pipelineValue = leads.reduce((s, l) => s + Number(l.estimatedValue || 0), 0)

  const openNew  = () => { setForm(EMPTY_LEAD); setEditLead(null); setShowModal(true) }
  const openEdit = (lead: Lead) => { setForm({ ...lead }); setEditLead(lead.id); setShowModal(true) }

  const save = () => {
    if (!form.name.trim()) return
    if (editLead !== null) {
      setLeads(prev => prev.map(l => l.id === editLead ? { ...l, ...form } : l))
    } else {
      const newLead: Lead = { ...form, id: Date.now(), created: todayStr() }
      setLeads(prev => [...prev, newLead])
      addActivity(`Ny lead tillagd: ${form.name}`, "lead")
    }
    setShowModal(false)
  }

  const moveStatus = (id: number, status: string) => {
    if (status === "forlorad") { setLostModal(id); setLostReason(""); return }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: status as Lead["status"] } : l))
  }

  const confirmLost = () => {
    if (lostModal === null) return
    setLeads(prev => prev.map(l => l.id === lostModal ? { ...l, status: "forlorad", lostReason } : l))
    setLostModal(null)
  }

  const deleteLead = () => {
    setLeads(prev => prev.filter(l => l.id !== confirmDel))
    setConfirmDel(null)
  }

  const convertToClient = (lead: Lead) => {
    const newClient: HemsidaClient = {
      id: Date.now(), name: lead.name, contact: lead.contact, email: lead.email,
      phone: lead.phone, website: "", status: "aktiv", plan: "Standard",
      monthlyFee: 0, startDate: todayStr(), renewalDate: "", notes: "",
    }
    setClients(prev => [...prev, newClient])
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    addActivity(`Lead konverterad till kund: ${lead.name}`, "client")
    showToast(`${lead.name} är nu tillagd som kund!`)
  }

  const addNote = () => {
    if (!noteText.trim() || noteModal === null) return
    setLeads(prev => prev.map(l => l.id === noteModal
      ? { ...l, timeline: [{ text: noteText, date: todayStr() }, ...(l.timeline || [])] }
      : l
    ))
    setNoteText("")
    setNoteModal(null)
  }

  const onDragStart = (e: React.DragEvent, leadId: number) => { setDragging(leadId); e.dataTransfer.effectAllowed = "move" }
  const onDragOver  = (e: React.DragEvent) => e.preventDefault()
  const onDrop      = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!dragging) return
    if (targetStatus === "forlorad") { setLostModal(dragging); setLostReason("") }
    else setLeads(prev => prev.map(l => l.id === dragging ? { ...l, status: targetStatus as Lead["status"] } : l))
    setDragging(null)
  }

  return (
    <div>
      <HPageHeader
        title="Nya kunder"
        sub={
          <span>
            Lead pipeline
            {pipelineValue > 0 && (
              <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Pipeline-värde: {formatSEK(pipelineValue)}
              </span>
            )}
          </span>
        }
      >
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Ny lead
        </button>
      </HPageHeader>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["alla", ...LEAD_SOURCES].map(s => (
          <button key={s} onClick={() => setSourceFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              sourceFilter === s ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            }`}>
            {s === "alla" ? "Alla källor" : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {LEAD_COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => l.status === col)
          const colValue = colLeads.reduce((s, l) => s + Number(l.estimatedValue || 0), 0)
          const otherCols = LEAD_COLUMNS.filter(c => c !== col)
          const isDanger = col === "forlorad"

          return (
            <div key={col}
              className={`rounded-2xl p-4 min-h-32 transition-colors ${isDanger ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-700/50"}`}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col)}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAD_STATUS[col]?.color}`}>
                  {LEAD_STATUS[col]?.label}
                </span>
                <span className="text-xs text-slate-400 font-medium">{colLeads.length}</span>
                {colValue > 0 && <span className="text-xs text-emerald-600 ml-auto font-medium">{formatSEK(colValue)}</span>}
              </div>

              <div className="space-y-3">
                {colLeads.map(lead => (
                  <div key={lead.id}
                    draggable
                    onDragStart={e => onDragStart(e, lead.id)}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-600 cursor-grab active:cursor-grabbing">

                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">{lead.name}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(lead)} className="text-slate-300 hover:text-amber-500">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setConfirmDel(lead.id)} className="text-slate-300 hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.contact}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                    {lead.estimatedValue > 0 && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">{formatSEK(lead.estimatedValue)}</p>
                    )}
                    {lead.followUpDate && (
                      <p className={`text-xs mt-1 font-medium ${lead.followUpDate === todayStr() ? "text-orange-600" : "text-slate-400"}`}>
                        Uppföljning: {lead.followUpDate}
                      </p>
                    )}
                    {lead.notes && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-2 leading-relaxed">{lead.notes}</p>
                    )}
                    {lead.lostReason && (
                      <p className="text-xs text-red-500 mt-1 italic">"{lead.lostReason}"</p>
                    )}

                    {(lead.timeline || []).length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-slate-100 dark:border-slate-600 pt-2">
                        {lead.timeline.slice(0, 2).map((n, i) => (
                          <div key={i} className="text-xs text-slate-500">
                            <span className="text-slate-400">{n.date}: </span>{n.text}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600 flex flex-wrap gap-1">
                      {otherCols.map(next => (
                        <button key={next} onClick={() => moveStatus(lead.id, next)}
                          className="text-xs text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors">
                          → {LEAD_STATUS[next]?.label}
                        </button>
                      ))}
                      <button onClick={() => { setNoteModal(lead.id); setNoteText("") }}
                        className="text-xs text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">
                        <MessageSquarePlus className="w-3 h-3 inline mr-1" />Notera
                      </button>
                      {lead.status === "avtal_signerat" && (
                        <button onClick={() => convertToClient(lead)}
                          className="text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors font-medium w-full text-center mt-1">
                          → Lägg till som kund
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-2">{lead.source} · {lead.created}</p>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center">
                    <p className="text-xs text-slate-400">Dra hit eller lägg till</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <HModal title={editLead !== null ? "Redigera lead" : "Ny lead"} onClose={() => setShowModal(false)} onSave={save}>
          <HFormField label="Företagsnamn" required value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <HFormField label="Kontaktperson" value={form.contact} onChange={v => setForm({ ...form, contact: v })} />
          <HFormField label="E-post" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <HFormField label="Telefon" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <div className="grid grid-cols-2 gap-3">
            <HFormSelect label="Källa" value={form.source} onChange={v => setForm({ ...form, source: v })} options={LEAD_SOURCES} />
            <HFormField label="Estimerat värde (kr)" type="number" value={form.estimatedValue} onChange={v => setForm({ ...form, estimatedValue: Number(v) })} />
          </div>
          <HFormField label="Uppföljningsdatum" type="date" value={form.followUpDate} onChange={v => setForm({ ...form, followUpDate: v })} />
          <HFormField label="Anteckningar" value={form.notes} onChange={v => setForm({ ...form, notes: v })} multiline />
        </HModal>
      )}

      {lostModal !== null && (
        <HModal title="Anledning till förlorad" onClose={() => setLostModal(null)} onSave={confirmLost} saveLabel="Bekräfta">
          <HFormField label="Varför förlorades denna lead?" value={lostReason} onChange={setLostReason} placeholder="T.ex. valde en konkurrent, för dyrt..." multiline />
        </HModal>
      )}

      {noteModal !== null && (
        <HModal title="Lägg till anteckning" onClose={() => setNoteModal(null)} onSave={addNote} saveLabel="Spara anteckning">
          <HFormField label="Anteckning" value={noteText} onChange={setNoteText} multiline placeholder="Skriv en intern notering..." />
        </HModal>
      )}

      {confirmDel !== null && (
        <HConfirmDialog title="Radera lead?" message="Denna åtgärd kan inte ångras." onConfirm={deleteLead} onClose={() => setConfirmDel(null)} confirmLabel="Radera" />
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Plus, Search, ExternalLink, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle, X } from "lucide-react"
import { CLIENT_STATUS_STYLE, CLIENT_STATUS_LABEL, TASK_STATUS, todayStr, daysUntil, formatSEK, exportCSV } from "@/lib/hemsidor-data"
import { HModal, HConfirmDialog, HFormField, HFormSelect, HPageHeader } from "./shared"
import type { HemsidaClient, CrmTask } from "@/lib/hemsidor-types"

const EMPTY_CLIENT: Omit<HemsidaClient, "id"> = {
  name: "", contact: "", email: "", phone: "", website: "",
  status: "aktiv", plan: "Standard", monthlyFee: 1500,
  startDate: "", renewalDate: "", notes: "",
}

interface Props {
  clients: HemsidaClient[]
  setClients: React.Dispatch<React.SetStateAction<HemsidaClient[]>>
  tasks: CrmTask[]
  setTasks: React.Dispatch<React.SetStateAction<CrmTask[]>>
  addActivity: (message: string, type?: string) => void
  showToast: (msg: string) => void
}

export default function ClientsTable({ clients, setClients, tasks, setTasks, addActivity, showToast }: Props) {
  const [search,       setSearch]       = useState("")
  const [filterStatus, setFilterStatus] = useState("alla")
  const [filterPlan,   setFilterPlan]   = useState("alla")
  const [sortBy,       setSortBy]       = useState("name")
  const [sortDir,      setSortDir]      = useState<"asc"|"desc">("asc")
  const [showModal,    setShowModal]    = useState(false)
  const [editClient,   setEditClient]   = useState<number | null>(null)
  const [detailClient, setDetailClient] = useState<HemsidaClient | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<number | null>(null)
  const [form, setForm] = useState<Omit<HemsidaClient, "id">>(EMPTY_CLIENT)

  const openNew  = () => { setForm(EMPTY_CLIENT); setEditClient(null); setShowModal(true) }
  const openEdit = (c: HemsidaClient) => { setForm({ ...c }); setEditClient(c.id); setShowModal(true) }

  const save = () => {
    if (!form.name.trim()) return
    if (editClient !== null) {
      setClients(prev => prev.map(c => c.id === editClient ? { ...c, ...form, monthlyFee: Number(form.monthlyFee) } : c))
      if (detailClient?.id === editClient) setDetailClient(prev => prev ? { ...prev, ...form, monthlyFee: Number(form.monthlyFee) } : null)
    } else {
      const newClient: HemsidaClient = { ...form, id: Date.now(), monthlyFee: Number(form.monthlyFee) }
      setClients(prev => [...prev, newClient])
      addActivity(`Ny kund tillagd: ${form.name}`, "client")
    }
    setShowModal(false)
  }

  const deleteClient = () => {
    setClients(prev => prev.filter(c => c.id !== confirmDel))
    if (detailClient?.id === confirmDel) setDetailClient(null)
    setConfirmDel(null)
    addActivity("Kund raderades", "client")
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("asc") }
  }

  const SortIcon = ({ col }: { col: string }) => sortBy === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronUp className="w-3 h-3 opacity-20" />

  let filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.website?.toLowerCase().includes(q)
    const matchStatus = filterStatus === "alla" || c.status === filterStatus
    const matchPlan   = filterPlan === "alla"   || c.plan === filterPlan
    return matchSearch && matchStatus && matchPlan
  })

  filtered = [...filtered].sort((a, b) => {
    let va = (a as unknown as Record<string, unknown>)[sortBy] ?? ""
    let vb = (b as unknown as Record<string, unknown>)[sortBy] ?? ""
    if (sortBy === "monthlyFee") { va = Number(va); vb = Number(vb) }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === "asc" ? cmp : -cmp
  })

  const doExportCSV = () => {
    exportCSV(clients.map(c => ({
      Namn: c.name, Kontakt: c.contact, Email: c.email, Telefon: c.phone,
      Hemsida: c.website, Status: c.status, Plan: c.plan,
      Månadsavgift: c.monthlyFee, Startdatum: c.startDate, Förnyelsedatum: c.renewalDate,
    })), "hemsida-kunder.csv")
    showToast("CSV exporterad!")
  }

  const clientTasks = detailClient ? tasks.filter(t => t.clientId === detailClient.id && !t.archivedAt) : []

  const COLS = [
    { key: "name",        label: "Kund" },
    { key: "plan",        label: "Plan" },
    { key: "status",      label: "Status" },
    { key: "monthlyFee",  label: "Månadsavgift" },
    { key: "renewalDate", label: "Förnyelse" },
  ]

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <HPageHeader title="Befintliga kunder" sub={`${clients.length} kunder totalt`}>
          <button onClick={doExportCSV} className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors">Exportera CSV</button>
          <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Ny kund
          </button>
        </HPageHeader>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Sök kund, kontakt, e-post..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 dark:bg-slate-800 dark:border-slate-600" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white dark:bg-slate-800 dark:border-slate-600">
            <option value="alla">Alla status</option>
            <option value="aktiv">Aktiv</option>
            <option value="pausad">Pausad</option>
            <option value="avslutas">Avslutas</option>
          </select>
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white dark:bg-slate-800 dark:border-slate-600">
            <option value="alla">Alla planer</option>
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Pro">Pro</option>
          </select>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                {COLS.map(c => (
                  <th key={c.key} onClick={() => handleSort(c.key)}
                    className="text-xs font-semibold text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">{c.label}<SortIcon col={c.key} /></span>
                  </th>
                ))}
                <th className="text-xs font-semibold text-slate-500 px-4 py-3">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const renewal = daysUntil(client.renewalDate)
                const renewalWarn = renewal !== null && renewal <= 30 && renewal >= 0
                return (
                  <tr key={client.id} onClick={() => setDetailClient(client)}
                    className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-amber-600">{client.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{client.name}</p>
                          <p className="text-xs text-slate-400">{client.contact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">{client.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CLIENT_STATUS_STYLE[client.status]}`}>
                        {CLIENT_STATUS_LABEL[client.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatSEK(client.monthlyFee)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {client.renewalDate ? (
                        <div className="flex items-center gap-1">
                          {renewalWarn && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`text-xs ${renewalWarn ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                            {client.renewalDate}
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-300">–</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(client)} className="text-slate-400 hover:text-amber-500 p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDel(client.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 text-sm py-12">Inga kunder hittades</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailClient && (
        <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 h-fit sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{detailClient.name}</h2>
            <button onClick={() => setDetailClient(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs mb-5">
            <div className="flex justify-between"><span className="text-slate-400">Kontakt</span><span className="text-slate-700 dark:text-slate-300 font-medium">{detailClient.contact}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">E-post</span><span className="text-slate-700 dark:text-slate-300">{detailClient.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Telefon</span><span className="text-slate-700 dark:text-slate-300">{detailClient.phone}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hemsida</span>
              {detailClient.website ? (
                <a href={`https://${detailClient.website}`} target="_blank" rel="noreferrer"
                  className="text-amber-600 hover:underline flex items-center gap-1">
                  {detailClient.website} <ExternalLink className="w-3 h-3" />
                </a>
              ) : <span className="text-slate-300">–</span>}
            </div>
            <div className="flex justify-between"><span className="text-slate-400">Plan</span><span className="text-slate-700 dark:text-slate-300">{detailClient.plan}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Avgift</span><span className="text-slate-700 dark:text-slate-300 font-semibold">{formatSEK(detailClient.monthlyFee)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Startdatum</span><span className="text-slate-700 dark:text-slate-300">{detailClient.startDate}</span></div>
            {detailClient.renewalDate && (
              <div className="flex justify-between">
                <span className="text-slate-400">Förnyelse</span>
                <span className={`font-medium ${(daysUntil(detailClient.renewalDate) ?? 999) <= 30 ? "text-amber-600" : "text-slate-700 dark:text-slate-300"}`}>
                  {detailClient.renewalDate}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Tasks ({clientTasks.length})</p>
            {clientTasks.length === 0
              ? <p className="text-xs text-slate-400">Inga aktiva tasks</p>
              : clientTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TASK_STATUS[t.status]?.dot}`} />
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                  <select value={t.status}
                    onChange={e => setTasks(prev => prev.map(task => task.id === t.id ? { ...task, status: e.target.value as CrmTask["status"], lastUpdated: todayStr() } : task))}
                    className={`text-xs rounded-full px-1.5 py-0.5 border-0 cursor-pointer focus:outline-none ${TASK_STATUS[t.status]?.color}`}
                    onClick={e => e.stopPropagation()}>
                    {["inkommen","pagaende","granskning","klar"].map(s => (
                      <option key={s} value={s}>{TASK_STATUS[s]?.label}</option>
                    ))}
                  </select>
                </div>
              ))
            }
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Anteckningar</p>
            <textarea
              defaultValue={detailClient.notes || ""}
              onBlur={e => {
                const newNotes = e.target.value
                setClients(prev => prev.map(c => c.id === detailClient.id ? { ...c, notes: newNotes } : c))
                setDetailClient(prev => prev ? { ...prev, notes: newNotes } : null)
              }}
              rows={4}
              placeholder="Skriv interna anteckningar om kunden..."
              className="w-full text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => openEdit(detailClient)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Redigera
            </button>
            <button onClick={() => setConfirmDel(detailClient.id)}
              className="flex items-center gap-1.5 py-2 px-3 border border-red-100 text-red-500 rounded-xl text-xs hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <HModal title={editClient !== null ? "Redigera kund" : "Ny kund"} onClose={() => setShowModal(false)} onSave={save}>
          <HFormField label="Företagsnamn" required value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <HFormField label="Kontaktperson" value={form.contact} onChange={v => setForm({ ...form, contact: v })} />
          <HFormField label="E-post" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <HFormField label="Telefon" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <HFormField label="Hemsida" value={form.website} onChange={v => setForm({ ...form, website: v })} />
          <div className="grid grid-cols-2 gap-3">
            <HFormSelect label="Plan" value={form.plan} onChange={v => setForm({ ...form, plan: v })} options={["Basic","Standard","Pro"]} />
            <HFormField label="Månadsavgift (kr)" type="number" value={form.monthlyFee} onChange={v => setForm({ ...form, monthlyFee: Number(v) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HFormField label="Startdatum" type="date" value={form.startDate} onChange={v => setForm({ ...form, startDate: v })} />
            <HFormField label="Förnyelsedatum" type="date" value={form.renewalDate} onChange={v => setForm({ ...form, renewalDate: v })} />
          </div>
          <HFormSelect label="Status" value={form.status} onChange={v => setForm({ ...form, status: v as HemsidaClient["status"] })}
            options={[{ value: "aktiv", label: "Aktiv" }, { value: "pausad", label: "Pausad" }, { value: "avslutas", label: "Avslutas" }]} />
        </HModal>
      )}

      {confirmDel !== null && (
        <HConfirmDialog title="Radera kund?" message="Kunden och alla kopplingar tas bort. Ej åtgärdbart." onConfirm={deleteClient} onClose={() => setConfirmDel(null)} confirmLabel="Radera kund" />
      )}
    </div>
  )
}

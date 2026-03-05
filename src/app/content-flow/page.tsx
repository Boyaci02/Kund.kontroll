"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import {
  cfLoad, cfTodayStr, cfGetList, cfCounts, cfNextId,
  CF_COLORS, FILTER_LABELS,
} from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFFilter, CFSortCol, CFStatus } from "@/lib/contentflow-types"
import KpiBand from "@/components/contentflow/KpiBand"
import ClientTable from "@/components/contentflow/ClientTable"
import ClientBoard from "@/components/contentflow/ClientBoard"
import ClientModal from "@/components/contentflow/ClientModal"
import QcModal from "@/components/contentflow/QcModal"
import ContentBoardModal from "@/components/contentflow/ContentBoardModal"
import TeamModal from "@/components/contentflow/TeamModal"
import { Table, LayoutGrid, Users, Plus, Download, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Advance confirm modal ─────────────────────────────────────────────

interface AdvanceConfig {
  icon: string
  iconBg: string
  iconColor: string
  title: string
  sub: string
  btnLabel: string
  onConfirm: () => void
}

function AdvanceModal({ cfg, onClose }: { cfg: AdvanceConfig; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xs mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
            {cfg.icon}
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">{cfg.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{cfg.sub}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Avbryt</button>
          <button onClick={() => { cfg.onConfirm(); onClose() }} className="text-sm px-4 py-2 bg-foreground text-background rounded-xl hover:opacity-80 transition-opacity font-medium">
            {cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

const FILTERS: { id: CFFilter; label: string }[] = [
  { id: "all",        label: "Alla" },
  { id: "overdue",    label: "Försenade" },
  { id: "upcoming",   label: "Inom 14d" },
  { id: "inprogress", label: "Pågår" },
  { id: "review",     label: "Granskning" },
  { id: "delivered",  label: "Levererade" },
]

export default function ContentFlowPage() {
  const [clients, setClients] = useState<CFClient[]>(() => cfLoad("cf3", []))
  const [team,    setTeam]    = useState<CFMember[]>(() => cfLoad("cf3-team", []))
  const [view,    setView]    = useState<"table" | "board">("table")
  const [fil,     setFil]     = useState<CFFilter>("all")
  const [q,       setQ]       = useState("")
  const [sortCol, setSortCol] = useState<CFSortCol>("due")
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null)

  // Modal states
  const [clientModal,  setClientModal]  = useState<CFClient | null | "new">(undefined as unknown as CFClient | null | "new")
  const [showClientModal, setShowClientModal] = useState(false)
  const [qcClient,     setQcClient]     = useState<CFClient | null>(null)
  const [boardClient,  setBoardClient]  = useState<CFClient | null>(null)
  const [showTeam,     setShowTeam]     = useState(false)
  const [advanceCfg,   setAdvanceCfg]   = useState<AdvanceConfig | null>(null)

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("cf3",      JSON.stringify(clients)) }, [clients])
  useEffect(() => { localStorage.setItem("cf3-team", JSON.stringify(team))    }, [team])

  // ── Client CRUD ────────────────────────────────────────────────────

  const saveClient = useCallback((editId: number | null, data: Omit<CFClient, "id" | "qc" | "qn" | "rev" | "contentBoard">) => {
    setClients(prev => {
      if (editId != null) {
        return prev.map(c => c.id === editId ? { ...c, ...data } : c)
      }
      const id = cfNextId(prev)
      return [...prev, { ...data, id, qc: [], qn: "", rev: 0, contentBoard: { columns: [] } }]
    })
    toast.success(editId != null ? `${data.name} uppdaterad` : `${data.name} tillagd`)
    setShowClientModal(false)
    setClientModal(null as unknown as CFClient)
  }, [])

  const deleteClient = useCallback((id: number) => {
    const c = clients.find(x => x.id === id)
    if (!confirm(`Ta bort ${c?.name}?`)) return
    setClients(prev => prev.filter(x => x.id !== id))
    toast(`${c?.name} borttagen`)
  }, [clients])

  // ── Status changes ─────────────────────────────────────────────────

  const advance = useCallback((id: number, to: "inprogress" | "review") => {
    const c = clients.find(x => x.id === id)!
    const cfgs: Record<string, AdvanceConfig> = {
      inprogress: {
        icon: "▷", iconBg: "bg-sky-100", iconColor: "text-sky-600",
        title: `Starta ${c.name}?`,
        sub: "Tilldela 2 dagar för videos och innehållsplan.",
        btnLabel: "▷ Starta arbete",
        onConfirm: () => { setClients(prev => prev.map(x => x.id === id ? { ...x, s: "inprogress" } : x)); toast("Status uppdaterad") },
      },
      review: {
        icon: "◎", iconBg: "bg-violet-100", iconColor: "text-violet-600",
        title: "Skicka för granskning?",
        sub: `Skicka ${c.name} till granskningskön.`,
        btnLabel: "→ Skicka",
        onConfirm: () => { setClients(prev => prev.map(x => x.id === id ? { ...x, s: "review" } : x)); toast("Skickad för granskning") },
      },
    }
    setAdvanceCfg(cfgs[to])
  }, [clients])

  const startNewCycle = useCallback((id: number) => {
    const c = clients.find(x => x.id === id)!
    setAdvanceCfg({
      icon: "↺", iconBg: "bg-teal-100", iconColor: "text-teal-600",
      title: `Ny cykel för ${c.name}?`,
      sub: "Återställer QC och startar om cykeln från idag.",
      btnLabel: "↺ Starta ny cykel",
      onConfirm: () => {
        setClients(prev => prev.map(x => x.id === id ? { ...x, s: "scheduled", last: cfTodayStr(), qc: [], qn: "" } : x))
        toast(`Ny cykel — ${c.name}`)
      },
    })
  }, [clients])

  const handleQcApprove = useCallback((id: number, checks: number[], notes: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, qc: checks, qn: notes, s: "delivered", last: cfTodayStr() } : c))
    toast.success(`✓ ${clients.find(x => x.id === id)?.name} godkänd`)
    setQcClient(null)
  }, [clients])

  const handleQcReject = useCallback((id: number, checks: number[], notes: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, qc: checks, qn: notes, s: "inprogress", rev: (c.rev || 0) + 1 } : c))
    toast(`${clients.find(x => x.id === id)?.name} — revision begärd`)
    setQcClient(null)
  }, [clients])

  // ── Sort ───────────────────────────────────────────────────────────

  const handleSort = (col: CFSortCol) => {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortCol(col); setSortDir(1) }
  }

  // ── Team ──────────────────────────────────────────────────────────

  const addMember = (name: string) => {
    const id = Math.max(0, ...team.map(m => m.id)) + 1
    const color = CF_COLORS[team.length % CF_COLORS.length]
    setTeam(prev => [...prev, { id, name, color }])
    toast(`${name} tillagd i teamet`)
  }

  const removeMember = (id: number) => {
    const m = team.find(x => x.id === id)
    setTeam(prev => prev.filter(x => x.id !== id))
    setClients(prev => prev.map(c => c.assignee === id ? { ...c, assignee: null } : c))
    toast(`${m?.name} borttagen`)
  }

  // ── PDF download ──────────────────────────────────────────────────

  const downloadPdf = (id: number) => {
    const c = clients.find(x => x.id === id)
    if (!c?.pdf) return
    const a = document.createElement("a")
    a.href = c.pdf.data
    a.download = c.pdf.name
    a.click()
  }

  // ── CSV export ────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = ["Namn", "Bransch", "Status", "Tilldelad", "Nästa datum", "Dagar kvar", "Revisioner", "Anteckningar"]
    const rows = clients.map(c => {
      const m = team.find(x => x.id === c.assignee)
      const dl = Math.round((new Date(c.last).getTime() + (c.cycle || 90) * 86400000 - Date.now()) / 86400000)
      return [`"${c.name}"`, `"${c.tag || ""}"`, c.s, m ? m.name : "", "", dl, c.rev || 0, `"${(c.notes || "").replace(/"/g, '""')}"`].join(",")
    })
    const csv = [header.join(","), ...rows].join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv," + encodeURIComponent(csv)
    a.download = `contentflow-${cfTodayStr()}.csv`
    a.click()
    toast("CSV exporterad")
  }

  const ct = cfCounts(clients)
  const list = cfGetList(clients, fil, q, sortCol, sortDir, filterAssignee)
  const overdueCount = ct.overdue

  const openClientForEdit = (id: number) => {
    const c = clients.find(x => x.id === id) ?? null
    setClientModal(c)
    setShowClientModal(true)
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* KPI Band */}
      <KpiBand clients={clients} />

      {/* Overdue alert */}
      {overdueCount > 0 && fil === "all" && (
        <div className="flex items-center gap-3 mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <span><strong>{overdueCount} klient{overdueCount > 1 ? "er" : ""} försenad{overdueCount > 1 ? "e" : ""}</strong> — kräver omedelbar uppmärksamhet.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => {
            const count = ct[f.id as keyof typeof ct] as number
            return (
              <button
                key={f.id}
                onClick={() => setFil(f.id)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all",
                  fil === f.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
                {count > 0 && f.id !== "all" && (
                  <span className={cn("text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full", fil === f.id ? "bg-white/20" : "bg-muted text-foreground")}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Sök klienter…"
            className="border border-border rounded-xl px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
          />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
        </div>

        {/* Assignee filter */}
        {team.length > 0 && (
          <div className="flex items-center gap-1">
            {team.map(m => (
              <button
                key={m.id}
                onClick={() => setFilterAssignee(filterAssignee === m.id ? null : m.id)}
                title={m.name}
                className={cn("w-7 h-7 rounded-full text-white text-xs font-bold transition-all", filterAssignee === m.id && "ring-2 ring-offset-1 ring-primary")}
                style={{ background: m.color }}
              >
                {m.name[0]}
              </button>
            ))}
            {filterAssignee && <button onClick={() => setFilterAssignee(null)} className="text-xs text-muted-foreground hover:text-foreground ml-1"><X className="w-3 h-3" /></button>}
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-1 border border-border rounded-xl overflow-hidden">
          <button onClick={() => setView("table")} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
            <Table className="w-3 h-3" /> Tabell
          </button>
          <button onClick={() => setView("board")} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors", view === "board" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
            <LayoutGrid className="w-3 h-3" /> Board
          </button>
        </div>

        {/* Actions */}
        <button onClick={() => setShowTeam(true)} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
          <Users className="w-3 h-3" /> Team
        </button>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
          <Download className="w-3 h-3" /> Export
        </button>
        <button
          onClick={() => { setClientModal(null); setShowClientModal(true) }}
          className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-xl px-3 py-1.5 hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-3 h-3" /> Ny klient
        </button>
      </div>

      {/* Page header */}
      <div className="px-6 mb-3">
        <span className="text-sm font-medium text-foreground">{FILTER_LABELS[fil]}</span>
        <span className="text-xs text-muted-foreground ml-2">{list.length} klient{list.length !== 1 ? "er" : ""}</span>
      </div>

      {/* Main view */}
      <div className="bg-card border border-border mx-6 mb-6 rounded-2xl overflow-hidden">
        {view === "table" ? (
          <ClientTable
            clients={clients} team={team} fil={fil} q={q}
            sortCol={sortCol} sortDir={sortDir} filterAssignee={filterAssignee}
            onSort={handleSort}
            onAdvance={advance}
            onNewCycle={startNewCycle}
            onReview={id => setQcClient(clients.find(x => x.id === id) ?? null)}
            onEdit={openClientForEdit}
            onDelete={deleteClient}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
            onDownloadPdf={downloadPdf}
          />
        ) : (
          <ClientBoard
            clients={clients} team={team} fil={fil} q={q}
            sortCol={sortCol} sortDir={sortDir} filterAssignee={filterAssignee}
            onAdvance={advance}
            onNewCycle={startNewCycle}
            onReview={id => setQcClient(clients.find(x => x.id === id) ?? null)}
            onEdit={openClientForEdit}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
          />
        )}
      </div>

      {/* Modals */}
      {showClientModal && (
        <ClientModal
          client={clientModal as CFClient | null}
          team={team}
          onSave={data => saveClient(clientModal && typeof clientModal === "object" ? (clientModal as CFClient).id : null, data)}
          onClose={() => { setShowClientModal(false); setClientModal(null as unknown as CFClient) }}
        />
      )}

      {qcClient && (
        <QcModal
          client={qcClient}
          onApprove={(checks, notes) => handleQcApprove(qcClient.id, checks, notes)}
          onReject={(checks, notes)  => handleQcReject(qcClient.id, checks, notes)}
          onClose={() => setQcClient(null)}
        />
      )}

      {boardClient && (
        <ContentBoardModal
          client={boardClient}
          onUpdate={updated => {
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
            setBoardClient(updated)
          }}
          onClose={() => setBoardClient(null)}
        />
      )}

      {showTeam && (
        <TeamModal
          team={team}
          onAdd={addMember}
          onRemove={removeMember}
          onClose={() => setShowTeam(false)}
        />
      )}

      {advanceCfg && (
        <AdvanceModal cfg={advanceCfg} onClose={() => setAdvanceCfg(null)} />
      )}
    </div>
  )
}

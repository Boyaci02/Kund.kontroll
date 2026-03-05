"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  cfLoad, cfTodayStr, cfGetList, cfCounts,
  CF_COLORS, FILTER_LABELS, defaultCFState, getWeekSlot,
} from "@/lib/contentflow-data"
import type { CFClient, CFClientState, CFMember, CFFilter, CFSortCol } from "@/lib/contentflow-types"
import { useDB } from "@/lib/store"
import KpiBand from "@/components/contentflow/KpiBand"
import ClientTable from "@/components/contentflow/ClientTable"
import ClientBoard from "@/components/contentflow/ClientBoard"
import CFStateModal from "@/components/contentflow/ClientModal"
import QcModal from "@/components/contentflow/QcModal"
import ContentBoardModal from "@/components/contentflow/ContentBoardModal"
import TeamModal from "@/components/contentflow/TeamModal"
import { Table, LayoutGrid, Users, Download, X } from "lucide-react"
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
  { id: "noddate",    label: "Ej datum" },
]

export default function ContentFlowPage() {
  const { db } = useDB()

  // CF-specifik state per kund-ID, sparat i cf3-state
  const [cfState, setCfState] = useState<Record<number, CFClientState>>(
    () => cfLoad("cf3-state", {})
  )
  const [team, setTeam] = useState<CFMember[]>(() => cfLoad("cf3-team", []))

  const [view,    setView]    = useState<"table" | "board">("table")
  const [fil,     setFil]     = useState<CFFilter>("all")
  const [q,       setQ]       = useState("")
  const [sortCol, setSortCol] = useState<CFSortCol>("due")
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null)

  // Modal states
  const [stateModalId,  setStateModalId]  = useState<number | null>(null)
  const [qcClient,      setQcClient]      = useState<CFClient | null>(null)
  const [boardClient,   setBoardClient]   = useState<CFClient | null>(null)
  const [showTeam,      setShowTeam]      = useState(false)
  const [advanceCfg,    setAdvanceCfg]    = useState<AdvanceConfig | null>(null)

  // Persist CF state + team
  useEffect(() => { localStorage.setItem("cf3-state", JSON.stringify(cfState)) }, [cfState])
  useEffect(() => { localStorage.setItem("cf3-team",  JSON.stringify(team))    }, [team])

  // ── Merge db.clients + cfState ─────────────────────────────────────

  const clients = useMemo<CFClient[]>(() =>
    db.clients
      .filter(k => k.st !== "INAKTIV")
      .map(k => ({
        id:            k.id,
        name:          k.name,
        tag:           k.pkg,
        recordingDate: k.nr,
        last:          k.lr || "",
        weekSlot:      getWeekSlot(k.name, db.schedule),
        vg:            k.vg,
        ed:            k.ed,
        cc:            k.cc,
        ...(cfState[k.id] ?? defaultCFState()),
      })),
  [db.clients, db.schedule, cfState])

  // ── CF state update ────────────────────────────────────────────────

  const updateCFState = useCallback((id: number, patch: Partial<CFClientState>) => {
    setCfState(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? defaultCFState()), ...patch },
    }))
  }, [])

  // ── Status changes ─────────────────────────────────────────────────

  const advance = useCallback((id: number, to: "inprogress" | "review") => {
    const c = clients.find(x => x.id === id)!
    const cfgs: Record<string, AdvanceConfig> = {
      inprogress: {
        icon: "▷", iconBg: "bg-sky-100", iconColor: "text-sky-600",
        title: `Starta ${c.name}?`,
        sub: "Markera som pågående arbete.",
        btnLabel: "▷ Starta arbete",
        onConfirm: () => { updateCFState(id, { s: "inprogress" }); toast("Status uppdaterad") },
      },
      review: {
        icon: "◎", iconBg: "bg-violet-100", iconColor: "text-violet-600",
        title: "Skicka för granskning?",
        sub: `Skicka ${c.name} till granskningskön.`,
        btnLabel: "→ Skicka",
        onConfirm: () => { updateCFState(id, { s: "review" }); toast("Skickad för granskning") },
      },
    }
    setAdvanceCfg(cfgs[to])
  }, [clients, updateCFState])

  const startNewCycle = useCallback((id: number) => {
    const c = clients.find(x => x.id === id)!
    setAdvanceCfg({
      icon: "↺", iconBg: "bg-teal-100", iconColor: "text-teal-600",
      title: `Ny cykel för ${c.name}?`,
      sub: "Återställer QC och startar om cykeln.",
      btnLabel: "↺ Starta ny cykel",
      onConfirm: () => {
        updateCFState(id, { s: "scheduled", qc: [], qn: "" })
        toast(`Ny cykel — ${c.name}`)
      },
    })
  }, [clients, updateCFState])

  const handleQcApprove = useCallback((id: number, checks: number[], notes: string) => {
    updateCFState(id, { qc: checks, qn: notes, s: "delivered" })
    toast.success(`✓ ${clients.find(x => x.id === id)?.name} godkänd`)
    setQcClient(null)
  }, [clients, updateCFState])

  const handleQcReject = useCallback((id: number, checks: number[], notes: string) => {
    const c = clients.find(x => x.id === id)!
    updateCFState(id, { qc: checks, qn: notes, s: "inprogress", rev: (c.rev || 0) + 1 })
    toast(`${c.name} — revision begärd`)
    setQcClient(null)
  }, [clients, updateCFState])

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
    // Clear assignee from all clients that had this member
    setCfState(prev => {
      const updated = { ...prev }
      for (const [k, v] of Object.entries(updated)) {
        if (v.assignee === id) updated[Number(k)] = { ...v, assignee: null }
      }
      return updated
    })
    toast(`${m?.name} borttagen`)
  }

  // ── CSV export ────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = ["Namn", "Paket", "Status", "Tilldelad", "Inspelning", "Vecka", "Revisioner"]
    const rows = clients.map(c => {
      const m = team.find(x => x.id === c.assignee)
      return [
        `"${c.name}"`, `"${c.tag || ""}"`, c.s,
        m ? m.name : "", `"${c.recordingDate}"`,
        c.weekSlot || "", c.rev || 0,
      ].join(",")
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
  const stateModalClient = stateModalId != null ? clients.find(x => x.id === stateModalId) ?? null : null

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* KPI Band */}
      <KpiBand clients={clients} />

      {/* Overdue alert */}
      {ct.overdue > 0 && fil === "all" && (
        <div className="flex items-center gap-3 mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <span><strong>{ct.overdue} kund{ct.overdue > 1 ? "er" : ""} försenad{ct.overdue > 1 ? "e" : ""}</strong> — kräver omedelbar uppmärksamhet.</span>
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
            placeholder="Sök kunder…"
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
      </div>

      {/* Page header */}
      <div className="px-6 mb-3">
        <span className="text-sm font-medium text-foreground">{FILTER_LABELS[fil]}</span>
        <span className="text-xs text-muted-foreground ml-2">{list.length} kund{list.length !== 1 ? "er" : ""}</span>
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
            onEdit={id => setStateModalId(id)}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
          />
        ) : (
          <ClientBoard
            clients={clients} team={team} fil={fil} q={q}
            sortCol={sortCol} sortDir={sortDir} filterAssignee={filterAssignee}
            onAdvance={advance}
            onNewCycle={startNewCycle}
            onReview={id => setQcClient(clients.find(x => x.id === id) ?? null)}
            onEdit={id => setStateModalId(id)}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
          />
        )}
      </div>

      {/* Modals */}
      {stateModalClient && (
        <CFStateModal
          client={stateModalClient}
          team={team}
          onSave={(patch) => {
            updateCFState(stateModalClient.id, patch)
            toast.success(`${stateModalClient.name} uppdaterad`)
            setStateModalId(null)
          }}
          onClose={() => setStateModalId(null)}
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
            updateCFState(updated.id, { contentBoard: updated.contentBoard })
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

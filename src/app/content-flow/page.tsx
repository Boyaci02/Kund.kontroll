"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  cfTodayStr, cfGetList, cfCounts,
  FILTER_LABELS, defaultCFState, getWeekSlot,
} from "@/lib/contentflow-data"
import type { CFClient, CFClientState, CFFilter, CFSortCol, CFTeam } from "@/lib/contentflow-types"
import { TEAM_FARGER, TEAM_MEDLEMMAR } from "@/lib/types"
import { useDB } from "@/lib/store"
import { useCf } from "@/components/providers/CfProvider"
import KpiBand from "@/components/contentflow/KpiBand"
import ClientTable from "@/components/contentflow/ClientTable"
import ClientBoard from "@/components/contentflow/ClientBoard"
import CFStateModal from "@/components/contentflow/ClientModal"
import QcModal from "@/components/contentflow/QcModal"
import ContentBoardModal from "@/components/contentflow/ContentBoardModal"
import ContentWorkspaceModal from "@/components/contentflow/ContentWorkspaceModal"
import TeamModal from "@/components/contentflow/TeamModal"
import { Table, LayoutGrid, Users, Download, X, ChevronDown, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Visa bara riktiga anställda (exkludera "Ingen" och "")
const FILTER_MEMBERS = TEAM_MEDLEMMAR.filter(m => m !== "Ingen" && m !== "")

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

// ── Filter dropdown ───────────────────────────────────────────────────

const FILTER_OPTIONS: { id: CFFilter; label: string }[] = [
  { id: "all",        label: "Alla kunder" },
  { id: "overdue",    label: "Försenade" },
  { id: "upcoming",   label: "Inom 14 dagar" },
  { id: "inprogress", label: "Pågår" },
  { id: "review",     label: "Granskning" },
  { id: "delivered",  label: "Levererade" },
]

function FilterDropdown({ fil, counts, onChange }: {
  fil: CFFilter
  counts: Record<string, number>
  onChange: (f: CFFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  const current = FILTER_OPTIONS.find(o => o.id === fil) ?? FILTER_OPTIONS[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all",
          fil !== "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:bg-muted",
        )}
      >
        {current.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-44 bg-popover border border-border rounded-xl shadow-lg py-1 text-sm">
          {FILTER_OPTIONS.map(opt => {
            const count = counts[opt.id] ?? 0
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false) }}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between",
                  fil === opt.id && "font-semibold text-foreground",
                )}
              >
                <span className="text-xs">{opt.label}</span>
                {count > 0 && opt.id !== "all" && (
                  <span className="text-[0.6rem] font-bold bg-muted text-foreground px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ContentFlowPage() {
  const { db } = useDB()
  const { cfState, updateCfClient, teams, setTeams } = useCf()

  const [view,           setView]           = useState<"table" | "board">("table")
  const [fil,            setFil]            = useState<CFFilter>("all")
  const [q,              setQ]              = useState("")
  const [sortCol,        setSortCol]        = useState<CFSortCol>("due")
  const [sortDir,        setSortDir]        = useState<1 | -1>(1)
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterTeam,     setFilterTeam]     = useState<CFTeam | null>(null)

  // Modal states
  const [stateModalId,    setStateModalId]    = useState<number | null>(null)
  const [qcClient,        setQcClient]        = useState<CFClient | null>(null)
  const [boardClient,     setBoardClient]     = useState<CFClient | null>(null)
  const [workspaceClient, setWorkspaceClient] = useState<CFClient | null>(null)
  const [showTeam,        setShowTeam]        = useState(false)
  const [advanceCfg,      setAdvanceCfg]      = useState<AdvanceConfig | null>(null)

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
    updateCfClient(id, { ...(cfState[id] ?? defaultCFState()), ...patch })
  }, [cfState, updateCfClient])

  // ── Auto-reset delivered clients after 3 days ─────────────────────

  useEffect(() => {
    if (!clients.length) return
    for (const c of clients) {
      if (c.s === "delivered" && c.deliveredAt) {
        const daysSince = (Date.now() - new Date(c.deliveredAt).getTime()) / 86400000
        if (daysSince >= 3) {
          updateCFState(c.id, { s: "scheduled", qc: [], qn: "", deliveredAt: null })
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfState])

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
        updateCFState(id, { s: "scheduled", qc: [], qn: "", deliveredAt: null })
        toast(`Ny cykel — ${c.name}`)
      },
    })
  }, [clients, updateCFState])

  const handleQcApprove = useCallback((id: number, checks: number[], notes: string) => {
    updateCFState(id, { qc: checks, qn: notes, s: "delivered", deliveredAt: new Date().toISOString() })
    toast.success(`✓ ${clients.find(x => x.id === id)?.name} godkänd`)
    setQcClient(null)
  }, [clients, updateCFState])

  const handleQcReject = useCallback((id: number, checks: number[], notes: string) => {
    const c = clients.find(x => x.id === id)!
    updateCFState(id, { qc: checks, qn: notes, s: "inprogress", rev: (c.rev || 0) + 1 })
    toast(`${c.name} — revision begärd`)
    setQcClient(null)
  }, [clients, updateCFState])

  // ── Inline assignee change ─────────────────────────────────────────

  const handleAssigneeChange = useCallback((clientId: number, assignee: string | null) => {
    updateCFState(clientId, { assignee })
  }, [updateCFState])

  // ── Sort ───────────────────────────────────────────────────────────

  const handleSort = (col: CFSortCol) => {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortCol(col); setSortDir(1) }
  }

  // ── Assignee / team filter toggle ─────────────────────────────────

  const toggleAssigneeFilter = (name: string) => {
    setFilterTeam(null)
    setFilterAssignee(prev => prev === name ? null : name)
  }

  const toggleTeamFilter = (t: CFTeam) => {
    setFilterAssignee(null)
    setFilterTeam(prev => prev?.id === t.id ? null : t)
  }

  const clearFilters = () => { setFilterAssignee(null); setFilterTeam(null) }

  // ── CSV export ────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = ["Namn", "Paket", "Status", "Ansvarig", "Inspelning", "Vecka", "Revisioner"]
    const rows = clients.map(c => [
      `"${c.name}"`, `"${c.tag || ""}"`, c.s,
      c.assignee ?? "", `"${c.recordingDate}"`,
      c.weekSlot || "", c.rev || 0,
    ].join(","))
    const csv = [header.join(","), ...rows].join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv," + encodeURIComponent(csv)
    a.download = `contentflow-${cfTodayStr()}.csv`
    a.click()
    toast("CSV exporterad")
  }

  const ct = cfCounts(clients)
  const list = cfGetList(clients, fil, q, sortCol, sortDir, filterAssignee, filterTeam)
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
        {/* Anpassa filter dropdown */}
        <FilterDropdown fil={fil} counts={ct} onChange={setFil} />

        {/* Search */}
        <div className="relative">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Sök kunder…"
            className="border border-border rounded-xl px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
          />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
        </div>

        {/* Assignee + team filter chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Individual member chips */}
          {FILTER_MEMBERS.map(name => (
            <button
              key={name}
              onClick={() => toggleAssigneeFilter(name)}
              title={name}
              className={cn(
                "w-7 h-7 rounded-full text-white text-xs font-bold transition-all",
                filterAssignee === name && "ring-2 ring-offset-1 ring-primary",
              )}
              style={{ background: TEAM_FARGER[name] ?? "#888" }}
            >
              {name[0]}
            </button>
          ))}

          {/* Team group chips */}
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => toggleTeamFilter(t)}
              title={t.name}
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-all",
                filterTeam?.id === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Users2 className="w-3 h-3" />
              {t.name}
            </button>
          ))}

          {(filterAssignee || filterTeam) && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground ml-1">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 border border-border rounded-xl overflow-hidden ml-auto">
          <button onClick={() => setView("table")} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
            <Table className="w-3 h-3" /> Tabell
          </button>
          <button onClick={() => setView("board")} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors", view === "board" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
            <LayoutGrid className="w-3 h-3" /> Board
          </button>
        </div>

        {/* Actions */}
        <button onClick={() => setShowTeam(true)} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
          <Users className="w-3 h-3" /> Grupper
        </button>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Page header */}
      <div className="px-6 mb-3">
        <span className="text-sm font-medium text-foreground">
          {filterTeam ? `Grupp: ${filterTeam.name}` : filterAssignee ? filterAssignee : FILTER_LABELS[fil]}
        </span>
        <span className="text-xs text-muted-foreground ml-2">{list.length} kund{list.length !== 1 ? "er" : ""}</span>
      </div>

      {/* Main view */}
      <div className="bg-card border border-border mx-6 mb-6 rounded-2xl overflow-hidden">
        {view === "table" ? (
          <ClientTable
            clients={clients} fil={fil} q={q}
            sortCol={sortCol} sortDir={sortDir}
            filterAssignee={filterAssignee} filterTeam={filterTeam}
            onSort={handleSort}
            onAdvance={advance}
            onNewCycle={startNewCycle}
            onReview={id => setQcClient(clients.find(x => x.id === id) ?? null)}
            onEdit={id => setStateModalId(id)}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
            onWorkspace={id => setWorkspaceClient(clients.find(x => x.id === id) ?? null)}
            onAssigneeChange={handleAssigneeChange}
          />
        ) : (
          <ClientBoard
            clients={clients} fil={fil} q={q}
            sortCol={sortCol} sortDir={sortDir} filterAssignee={filterAssignee}
            onAdvance={advance}
            onNewCycle={startNewCycle}
            onReview={id => setQcClient(clients.find(x => x.id === id) ?? null)}
            onEdit={id => setStateModalId(id)}
            onBoard={id => setBoardClient(clients.find(x => x.id === id) ?? null)}
            onWorkspace={id => setWorkspaceClient(clients.find(x => x.id === id) ?? null)}
          />
        )}
      </div>

      {/* Modals */}
      {stateModalClient && (
        <CFStateModal
          client={stateModalClient}
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

      {workspaceClient && (
        <ContentWorkspaceModal
          client={workspaceClient}
          onUpdate={rows => updateCFState(workspaceClient.id, { contentTable: rows })}
          onClose={() => setWorkspaceClient(null)}
        />
      )}

      {showTeam && (
        <TeamModal
          teams={teams}
          onSaveTeams={setTeams}
          onClose={() => setShowTeam(false)}
        />
      )}

      {advanceCfg && (
        <AdvanceModal cfg={advanceCfg} onClose={() => setAdvanceCfg(null)} />
      )}
    </div>
  )
}

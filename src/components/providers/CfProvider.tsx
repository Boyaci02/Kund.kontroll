"use client"

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { CFClientState, CFCard, CFColumn, CFMember, CFTeam, CFStatus, ContentRow } from "@/lib/contentflow-types"

// ── Types för DB-rader ────────────────────────────────────────────────

type DbCfClientState = {
  kund_id: number; s: string; qc: number[]; qn: string; rev: number
  assignee: number | null; delivered_at: string | null; updated_at: string
}
type DbTeam = { id: number; name: string; member_ids: number[] }
type DbColumn = { id: number; kund_id: number; label: string; col_order: number }
type DbCard = {
  id: number; kund_id: number; column_id: number; title: string; notes: string
  hook: string; status: string; assignee: string; card_order: number; created_at: string
}
type DbComment = { id: number; card_id: number; text: string; author: string; created_at: string }
type DbRow = {
  id: number; kund_id: number; title: string; format: string; pub_date: string
  hook: string; notes: string; comments: string; status: string; row_order: number
}
type DbMember = { id: number; name: string; color: string }

type CfStateMap = Record<number, CFClientState>

interface CfContextValue {
  cfState: CfStateMap
  cfLoading: boolean
  updateCfClient: (clientId: number, state: CFClientState) => void
  team: CFMember[]
  teamLoading: boolean
  setTeam: (team: CFMember[]) => void
  teams: CFTeam[]
  setTeams: (teams: CFTeam[]) => void
}

const CfContext = createContext<CfContextValue | null>(null)

export function useCf() {
  const ctx = useContext(CfContext)
  if (!ctx) throw new Error("useCf must be used inside CfProvider")
  return ctx
}

// ── ID-generering ─────────────────────────────────────────────────────
// Använder Date.now() (13 siffror) som ryms i bigint-kolumner och JS number
function newId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

// ── Assemblera tabellrader till CfStateMap ────────────────────────────
function assembleState(
  clientStates: DbCfClientState[],
  columns: DbColumn[],
  cards: DbCard[],
  comments: DbComment[],
  rows: DbRow[],
): CfStateMap {
  const result: CfStateMap = {}

  for (const cs of clientStates) {
    const clientColumns = columns
      .filter(col => col.kund_id === cs.kund_id)
      .sort((a, b) => a.col_order - b.col_order)

    const cfColumns: CFColumn[] = clientColumns.map(col => {
      const colCards = cards
        .filter(card => card.column_id === col.id)
        .sort((a, b) => a.card_order - b.card_order)

      return {
        id: col.id,
        label: col.label,
        cards: colCards.map(card => ({
          id: card.id,
          title: card.title,
          notes: card.notes,
          hook: card.hook,
          status: card.status as CFCard["status"],
          assignee: card.assignee,
          createdAt: card.created_at,
          comments: comments
            .filter(c => c.card_id === card.id)
            .sort((a, b) => a.id - b.id)
            .map(c => ({ id: c.id, text: c.text, author: c.author, createdAt: c.created_at })),
        } as CFCard)),
      }
    })

    const contentTable: ContentRow[] = rows
      .filter(r => r.kund_id === cs.kund_id)
      .sort((a, b) => a.row_order - b.row_order)
      .map(r => ({
        id: r.id,
        title: r.title,
        format: r.format,
        pubDate: r.pub_date,
        hook: r.hook,
        notes: r.notes,
        comments: r.comments,
        status: r.status as ContentRow["status"],
      }))

    result[cs.kund_id] = {
      s: cs.s as CFStatus,
      qc: cs.qc ?? [],
      qn: cs.qn ?? "",
      rev: cs.rev ?? 0,
      assignee: cs.assignee,
      deliveredAt: cs.delivered_at ?? null,
      contentBoard: { columns: cfColumns },
      contentTable,
    }
  }

  return result
}

// ── Spara en klients state till dedikerade tabeller ───────────────────
async function saveCfClientState(
  clientId: number,
  next: CFClientState,
  prev: CFClientState | undefined,
) {
  // 1. Upsert workflow-metadata
  const { error: csErr } = await supabase.from("cf_client_state").upsert({
    kund_id: clientId,
    s: next.s,
    qc: next.qc,
    qn: next.qn,
    rev: next.rev,
    assignee: next.assignee,
    delivered_at: next.deliveredAt ?? null,
    updated_at: new Date().toISOString(),
  })
  if (csErr) console.error("[cf] cf_client_state upsert:", csErr)

  // 2. Diff kolumner
  const prevCols = prev?.contentBoard?.columns ?? []
  const nextCols = next.contentBoard?.columns ?? []
  const prevColIds = new Set(prevCols.map(c => c.id))
  const nextColIds = new Set(nextCols.map(c => c.id))

  const removedColIds = [...prevColIds].filter(id => !nextColIds.has(id))
  if (removedColIds.length > 0) {
    const { error } = await supabase.from("content_columns").delete().in("id", removedColIds)
    if (error) console.error("[cf] content_columns delete:", error)
  }

  if (nextCols.length > 0) {
    const { error } = await supabase.from("content_columns").upsert(
      nextCols.map((col, i) => ({
        id: col.id,
        kund_id: clientId,
        label: col.label,
        col_order: i,
      }))
    )
    if (error) console.error("[cf] content_columns upsert:", error)
  }

  // 3. Diff kort
  const prevCardIds = new Set(prevCols.flatMap(c => c.cards.map(k => k.id)))
  const nextCards = nextCols.flatMap((col, _ci) =>
    col.cards.map((card, ki) => ({
      ...card,
      column_id: col.id,
      kund_id: clientId,
      card_order: ki,
    }))
  )
  const nextCardIds = new Set(nextCards.map(c => c.id))

  const removedCardIds = [...prevCardIds].filter(id => !nextCardIds.has(id))
  if (removedCardIds.length > 0) {
    const { error } = await supabase.from("content_cards").delete().in("id", removedCardIds)
    if (error) console.error("[cf] content_cards delete:", error)
  }

  if (nextCards.length > 0) {
    const { error } = await supabase.from("content_cards").upsert(
      nextCards.map(card => ({
        id: card.id,
        kund_id: card.kund_id,
        column_id: card.column_id,
        title: card.title,
        notes: card.notes,
        hook: card.hook ?? "",
        status: card.status ?? "idea",
        assignee: card.assignee ?? "",
        card_order: card.card_order,
      }))
    )
    if (error) console.error("[cf] content_cards upsert:", error)

    // Upsert kommentarer för alla kort
    const allComments = nextCards.flatMap(card =>
      (card.comments ?? []).map(c => ({
        id: c.id,
        card_id: card.id,
        text: c.text,
        author: c.author,
        created_at: c.createdAt,
      }))
    )
    if (allComments.length > 0) {
      const { error: cErr } = await supabase.from("card_comments").upsert(allComments)
      if (cErr) console.error("[cf] card_comments upsert:", cErr)
    }
  }

  // 4. Diff content-rader
  const prevRows = prev?.contentTable ?? []
  const nextRows = next.contentTable ?? []
  const prevRowIds = new Set(prevRows.map(r => r.id))
  const nextRowIds = new Set(nextRows.map(r => r.id))

  const removedRowIds = [...prevRowIds].filter(id => !nextRowIds.has(id))
  if (removedRowIds.length > 0) {
    const { error } = await supabase.from("content_rows").delete().in("id", removedRowIds)
    if (error) console.error("[cf] content_rows delete:", error)
  }

  if (nextRows.length > 0) {
    const { error } = await supabase.from("content_rows").upsert(
      nextRows.map((r, i) => ({
        id: r.id,
        kund_id: clientId,
        title: r.title,
        format: r.format,
        pub_date: r.pubDate,
        hook: r.hook,
        notes: r.notes,
        comments: r.comments,
        status: r.status ?? "",
        row_order: i,
      }))
    )
    if (error) console.error("[cf] content_rows upsert:", error)
  }
}

// ── Remap kollisionsbenägna "små" IDs vid migrering ──────────────────
// Standardkolumner skapas med id=1-5, delade av alla kunder → PK-konflikt.
// Använd kund-specifika IDs: kundId * 10000 + gammal_id
function remapSmallIds(kundId: number, state: CFClientState): CFClientState {
  const threshold = 1_000_000
  const cols = state.contentBoard?.columns ?? []

  if (!cols.some(c => c.id < threshold)) return state  // Inga små IDs, ingenting att göra

  const colIdMap = new Map<number, number>()
  const newCols: CFColumn[] = cols.map((col, i) => {
    const newColId = col.id < threshold ? kundId * 10000 + i + 1 : col.id
    colIdMap.set(col.id, newColId)
    return {
      ...col,
      id: newColId,
      cards: col.cards.map(card => ({
        ...card,
        id: card.id < threshold ? kundId * 100000 + card.id : card.id,
        comments: (card.comments ?? []).map(cm => ({
          ...cm,
          id: cm.id < threshold ? kundId * 1000000 + cm.id : cm.id,
        })),
      })),
    }
  })

  const newRows = (state.contentTable ?? []).map(row => ({
    ...row,
    id: row.id < threshold ? kundId * 100000 + row.id : row.id,
  }))

  return { ...state, contentBoard: { columns: newCols }, contentTable: newRows }
}

// ── Provider ──────────────────────────────────────────────────────────
export function CfProvider({ children }: { children: React.ReactNode }) {
  const [cfState, setCfState] = useState<CfStateMap>({})
  const [team, setTeamState] = useState<CFMember[]>([])
  const [teams, setTeamsState] = useState<CFTeam[]>([])
  const [cfLoading, setCfLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(true)
  const cfStateRef = useRef<CfStateMap>({})

  // Hämta alla tabeller och sätt ihop state
  const reloadAll = useCallback(async () => {
    const [csRes, colRes, cardRes, commentRes, rowRes] = await Promise.all([
      supabase.from("cf_client_state").select("*"),
      supabase.from("content_columns").select("*").order("col_order"),
      supabase.from("content_cards").select("*").order("card_order"),
      supabase.from("card_comments").select("*").order("id"),
      supabase.from("content_rows").select("*").order("row_order"),
    ])

    const assembled = assembleState(
      (csRes.data ?? []) as DbCfClientState[],
      (colRes.data ?? []) as DbColumn[],
      (cardRes.data ?? []) as DbCard[],
      (commentRes.data ?? []) as DbComment[],
      (rowRes.data ?? []) as DbRow[],
    )
    setCfState(assembled)
    cfStateRef.current = assembled
    return assembled
  }, [])

  useEffect(() => {
    async function init() {
      // Hämta team och content parallellt
      const [membersRes, teamsRes, assembled] = await Promise.all([
        supabase.from("cf_members").select("*").order("id"),
        supabase.from("cf_teams").select("*").order("id"),
        reloadAll(),
      ])

      // Team members
      const members = (membersRes.data ?? []) as DbMember[]
      setTeamState(members.map(m => ({ id: m.id, name: m.name, color: m.color })))
      setTeamLoading(false)

      // Teams (grupper)
      const dbTeams = (teamsRes.data ?? []) as DbTeam[]
      setTeamsState(dbTeams.map(t => ({ id: t.id, name: t.name, memberIds: t.member_ids ?? [] })))

      // ── Automatisk migrering från gamla app_state JSON-blobs ─────────
      // Körs bara om de nya tabellerna är tomma
      const isEmpty = Object.keys(assembled).length === 0

      if (isEmpty) {
        const [oldCfRes, oldTeamRes] = await Promise.all([
          supabase.from("app_state").select("data").eq("id", "cf-state").single(),
          supabase.from("app_state").select("data").eq("id", "cf-team").single(),
        ])

        if (oldCfRes.data?.data && typeof oldCfRes.data.data === "object") {
          console.log("[cf-migration] Migrerar cf-state till dedikerade tabeller...")
          const stateMap = oldCfRes.data.data as Record<string, CFClientState>
          for (const [kundIdStr, state] of Object.entries(stateMap)) {
            const kundId = Number(kundIdStr)
            // Remap eventuella kollisionsbenägna "små" kolumn- och kort-IDs
            // (t.ex. standardkolumner med id=1-5 som delas mellan kunder)
            const remappedState = remapSmallIds(kundId, state)
            await saveCfClientState(kundId, remappedState, undefined)
          }
          await reloadAll()
          console.log("[cf-migration] Klar!")
        }

        if (oldTeamRes.data?.data && Array.isArray(oldTeamRes.data.data) && members.length === 0) {
          const oldMembers = oldTeamRes.data.data as CFMember[]
          if (oldMembers.length > 0) {
            await supabase.from("cf_members").upsert(oldMembers)
            setTeamState(oldMembers)
            console.log("[cf-migration] cf-team migrerat till cf_members")
          }
        }
      }

      // Rensa gamla localStorage-nycklar
      if (typeof window !== "undefined") {
        localStorage.removeItem("cf3-state")
        localStorage.removeItem("cf3-state_updated_at")
        localStorage.removeItem("cf3-team")
        localStorage.removeItem("cf3-team_updated_at")
      }

      setCfLoading(false)
    }

    init()

    // ── Realtime-prenumerationer ───────────────────────────────────────
    const reload = () => { reloadAll() }

    const channels = [
      supabase.channel("cf_client_state_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "cf_client_state" }, reload)
        .subscribe(),
      supabase.channel("content_columns_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "content_columns" }, reload)
        .subscribe(),
      supabase.channel("content_cards_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "content_cards" }, reload)
        .subscribe(),
      supabase.channel("content_rows_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "content_rows" }, reload)
        .subscribe(),
      supabase.channel("cf_members_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "cf_members" }, async () => {
          const { data } = await supabase.from("cf_members").select("*").order("id")
          if (data) setTeamState((data as DbMember[]).map(m => ({ id: m.id, name: m.name, color: m.color })))
        })
        .subscribe(),
      supabase.channel("cf_teams_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "cf_teams" }, async () => {
          const { data } = await supabase.from("cf_teams").select("*").order("id")
          if (data) setTeamsState((data as DbTeam[]).map(t => ({ id: t.id, name: t.name, memberIds: t.member_ids ?? [] })))
        })
        .subscribe(),
    ]

    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateCfClient = useCallback(
    (clientId: number, state: CFClientState) => {
      const prev = cfStateRef.current[clientId]
      const next = { ...cfStateRef.current, [clientId]: state }
      cfStateRef.current = next
      setCfState(next)
      saveCfClientState(clientId, state, prev)
    },
    []
  )

  const setTeams = useCallback(async (newTeams: CFTeam[]) => {
    setTeamsState(newTeams)
    const { data: existing } = await supabase.from("cf_teams").select("id")
    const existingIds = (existing ?? []).map((r: { id: number }) => r.id)
    const newIds = new Set(newTeams.map(t => t.id))
    const toDelete = existingIds.filter((id: number) => !newIds.has(id))

    if (toDelete.length > 0) {
      await supabase.from("cf_teams").delete().in("id", toDelete)
    }
    if (newTeams.length > 0) {
      await supabase.from("cf_teams").upsert(
        newTeams.map(t => ({ id: t.id, name: t.name, member_ids: t.memberIds }))
      )
    }
  }, [])

  const setTeam = useCallback(async (members: CFMember[]) => {
    setTeamState(members)
    // Full ersättning: ta bort alla, sätt in nya
    // (liten lista, aldrig mer än ~10 medlemmar)
    const { data: existing } = await supabase.from("cf_members").select("id")
    const existingIds = (existing ?? []).map((r: { id: number }) => r.id)
    const newIds = new Set(members.map(m => m.id))
    const toDelete = existingIds.filter((id: number) => !newIds.has(id))

    if (toDelete.length > 0) {
      await supabase.from("cf_members").delete().in("id", toDelete)
    }
    if (members.length > 0) {
      await supabase.from("cf_members").upsert(members)
    }
  }, [])

  return (
    <CfContext.Provider value={{ cfState, cfLoading, updateCfClient, team, teamLoading, setTeam, teams, setTeams }}>
      {children}
    </CfContext.Provider>
  )
}


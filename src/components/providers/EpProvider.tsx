"use client"

import { createContext, useContext, useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { EP_KEY } from "@/lib/editor-types"
import type { EditorClientState, EditorRow, EditorStatus, ApprovedStatus } from "@/lib/editor-types"

type EpState = Record<number, EditorClientState>

interface EpContextValue {
  epState: EpState
  epLoading: boolean
  getClientRows: (clientId: number) => EditorRow[]
  updateClientRows: (clientId: number, rows: EditorRow[]) => void
}

const EpContext = createContext<EpContextValue | null>(null)

export function useEp() {
  const ctx = useContext(EpContext)
  if (!ctx) throw new Error("useEp must be used inside EpProvider")
  return ctx
}

// ── Row ↔ EditorRow mapping ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEditorRow(row: Record<string, any>): EditorRow {
  return {
    id: row.id as number,
    status: (row.status as EditorStatus) ?? "",
    comments: (row.comments as string) ?? "",
    approved: (row.approved as ApprovedStatus) ?? "",
    materialDate: (row.material_date as string) ?? "",
    deadline: (row.deadline as string) ?? "",
    linkBank: (row.link_bank as string) ?? "",
    linkFeedback: (row.link_feedback as string) ?? "",
    linkSocial: (row.link_social as string) ?? "",
  }
}

function editorRowToDbRow(kundId: number, row: EditorRow, sortOrder: number) {
  return {
    id: row.id > 99999 ? undefined : row.id, // skip temp IDs
    kund_id: kundId,
    sort_order: sortOrder,
    status: row.status,
    comments: row.comments,
    approved: row.approved,
    material_date: row.materialDate,
    deadline: row.deadline,
    link_bank: row.linkBank,
    link_feedback: row.linkFeedback,
    link_social: row.linkSocial,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function EpProvider({ children }: { children: React.ReactNode }) {
  const [epState, setEpState] = useState<EpState>({})
  const [epLoading, setEpLoading] = useState(true)

  // ── Mount: migrate localStorage → Supabase, then load ──────────────────────
  useEffect(() => {
    async function init() {
      // One-time migration from localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(EP_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as Record<number, EditorClientState>
            const rows: ReturnType<typeof editorRowToDbRow>[] = []
            for (const [kundIdStr, clientState] of Object.entries(parsed)) {
              const kundId = Number(kundIdStr)
              clientState.rows.forEach((row, idx) => {
                const dbRow = editorRowToDbRow(kundId, row, idx)
                if (dbRow.id !== undefined) rows.push(dbRow)
                else rows.push({ ...dbRow, id: undefined })
              })
            }
            if (rows.length > 0) {
              // Insert without IDs to let Supabase generate them
              const rowsNoId = rows.map(({ id: _id, ...rest }) => rest)
              await supabase.from("ep_rows").insert(rowsNoId)
            }
            localStorage.removeItem(EP_KEY)
          }
        } catch {}
      }

      // Load from Supabase
      const { data } = await supabase.from("ep_rows").select("*").order("kund_id").order("sort_order")
      if (data) {
        const state: EpState = {}
        for (const row of data) {
          const kundId = row.kund_id as number
          if (!state[kundId]) state[kundId] = { rows: [] }
          state[kundId].rows.push(rowToEditorRow(row))
        }
        setEpState(state)
      }
      setEpLoading(false)
    }
    init()
  }, [])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("ep_rows_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "ep_rows" }, async () => {
        // Re-fetch on any change (simpler than partial updates for this table)
        const { data } = await supabase.from("ep_rows").select("*").order("kund_id").order("sort_order")
        if (data) {
          const state: EpState = {}
          for (const row of data) {
            const kundId = row.kund_id as number
            if (!state[kundId]) state[kundId] = { rows: [] }
            state[kundId].rows.push(rowToEditorRow(row))
          }
          setEpState(state)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── API ───────────────────────────────────────────────────────────────────
  const getClientRows = useCallback(
    (clientId: number): EditorRow[] => epState[clientId]?.rows ?? [],
    [epState]
  )

  const updateClientRows = useCallback(async (clientId: number, rows: EditorRow[]) => {
    // Optimistic update
    setEpState(prev => ({ ...prev, [clientId]: { rows } }))

    // Get existing DB row IDs for this client
    const { data: existing } = await supabase
      .from("ep_rows")
      .select("id")
      .eq("kund_id", clientId)

    const existingIds = new Set((existing ?? []).map((r: { id: number }) => r.id))
    const newIds = new Set(rows.filter(r => r.id <= 99999).map(r => r.id))

    // Delete rows that were removed (existed in DB but not in new rows)
    const toDelete = [...existingIds].filter(id => !newIds.has(id))
    if (toDelete.length > 0) {
      await supabase.from("ep_rows").delete().in("id", toDelete)
    }

    // Upsert all rows
    const upsertRows = rows.map((row, idx) => {
      const dbRow = editorRowToDbRow(clientId, row, idx)
      // Only include id if it's a real DB id (not a temp id)
      if (row.id > 99999) {
        const { id: _id, ...rest } = dbRow
        return rest
      }
      return dbRow
    })

    const { data: upserted } = await supabase
      .from("ep_rows")
      .upsert(upsertRows, { onConflict: "id" })
      .select()

    // Update state with real IDs for newly inserted rows
    if (upserted) {
      setEpState(prev => ({
        ...prev,
        [clientId]: { rows: upserted.map(rowToEditorRow) }
      }))
    }
  }, [])

  return (
    <EpContext.Provider value={{ epState, epLoading, getClientRows, updateClientRows }}>
      {children}
    </EpContext.Provider>
  )
}

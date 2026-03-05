"use client"

import { createContext, useContext, useCallback } from "react"
import { useSyncedState } from "@/lib/use-synced-state"
import { EP_KEY } from "@/lib/editor-types"
import type { EditorClientState, EditorRow } from "@/lib/editor-types"

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

function getInitialEpState(): EpState {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(EP_KEY)
    return raw ? (JSON.parse(raw) as EpState) : {}
  } catch { return {} }
}

export function EpProvider({ children }: { children: React.ReactNode }) {
  const [epState, setEpStateRaw, epLoading] = useSyncedState<EpState>(
    "ep-state",
    EP_KEY,
    getInitialEpState(),
  )

  const getClientRows = useCallback(
    (clientId: number): EditorRow[] => epState[clientId]?.rows ?? [],
    [epState]
  )

  const updateClientRows = useCallback(
    (clientId: number, rows: EditorRow[]) => {
      setEpStateRaw(prev => ({ ...prev, [clientId]: { rows } }))
    },
    [setEpStateRaw]
  )

  return (
    <EpContext.Provider value={{ epState, epLoading, getClientRows, updateClientRows }}>
      {children}
    </EpContext.Provider>
  )
}

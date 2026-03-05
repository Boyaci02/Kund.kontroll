"use client"

import { createContext, useContext, useCallback } from "react"
import { useSyncedState } from "@/lib/use-synced-state"
import type { CFClientState, CFMember } from "@/lib/contentflow-types"

const CF_STATE_KEY = "cf3-state"
const CF_TEAM_KEY  = "cf3-team"

type CfStateMap = Record<number, CFClientState>

interface CfContextValue {
  cfState: CfStateMap
  cfLoading: boolean
  updateCfClient: (clientId: number, state: CFClientState) => void
  team: CFMember[]
  teamLoading: boolean
  setTeam: (team: CFMember[]) => void
}

const CfContext = createContext<CfContextValue | null>(null)

export function useCf() {
  const ctx = useContext(CfContext)
  if (!ctx) throw new Error("useCf must be used inside CfProvider")
  return ctx
}

function getInitialCfState(): CfStateMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(CF_STATE_KEY)
    return raw ? (JSON.parse(raw) as CfStateMap) : {}
  } catch { return {} }
}

function getInitialCfTeam(): CFMember[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CF_TEAM_KEY)
    return raw ? (JSON.parse(raw) as CFMember[]) : []
  } catch { return [] }
}

export function CfProvider({ children }: { children: React.ReactNode }) {
  const [cfState, setCfStateRaw, cfLoading] = useSyncedState<CfStateMap>(
    "cf-state",
    CF_STATE_KEY,
    getInitialCfState(),
  )

  const [team, setTeamRaw, teamLoading] = useSyncedState<CFMember[]>(
    "cf-team",
    CF_TEAM_KEY,
    getInitialCfTeam(),
  )

  const updateCfClient = useCallback(
    (clientId: number, state: CFClientState) => {
      setCfStateRaw(prev => ({ ...prev, [clientId]: state }))
    },
    [setCfStateRaw]
  )

  const setTeam = useCallback(
    (t: CFMember[]) => setTeamRaw(t),
    [setTeamRaw]
  )

  return (
    <CfContext.Provider value={{ cfState, cfLoading, updateCfClient, team, teamLoading, setTeam }}>
      {children}
    </CfContext.Provider>
  )
}

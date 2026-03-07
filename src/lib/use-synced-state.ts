"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

/**
 * Generic hook that mirrors the DBProvider pattern for any piece of app state.
 * - Loads from localStorage immediately (no flash)
 * - Fetches from Supabase on mount (source of truth — unless local is newer)
 * - Subscribes to realtime changes so all employees stay in sync
 * - On update: saves to localStorage + upserts to Supabase
 *
 * Merge strategy: timestamp-based. Whichever side was written more recently wins.
 * This prevents a stale/empty Supabase row from overwriting valid local data
 * after a failed sync or a fresh deployment.
 */
export function useSyncedState<T>(
  supabaseId: string,
  localKey: string,
  initial: T,
  migrate?: (raw: unknown) => T,
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const TS_KEY = `${localKey}_updated_at`

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial
    try {
      const raw = localStorage.getItem(localKey)
      if (!raw) return initial
      const parsed = JSON.parse(raw) as unknown
      return migrate ? migrate(parsed) : (parsed as T)
    } catch {
      return initial
    }
  })
  const [loading, setLoading] = useState(true)
  const stateRef = useRef(state)

  useEffect(() => {
    async function init() {
      // Fetch from Supabase — include updated_at for timestamp comparison
      const { data, error } = await supabase
        .from("app_state")
        .select("data, updated_at")
        .eq("id", supabaseId)
        .single()

      if (!error && data?.data != null) {
        const supabaseTs = new Date(data.updated_at ?? 0).getTime()
        const localTs = Number(localStorage.getItem(TS_KEY) ?? 0)

        if (localTs > supabaseTs) {
          // Local data is newer — push it to Supabase, don't overwrite local
          supabase
            .from("app_state")
            .upsert({ id: supabaseId, data: stateRef.current, updated_at: new Date().toISOString() })
            .then(r => { if (r?.error) console.error(`[sync:${supabaseId}] push-local failed:`, r.error) })
        } else {
          // Supabase is newer or same — use Supabase data (existing behavior)
          const remote = migrate
            ? migrate(data.data as unknown)
            : (data.data as T)
          setState(remote)
          stateRef.current = remote
          try {
            localStorage.setItem(localKey, JSON.stringify(remote))
            localStorage.setItem(TS_KEY, String(supabaseTs))
          } catch {}
        }
      } else {
        // First time or Supabase empty — seed Supabase with local data
        await supabase
          .from("app_state")
          .upsert({ id: supabaseId, data: stateRef.current, updated_at: new Date().toISOString() })
      }
      setLoading(false)
    }

    init()

    // Realtime subscription
    const channel = supabase
      .channel(`synced_state_${supabaseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state", filter: `id=eq.${supabaseId}` },
        (payload) => {
          const row = payload.new as { id?: string; data?: unknown; updated_at?: string }
          if (row?.id !== supabaseId) return
          const remote = row.data
          const parsed = migrate ? migrate(remote) : (remote as T)
          setState(parsed)
          stateRef.current = parsed
          try {
            localStorage.setItem(localKey, JSON.stringify(parsed))
            if (row.updated_at) {
              localStorage.setItem(TS_KEY, String(new Date(row.updated_at).getTime()))
            }
          } catch {}
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseId, localKey])

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const next = typeof updater === "function"
        ? (updater as (p: T) => T)(stateRef.current)
        : updater
      stateRef.current = next
      try {
        localStorage.setItem(localKey, JSON.stringify(next))
        localStorage.setItem(TS_KEY, String(Date.now()))
      } catch {}
      setState(next)
      supabase
        .from("app_state")
        .upsert({ id: supabaseId, data: next, updated_at: new Date().toISOString() })
        .then((result) => {
          if (result?.error) console.error(`[sync:${supabaseId}] upsert failed:`, result.error)
        })
    },
    [supabaseId, localKey, TS_KEY]
  )

  return [state, set, loading]
}

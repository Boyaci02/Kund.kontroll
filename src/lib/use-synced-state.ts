"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

/**
 * Generic hook that mirrors the DBProvider pattern for any piece of app state.
 * - Loads from localStorage immediately (no flash)
 * - Fetches from Supabase on mount (source of truth)
 * - Subscribes to realtime changes so all employees stay in sync
 * - On update: saves to localStorage + upserts to Supabase
 */
export function useSyncedState<T>(
  supabaseId: string,
  localKey: string,
  initial: T,
  migrate?: (raw: unknown) => T,
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
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
      // 1. Load local first (already done in useState initializer)
      // 2. Fetch from Supabase (source of truth)
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("id", supabaseId)
        .single()

      if (!error && data?.data != null) {
        const remote = migrate
          ? migrate(data.data as unknown)
          : (data.data as T)
        setState(remote)
        stateRef.current = remote
        try { localStorage.setItem(localKey, JSON.stringify(remote)) } catch {}
      } else {
        // First time — seed Supabase with local data
        await supabase
          .from("app_state")
          .upsert({ id: supabaseId, data: stateRef.current, updated_at: new Date().toISOString() })
      }
      setLoading(false)
    }

    init()

    // 3. Realtime subscription
    const channel = supabase
      .channel(`synced_state_${supabaseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state", filter: `id=eq.${supabaseId}` },
        (payload) => {
          const remote = (payload.new as { data: unknown }).data
          const parsed = migrate ? migrate(remote) : (remote as T)
          setState(parsed)
          stateRef.current = parsed
          try { localStorage.setItem(localKey, JSON.stringify(parsed)) } catch {}
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
      try { localStorage.setItem(localKey, JSON.stringify(next)) } catch {}
      setState(next)
      // Explicit callback required to trigger the HTTP request in postgrest-js
      supabase
        .from("app_state")
        .upsert({ id: supabaseId, data: next, updated_at: new Date().toISOString() })
        .then((result) => {
          if (result?.error) console.error(`[sync:${supabaseId}] upsert failed:`, result.error)
        })
    },
    [supabaseId, localKey]
  )

  return [state, set, loading]
}

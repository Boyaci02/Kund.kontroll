"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  description?: string
}

export interface NewCalendarEvent {
  summary: string
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
  description?: string
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minuter

export function useGoogleCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  // Track the last month fetched so auto-refresh knows what to re-fetch
  const activeMonthRef = useRef<Date | null>(null)

  const fetchEvents = useCallback(async (month: Date) => {
    activeMonthRef.current = month
    const year = month.getFullYear()
    const m = month.getMonth()
    const timeMin = new Date(year, m, 1).toISOString()
    const timeMax = new Date(year, m + 1, 0, 23, 59, 59).toISOString()

    setLoading(true)
    try {
      const res = await fetch(
        `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      )
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh: every 5 min + on tab focus
  useEffect(() => {
    function refresh() {
      if (activeMonthRef.current) fetchEvents(activeMonthRef.current)
    }

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [fetchEvents])

  const createEvent = useCallback(
    async (event: NewCalendarEvent): Promise<boolean> => {
      try {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        })
        return res.ok
      } catch {
        return false
      }
    },
    []
  )

  return { events, loading, fetchEvents, createEvent }
}

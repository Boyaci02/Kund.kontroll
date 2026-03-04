"use client"

import { useState, useCallback } from "react"

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

export function useGoogleCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async (month: Date) => {
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

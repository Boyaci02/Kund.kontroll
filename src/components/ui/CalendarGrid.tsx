"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Kund } from "@/lib/types"
import type { CalendarEvent } from "@/hooks/useGoogleCalendar"

// ─── Swedish month names ──────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
]
const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"]

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mars: 2, mar: 2, apr: 3, maj: 4,
  jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
}

// ─── Parse the free-text `nr` field into Date[] ───────────────────────────────
function parseNrDates(nr: string, year: number): Date[] {
  if (!nr) return []
  const lower = nr.toLowerCase().trim()
  if (["?", "avvakta", "planera inspelning", ""].includes(lower)) return []

  const dates: Date[] = []
  // Split on "+" to handle "9 mars + 11 mars"
  const parts = nr.split("+").map((p) => p.trim())

  for (const part of parts) {
    // Format: "10 mars", "4 mars"
    const dayMonth = part.match(/^(\d{1,2})\s+(\w+)$/i)
    if (dayMonth) {
      const day = parseInt(dayMonth[1])
      const month = MONTH_MAP[dayMonth[2].toLowerCase()]
      if (month !== undefined && day >= 1 && day <= 31) {
        dates.push(new Date(year, month, day))
      }
      continue
    }

    // Format: "Mar V.2", "Mar V.3"
    const weekMatch = part.match(/^(\w+)\s+v\.?(\d)$/i)
    if (weekMatch) {
      const month = MONTH_MAP[weekMatch[1].toLowerCase()]
      const week = parseInt(weekMatch[2])
      if (month !== undefined && week >= 1 && week <= 5) {
        const startDay = (week - 1) * 7 + 1
        dates.push(new Date(year, month, startDay))
      }
    }
  }
  return dates
}

// ─── Format date to YYYY-MM-DD for Google Calendar ───────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

interface CalendarGridProps {
  clients: Kund[]
  googleEvents: CalendarEvent[]
  loading?: boolean
  onMonthChange: (month: Date) => void
  onAddToCalendar?: (kund: Kund, date: Date) => void
}

export function CalendarGrid({
  clients,
  googleEvents,
  loading = false,
  onMonthChange,
  onAddToCalendar,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  function navigate(delta: number) {
    const next = new Date(year, month + delta, 1)
    setCurrentMonth(next)
    setSelectedDay(null)
    onMonthChange(next)
  }

  // Build day → clients map
  const clientsByDay = useMemo(() => {
    const map = new Map<number, Array<{ kund: Kund; date: Date }>>()
    for (const kund of clients) {
      const dates = parseNrDates(kund.nr, year)
      for (const d of dates) {
        if (d.getMonth() === month) {
          const day = d.getDate()
          if (!map.has(day)) map.set(day, [])
          map.get(day)!.push({ kund, date: d })
        }
      }
    }
    return map
  }, [clients, year, month])

  // Build day → Google events map
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const event of googleEvents) {
      if (!event.start) continue
      const d = new Date(event.start)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(event)
      }
    }
    return map
  }, [googleEvents, year, month])

  // Build calendar cells
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month

  // Selected day data
  const selectedClients = selectedDay !== null ? (clientsByDay.get(selectedDay) ?? []) : []
  const selectedEvents = selectedDay !== null ? (eventsByDay.get(selectedDay) ?? []) : []

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(-1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => navigate(1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="min-h-[44px]" />
          }

          const kundsOnDay = clientsByDay.get(day) ?? []
          const eventsOnDay = eventsByDay.get(day) ?? []
          const isToday = isCurrentMonth && today.getDate() === day
          const isSelected = selectedDay === day
          const hasActivity = kundsOnDay.length > 0 || eventsOnDay.length > 0

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                "relative min-h-[44px] rounded-lg p-1 text-left transition-colors flex flex-col",
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
                isToday && !isSelected && "ring-1 ring-primary"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium leading-none",
                  isToday ? "text-primary font-bold" : "text-foreground",
                  !hasActivity && "text-muted-foreground"
                )}
              >
                {day}
              </span>
              {/* Dots */}
              <div className="flex flex-wrap gap-0.5 mt-1">
                {kundsOnDay.slice(0, 3).map(({ kund }) => (
                  <div
                    key={kund.id}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                    title={kund.name}
                  />
                ))}
                {eventsOnDay.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    title={e.summary}
                  />
                ))}
                {kundsOnDay.length + eventsOnDay.length > 4 && (
                  <span className="text-[8px] text-muted-foreground leading-none mt-0.5">
                    +{kundsOnDay.length + eventsOnDay.length - 4}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Hämtar händelser...
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground">Inspelning (kund)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">Google Kalender</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && (selectedClients.length > 0 || selectedEvents.length > 0) && (
        <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {new Date(year, month, selectedDay).toLocaleDateString("sv-SE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          {/* Client recordings */}
          {selectedClients.map(({ kund, date }) => (
            <div key={kund.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-foreground">{kund.name}</p>
                {kund.vg && (
                  <p className="text-[10px] text-muted-foreground">VG: {kund.vg}</p>
                )}
              </div>
              {onAddToCalendar && (
                <button
                  onClick={() => onAddToCalendar(kund, date)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
                  title="Lägg till i Google Kalender"
                >
                  <CalendarPlus className="h-3 w-3" />
                  Lägg till
                </button>
              )}
            </div>
          ))}

          {/* Google Calendar events */}
          {selectedEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <p className="text-xs text-foreground">{e.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

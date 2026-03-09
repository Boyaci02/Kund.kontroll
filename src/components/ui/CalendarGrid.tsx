"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarPlus, Camera, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Kund } from "@/lib/types"
import { TEAM_FARGER } from "@/lib/types"
import type { CalendarEvent } from "@/hooks/useGoogleCalendar"
import type { Task } from "@/lib/task-types"

// ─── Swedish month names ──────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
]
const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"]

// Re-export from shared module for backwards compatibility
export { parseNrDates } from "@/lib/nr-parser"

interface CalendarGridProps {
  clients: Kund[]
  googleEvents: CalendarEvent[]
  loading?: boolean
  tasks?: Task[]
  onMonthChange: (month: Date) => void
  onAddToCalendar?: (kund: Kund, date: Date) => void
  onDaySelect?: (day: number | null) => void
}

export function CalendarGrid({
  clients,
  googleEvents,
  loading = false,
  tasks = [],
  onMonthChange,
  onAddToCalendar,
  onDaySelect,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  function selectDay(day: number | null) {
    setSelectedDay(day)
    onDaySelect?.(day)
  }

  function navigate(delta: number) {
    const next = new Date(year, month + delta, 1)
    setCurrentMonth(next)
    selectDay(null)
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

  // Build day → tasks map (based on endDate YYYY-MM-DD)
  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>()
    const monthStr = String(month + 1).padStart(2, "0")
    const yearStr = String(year)
    for (const task of tasks) {
      if (!task.endDate) continue
      // endDate format: YYYY-MM-DD
      const prefix = `${yearStr}-${monthStr}-`
      if (task.endDate.startsWith(prefix)) {
        const day = parseInt(task.endDate.slice(8, 10))
        if (day >= 1 && day <= 31) {
          if (!map.has(day)) map.set(day, [])
          map.get(day)!.push(task)
        }
      }
    }
    return map
  }, [tasks, year, month])

  // Build calendar cells
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const selectedClients = selectedDay !== null ? (clientsByDay.get(selectedDay) ?? []) : []
  const selectedEvents = selectedDay !== null ? (eventsByDay.get(selectedDay) ?? []) : []
  const selectedTasks = selectedDay !== null ? (tasksByDay.get(selectedDay) ?? []) : []
  const selectedDate = selectedDay !== null ? new Date(year, month, selectedDay) : null

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-base font-bold text-foreground tracking-wide">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => navigate(1)}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1.5">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-muted-foreground py-1 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="min-h-[72px]" />
          }

          const kundsOnDay = clientsByDay.get(day) ?? []
          const eventsOnDay = eventsByDay.get(day) ?? []
          const tasksOnDay = tasksByDay.get(day) ?? []
          const isToday = isCurrentMonth && today.getDate() === day
          const isSelected = selectedDay === day
          const hasActivity = kundsOnDay.length > 0 || eventsOnDay.length > 0 || tasksOnDay.length > 0

          return (
            <button
              key={day}
              onClick={() => selectDay(isSelected ? null : day)}
              className={cn(
                "relative min-h-[72px] rounded-xl p-1.5 text-left transition-all flex flex-col gap-0.5",
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/40"
                  : hasActivity
                  ? "hover:bg-muted/50"
                  : "hover:bg-muted/30"
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  "text-xs font-semibold leading-none w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                  isToday
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                    : isSelected
                    ? "text-primary font-bold"
                    : hasActivity
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {day}
              </span>

              {/* Activity indicators */}
              {kundsOnDay.length === 1 && (
                <span className="text-[9px] leading-tight font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-md px-0.5 truncate w-full">
                  {kundsOnDay[0].kund.name.split(" ")[0]}
                </span>
              )}
              {kundsOnDay.length === 2 && (
                <>
                  <span className="text-[9px] leading-tight font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-md px-0.5 truncate w-full">
                    {kundsOnDay[0].kund.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] leading-tight font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-md px-0.5 truncate w-full">
                    {kundsOnDay[1].kund.name.split(" ")[0]}
                  </span>
                </>
              )}
              {kundsOnDay.length >= 3 && (
                <>
                  <span className="text-[9px] leading-tight font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-md px-0.5 truncate w-full">
                    {kundsOnDay[0].kund.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] leading-tight font-medium text-amber-600 dark:text-amber-400 rounded-md px-0.5">
                    +{kundsOnDay.length - 1} till
                  </span>
                </>
              )}

              {/* Bottom indicator dots */}
              {(eventsOnDay.length > 0 || tasksOnDay.length > 0) && (
                <div className="flex gap-0.5 mt-auto">
                  {eventsOnDay.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                      title={e.summary}
                    />
                  ))}
                  {tasksOnDay.length > 0 && (
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0"
                      title={`${tasksOnDay.length} uppgift${tasksOnDay.length > 1 ? "er" : ""}`}
                    />
                  )}
                </div>
              )}
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
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 rounded bg-amber-100 dark:bg-amber-900/30" />
          <span className="text-[10px] text-muted-foreground">Inspelning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">Google Kalender</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-[10px] text-muted-foreground">Uppgift</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && selectedDate !== null &&
        (selectedClients.length > 0 || selectedEvents.length > 0 || selectedTasks.length > 0) && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3">
          {/* Date heading */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground capitalize">
              {selectedDate.toLocaleDateString("sv-SE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* Client recordings */}
          {selectedClients.length > 0 && (
            <div className="space-y-2">
              {selectedClients.map(({ kund, date }) => (
                <div
                  key={kund.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{kund.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {kund.vg && (
                        <div className="flex items-center gap-1">
                          <div
                            className="h-3.5 w-3.5 rounded-full shrink-0"
                            style={{ background: TEAM_FARGER[kund.vg] ?? "#9CA3AF" }}
                          />
                          <span className="text-[10px] text-muted-foreground">{kund.vg}</span>
                        </div>
                      )}
                      {kund.ed && kund.ed !== kund.vg && (
                        <div className="flex items-center gap-1">
                          <div
                            className="h-3.5 w-3.5 rounded-full shrink-0"
                            style={{ background: TEAM_FARGER[kund.ed] ?? "#9CA3AF" }}
                          />
                          <span className="text-[10px] text-muted-foreground">{kund.ed}</span>
                        </div>
                      )}
                      {kund.adr && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {kund.adr}
                        </span>
                      )}
                    </div>
                  </div>
                  {onAddToCalendar && (
                    <button
                      onClick={() => onAddToCalendar(kund, date)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium shrink-0 border border-primary/20 rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors"
                      title="Lägg till i Google Kalender"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Lägg till
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          {selectedTasks.length > 0 && (
            <div className="space-y-1.5">
              {selectedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 px-3 py-2"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  {t.assignee && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{t.assignee}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Google Calendar events */}
          {selectedEvents.length > 0 && (
            <div className="space-y-1.5">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2"
                >
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground">{e.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt when day is selected but empty */}
      {selectedDay !== null &&
        selectedClients.length === 0 &&
        selectedEvents.length === 0 &&
        selectedTasks.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Inga inspelningar eller uppgifter den {selectedDay} {MONTH_NAMES[month].toLowerCase()}
          </p>
        </div>
      )}
    </div>
  )
}

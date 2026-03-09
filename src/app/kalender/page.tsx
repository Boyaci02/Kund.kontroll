"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Camera, ClipboardCheck, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDB } from "@/lib/store"
import { useTask } from "@/components/providers/TaskProvider"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { parseNrDates } from "@/components/ui/CalendarGrid"
import { TEAM_FARGER } from "@/lib/types"
import { useRouter } from "next/navigation"
import type { Kund } from "@/lib/types"
import type { Task } from "@/lib/task-types"
import type { CalendarEvent } from "@/hooks/useGoogleCalendar"

// ── Swedish locale ─────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Januari","Februari","Mars","April","Maj","Juni",
  "Juli","Augusti","September","Oktober","November","December",
]
const DAY_NAMES_FULL = ["Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag","Söndag"]
const DAY_NAMES_SHORT = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"]

// ── CalendarEvent types ────────────────────────────────────────────────────────
type EventKind = "recording" | "task" | "google"

interface CalEvent {
  id: string
  kind: EventKind
  title: string
  day: number
  kund?: Kund
  task?: Task
  googleEvent?: CalendarEvent
  date?: Date
}

// ── Build cells for a month ────────────────────────────────────────────────────
function buildCells(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  displayMonth,
  selectedDay,
  onNavigate,
  onDayClick,
  eventDays,
}: {
  displayMonth: Date
  selectedDay: number | null
  onNavigate: (delta: number) => void
  onDayClick: (day: number) => void
  eventDays: Set<number>
}) {
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const cells = buildCells(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onNavigate(-1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => onNavigate(1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground uppercase py-0.5">
            {d[0]}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`p-${i}`} />
          const isToday = isCurrentMonth && today.getDate() === day
          const isSelected = selectedDay === day
          const hasEvent = eventDays.has(day)
          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded-full text-[10px] font-medium mx-auto transition-colors relative",
                isSelected ? "bg-primary text-primary-foreground" :
                isToday ? "ring-2 ring-primary text-primary font-bold" :
                "hover:bg-muted text-foreground"
              )}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary opacity-60" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Day detail panel ──────────────────────────────────────────────────────────
function DayPanel({
  day,
  month,
  year,
  events,
  onClose,
  router,
}: {
  day: number
  month: number
  year: number
  events: CalEvent[]
  onClose: () => void
  router: ReturnType<typeof useRouter>
}) {
  const date = new Date(year, month, day)
  const dateLabel = date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const recordings = events.filter((e) => e.kind === "recording")
  const tasks = events.filter((e) => e.kind === "task")
  const googleEvents = events.filter((e) => e.kind === "google")

  return (
    <div className="border-l border-border bg-card h-full flex flex-col" style={{ minWidth: 280, maxWidth: 320 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-xs font-semibold text-foreground capitalize">{dateLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors text-sm"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {events.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Inga händelser denna dag</p>
        )}

        {recordings.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Inspelningar</p>
            <div className="space-y-2">
              {recordings.map((e) => (
                <button
                  key={e.id}
                  onClick={() => e.kund && router.push(`/kunder/${e.kund.id}`)}
                  className="w-full text-left rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{e.kund?.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {e.kund?.vg && (
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full" style={{ background: TEAM_FARGER[e.kund.vg] ?? "#9CA3AF" }} />
                        <span className="text-[10px] text-muted-foreground">{e.kund.vg}</span>
                      </div>
                    )}
                    {e.kund?.ed && e.kund.ed !== e.kund.vg && (
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full" style={{ background: TEAM_FARGER[e.kund.ed] ?? "#9CA3AF" }} />
                        <span className="text-[10px] text-muted-foreground">{e.kund.ed}</span>
                      </div>
                    )}
                    {e.kund?.adr && <span className="text-[10px] text-muted-foreground">{e.kund.adr}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">Uppgifter</p>
            <div className="space-y-2">
              {tasks.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-900/20 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">{e.task?.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {e.task?.assignee && <span className="text-[10px] text-muted-foreground">{e.task.assignee}</span>}
                    {e.task?.priority && (
                      <span className={cn(
                        "text-[9px] font-semibold rounded-full px-1.5 py-0.5 uppercase",
                        e.task.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        e.task.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {e.task.priority === "high" ? "Hög" : e.task.priority === "medium" ? "Medium" : "Låg"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {googleEvents.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Google Kalender</p>
            <div className="space-y-2">
              {googleEvents.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">{e.googleEvent?.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main calendar page ─────────────────────────────────────────────────────────
export default function KalenderPage() {
  const { db } = useDB()
  const { tasks } = useTask()
  const { events: googleEvents, loading, fetchEvents } = useGoogleCalendar()
  const router = useRouter()

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const cells = useMemo(() => buildCells(year, month), [year, month])

  useEffect(() => {
    fetchEvents(currentMonth)
  }, [fetchEvents, currentMonth])

  function navigate(delta: number) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setSelectedDay(null)
  }

  function goToday() {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(today.getDate())
  }

  const handleMonthChange = useCallback(
    (m: Date) => { fetchEvents(m) },
    [fetchEvents]
  )
  void handleMonthChange

  // Build events map: day → CalEvent[]
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalEvent[]>()

    function add(day: number, ev: CalEvent) {
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(ev)
    }

    // Recordings from clients
    for (const kund of db.clients) {
      const dates = parseNrDates(kund.nr, year)
      for (const d of dates) {
        if (d.getMonth() === month) {
          add(d.getDate(), {
            id: `rec-${kund.id}-${d.getDate()}`,
            kind: "recording",
            title: kund.name,
            day: d.getDate(),
            kund,
            date: d,
          })
        }
      }
    }

    // Tasks with endDate in this month
    const monthStr = String(month + 1).padStart(2, "0")
    const prefix = `${year}-${monthStr}-`
    for (const task of tasks) {
      if (!task.endDate || !task.endDate.startsWith(prefix)) continue
      const day = parseInt(task.endDate.slice(8, 10))
      if (day >= 1 && day <= 31) {
        add(day, {
          id: `task-${task.id}`,
          kind: "task",
          title: task.title,
          day,
          task,
        })
      }
    }

    // Google Calendar events
    for (const ev of googleEvents) {
      if (!ev.start) continue
      const d = new Date(ev.start)
      if (d.getFullYear() === year && d.getMonth() === month) {
        add(d.getDate(), {
          id: `gcal-${ev.id}`,
          kind: "google",
          title: ev.summary ?? "",
          day: d.getDate(),
          googleEvent: ev,
        })
      }
    }

    return map
  }, [db.clients, tasks, googleEvents, year, month])

  // All days that have at least one event (for mini-calendar dots)
  const eventDays = useMemo(() => new Set(eventsByDay.keys()), [eventsByDay])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const selectedDayEvents = selectedDay !== null ? (eventsByDay.get(selectedDay) ?? []) : []

  return (
    <div className="flex h-[calc(100vh-3.75rem)] overflow-hidden bg-background">

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-y-auto">
        {/* Mini calendar */}
        <MiniCalendar
          displayMonth={currentMonth}
          selectedDay={selectedDay}
          onNavigate={navigate}
          onDayClick={(d) => setSelectedDay((prev) => prev === d ? null : d)}
          eventDays={eventDays}
        />

        <div className="mx-4 border-t border-border" />

        {/* Legend / filters */}
        <div className="px-4 py-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Kalendertyper</p>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-amber-400 shrink-0" />
            <span className="text-xs text-foreground">Inspelningar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-violet-500 shrink-0" />
            <span className="text-xs text-foreground">Uppgifter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-primary shrink-0" />
            <span className="text-xs text-foreground">Google Kalender</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 border-t border-border" />
        <div className="px-4 py-4 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Denna månad</p>
          <div className="flex items-center gap-2">
            <Camera className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {Array.from(eventsByDay.values()).flat().filter(e => e.kind === "recording").length} inspelningar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs text-muted-foreground">
              {Array.from(eventsByDay.values()).flat().filter(e => e.kind === "task").length} deadlines
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">
              {loading ? "Hämtar..." : `${Array.from(eventsByDay.values()).flat().filter(e => e.kind === "google").length} Google-händelser`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main calendar ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background shrink-0">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Idag
          </button>
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-lg font-bold text-foreground">
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border shrink-0 bg-background">
          {DAY_NAMES_FULL.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(110px, 1fr)" }}>
              {cells.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`pad-${i}`}
                      className="border-r border-b border-border last:border-r-0 bg-muted/20"
                    />
                  )
                }

                const dayEvents = eventsByDay.get(day) ?? []
                const isToday = isCurrentMonth && today.getDate() === day
                const isSelected = selectedDay === day
                const MAX_VISIBLE = 3
                const visible = dayEvents.slice(0, MAX_VISIBLE)
                const overflow = dayEvents.length - MAX_VISIBLE

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "border-r border-b border-border last:border-r-0 p-1.5 flex flex-col gap-1 cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold leading-none transition-colors",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : isSelected
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {day}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="flex flex-col gap-0.5 flex-1">
                      {visible.map((ev) => (
                        <EventPill key={ev.id} event={ev} />
                      ))}
                      {overflow > 0 && (
                        <span className="text-[10px] text-muted-foreground px-1 font-medium">
                          +{overflow} till
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day detail panel */}
          {selectedDay !== null && (
            <DayPanel
              day={selectedDay}
              month={month}
              year={year}
              events={selectedDayEvents}
              onClose={() => setSelectedDay(null)}
              router={router}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Event pill component ───────────────────────────────────────────────────────
function EventPill({ event }: { event: CalEvent }) {
  const styles: Record<EventKind, string> = {
    recording: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-l-2 border-amber-400",
    task:      "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 border-l-2 border-violet-500",
    google:    "bg-primary/10 text-primary border-l-2 border-primary",
  }

  return (
    <div className={cn(
      "rounded-sm px-1.5 py-0.5 text-[10px] font-medium truncate leading-tight",
      styles[event.kind]
    )}>
      {event.title}
    </div>
  )
}

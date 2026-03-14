"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { useTask } from "@/components/providers/TaskProvider"
import { useGoogleCalendar, type NewCalendarEvent } from "@/hooks/useGoogleCalendar"
import { CalendarGrid, parseNrDates } from "@/components/ui/CalendarGrid"
import { TEAM_FARGER } from "@/lib/types"
import {
  ArrowRight,
  Film,
  ClipboardCheck,
  Camera,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Kund } from "@/lib/types"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "God natt"
  if (h < 10) return "God morgon"
  if (h < 12) return "God förmiddag"
  if (h < 18) return "God eftermiddag"
  return "God kväll"
}

function formatDate(): string {
  return new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Format a day number + month Date into YYYY-MM-DD
function formatYMD(month: Date, day: number): string {
  const y = month.getFullYear()
  const m = String(month.getMonth() + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const MONTH_NAMES = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
]

export default function OversiktPage() {
  const { db } = useDB()
  const { user } = useAuth()
  const { tasks } = useTask()
  const router = useRouter()
  const { events, loading, fetchEvents, createEvent } = useGoogleCalendar()

  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  const clients = db.clients

  useEffect(() => {
    fetchEvents(new Date())
  }, [fetchEvents])

  // General tasks (not done) assigned to the logged-in user, sorted by endDate
  const myGeneralTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done" && t.assignee === user?.name)
      .sort((a, b) => (a.endDate || "9999") < (b.endDate || "9999") ? -1 : 1)
      .slice(0, 8)
  }, [tasks, user?.name])

  // Tasks for selected day assigned to the logged-in user
  const tasksForSelectedDay = useMemo(() => {
    if (selectedDay === null) return []
    const ymd = formatYMD(calendarMonth, selectedDay)
    return tasks.filter((t) => t.endDate === ymd && t.status !== "done" && t.assignee === user?.name)
  }, [tasks, selectedDay, calendarMonth, user?.name])

  // Recordings for selected day
  const recordingsForSelectedDay = useMemo(() => {
    if (selectedDay === null) return []
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const result: Array<{ kund: Kund; date: Date }> = []
    for (const kund of clients) {
      const dates = parseNrDates(kund.nr, year)
      for (const d of dates) {
        if (d.getMonth() === month && d.getDate() === selectedDay) {
          result.push({ kund, date: d })
        }
      }
    }
    return result
  }, [clients, selectedDay, calendarMonth])

  // Pipeline: active clients with upcoming recordings
  const pipeline = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const today = new Date()

    const withDates = clients
      .filter((c) => c.st === "AKTIV" && c.nr && !["?", "avvakta", "planera inspelning", ""].includes(c.nr.toLowerCase().trim()))
      .flatMap((c) => {
        const dates = parseNrDates(c.nr, year)
        const nearest = dates
          .filter((d) => d >= today || d.toDateString() === today.toDateString())
          .sort((a, b) => a.getTime() - b.getTime())[0]
        return nearest ? [{ kund: c, date: nearest }] : []
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10)

    return withDates
  }, [clients, calendarMonth])

  async function handleAddToCalendar(kund: Kund, date: Date) {
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const event: NewCalendarEvent = {
      summary: `Inspelning: ${kund.name}`,
      start: ymd,
      end: ymd,
      description: [
        kund.vg ? `Videograf: ${kund.vg}` : "",
        kund.ed ? `Redigerare: ${kund.ed}` : "",
        kund.cc && kund.cc !== "Ingen" ? `Content Creator: ${kund.cc}` : "",
        kund.adr ? `Plats: ${kund.adr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    }
    const ok = await createEvent(event)
    if (ok) {
      toast.success(`Lagt till i Google Kalender: ${kund.name}`)
      fetchEvents(calendarMonth)
    } else {
      toast.error("Kunde inte lägga till i Google Kalender")
    }
  }

  const handleMonthChange = useCallback(
    (month: Date) => {
      setCalendarMonth(month)
      fetchEvents(month)
    },
    [fetchEvents]
  )

  const greeting = user ? `${getGreeting()}, ${user.name}!` : getGreeting()
  const date = formatDate()

  const hasSelectedDayContent = recordingsForSelectedDay.length > 0 || tasksForSelectedDay.length > 0

  return (
    <div className="flex h-[calc(100vh-3.75rem)] overflow-hidden">

      {/* ── Vänster panel ─────────────────────────────────────────── */}
      <div className="w-1/2 overflow-y-auto p-6 space-y-5">

        {/* Hälsning */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{date}</p>
        </div>

        {/* Vald dag-sammanfattning */}
        {selectedDay !== null && hasSelectedDayContent && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Camera className="h-3 w-3 text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground capitalize">
                {new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), selectedDay)
                  .toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            {recordingsForSelectedDay.map(({ kund }) => (
              <button
                key={kund.id}
                onClick={() => router.push(`/kunder/${kund.id}`)}
                className="w-full text-left flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 px-3 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{kund.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {kund.vg && (
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: TEAM_FARGER[kund.vg] ?? "#9CA3AF" }} />
                        <span className="text-[10px] text-muted-foreground">{kund.vg}</span>
                      </div>
                    )}
                    {kund.adr && <span className="text-[10px] text-muted-foreground truncate">{kund.adr}</span>}
                  </div>
                </div>
                <Film className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              </button>
            ))}

            {tasksForSelectedDay.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 px-3 py-2"
              >
                <ClipboardCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <p className="text-xs font-medium text-foreground truncate flex-1">{t.title}</p>
                {t.assignee && <span className="text-[10px] text-muted-foreground shrink-0">{t.assignee}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Mina uppgifter */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Mina uppgifter</h2>
              {myGeneralTasks.length > 0 && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                  {myGeneralTasks.length}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground h-7">
              <Link href="/tasks">
                Se alla
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {myGeneralTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Inga öppna uppgifter — bra jobbat!
            </p>
          ) : (
            <div className="space-y-0.5">
              {myGeneralTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push("/tasks")}
                  className="w-full flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/30 transition-colors text-left"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full mt-1 shrink-0",
                      t.priority === "high" ? "bg-red-500" :
                      t.priority === "medium" ? "bg-amber-500" :
                      "bg-muted-foreground/40"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-foreground truncate">{t.title}</p>
                    {t.endDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Deadline: {new Date(t.endDate).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  {t.assignee && (
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{t.assignee}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inspelningspipeline */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Film className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Kommande inspelningar</h2>
            {pipeline.length > 0 && (
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full px-1.5 py-0.5">
                {pipeline.length}
              </span>
            )}
          </div>

          {pipeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Inga kommande inspelningar
            </p>
          ) : (
            <div className="space-y-0.5">
              {pipeline.map(({ kund, date: recDate }) => (
                <button
                  key={kund.id}
                  onClick={() => router.push(`/kunder/${kund.id}`)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/30 transition-colors text-left"
                >
                  {/* Date pill */}
                  <div className="shrink-0 text-center min-w-[36px]">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase leading-none">
                      {MONTH_NAMES[recDate.getMonth()].slice(0, 3)}
                    </p>
                    <p className="text-base font-bold text-foreground leading-none mt-0.5">
                      {recDate.getDate()}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-border shrink-0" />

                  {/* Kund info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{kund.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {[kund.vg, kund.ed].filter(Boolean).map((member) => (
                        <div key={member} className="flex items-center gap-1">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ background: TEAM_FARGER[member!] ?? "#9CA3AF" }}
                          />
                          <span className="text-[10px] text-muted-foreground">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Höger panel (kalender) ─────────────────────────────────── */}
      <div className="w-1/2 border-l border-border overflow-y-auto p-6">
        <CalendarGrid
          clients={clients}
          googleEvents={events}
          loading={loading}
          tasks={myGeneralTasks}
          onMonthChange={handleMonthChange}
          onAddToCalendar={handleAddToCalendar}
          onDaySelect={setSelectedDay}
        />
      </div>

    </div>
  )
}

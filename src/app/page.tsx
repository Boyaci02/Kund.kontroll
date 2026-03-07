"use client"

import { useMemo, useEffect, useCallback } from "react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { useGoogleCalendar, type NewCalendarEvent } from "@/hooks/useGoogleCalendar"
import { OB_STEG } from "@/lib/data"
import { CalendarGrid } from "@/components/ui/CalendarGrid"
import {
  Users,
  UserCheck,
  UserMinus,
  ClipboardCheck,
  CalendarClock,
  ArrowRight,
  Film,
  ClipboardList,
  CheckSquare,
  PhoneCall,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

function StatPill({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType
  value: number | string
  label: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color ?? "text-muted-foreground")} />
      <span className={cn("text-base font-bold leading-none", color ?? "text-foreground")}>{value}</span>
      <span className="text-xs text-muted-foreground leading-none">{label}</span>
    </div>
  )
}

function ActionCard({
  href,
  icon: Icon,
  label,
  subtitle,
  iconColor,
  iconBg,
}: {
  href: string
  icon: React.ElementType
  label: string
  subtitle: string
  iconColor: string
  iconBg: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md hover:border-border/80 transition-all duration-200"
    >
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-auto" />
    </Link>
  )
}

export default function OversiktPage() {
  const { db, toggleTask } = useDB()
  const { user } = useAuth()
  const router = useRouter()
  const { events, loading, fetchEvents, createEvent } = useGoogleCalendar()

  const clients = db.clients
  const aktiva = clients.filter((c) => c.st === "AKTIV").length
  const inaktiva = clients.filter((c) => c.st === "INAKTIV").length

  useEffect(() => {
    fetchEvents(new Date())
  }, [fetchEvents])

  const myTasks = useMemo(() => {
    if (!user) return []
    const result: Array<{
      taskId: string
      text: string
      stepTitle: string
      kund: Kund
      done: boolean
    }> = []

    for (const kund of clients.filter((c) => c.st === "AKTIV" || c.st === "")) {
      const obState = db.obState[kund.id] ?? {}
      for (const steg of OB_STEG) {
        for (const task of steg.tasks) {
          if (
            task.who.toLowerCase() === user.name.toLowerCase() &&
            !obState[task.id]
          ) {
            result.push({
              taskId: task.id,
              text: task.text,
              stepTitle: steg.title,
              kund,
              done: false,
            })
          }
        }
      }
    }
    return result.slice(0, 8)
  }, [clients, db.obState, user])

  const myInspelningar = user
    ? clients.filter((c) => c.st === "AKTIV" && (c.vg === user.name || c.ed === user.name || c.cc === user.name)).length
    : 0

  const kommandeSMS = clients.filter((c) => c.ns && c.st === "AKTIV").slice(0, 8)

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
      fetchEvents(new Date())
    } else {
      toast.error("Kunde inte lägga till i Google Kalender")
    }
  }

  const handleMonthChange = useCallback(
    (month: Date) => {
      fetchEvents(month)
    },
    [fetchEvents]
  )

  const greeting = user ? `${getGreeting()}, ${user.name}!` : getGreeting()
  const date = formatDate()

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{date}</p>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        <StatPill icon={Users} value={clients.length} label="Totalt" />
        <StatPill
          icon={UserCheck}
          value={aktiva}
          label="Aktiva"
          color="text-green-600 dark:text-green-400"
        />
        <StatPill
          icon={UserMinus}
          value={inaktiva}
          label="Inaktiva"
          color="text-muted-foreground"
        />
        <StatPill
          icon={ClipboardCheck}
          value={myTasks.length}
          label="Mina uppgifter"
          color="text-primary"
        />
        <StatPill
          icon={Film}
          value={myInspelningar}
          label="Mina inspelningar"
          color="text-amber-500"
        />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionCard
          href="/tasks"
          icon={ClipboardList}
          label="Tasks"
          subtitle="Hantera uppgifter"
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <ActionCard
          href="/kunder"
          icon={Users}
          label="Kunder"
          subtitle={`${aktiva} aktiva kunder`}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        />
        <ActionCard
          href="/onboarding"
          icon={CheckSquare}
          label="Onboarding"
          subtitle="Onboarding-steg"
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-100 dark:bg-green-900/30"
        />
        <ActionCard
          href="/kundkontakt"
          icon={PhoneCall}
          label="Kundkontakt"
          subtitle="Bokningar & SMS"
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>

      {/* Main grid: Mina uppgifter + Kalender */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {/* Mina uppgifter */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Mina uppgifter</h2>
              {myTasks.length > 0 && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                  {myTasks.length} kvar
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1 text-xs text-muted-foreground h-7"
            >
              <Link href="/tasks">
                Se alla
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Inga uppgifter kvar — bra jobbat! 🎉
            </p>
          ) : (
            <div className="space-y-0.5">
              {myTasks.map((t) => (
                <label
                  key={`${t.kund.id}-${t.taskId}`}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={() => toggleTask(t.kund.id, t.taskId)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-foreground truncate">{t.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.stepTitle}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/kunder/${t.kund.id}`)
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary hover:underline shrink-0 mt-0.5 transition-colors"
                  >
                    {t.kund.name}
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Kalender */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Inspelningskalender</h2>
          <CalendarGrid
            clients={clients}
            googleEvents={events}
            loading={loading}
            onMonthChange={handleMonthChange}
            onAddToCalendar={handleAddToCalendar}
          />
        </div>
      </div>

      {/* Kommande SMS */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Kommande SMS</h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
          {kommandeSMS.length === 0 ? (
            <p className="text-xs text-muted-foreground col-span-4">Inga SMS planerade</p>
          ) : (
            kommandeSMS.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/kunder/${c.id}`)}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{c.ns}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

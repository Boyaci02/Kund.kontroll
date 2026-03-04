"use client"

import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { KONTAKTER } from "@/lib/data"
import { paketClass, statusClass } from "@/lib/helpers"
import { TEAM_FARGER } from "@/lib/types"
import {
  Users,
  UserCheck,
  UserMinus,
  MessageSquare,
  PhoneCall,
  Camera,
  CalendarClock,
  Plus,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <Icon className={cn("h-4 w-4 shrink-0", color ?? "text-muted-foreground")} />
      <span className={cn("text-lg font-bold", color ?? "text-foreground")}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function OversiktPage() {
  const { db } = useDB()
  const { user } = useAuth()
  const router = useRouter()
  const clients = db.clients
  const aktiva = clients.filter((c) => c.st === "AKTIV").length
  const inaktiva = clients.filter((c) => c.st === "INAKTIV").length

  const recentClients = clients.slice(0, 10)

  const kommandeInspelningar = clients
    .filter((c) => c.nr && c.nr !== "Avvakta" && c.nr !== "?" && c.nr !== "")
    .slice(0, 8)

  const kommandeSMS = clients
    .filter((c) => c.ns && c.st === "AKTIV")
    .slice(0, 8)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Översikt</p>
          <h1 className="text-3xl font-bold text-foreground">
            {clients.length} kunder totalt
          </h1>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/kunder">
            <Plus className="h-4 w-4" />
            Ny kund
          </Link>
        </Button>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
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
          icon={MessageSquare}
          value={KONTAKTER.sms.length}
          label="SMS denna månad"
          color="text-primary"
        />
        <StatPill
          icon={PhoneCall}
          value={KONTAKTER.quarterly.length}
          label="Kvartalsamtal"
        />
      </div>

      {/* Recent clients table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Senaste kunder</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground">
            <Link href="/kunder">
              Se alla
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Kund
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Team
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Nästa inspelning
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentClients.map((c) => {
                const members = [
                  ...new Set([c.vg, c.ed, c.cc].filter((x) => x && x !== "Ingen")),
                ]
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/kunder/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.pkg && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-0.5",
                            paketClass(c.pkg)
                          )}
                        >
                          {c.pkg}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {members.map((m) => {
                          const color = TEAM_FARGER[m] ?? "#9CA3AF"
                          return (
                            <div
                              key={m}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card shrink-0"
                              style={{ background: color }}
                              title={m}
                            >
                              {m[0]}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.nr || "–"}
                    </td>
                    <td className="px-4 py-3">
                      {c.st ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            statusClass(c.st)
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {c.st === "AKTIV" ? "Aktiv" : "Inaktiv"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming: Inspelningar + SMS */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Kommande inspelningar</h2>
          </div>
          <div className="space-y-1">
            {kommandeInspelningar.length === 0 ? (
              <p className="text-xs text-muted-foreground">Inga kommande inspelningar</p>
            ) : (
              kommandeInspelningar.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/kunder/${c.id}`)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.nr}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Kommande SMS</h2>
          </div>
          <div className="space-y-1">
            {kommandeSMS.length === 0 ? (
              <p className="text-xs text-muted-foreground">Inga SMS planerade</p>
            ) : (
              kommandeSMS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/kunder/${c.id}`)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.ns}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

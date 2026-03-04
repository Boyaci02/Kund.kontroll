"use client"

import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { KONTAKTER } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserMinus, MessageSquare, PhoneCall, Camera, CalendarClock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function OversiktPage() {
  const { db } = useDB()
  const { user } = useAuth()
  const clients = db.clients
  const aktiva = clients.filter((c) => c.st === "AKTIV").length
  const inaktiva = clients.filter((c) => c.st === "INAKTIV").length

  const kommandeInspelningar = clients
    .filter((c) => c.nr && c.nr !== "Avvakta" && c.nr !== "?" && c.nr !== "")
    .slice(0, 8)

  const kommandeSMS = clients
    .filter((c) => c.ns && c.st === "AKTIV")
    .slice(0, 8)

  const stats = [
    { label: "Totalt kunder", value: clients.length, sub: "I systemet", icon: Users, color: "text-foreground" },
    { label: "Aktiva", value: aktiva, sub: "Just nu", icon: UserCheck, color: "text-green-600 dark:text-green-400" },
    { label: "Inaktiva", value: inaktiva, sub: "Pausade", icon: UserMinus, color: "text-muted-foreground" },
    { label: "SMS denna månad", value: KONTAKTER.sms.length, sub: "Planerade", icon: MessageSquare, color: "text-primary" },
    { label: "Kvartalsamtal", value: KONTAKTER.quarterly.length, sub: "Att ringa", icon: PhoneCall, color: "text-foreground" },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Översikt</h1>
        <p className="text-sm text-muted-foreground mt-1">Välkommen tillbaka, {user?.name ?? "Emanuel"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Button asChild>
          <Link href="/kunder">Hantera kunder</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/onboarding">Visa onboarding</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sms-mallar">SMS-mallar</Link>
        </Button>
      </div>

      {/* Upcoming */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Kommande inspelningar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kommandeInspelningar.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga kommande inspelningar</p>
            ) : (
              kommandeInspelningar.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.nr}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Kommande SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kommandeSMS.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga SMS planerade</p>
            ) : (
              kommandeSMS.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.ns}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

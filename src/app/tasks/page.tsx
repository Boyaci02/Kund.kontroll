"use client"

import { useState, useMemo } from "react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import { OB_STEG } from "@/lib/data"
import { TEAM_FARGER } from "@/lib/types"
import { paketClass, statusClass } from "@/lib/helpers"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Video, Pencil, UserCheck, ClipboardCheck } from "lucide-react"

type Tab = "onboarding" | "inspelning"

const TEAM_FILTER = ["Philip", "Etienne", "Danah", "Edvin", "Jakob", "Sami", "Matteus", "Emanuel"]

export default function TasksPage() {
  const { db, toggleTask } = useDB()
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("onboarding")
  const [selectedMember, setSelectedMember] = useState<string>(user?.name ?? "alla")

  // --- Onboarding tasks grouped by team member ---
  // For each member: aggregate all their tasks across all active clients
  const tasksByMember = useMemo(() => {
    const activeClients = db.clients.filter((c) => c.st === "AKTIV" || c.st === "")

    const members =
      selectedMember === "alla" ? TEAM_FILTER : [selectedMember]

    return members
      .map((member) => {
        const tasks = activeClients.flatMap((kund) => {
          const state = db.obState[kund.id] ?? {}
          return OB_STEG.flatMap((steg) =>
            steg.tasks
              .filter((t) => t.who.toLowerCase() === member.toLowerCase())
              .map((t) => ({
                ...t,
                stepTitle: steg.title,
                stepN: steg.n,
                done: !!state[t.id],
                kund,
              }))
          )
        })
        return { member, tasks }
      })
      .filter(({ tasks }) => tasks.length > 0)
  }, [db.clients, db.obState, selectedMember])

  const totalOnboarding = tasksByMember.reduce((acc, { tasks }) => acc + tasks.length, 0)
  const doneOnboarding = tasksByMember.reduce(
    (acc, { tasks }) => acc + tasks.filter((t) => t.done).length,
    0
  )

  // --- Recording tasks ---
  const videoClients = useMemo(() => {
    if (selectedMember === "alla") return db.clients.filter((c) => c.vg)
    return db.clients.filter((c) => c.vg.toLowerCase() === selectedMember.toLowerCase())
  }, [db.clients, selectedMember])

  const editClients = useMemo(() => {
    if (selectedMember === "alla") return db.clients.filter((c) => c.ed)
    return db.clients.filter((c) => c.ed.toLowerCase() === selectedMember.toLowerCase())
  }, [db.clients, selectedMember])

  const ccClients = useMemo(() => {
    if (selectedMember === "alla") return db.clients.filter((c) => c.cc && c.cc !== "Ingen")
    return db.clients.filter(
      (c) => c.cc.toLowerCase() === selectedMember.toLowerCase() && c.cc !== "Ingen"
    )
  }, [db.clients, selectedMember])

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Uppgifter</h1>
        <p className="text-sm text-muted-foreground mt-1">Tilldelade uppgifter per teammedlem</p>
      </div>

      {/* Member filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={selectedMember === "alla" ? "default" : "outline"}
          onClick={() => setSelectedMember("alla")}
          className="h-8 text-xs"
        >
          Alla
        </Button>
        {TEAM_FILTER.map((name) => {
          const color = TEAM_FARGER[name] ?? "#9CA3AF"
          const isActive = selectedMember === name
          return (
            <button
              key={name}
              onClick={() => setSelectedMember(name)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-colors border",
                isActive
                  ? "text-white border-transparent"
                  : "text-foreground border-border hover:bg-muted"
              )}
              style={isActive ? { background: color, borderColor: color } : {}}
            >
              <div
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: isActive ? "rgba(255,255,255,0.4)" : color }}
              />
              {name}
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["onboarding", "inspelning"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "onboarding" ? "Onboarding-uppgifter" : "Inspelningsuppgifter"}
          </button>
        ))}
      </div>

      {/* Tab: Onboarding — one table per team member */}
      {tab === "onboarding" && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ClipboardCheck className="h-4 w-4" />
            <span>
              {doneOnboarding} av {totalOnboarding} uppgifter klara
            </span>
            {totalOnboarding > 0 && (
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-40">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.round((doneOnboarding / totalOnboarding) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {tasksByMember.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Inga onboarding-uppgifter för vald person
            </p>
          ) : (
            tasksByMember.map(({ member, tasks }) => {
              const memberColor = TEAM_FARGER[member] ?? "#9CA3AF"
              const doneMember = tasks.filter((t) => t.done).length
              return (
                <div key={member}>
                  {/* Member header */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: memberColor }}
                    >
                      {member[0]}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{member}</span>
                    <span className="text-xs text-muted-foreground">
                      {doneMember}/{tasks.length} klara
                    </span>
                    {/* Mini progress */}
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-32">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${tasks.length > 0 ? Math.round((doneMember / tasks.length) * 100) : 0}%`,
                          background: memberColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tasks table */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="w-8 px-3 py-2.5" />
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                            Uppgift
                          </th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                            Steg
                          </th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                            Kund
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => (
                          <tr
                            key={`${task.kund.id}-${task.id}`}
                            className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-3 py-2.5">
                              <Checkbox
                                checked={task.done}
                                onCheckedChange={() => toggleTask(task.kund.id, task.id)}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={cn(
                                  "text-xs",
                                  task.done && "line-through text-muted-foreground"
                                )}
                              >
                                {task.text}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 hidden sm:table-cell">
                              <span className="text-[10px] text-muted-foreground">
                                Steg {task.stepN}: {task.stepTitle}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => router.push(`/kunder/${task.kund.id}`)}
                                className="text-xs font-medium text-foreground hover:text-primary hover:underline transition-colors"
                              >
                                {task.kund.name}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Inspelning */}
      {tab === "inspelning" && (
        <div className="space-y-6">
          <RecordingSection
            title="Videograf"
            icon={<Video className="h-4 w-4 text-primary" />}
            clients={videoClients}
            roleLabel="Videograf"
          />
          <RecordingSection
            title="Redigerare"
            icon={<Pencil className="h-4 w-4 text-amber-500" />}
            clients={editClients}
            roleLabel="Redigerare"
          />
          <RecordingSection
            title="Content Creator"
            icon={<UserCheck className="h-4 w-4 text-emerald-500" />}
            clients={ccClients}
            roleLabel="Content Creator"
          />
        </div>
      )}
    </div>
  )
}

function RecordingSection({
  title,
  icon,
  clients,
  roleLabel,
}: {
  title: string
  icon: React.ReactNode
  clients: ReturnType<typeof useDB>["db"]["clients"]
  roleLabel: string
}) {
  if (clients.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({clients.length} kunder)</span>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Kund
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Paket
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Nästa inspelning
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                {roleLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const rolePerson =
                roleLabel === "Videograf" ? c.vg : roleLabel === "Redigerare" ? c.ed : c.cc
              const roleColor = TEAM_FARGER[rolePerson] ?? "#9CA3AF"
              return (
                <tr
                  key={c.id}
                  className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-2.5">
                    {c.pkg ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          paketClass(c.pkg)
                        )}
                      >
                        {c.pkg}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
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
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.nr || "-"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: roleColor }}
                      >
                        {rolePerson[0]}
                      </div>
                      <span className="text-xs text-foreground">{rolePerson}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useDB } from "@/lib/store"
import { OB_STEG } from "@/lib/data"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronDown, RotateCcw, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TEAM_FARGER } from "@/lib/types"

export default function OnboardingPage() {
  const { db, toggleTask, resetObState } = useDB()
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const aktiva = db.clients.filter((c) => c.st === "AKTIV" || c.st === "")

  const filtered = search
    ? aktiva.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : aktiva

  function getProgress(kundId: number): number {
    const state = db.obState[kundId] ?? {}
    const total = OB_STEG.reduce((acc, s) => acc + s.tasks.length, 0)
    const done = Object.values(state).filter(Boolean).length
    return total ? Math.round((done / total) * 100) : 0
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleReset(kundId: number, name: string) {
    resetObState(kundId)
    toast.success(`Onboarding återställd för ${name}`)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Checklista per kund</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 w-56 text-sm"
            placeholder="Sök kund..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((kund) => {
          const progress = getProgress(kund.id)
          const state = db.obState[kund.id] ?? {}
          const isExpanded = expanded[kund.id] ?? false

          return (
            <Card key={kund.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{kund.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{kund.pkg || "Inget paket"}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => handleReset(kund.id, kund.name)}
                      title="Återställ"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => toggleExpand(String(kund.id))}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Framsteg</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-3">
                  {OB_STEG.map((steg) => {
                    const doneTasks = steg.tasks.filter((t) => state[t.id]).length
                    return (
                      <div key={steg.n} className="rounded-xl border border-border/60 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {steg.n}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{steg.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {doneTasks}/{steg.tasks.length}
                          </span>
                        </div>
                        <div className="divide-y divide-border/40">
                          {steg.tasks.map((task) => {
                            const done = !!state[task.id]
                            const whoColor = TEAM_FARGER[task.who] ?? "#9CA3AF"
                            return (
                              <label
                                key={task.id}
                                className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                              >
                                <Checkbox
                                  checked={done}
                                  onCheckedChange={() => toggleTask(kund.id, task.id)}
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-xs leading-relaxed", done && "line-through text-muted-foreground")}>
                                    {task.text}
                                  </p>
                                </div>
                                <div
                                  className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                  style={{ background: whoColor }}
                                  title={task.who}
                                >
                                  {task.who[0]}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

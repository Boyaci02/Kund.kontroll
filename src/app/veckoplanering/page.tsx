"use client"

import { useMemo, useState } from "react"
import { useDB } from "@/lib/store"
import { SCHEMA } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, GripVertical } from "lucide-react"
import type { Veckoschema } from "@/lib/types"
import { cn } from "@/lib/utils"
import { paketClass } from "@/lib/helpers"

const VECKOR: Array<{ key: keyof Veckoschema; label: string }> = [
  { key: "v1", label: "Vecka 1" },
  { key: "v2", label: "Vecka 2" },
  { key: "v3", label: "Vecka 3" },
  { key: "v4", label: "Vecka 4" },
]

export default function VeckoPlaneringPage() {
  const { db, moveToVecka } = useDB()
  const [dragOver, setDragOver] = useState<keyof Veckoschema | "unscheduled" | null>(null)

  const schedule = useMemo(() => db.schedule ?? { ...SCHEMA }, [db.schedule])

  const unscheduled = useMemo(() => {
    const scheduled = new Set([...schedule.v1, ...schedule.v2, ...schedule.v3, ...schedule.v4])
    return db.clients.filter((c) => c.st === "AKTIV" && !scheduled.has(c.name))
  }, [db.clients, schedule])

  function onDragStart(e: React.DragEvent, name: string, from: keyof Veckoschema | null) {
    e.dataTransfer.setData("kundName", name)
    e.dataTransfer.setData("fromVecka", from ?? "")
    e.dataTransfer.effectAllowed = "move"
  }

  function onDrop(e: React.DragEvent, to: keyof Veckoschema) {
    e.preventDefault()
    const name = e.dataTransfer.getData("kundName")
    const from = e.dataTransfer.getData("fromVecka") as keyof Veckoschema | ""
    if (name) moveToVecka(name, from || null, to)
    setDragOver(null)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Veckoplanering</h1>
        <p className="text-sm text-muted-foreground mt-1">Dra kunder mellan veckor för att planera inspelning</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {VECKOR.map(({ key, label }) => (
          <Card
            key={key}
            className={cn(
              "border-border transition-colors",
              dragOver === key && "border-primary/60 bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(e, key)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{schedule[key].length} kunder</p>
            </CardHeader>
            <CardContent className="space-y-1.5 min-h-[60px]">
              {schedule[key].map((name) => (
                <div
                  key={name}
                  draggable
                  onDragStart={(e) => onDragStart(e, name, key)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors cursor-grab active:cursor-grabbing select-none"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-foreground flex-1">{name}</span>
                </div>
              ))}
              {schedule[key].length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {dragOver === key ? "Släpp här" : "Inga kunder"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unscheduled customers */}
      {unscheduled.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Ej schemalagda</span>
            <span className="text-xs text-muted-foreground">{unscheduled.length} aktiva kunder saknas i schemat</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {unscheduled.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => onDragStart(e, c.name, null)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-border bg-muted/20 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <span className="text-xs text-foreground font-medium">{c.name}</span>
                {c.pkg && (
                  <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium", paketClass(c.pkg))}>
                    {c.pkg.split(" ")[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useDB } from "@/lib/store"
import { SCHEMA } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, GripVertical, MoveRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Veckoschema } from "@/lib/types"
import { cn } from "@/lib/utils"

const VECKOR: Array<{ key: keyof Veckoschema; label: string }> = [
  { key: "v1", label: "Vecka 1" },
  { key: "v2", label: "Vecka 2" },
  { key: "v3", label: "Vecka 3" },
  { key: "v4", label: "Vecka 4" },
]

export default function VeckoPlaneringPage() {
  const { db, moveToVecka } = useDB()
  const [movingKund, setMovingKund] = useState<{ name: string; from: keyof Veckoschema } | null>(null)

  const schedule = useMemo(() => db.schedule ?? { ...SCHEMA }, [db.schedule])

  function handleMove(to: keyof Veckoschema) {
    if (!movingKund) return
    moveToVecka(movingKund.name, movingKund.from, to)
    setMovingKund(null)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Veckoplanering</h1>
        <p className="text-sm text-muted-foreground mt-1">Filmschema per vecka — klicka på en kund för att flytta</p>
      </div>

      {movingKund && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <MoveRight className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm text-foreground flex-1">
            Flytta <strong>{movingKund.name}</strong> till:
          </span>
          <div className="flex gap-1.5">
            {VECKOR.filter((v) => v.key !== movingKund.from).map((v) => (
              <Button key={v.key} size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleMove(v.key)}>
                {v.label}
              </Button>
            ))}
          </div>
          <button onClick={() => setMovingKund(null)} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {VECKOR.map(({ key, label }) => (
          <Card key={key} className={cn("border-border", movingKund && movingKund.from !== key && "ring-1 ring-primary/20")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{schedule[key].length} kunder</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {schedule[key].map((name) => (
                <button
                  key={name}
                  onClick={() => setMovingKund(movingKund?.name === name ? null : { name, from: key })}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-left",
                    movingKund?.name === name
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "bg-muted/40 hover:bg-muted/70"
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-foreground flex-1">{name}</span>
                </button>
              ))}
              {schedule[key].length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">Inga kunder</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

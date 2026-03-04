"use client"

import { SCHEMA } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

const VECKOR = [
  { key: "v1" as const, label: "Vecka 1" },
  { key: "v2" as const, label: "Vecka 2" },
  { key: "v3" as const, label: "Vecka 3" },
  { key: "v4" as const, label: "Vecka 4" },
]

export default function VeckoPlaneringPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Veckoplanering</h1>
        <p className="text-sm text-muted-foreground mt-1">Filmschema per vecka</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {VECKOR.map(({ key, label }) => (
          <Card key={key} className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{SCHEMA[key].length} kunder</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {SCHEMA[key].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-foreground">{name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

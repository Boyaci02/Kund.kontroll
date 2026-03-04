"use client"

import { useState } from "react"
import { SMS_MALLAR } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, RotateCcw, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { TEAM_FARGER } from "@/lib/types"

type VarValues = Record<string, string>

export default function SMSMallarPage() {
  const [vars, setVars] = useState<Record<string, VarValues>>(
    Object.fromEntries(SMS_MALLAR.map((m) => [m.id, Object.fromEntries(m.vars.map((v) => [v, ""]))]))
  )

  function getPreview(mallId: string): string {
    const mall = SMS_MALLAR.find((m) => m.id === mallId)
    if (!mall) return ""
    let text = mall.text
    const v = vars[mallId] ?? {}
    for (const [key, val] of Object.entries(v)) {
      text = text.replaceAll(`[${key}]`, val || `[${key}]`)
    }
    return text
  }

  function handleCopy(mallId: string) {
    const preview = getPreview(mallId)
    navigator.clipboard.writeText(preview).then(() => {
      toast.success("SMS kopierat!")
    })
  }

  function handleReset(mallId: string) {
    const mall = SMS_MALLAR.find((m) => m.id === mallId)
    if (!mall) return
    setVars((prev) => ({
      ...prev,
      [mallId]: Object.fromEntries(mall.vars.map((v) => [v, ""])),
    }))
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">SMS-mallar</h1>
        <p className="text-sm text-muted-foreground mt-1">Fyll i och kopiera mallar</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {SMS_MALLAR.map((mall) => {
          const whoColor = TEAM_FARGER[mall.who] ?? "#9CA3AF"
          const preview = getPreview(mall.id)
          const mallVars = vars[mall.id] ?? {}

          return (
            <Card key={mall.id} className="border-border flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      {mall.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{mall.sub}</p>
                  </div>
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: whoColor }}
                    title={mall.who}
                  >
                    {mall.who[0]}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                {/* Variable inputs */}
                {mall.vars.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variabler</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mall.vars.map((v) => (
                        <div key={v}>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{v}</label>
                          <Input
                            className="h-7 text-xs"
                            placeholder={v}
                            value={mallVars[v] ?? ""}
                            onChange={(e) =>
                              setVars((prev) => ({
                                ...prev,
                                [mall.id]: { ...prev[mall.id], [v]: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Förhandsvisning</p>
                  <div className="bg-muted rounded-xl px-3 py-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed min-h-[80px]">
                    {preview}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 gap-2 h-8 text-xs" onClick={() => handleCopy(mall.id)}>
                    <Copy className="h-3.5 w-3.5" />
                    Kopiera
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleReset(mall.id)} title="Rensa">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

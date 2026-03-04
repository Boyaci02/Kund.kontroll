"use client"

import { useState, useMemo } from "react"
import { SMS_MALLAR } from "@/lib/data"
import { useDB } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, RotateCcw, MessageSquare, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { TEAM_FARGER } from "@/lib/types"
import { cn } from "@/lib/utils"

type VarValues = Record<string, string>

// Variables that are always auto-filled (hidden from manual input)
const AUTO_VARS = new Set(["RESTAURANG", "NAMN", "AVSANDARE"])

export default function SMSMallarPage() {
  const { db } = useDB()
  const activeClients = useMemo(() => db.clients.filter((c) => c.st === "AKTIV"), [db.clients])

  const [selectedKundId, setSelectedKundId] = useState<Record<string, number | null>>(
    Object.fromEntries(SMS_MALLAR.map((m) => [m.id, null]))
  )
  const [search, setSearch] = useState<Record<string, string>>(
    Object.fromEntries(SMS_MALLAR.map((m) => [m.id, ""]))
  )
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(SMS_MALLAR.map((m) => [m.id, false]))
  )
  const [manualVars, setManualVars] = useState<Record<string, VarValues>>(
    Object.fromEntries(SMS_MALLAR.map((m) => [m.id, Object.fromEntries(m.vars.filter(v => !AUTO_VARS.has(v)).map((v) => [v, ""]))]))
  )

  function getVars(mallId: string): VarValues {
    const kundId = selectedKundId[mallId]
    const kund = kundId != null ? db.clients.find((c) => c.id === kundId) : null
    return {
      RESTAURANG: kund?.name ?? "",
      NAMN: kund?.cnt ?? "",
      AVSANDARE: "Philip",
      ...(manualVars[mallId] ?? {}),
    }
  }

  function getPreview(mallId: string): string {
    const mall = SMS_MALLAR.find((m) => m.id === mallId)
    if (!mall) return ""
    let text = mall.text
    const v = getVars(mallId)
    for (const [key, val] of Object.entries(v)) {
      text = text.replaceAll(`[${key}]`, val || `[${key}]`)
    }
    return text
  }

  function handleCopy(mallId: string) {
    navigator.clipboard.writeText(getPreview(mallId)).then(() => {
      toast.success("SMS kopierat!")
    })
  }

  function handleReset(mallId: string) {
    const mall = SMS_MALLAR.find((m) => m.id === mallId)
    if (!mall) return
    setSelectedKundId((prev) => ({ ...prev, [mallId]: null }))
    setSearch((prev) => ({ ...prev, [mallId]: "" }))
    setManualVars((prev) => ({
      ...prev,
      [mallId]: Object.fromEntries(mall.vars.filter(v => !AUTO_VARS.has(v)).map((v) => [v, ""])),
    }))
  }

  function selectKund(mallId: string, kundId: number, kundName: string) {
    setSelectedKundId((prev) => ({ ...prev, [mallId]: kundId }))
    setSearch((prev) => ({ ...prev, [mallId]: kundName }))
    setDropdownOpen((prev) => ({ ...prev, [mallId]: false }))
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">SMS-mallar</h1>
        <p className="text-sm text-muted-foreground mt-1">Välj restaurang och kopiera mall</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {SMS_MALLAR.map((mall) => {
          const whoColor = TEAM_FARGER[mall.who] ?? "#9CA3AF"
          const preview = getPreview(mall.id)
          const mv = manualVars[mall.id] ?? {}
          const manualVarsList = mall.vars.filter((v) => !AUTO_VARS.has(v))
          const filtered = activeClients.filter((c) =>
            c.name.toLowerCase().includes((search[mall.id] ?? "").toLowerCase())
          )
          const selectedKund = selectedKundId[mall.id] != null
            ? db.clients.find((c) => c.id === selectedKundId[mall.id])
            : null

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
                {/* Restaurant picker */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Restaurang</p>
                  <div className="relative">
                    <div className="relative">
                      <Input
                        className="h-8 text-xs pr-7"
                        placeholder="Sök restaurang..."
                        value={search[mall.id] ?? ""}
                        onChange={(e) => {
                          setSearch((prev) => ({ ...prev, [mall.id]: e.target.value }))
                          setSelectedKundId((prev) => ({ ...prev, [mall.id]: null }))
                          setDropdownOpen((prev) => ({ ...prev, [mall.id]: true }))
                        }}
                        onFocus={() => setDropdownOpen((prev) => ({ ...prev, [mall.id]: true }))}
                        onBlur={() => setTimeout(() => setDropdownOpen((prev) => ({ ...prev, [mall.id]: false })), 150)}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    {dropdownOpen[mall.id] && filtered.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-border bg-popover shadow-md max-h-44 overflow-y-auto">
                        {filtered.map((c) => (
                          <button
                            key={c.id}
                            onMouseDown={() => selectKund(mall.id, c.id, c.name)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                              selectedKundId[mall.id] === c.id && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedKund && (
                    <p className="text-[10px] text-muted-foreground">
                      Kontakt: {selectedKund.cnt || "–"} · Avsändare: Philip
                    </p>
                  )}
                </div>

                {/* Manual vars (DATUM, TID etc.) */}
                {manualVarsList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detaljer</p>
                    <div className="grid grid-cols-2 gap-2">
                      {manualVarsList.map((v) => (
                        <div key={v}>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{v}</label>
                          <Input
                            className="h-7 text-xs"
                            placeholder={v}
                            value={mv[v] ?? ""}
                            onChange={(e) =>
                              setManualVars((prev) => ({
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

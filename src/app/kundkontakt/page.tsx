"use client"

import { useDB } from "@/lib/store"
import { KONTAKTER } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MessageSquare, PhoneCall, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const SEKTIONER = [
  {
    key: "booking" as const,
    label: "Bokning",
    sub: "Kontakter att ringa för att boka inspelning",
    icon: Calendar,
    color: "text-primary",
    dot: "bg-primary",
  },
  {
    key: "sms" as const,
    label: "SMS-påminnelser",
    sub: "Skicka påminnelse-SMS inför inspelning",
    icon: MessageSquare,
    color: "text-amber-500",
    dot: "bg-amber-500",
  },
  {
    key: "quarterly" as const,
    label: "Kvartalsamtal",
    sub: "Ring för kvartalsvis check-in",
    icon: PhoneCall,
    color: "text-emerald-500",
    dot: "bg-emerald-500",
  },
]

export default function KundkontaktPage() {
  const { db, toggleContact } = useDB()
  const contactLog = db.contactLog ?? {}

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Kundkontakt</h1>
        <p className="text-sm text-muted-foreground mt-1">Bokning, SMS och kvartalsamtal</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {SEKTIONER.map(({ key, label, sub, icon: Icon, color, dot }) => (
          <Card key={key} className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {KONTAKTER[key].length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga kontakter</p>
              ) : (
                KONTAKTER[key].map((k, i) => {
                  const logKey = `${key}-${k.name}`
                  const done = !!contactLog[logKey]
                  return (
                    <button
                      key={i}
                      onClick={() => toggleContact(logKey)}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors text-left",
                        done
                          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                          : "border-border/60 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", done ? "bg-emerald-500" : dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
                          {k.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{k.day}</p>
                        {k.note && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{k.note}</p>
                        )}
                      </div>
                      {done && <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

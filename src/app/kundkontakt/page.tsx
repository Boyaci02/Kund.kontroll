"use client"

import { KONTAKTER } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MessageSquare, PhoneCall } from "lucide-react"

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
                KONTAKTER[key].map((k, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <p className="text-xs text-muted-foreground">{k.day}</p>
                      {k.note && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{k.note}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

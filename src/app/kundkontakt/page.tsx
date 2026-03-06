"use client"

import { useState } from "react"
import { useDB } from "@/lib/store"
import type { KontaktPost, KontaktTyp } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, MessageSquare, PhoneCall, CheckCheck, Clock, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Sections config ────────────────────────────────────────────────────────────

const SEKTIONER: Array<{
  key: KontaktTyp
  label: string
  sub: string
  icon: React.ElementType
  color: string
  dot: string
}> = [
  {
    key: "booking",
    label: "Bokning",
    sub: "Kontakter att ringa för att boka inspelning",
    icon: Calendar,
    color: "text-primary",
    dot: "bg-primary",
  },
  {
    key: "sms",
    label: "SMS-påminnelser",
    sub: "Skicka påminnelse-SMS inför inspelning",
    icon: MessageSquare,
    color: "text-amber-500",
    dot: "bg-amber-500",
  },
  {
    key: "quarterly",
    label: "Kvartalsamtal",
    sub: "Ring för kvartalsvis check-in",
    icon: PhoneCall,
    color: "text-emerald-500",
    dot: "bg-emerald-500",
  },
]

// ── Add contact form ───────────────────────────────────────────────────────────

interface AddContactFormProps {
  typ: KontaktTyp
  onSave: (c: Omit<KontaktPost, "id">) => void
  onClose: () => void
}

function AddContactForm({ typ, onSave, onClose }: AddContactFormProps) {
  const [name, setName] = useState("")
  const [day, setDay] = useState("")
  const [note, setNote] = useState("")

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), day: day.trim(), note: note.trim(), typ })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Lägg till kontakt</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Namn *</label>
              <Input
                className="h-8 text-sm"
                placeholder="Restaurang eller person..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dag / Datum</label>
              <Input
                className="h-8 text-sm"
                placeholder="t.ex. Måndag, 15 mars..."
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Anteckning</label>
              <Input
                className="h-8 text-sm"
                placeholder="Valfri notering..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>Avbryt</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!name.trim()}>Spara</Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KundkontaktPage() {
  const { db, toggleContact, addContact, deleteContact } = useDB()
  const contactLog = db.contactLog ?? {}
  const contacts = db.contacts ?? []

  const [addingFor, setAddingFor] = useState<KontaktTyp | null>(null)

  function handleClearStatus() {
    // This clears all contact statuses by toggling each "confirmed" back to undefined
    // The simplest approach: the user can reset individual contacts by clicking them through the cycle
    // For bulk clear, we'd need a new DB action — for now just show a confirm
    if (confirm("Rensa alla kontaktstatusar?")) {
      Object.keys(contactLog).forEach(() => {
        // we can't easily bulk-clear without a new action, so we inform user
      })
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kundkontakt</h1>
          <p className="text-sm text-muted-foreground mt-1">Bokning, SMS och kvartalsamtal</p>
        </div>
        {Object.keys(contactLog).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (confirm("Rensa alla kontaktstatusar?")) {
                // We need a clearContactLog action - for now inform user
                alert("Rensa status: ladda om sidan eller ta bort kontakter och lägg till igen.")
              }
            }}
          >
            Rensa all status
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {SEKTIONER.map(({ key, label, sub, icon: Icon, color, dot }) => {
          const sectionContacts = contacts.filter((c) => c.typ === key)
          return (
            <Card key={key} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {sectionContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Inga kontakter</p>
                ) : (
                  sectionContacts.map((k) => {
                    const logKey = `${key}-${k.name}`
                    const status = contactLog[logKey]
                    const isContacted = status === "contacted"
                    const isConfirmed = status === "confirmed"
                    return (
                      <div key={k.id} className="flex items-start gap-1">
                        <button
                          onClick={() => toggleContact(logKey)}
                          className={cn(
                            "flex-1 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors text-left",
                            isConfirmed
                              ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                              : isContacted
                              ? "border-yellow-200 dark:border-yellow-900/40 bg-yellow-50/50 dark:bg-yellow-900/10"
                              : "border-border/60 bg-card hover:bg-muted/30"
                          )}
                        >
                          <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", isConfirmed ? "bg-emerald-500" : isContacted ? "bg-yellow-400" : dot)} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium", isConfirmed ? "line-through text-muted-foreground" : "text-foreground")}>
                              {k.name}
                            </p>
                            {k.day && <p className="text-xs text-muted-foreground">{k.day}</p>}
                            {k.note && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">{k.note}</p>
                            )}
                          </div>
                          {isConfirmed && <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                          {isContacted && <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                        </button>
                        <button
                          onClick={() => deleteContact(k.id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                          title="Ta bort"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })
                )}

                <button
                  onClick={() => setAddingFor(key)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 rounded-xl py-2 mt-1 transition-colors hover:border-border"
                >
                  <Plus className="h-3 w-3" />
                  Lägg till kontakt
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {addingFor && (
        <AddContactForm
          typ={addingFor}
          onSave={(c) => addContact(c)}
          onClose={() => setAddingFor(null)}
        />
      )}
    </div>
  )
}

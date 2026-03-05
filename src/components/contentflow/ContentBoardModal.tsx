"use client"

import { useState } from "react"
import type { CFClient, CFColumn, CFCard } from "@/lib/contentflow-types"
import { X, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const KB_BG  = ["#b2eae4","#b3d9f7","#f7e2b3","#dbb3f7","#f7b3c6","#c6f7d4","#f7d9b3"]
const KB_FG  = ["#1a6b63","#1a5b8f","#7a5a1a","#5a1a7a","#7a1a3a","#1a6b3a","#7a4a1a"]

let nextColId  = 1000
let nextCardId = 10000

function ensureIds(client: CFClient) {
  client.contentBoard?.columns?.forEach(col => {
    if (col.id >= nextColId) nextColId = col.id + 1
    col.cards?.forEach(card => {
      if (card.id >= nextCardId) nextCardId = card.id + 1
    })
  })
}

interface CardEditModal {
  colId: number
  card: CFCard
  colLabel: string
}

interface Props {
  client: CFClient
  onUpdate: (updated: CFClient) => void
  onClose: () => void
}

export default function ContentBoardModal({ client, onUpdate, onClose }: Props) {
  ensureIds(client)
  const [cols, setCols] = useState<CFColumn[]>(client.contentBoard?.columns ?? [])
  const [cardEdit, setCardEdit] = useState<CardEditModal | null>(null)
  const [cardTitle, setCardTitle] = useState("")
  const [cardNotes, setCardNotes] = useState("")
  const [dragging, setDragging] = useState<{ colId: number; cardId: number } | null>(null)

  const save = (newCols: CFColumn[]) => {
    setCols(newCols)
    onUpdate({ ...client, contentBoard: { columns: newCols } })
  }

  const addColumn = () => {
    const label = window.prompt("Kolumnnamn (t.ex. 'April-content'):")
    if (!label?.trim()) return
    save([...cols, { id: nextColId++, label: label.trim(), cards: [] }])
  }

  const deleteColumn = (colId: number) => {
    const col = cols.find(c => c.id === colId)
    if (!col) return
    if (col.cards.length > 0 && !confirm(`Ta bort "${col.label}" och alla ${col.cards.length} kort?`)) return
    save(cols.filter(c => c.id !== colId))
  }

  const addCard = (colId: number) => {
    const id = nextCardId++
    const newCard: CFCard = { id, title: "Nytt kort", notes: "" }
    const newCols = cols.map(c => c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c)
    save(newCols)
    const col = newCols.find(c => c.id === colId)!
    setCardEdit({ colId, card: newCard, colLabel: col.label })
    setCardTitle(newCard.title)
    setCardNotes(newCard.notes)
  }

  const openCard = (colId: number, card: CFCard) => {
    const col = cols.find(c => c.id === colId)!
    setCardEdit({ colId, card, colLabel: col.label })
    setCardTitle(card.title)
    setCardNotes(card.notes)
  }

  const saveCard = () => {
    if (!cardEdit) return
    const newCols = cols.map(c =>
      c.id === cardEdit.colId
        ? { ...c, cards: c.cards.map(card => card.id === cardEdit.card.id ? { ...card, title: cardTitle.trim() || "Untitled", notes: cardNotes.trim() } : card) }
        : c,
    )
    save(newCols)
    setCardEdit(null)
    toast.success("Kort sparat")
  }

  const deleteCard = () => {
    if (!cardEdit) return
    const newCols = cols.map(c =>
      c.id === cardEdit.colId ? { ...c, cards: c.cards.filter(card => card.id !== cardEdit.card.id) } : c,
    )
    save(newCols)
    setCardEdit(null)
    toast("Kort borttaget")
  }

  // Drag & Drop
  const onDragStart = (colId: number, cardId: number) => setDragging({ colId, cardId })
  const onDrop = (toColId: number) => {
    if (!dragging || dragging.colId === toColId) return
    const fromCol = cols.find(c => c.id === dragging.colId)
    const toCol   = cols.find(c => c.id === toColId)
    if (!fromCol || !toCol) return
    const cardIdx = fromCol.cards.findIndex(c => c.id === dragging.cardId)
    if (cardIdx === -1) return
    const card = fromCol.cards[cardIdx]
    const newCols = cols.map(c => {
      if (c.id === dragging.colId) return { ...c, cards: c.cards.filter(x => x.id !== dragging.cardId) }
      if (c.id === toColId)        return { ...c, cards: [...c.cards, card] }
      return c
    })
    save(newCols)
    setDragging(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-[92vw] max-w-5xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <div className="font-semibold text-foreground">{client.name}</div>
            <div className="text-xs text-muted-foreground">Content Board</div>
          </div>
          <div className="flex gap-2">
            <button onClick={addColumn} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
              <Plus className="w-3 h-3" /> Lägg till kolumn
            </button>
            <button onClick={onClose} className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition-colors">
              <X className="w-3 h-3" /> Stäng
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex gap-4 p-5 overflow-x-auto flex-1">
          {cols.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-sm mb-3">Inga kolumner ännu</p>
              <button onClick={addColumn} className="flex items-center gap-1.5 text-xs border border-dashed border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" /> Skapa första kolumnen
              </button>
            </div>
          ) : cols.map((col, ci) => {
            const bg = KB_BG[ci % KB_BG.length]
            const fg = KB_FG[ci % KB_FG.length]
            return (
              <div
                key={col.id}
                className="flex flex-col min-w-[220px] w-[220px]"
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(col.id)}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: bg, color: fg }}>
                    {col.label}
                    <span className="text-[0.6rem] opacity-70">{col.cards.length}</span>
                  </span>
                  <button onClick={() => deleteColumn(col.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {col.cards.map(card => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => onDragStart(col.id, card.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => openCard(col.id, card)}
                      className={cn(
                        "bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all",
                        dragging?.cardId === card.id && "opacity-40",
                      )}
                    >
                      <div className="text-xs font-semibold text-foreground leading-snug">{card.title || "Untitled"}</div>
                      {card.notes && (
                        <div className="text-[0.65rem] text-muted-foreground mt-1 leading-relaxed">
                          {card.notes.substring(0, 60)}{card.notes.length > 60 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addCard(col.id)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl px-3 py-2 transition-colors border border-dashed border-border/60"
                >
                  <Plus className="w-3 h-3" /> Lägg till kort
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card edit modal */}
      {cardEdit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setCardEdit(null) }}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col overflow-hidden" style={{ height: "60vh" }}>
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="font-semibold text-foreground text-sm">{cardEdit.colLabel}</div>
              <button onClick={() => setCardEdit(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 flex flex-col gap-4 flex-1 min-h-0">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Videonamn</label>
                <input autoFocus value={cardTitle} onChange={e => setCardTitle(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="t.ex. Morgonrutin reel…" />
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Noteringar</label>
                <textarea value={cardNotes} onChange={e => setCardNotes(e.target.value)}
                  className="flex-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Hook, kameravinklar, script, idéer…" />
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
              <button onClick={deleteCard} className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 rounded-xl px-3 py-1.5 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3 h-3" /> Ta bort
              </button>
              <div className="flex gap-2">
                <button onClick={() => setCardEdit(null)} className="text-sm px-4 py-1.5 border border-border rounded-xl hover:bg-muted transition-colors">Avbryt</button>
                <button onClick={saveCard} className="text-sm px-4 py-1.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium">Spara</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

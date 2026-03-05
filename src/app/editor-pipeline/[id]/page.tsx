"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDB } from "@/lib/store"
import {
  loadEpState, saveEpState, getClientRows, newRow,
} from "@/lib/editor-types"
import type { EditorClientState, EditorRow } from "@/lib/editor-types"
import EditorPipelineTable from "@/components/editor/EditorPipelineTable"
import { ArrowLeft, Plus } from "lucide-react"

export default function EditorPipelineClientPage() {
  const { id } = useParams<{ id: string }>()
  const kundId = Number(id)
  const { db } = useDB()
  const router = useRouter()

  const kund = db.clients.find(c => c.id === kundId)

  const [epState, setEpState] = useState<Record<number, EditorClientState>>({})
  const [rows, setRows] = useState<EditorRow[]>([])

  useEffect(() => {
    const state = loadEpState()
    setEpState(state)
    setRows(getClientRows(state, kundId))
  }, [kundId])

  function handleChange(newRows: EditorRow[]) {
    setRows(newRows)
    const updated = { ...epState, [kundId]: { rows: newRows } }
    setEpState(updated)
    saveEpState(updated)
  }

  if (!kund) {
    return (
      <main className="min-h-screen bg-background p-6">
        <p className="text-muted-foreground text-sm">Kund hittades inte.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <button
          onClick={() => router.push("/editor-pipeline")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tillbaka
        </button>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{kund.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length} video{rows.length !== 1 ? "r" : ""}
              {kund.ed ? ` · Redigerare: ${kund.ed}` : ""}
            </p>
          </div>
          <button
            onClick={() => handleChange([...rows, newRow()])}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-xl px-3 py-1.5 hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Lägg till video
          </button>
        </div>
      </div>

      {/* Table — inramad i ett kort med luft runt om */}
      <div className="p-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <EditorPipelineTable rows={rows} onChange={handleChange} />
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { cfTodayStr, CF_DEFAULT_CYCLE } from "@/lib/contentflow-data"
import type { CFClient, CFMember, CFStatus, CFPdf } from "@/lib/contentflow-types"
import { X, Upload, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  client: CFClient | null   // null = new
  team: CFMember[]
  onSave: (data: Omit<CFClient, "id" | "qc" | "qn" | "rev" | "contentBoard">) => void
  onClose: () => void
}

interface Form {
  name: string
  tag: string
  last: string
  cycle: number
  s: CFStatus
  assignee: number | null
  notes: string
  pdf: CFPdf | null
}

export default function ClientModal({ client, team, onSave, onClose }: Props) {
  const [form, setForm] = useState<Form>({
    name: client?.name ?? "",
    tag:  client?.tag  ?? "",
    last: client?.last ?? cfTodayStr(),
    cycle: client?.cycle ?? CF_DEFAULT_CYCLE,
    s:    client?.s    ?? "scheduled",
    assignee: client?.assignee ?? null,
    notes: client?.notes ?? "",
    pdf:  client?.pdf  ?? null,
  })
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100)
  }, [])

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Namn krävs"); return }
    onSave({ ...form, name: form.name.trim(), tag: form.tag.trim(), notes: form.notes.trim() })
  }

  const handlePdf = (file: File | null | undefined) => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { toast.error("Filen är för stor — max 8 MB"); return }
    if (file.size > 3 * 1024 * 1024) toast.warning("Stor fil — kan nå webbläsarens lagringsgräns")
    const reader = new FileReader()
    reader.onload = e => {
      setForm(f => ({ ...f, pdf: { name: file.name, size: file.size, data: e.target!.result as string } }))
    }
    reader.readAsDataURL(file)
  }

  const downloadPdf = () => {
    if (!form.pdf) return
    const a = document.createElement("a")
    a.href = form.pdf.data
    a.download = form.pdf.name
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">{client ? "Redigera klient" : "Ny klient"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{client ? client.name : "Lägg till en ny klient i pipelinen."}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Namn *</label>
            <input ref={nameRef} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Klientnamn…" />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Bransch</label>
            <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="t.ex. Restaurang…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Last delivery */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Senaste leverans</label>
              <input type="date" value={form.last} onChange={e => setForm(f => ({ ...f, last: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {/* Cycle */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Cykel (dagar)</label>
              <input type="number" value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: parseInt(e.target.value) || 90 }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                min={1} max={365} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
              <select value={form.s} onChange={e => setForm(f => ({ ...f, s: e.target.value as CFStatus }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="scheduled">Scheduled</option>
                <option value="inprogress">In Progress</option>
                <option value="review">Manager Review</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Tilldelad</label>
              <select value={form.assignee ?? ""} onChange={e => setForm(f => ({ ...f, assignee: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— Ingen —</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Anteckningar</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3} placeholder="Noteringar om klienten…" />
          </div>

          {/* PDF */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Marknadsplan (PDF)</label>
            {form.pdf ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-xl bg-muted/30">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{form.pdf.name}</div>
                  <div className="text-xs text-muted-foreground">{(form.pdf.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={downloadPdf} className="text-xs border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" /> Hämta
                </button>
                <button onClick={() => setForm(f => ({ ...f, pdf: null }))} className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 border border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Klicka för att ladda upp PDF</span>
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handlePdf(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">Avbryt</button>
          <button onClick={handleSave} className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium">
            {client ? "Spara" : "Lägg till"}
          </button>
        </div>
      </div>
    </div>
  )
}

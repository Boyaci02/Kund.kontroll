"use client"

import { useState } from "react"
import { CheckCircle, Send } from "lucide-react"
import { REQUEST_CATEGORIES } from "@/lib/hemsidor-data"

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

const EMPTY = { name: "", email: "", category: "Ny funktion", title: "", description: "", priority: "normal" }

const PRIORITY_OPTS = [
  { value: "lag",        label: "Låg",        color: "border-slate-200 text-slate-600 bg-slate-50" },
  { value: "normal",     label: "Normal",     color: "border-blue-200  text-blue-700  bg-blue-50"  },
  { value: "bradskande", label: "Brådskande", color: "border-red-200   text-red-700   bg-red-50"   },
]

function inputCls(error?: string) {
  return `w-full text-sm px-3 py-2 border rounded-lg bg-white outline-none transition-colors focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${
    error ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300"
  }`
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export default function ForfraganPage() {
  const [form, setForm]       = useState(EMPTY)
  const [errors, setErrors]   = useState<Record<string,string>>({})
  const [submitted, setSubmitted] = useState<number | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.name.trim())        e.name        = "Obligatoriskt"
    if (!form.email.trim())       e.email       = "Obligatoriskt"
    if (!form.title.trim())       e.title       = "Obligatoriskt"
    if (!form.description.trim()) e.description = "Obligatoriskt"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const req = {
      id:          Date.now(),
      name:        form.name.trim(),
      email:       form.email.trim(),
      category:    form.category,
      title:       form.title.trim(),
      description: form.description.trim(),
      priority:    form.priority,
      status:      "ny",
      submittedAt: todayStr(),
    }

    const existing = JSON.parse(localStorage.getItem("crm_task_requests") || "[]")
    localStorage.setItem("crm_task_requests", JSON.stringify([...existing, req]))
    setSubmitted(req.id)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Förfrågan skickad!</h2>
          <p className="text-sm text-slate-500 mb-1">Din förfrågan har tagits emot och vi återkommer så snart vi kan.</p>
          <p className="text-xs text-slate-400 mt-3">Ärendenummer: <span className="font-mono font-semibold text-slate-600">#{submitted}</span></p>
          <button
            onClick={() => { setForm(EMPTY); setSubmitted(null) }}
            className="mt-6 text-xs text-amber-600 hover:underline">
            Skicka en ny förfrågan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-lg w-full">

        <div className="flex items-center gap-3 mb-7">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">Skicka en förfrågan</h1>
            <p className="text-xs text-slate-400">Berätta vad du vill ha hjälp med</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ditt namn" required error={errors.name}>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Anna Andersson" className={inputCls(errors.name)} />
            </Field>
            <Field label="Din e-post" required error={errors.email}>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="anna@foretag.se" className={inputCls(errors.email)} />
            </Field>
          </div>

          <Field label="Kategori">
            <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls()}>
              {REQUEST_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Titel" required error={errors.title}>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Kort sammanfattning av vad du vill ha gjort" className={inputCls(errors.title)} />
          </Field>

          <Field label="Beskrivning" required error={errors.description}>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4}
              placeholder="Beskriv så detaljerat som möjligt vad du behöver hjälp med..."
              className={inputCls(errors.description) + " resize-none"} />
          </Field>

          <Field label="Prioritet">
            <div className="flex gap-2">
              {PRIORITY_OPTS.map(p => (
                <button key={p.value} type="button" onClick={() => set("priority", p.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.priority === p.value
                      ? p.color + " ring-2 ring-offset-1 ring-current"
                      : "border-slate-200 text-slate-400 bg-white hover:bg-slate-50"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <button type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors mt-2">
            <Send className="w-4 h-4" />
            Skicka förfrågan
          </button>
        </form>
      </div>
    </div>
  )
}

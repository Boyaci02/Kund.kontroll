"use client"

import { useState } from "react"
import { Sparkles, CheckSquare, X, AlertCircle, User, Calendar } from "lucide-react"
import { REQUEST_PRIORITY, todayStr } from "@/lib/hemsidor-data"
import { HModal, HFormField, HFormSelect, HPageHeader } from "./shared"
import type { TaskRequest, CrmTask, HemsidaClient } from "@/lib/hemsidor-types"

const CAT_STYLE: Record<string, string> = {
  "Ny funktion":          "bg-violet-100 text-violet-700",
  "Buggfix":              "bg-red-100 text-red-700",
  "Innehållsuppdatering": "bg-sky-100 text-sky-700",
  "Övrigt":               "bg-muted text-muted-foreground",
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

async function getAISuggestion(req: TaskRequest, apiKey: string) {
  const prompt = `Du är assistent för ett webbyrå-CRM. Analysera denna kundförfrågan och svara ENBART med JSON (inga förklaringar):
{"priority":"hog|normal|lag","description":"utökad tydlig beskrivning på svenska","suggestedDueDays":3}

Förfrågan:
Kategori: ${req.category}
Titel: ${req.title}
Beskrivning: ${req.description}
Kundens prioritet: ${req.priority}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-allow-browser": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`API-fel: ${res.status}`)
  const data = await res.json()
  const text = (data.content?.[0]?.text || "") as string
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Ogiltigt svar från AI")
  return JSON.parse(jsonMatch[0]) as { priority: string; description: string; suggestedDueDays: number }
}

interface ConvertForm {
  title: string
  description: string
  priority: string
  clientId: number | null
  assignee: string
  dueDate: string
}

function ConvertModal({ req, clients, onSave, onClose }: { req: TaskRequest; clients: HemsidaClient[]; onSave: (form: ConvertForm) => void; onClose: () => void }) {
  const apiKey = typeof window !== "undefined" ? (localStorage.getItem("crm_ai_key") || "") : ""
  const [form, setForm] = useState<ConvertForm>({
    title:       req.title,
    description: req.description,
    priority:    req.priority === "bradskande" ? "hog" : req.priority,
    clientId:    null,
    assignee:    "",
    dueDate:     "",
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState("")

  const handleAI = async () => {
    setAiLoading(true)
    setAiError("")
    try {
      const suggestion = await getAISuggestion(req, apiKey)
      setForm(f => ({
        ...f,
        priority:    suggestion.priority    || f.priority,
        description: suggestion.description || f.description,
        dueDate:     suggestion.suggestedDueDays ? addDays(suggestion.suggestedDueDays) : f.dueDate,
      }))
    } catch (err) {
      setAiError((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <HModal title="Skapa uppgift från förfrågan" onClose={onClose} onSave={() => onSave(form)} saveLabel="Skapa uppgift">
      {apiKey && (
        <div className="mb-1">
          <button type="button" onClick={handleAI} disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50">
            <Sparkles className="w-3.5 h-3.5" />
            {aiLoading ? "Analyserar..." : "AI-förslag ✦"}
          </button>
          {aiError && <p className="text-xs text-red-500 mt-1">{aiError}</p>}
        </div>
      )}

      <HFormField label="Titel" required value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
      <HFormField label="Beskrivning" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Prioritet</label>
          <div className="flex gap-1.5">
            {[["lag","Låg"],["normal","Normal"],["hog","Hög"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, priority: v }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  form.priority === v
                    ? v === "hog" ? "bg-red-100 text-red-700 border-red-200"
                      : v === "lag" ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                    : "bg-card border-border text-muted-foreground hover:bg-muted/60"
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <HFormField label="Deadline" type="date" value={form.dueDate} onChange={v => setForm(f => ({ ...f, dueDate: v }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HFormSelect
          label="Klient"
          value={form.clientId ? String(form.clientId) : ""}
          onChange={v => setForm(f => ({ ...f, clientId: v ? Number(v) : null }))}
          options={clients.map(c => ({ value: c.id, label: c.name }))}
        />
        <HFormField label="Tilldela till" value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))} placeholder="Namn..." />
      </div>
    </HModal>
  )
}

interface Props {
  requests: TaskRequest[]
  setRequests: React.Dispatch<React.SetStateAction<TaskRequest[]>>
  clients: HemsidaClient[]
  setTasks: React.Dispatch<React.SetStateAction<CrmTask[]>>
  addActivity: (message: string, type?: string) => void
  showToast: (msg: string) => void
}

export default function RequestsList({ requests, setRequests, clients, setTasks, addActivity, showToast }: Props) {
  const [convertModal, setConvertModal] = useState<TaskRequest | null>(null)
  const [filter,       setFilter]       = useState("ny")

  const nyCount = requests.filter(r => r.status === "ny").length
  const filtered = requests.filter(r => filter === "alla" ? true : r.status === filter)

  const handleConvert = (req: TaskRequest, form: ConvertForm) => {
    const client = clients.find(c => c.id === form.clientId)
    const newTask: CrmTask = {
      id:               Date.now(),
      clientId:         form.clientId || null,
      clientName:       client?.name  || req.name,
      title:            form.title,
      description:      form.description,
      priority:         form.priority as CrmTask["priority"],
      status:           "inkommen",
      created:          todayStr(),
      dueDate:          form.dueDate,
      assignee:         form.assignee,
      isRecurring:      false,
      recurringInterval:"",
      comments:         [],
      archivedAt:       null,
      lastUpdated:      todayStr(),
    }

    setTasks(prev => [...prev, newTask])
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "omvandlad" as const } : r))
    addActivity(`Förfrågan konverterad till uppgift: ${form.title}`, "task")
    showToast(`Uppgift skapad: ${form.title}`)
    setConvertModal(null)
  }

  const dismiss = (id: number) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "avvisad" as const } : r))
  }

  return (
    <div>
      <HPageHeader title="Förfrågningar" sub={nyCount > 0 ? `${nyCount} nya förfrågningar` : "Kundförfrågningar"}>
        <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/hemsidor/forfragan"); showToast("Förfrågnings-länk kopierad!") }}
          className="text-xs border border-border text-muted-foreground hover:bg-muted/60 px-3 py-1.5 rounded-xl transition-colors">
          Kopiera länk
        </button>
      </HPageHeader>

      <div className="flex gap-2 mb-5">
        {[["ny","Nya"], ["omvandlad","Omvandlade"], ["avvisad","Avvisade"], ["alla","Alla"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === val ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted/60"
            }`}>
            {label}
            {val === "ny" && nyCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{nyCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Inga förfrågningar här</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filtered.map((req) => {
            const prio = REQUEST_PRIORITY[req.priority] || REQUEST_PRIORITY.normal
            return (
              <div key={req.id} className={`border-b border-border/50 last:border-0 p-5 hover:bg-muted/40 transition-colors ${req.status === "omvandlad" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${prio.style}`}>
                        {prio.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_STYLE[req.category] || "bg-muted text-muted-foreground"}`}>
                        {req.category}
                      </span>
                      {req.status === "omvandlad" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Omvandlad</span>
                      )}
                      {req.status === "avvisad" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Avvisad</span>
                      )}
                    </div>

                    <p className="font-semibold text-foreground text-sm leading-tight">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.name}</span>
                      <span>{req.email}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{req.submittedAt}</span>
                    </p>

                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2.5 leading-relaxed border border-border/50">
                        {req.description}
                      </p>
                    )}
                  </div>

                  {req.status === "ny" && (
                    <div className="flex-shrink-0 flex flex-col gap-1.5">
                      <button onClick={() => setConvertModal(req)}
                        className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium">
                        <CheckSquare className="w-3.5 h-3.5" /> Skapa uppgift
                      </button>
                      <button onClick={() => dismiss(req.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <X className="w-3.5 h-3.5" /> Avvisa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {convertModal && (
        <ConvertModal
          req={convertModal}
          clients={clients}
          onSave={(form) => handleConvert(convertModal, form)}
          onClose={() => setConvertModal(null)}
        />
      )}
    </div>
  )
}

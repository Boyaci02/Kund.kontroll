"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, ChevronDown, ChevronUp, Pencil, Check, X, Loader2, TrendingUp, Target, AlertCircle, MapPin, Download } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { MarketingPlan, Kund } from "@/lib/types"

interface Props {
  kund: Kund
}

const STATUS_LABELS: Record<MarketingPlan["status"], string> = {
  generating: "Genererar...",
  draft: "Utkast",
  active: "Aktiv",
  completed: "Avslutad",
}

const STATUS_COLORS: Record<MarketingPlan["status"], string> = {
  generating: "bg-yellow-100 text-yellow-800",
  draft: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
}

export default function MarketingPlanSection({ kund }: Props) {
  const [plan, setPlan] = useState<MarketingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false })
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchPlan = useCallback(async () => {
    const res = await fetch(`/api/marketing-plan?kund_id=${kund.id}`)
    const data = await res.json()
    setPlan(data)
    setLoading(false)
  }, [kund.id])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // Poll medan planen genereras
  useEffect(() => {
    if (plan?.status !== "generating") return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/marketing-plan?kund_id=${kund.id}`)
      const data = await res.json()
      if (data?.status !== "generating") {
        setPlan(data)
        setGenerating(false)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [plan?.status, kund.id])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)

    // Skapa en ny plan-post med status "generating"
    const createRes = await fetch("/api/marketing-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kund_id: kund.id }),
    })
    const newPlan = await createRes.json()
    setPlan(newPlan)

    // Starta generering
    try {
      const res = await fetch("/api/marketing-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kund_id: kund.id, plan_id: newPlan.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        setGenerateError(result.error ?? "Generering misslyckades")
        fetchPlan()
      } else {
        setPlan(result)
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Nätverksfel")
      fetchPlan()
    } finally {
      setGenerating(false)
    }
  }

  function handleDownloadPdf() {
    if (!plan) return
    window.open(`/api/marketing-plan/${plan.id}/pdf?name=${encodeURIComponent(kund.name)}`, "_blank")
  }

  async function handleSaveField(field: string, value: string) {
    if (!plan) return
    setSaving(true)

    const body: Record<string, unknown> = {}

    if (field.startsWith("month")) {
      const month = field.split("_")[0] // month1, month2, month3
      const part = field.split("_")[1]  // goal eller subgoals
      if (part === "subgoals") {
        body[month] = { subgoals: value.split("\n").map((s) => s.trim()).filter(Boolean) }
      } else {
        body[month] = { goal: value }
      }
    } else {
      body[field] = value
    }

    const res = await fetch(`/api/marketing-plan/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const updated = await res.json()
      setPlan(updated)
    }

    setSaving(false)
    setEditField(null)
  }

  async function handleStatusChange(newStatus: MarketingPlan["status"]) {
    if (!plan) return
    const res = await fetch(`/api/marketing-plan/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlan(updated)
    }
  }

  function startEdit(field: string, currentValue: string) {
    setEditField(field)
    setEditValue(currentValue)
  }

  function toggleMonth(month: number) {
    setExpandedMonths((prev) => ({ ...prev, [month]: !prev[month] }))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Laddar marknadsföringsplan...</span>
      </div>
    )
  }

  if (!plan) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Ingen marknadsföringsplan</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generera en AI-driven 3-månaders plan anpassad för {kund.name}
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="mt-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Genererar...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generera marknadsföringsplan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (plan.status === "generating") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div>
            <p className="font-medium">Analyserar {kund.name}...</p>
            <p className="text-sm text-muted-foreground">Claude tar fram en skräddarsydd marknadsföringsplan</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Felmeddelande */}
      {generateError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Generering misslyckades: </span>
            {generateError}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Marknadsföringsplan</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[plan.status]}`}>
            {STATUS_LABELS[plan.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {plan.main_goal && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Ladda ner PDF
            </Button>
          )}
          {plan.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("active")}>
              Aktivera plan
            </Button>
          )}
          {plan.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("completed")}>
              Markera avslutad
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Regenerera
          </Button>
        </div>
      </div>

      {/* Huvudmål */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            Övergripande mål
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EditableField
            field="main_goal"
            label="Mål"
            value={plan.main_goal}
            editField={editField}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onSave={handleSaveField}
            onCancel={() => setEditField(null)}
            onEditValueChange={setEditValue}
          />
          <EditableField
            field="opportunity"
            label="Möjlighet & differentiering"
            value={plan.opportunity}
            editField={editField}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onSave={handleSaveField}
            onCancel={() => setEditField(null)}
            onEditValueChange={setEditValue}
          />
          <EditableField
            field="current_problem"
            label="Nuläge & problem"
            value={plan.current_problem}
            editField={editField}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onSave={handleSaveField}
            onCancel={() => setEditField(null)}
            onEditValueChange={setEditValue}
          />
        </CardContent>
      </Card>

      {/* Analys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-orange-500" />
            Marknadsanalys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EditableField
            field="area_analysis"
            label="Områdesanalys"
            value={plan.area_analysis}
            editField={editField}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onSave={handleSaveField}
            onCancel={() => setEditField(null)}
            onEditValueChange={setEditValue}
          />
          <EditableField
            field="trend_analysis"
            label="Trender & säsonger"
            value={plan.trend_analysis}
            editField={editField}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onSave={handleSaveField}
            onCancel={() => setEditField(null)}
            onEditValueChange={setEditValue}
          />
        </CardContent>
      </Card>

      {/* Månadsplaner */}
      {([1, 2, 3] as const).map((month) => {
        const monthKey = `month${month}` as "month1" | "month2" | "month3"
        const monthData = plan[monthKey]
        const isExpanded = expandedMonths[month]

        return (
          <Card key={month}>
            <CardHeader>
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleMonth(month)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Månad {month}
                  {monthData.goal && (
                    <span className="font-normal text-muted-foreground truncate max-w-xs">
                      — {monthData.goal}
                    </span>
                  )}
                </CardTitle>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                <EditableField
                  field={`${monthKey}_goal`}
                  label="Månadssmål"
                  value={monthData.goal}
                  editField={editField}
                  editValue={editValue}
                  saving={saving}
                  onStartEdit={startEdit}
                  onSave={handleSaveField}
                  onCancel={() => setEditField(null)}
                  onEditValueChange={setEditValue}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Delmål
                    </span>
                    {editField !== `${monthKey}_subgoals` && (
                      <button
                        onClick={() =>
                          startEdit(
                            `${monthKey}_subgoals`,
                            monthData.subgoals.join("\n")
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {editField === `${monthKey}_subgoals` ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={5}
                        placeholder="Ett delmål per rad"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Ett delmål per rad</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveField(`${monthKey}_subgoals`, editValue)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {monthData.subgoals.length === 0 ? (
                        <li className="text-sm text-muted-foreground italic">Inga delmål</li>
                      ) : (
                        monthData.subgoals.map((subgoal, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 h-4 w-4 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center shrink-0 font-medium">
                              {i + 1}
                            </span>
                            {subgoal}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// Redigerbart textfält
interface EditableFieldProps {
  field: string
  label: string
  value: string
  editField: string | null
  editValue: string
  saving: boolean
  onStartEdit: (field: string, value: string) => void
  onSave: (field: string, value: string) => void
  onCancel: () => void
  onEditValueChange: (value: string) => void
}

function EditableField({
  field,
  label,
  value,
  editField,
  editValue,
  saving,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: EditableFieldProps) {
  const isEditing = editField === field

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {!isEditing && (
          <button
            onClick={() => onStartEdit(field, value)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(field, editValue)} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{value || <span className="text-muted-foreground italic">Ej ifyllt</span>}</p>
      )}
    </div>
  )
}

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import Anthropic from "@anthropic-ai/sdk"
import type { KundTema } from "@/lib/types"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getPkgFrequency(pkg: string): string {
  const lower = (pkg ?? "").toLowerCase()
  if (lower.includes("lilla")) return "8"
  if (lower.includes("mellan")) return "12"
  if (lower.includes("stora")) return "20"
  if (lower.includes("extra")) return "24+"
  if (lower.includes("special")) return "16"
  return "12"
}

function getTemaText(tema: KundTema | null | undefined): string {
  if (!tema) return "–"
  return [
    tema.typ ? `Typ: ${tema.typ}` : null,
    tema.kansla ? `Känsla: ${tema.kansla}` : null,
    tema.musik ? `Musik: ${tema.musik}` : null,
    tema.farg ? `Färger: ${tema.farg}` : null,
  ]
    .filter(Boolean)
    .join(", ")
}

// POST /api/marketing-plan/generate — Manuell fallback (snabb, utan web search)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { kund_id, plan_id } = body

  if (!kund_id || !plan_id) {
    return NextResponse.json({ error: "kund_id och plan_id krävs" }, { status: 400 })
  }

  const { data: kund, error: kundError } = await supabase
    .from("kunder")
    .select("*")
    .eq("id", kund_id)
    .single()

  if (kundError || !kund) {
    await supabase.from("marketing_plans").update({ status: "draft" }).eq("id", plan_id)
    return NextResponse.json({ error: `Kund hittades inte (id: ${kund_id}).` }, { status: 404 })
  }

  try {
    const pkgFrequency = getPkgFrequency(kund.pkg ?? "")
    const temaText = getTemaText(kund.tema as KundTema | null)
    const currentMonth = new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Du är social media-strateg specialiserad på svenska restauranger.
Du arbetar för Syns Nu Media som producerar Instagram/TikTok/Facebook-innehåll åt restauranger.

=== RESTAURANGINFORMATION ===
Namn: ${kund.name}
Adress: ${kund.adr || "Sverige"}
Paket: ${kund.pkg || "okänt"} (${pkgFrequency} inlägg/månad)
Anteckningar: ${kund.notes || "–"}
Varumärkesidentitet: ${temaText}

=== DIN UPPGIFT ===
Skapa en 3-månaders social media-marknadsföringsplan specifikt för ${kund.name}. Startmånad: ${currentMonth}.

KRAV:
1. Planen ska kännas unik för ${kund.name} — inte generisk
2. Föreslå konkreta innehållsidéer baserade på restaurangtyp och adress
3. Handlingsplanen per månad ska vara veckovis och plattformsspecifik
4. Anpassa volym till paketet: ${pkgFrequency} inlägg/månad

Returnera ENBART ett JSON-objekt:
{
  "main_goal": "...",
  "opportunity": "...",
  "current_problem": "...",
  "area_analysis": "...",
  "trend_analysis": "...",
  "month1": {
    "goal": "...",
    "subgoals": ["...", "...", "...", "..."],
    "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."]
  },
  "month2": { "goal": "...", "subgoals": ["...", "...", "...", "..."], "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."] },
  "month3": { "goal": "...", "subgoals": ["...", "...", "...", "..."], "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."] }
}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") throw new Error("Oväntat svarsformat")

    const start = content.text.indexOf("{")
    const end = content.text.lastIndexOf("}")
    if (start === -1 || end === -1) throw new Error("Kunde inte hitta JSON i svaret")

    const planData = JSON.parse(content.text.slice(start, end + 1))

    const { data, error } = await supabase
      .from("marketing_plans")
      .update({
        status: "draft",
        main_goal: planData.main_goal ?? "",
        opportunity: planData.opportunity ?? "",
        current_problem: planData.current_problem ?? "",
        area_analysis: planData.area_analysis ?? "",
        trend_analysis: planData.trend_analysis ?? "",
        month1_goal: planData.month1?.goal ?? "",
        month1_subgoals: planData.month1?.subgoals ?? [],
        month1_actions: planData.month1?.actions ?? [],
        month2_goal: planData.month2?.goal ?? "",
        month2_subgoals: planData.month2?.subgoals ?? [],
        month2_actions: planData.month2?.actions ?? [],
        month3_goal: planData.month3?.goal ?? "",
        month3_subgoals: planData.month3?.subgoals ?? [],
        month3_actions: planData.month3?.actions ?? [],
      })
      .eq("id", plan_id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    const row = data as Record<string, unknown>
    return NextResponse.json({
      id: row.id,
      kund_id: row.kund_id,
      status: row.status,
      main_goal: row.main_goal,
      opportunity: row.opportunity,
      current_problem: row.current_problem,
      area_analysis: row.area_analysis,
      trend_analysis: row.trend_analysis,
      month1: { goal: row.month1_goal, subgoals: row.month1_subgoals, actions: row.month1_actions },
      month2: { goal: row.month2_goal, subgoals: row.month2_subgoals, actions: row.month2_actions },
      month3: { goal: row.month3_goal, subgoals: row.month3_subgoals, actions: row.month3_actions },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Generering misslyckades"
    console.error("[marketing-plan/generate] error:", errorMsg)
    await supabase.from("marketing_plans").update({ status: "draft" }).eq("id", plan_id)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

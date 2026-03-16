import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import Anthropic from "@anthropic-ai/sdk"
import type { DB, Kund } from "@/lib/types"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function getKund(kundId: number): Promise<Kund | null> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", "main")
    .single()

  if (error || !data?.data) return null

  const db = data.data as DB
  return db.clients?.find((k) => k.id === kundId) ?? null
}

// POST /api/marketing-plan/generate — Generera marknadsföringsplan med Claude
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { kund_id, plan_id } = body

  if (!kund_id || !plan_id) {
    return NextResponse.json({ error: "kund_id och plan_id krävs" }, { status: 400 })
  }

  const kund = await getKund(kund_id)
  if (!kund) {
    return NextResponse.json({ error: "Kund hittades inte" }, { status: 404 })
  }

  // Bygg prompt med kunddata
  const kundInfo = [
    `Restaurang: ${kund.name}`,
    `Adress: ${kund.adr || "ej angiven"}`,
    `Paket: ${kund.pkg || "ej angivet"}`,
    kund.notes ? `Anteckningar: ${kund.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const prompt = `Du är en expert på restaurangmarknadsföring och sociala medier i Sverige.

Kunduppgifter:
${kundInfo}

Analysera och skapa en 3-månaders marknadsföringsplan för denna restaurang. Planen ska hjälpa dem att växa på sociala medier och attrahera fler gäster.

Inkludera:
1. Analys av restaurangbranschen i området (baserat på adress och allmän branschkunskap)
2. Försäljningstrender att kapitalisera på (säsonger, helger, lokala event, trender)
3. Nuläge och problem (vad hindrar tillväxt idag för en typisk restaurang utan stark social media-närvaro?)
4. Differentieringsmöjlighet (vad kan stå ut vs. konkurrenter i området?)
5. Ett övergripande mål för hela 3-månaderperioden
6. Detaljerade månadsplaner med tydliga mål och konkreta delmål

Returnera ENBART ett JSON-objekt (ingen annan text) med exakt denna struktur:
{
  "main_goal": "Det övergripande målet för hela perioden",
  "opportunity": "Den huvudsakliga möjligheten/differentieringen",
  "current_problem": "Nuläget och problemet idag",
  "area_analysis": "Analys av området och konkurrensläget",
  "trend_analysis": "Relevanta trender och säsongsmönster att utnyttja",
  "month1": {
    "goal": "Månadens övergripande mål",
    "subgoals": ["Delmål 1", "Delmål 2", "Delmål 3", "Delmål 4"]
  },
  "month2": {
    "goal": "Månadens övergripande mål",
    "subgoals": ["Delmål 1", "Delmål 2", "Delmål 3", "Delmål 4"]
  },
  "month3": {
    "goal": "Månadens övergripande mål",
    "subgoals": ["Delmål 1", "Delmål 2", "Delmål 3", "Delmål 4"]
  }
}`

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      throw new Error("Oväntat svarsformat från Claude")
    }

    // Extrahera JSON från svaret
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Kunde inte hitta JSON i svaret")
    }

    const planData = JSON.parse(jsonMatch[0])

    // Spara planen i Supabase
    const { data, error } = await supabase
      .from("marketing_plans")
      .update({
        status: "draft",
        main_goal: planData.main_goal,
        opportunity: planData.opportunity,
        current_problem: planData.current_problem,
        area_analysis: planData.area_analysis,
        trend_analysis: planData.trend_analysis,
        month1_goal: planData.month1?.goal,
        month1_subgoals: planData.month1?.subgoals ?? [],
        month2_goal: planData.month2?.goal,
        month2_subgoals: planData.month2?.subgoals ?? [],
        month3_goal: planData.month3?.goal,
        month3_subgoals: planData.month3?.subgoals ?? [],
      })
      .eq("id", plan_id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

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
      month1: { goal: row.month1_goal, subgoals: row.month1_subgoals },
      month2: { goal: row.month2_goal, subgoals: row.month2_subgoals },
      month3: { goal: row.month3_goal, subgoals: row.month3_subgoals },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  } catch (err) {
    // Markera planen som misslyckad om något går fel
    await supabase
      .from("marketing_plans")
      .update({ status: "draft" })
      .eq("id", plan_id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generering misslyckades" },
      { status: 500 }
    )
  }
}

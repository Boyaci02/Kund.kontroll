import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import Anthropic from "@anthropic-ai/sdk"
import type { KundTema } from "@/lib/types"

export const maxDuration = 300

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function getPkgFrequency(pkg: string): string {
  const lower = pkg.toLowerCase()
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

// POST /api/marketing-plan/generate — Generera marknadsföringsplan med Claude
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
    return NextResponse.json(
      { error: `Kund hittades inte (id: ${kund_id}).` },
      { status: 404 }
    )
  }

  try {
    // ─── Fas 1: Webbresearch ───────────────────────────────────────────────────
    const researchRes = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 } as any],
      messages: [
        {
          role: "user",
          content: `Researcha restaurangen "${kund.name}"${kund.adr ? ` på adressen ${kund.adr}` : " i Sverige"}.

Sök efter och sammanfatta:
1. Deras Instagram och/eller TikTok (finns de? antal följare, typ av innehåll, senaste inlägg)
2. Google-recensioner och betyg (genomsnitt, antal, vad gästerna berömmer eller klagar på)
3. Hur länge de har funnits och restaurangens bakgrund
4. Vilka liknande restauranger/konkurrenter som finns i samma stadsdel eller på samma gata
5. Eventuella mediabevakningar, utmärkelser eller unika egenskaper

Ge en detaljerad research-sammanfattning på svenska som en social media-strateg ska använda för att skapa en skräddarsydd marknadsföringsplan.`,
        },
      ],
    })

    // Extrahera text från research-svaret
    const research = researchRes.content
      .filter((c) => c.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c) => (c as any).text as string)
      .join("\n")
      .trim()

    // ─── Fas 2: Plansgenerering ────────────────────────────────────────────────
    const pkgFrequency = getPkgFrequency(kund.pkg ?? "")
    const temaText = getTemaText(kund.tema as KundTema | null)

    const prompt = `Du är social media-strateg specialiserad på svenska restauranger.
Du arbetar för Syns Nu Media som producerar Instagram/TikTok/Facebook-innehåll åt restauranger.

=== RESTAURANGINFORMATION ===
Namn: ${kund.name}
Adress: ${kund.adr || "Sverige"}
Paket: ${kund.pkg || "okänt"} (${pkgFrequency} inlägg/månad)
Anteckningar från oss: ${kund.notes || "–"}
Varumärkesidentitet: ${temaText}

=== RESEARCH (automatiskt insamlad) ===
${research || "Ingen research tillgänglig – basera planen på restaurangens namn och adress."}

=== DIN UPPGIFT ===
Skapa en 3-månaders social media-marknadsföringsplan specifikt för ${kund.name}.

ABSOLUTA KRAV:
1. Planen ska vara 100% unik för ${kund.name} — omöjlig att kopiera till en annan restaurang
2. Nämn faktiska konkurrenter som hittades i researchen och hur ${kund.name} differentierar sig
3. Föreslå KONKRETA innehållsidéer som matchar restaurangens matkoncept, stämning och varumärke
4. Handlingsplanen (actions) per månad ska vara VECKOVIS och plattformsspecifik (t.ex. "Vecka 1: 2 Reels på Instagram med…", "Vecka 2: TikTok-video av…")
5. Anpassa inläggsvolym till paketet: ${pkgFrequency} inlägg/månad
6. Ton och stil ska matcha varumärkesidentiteten
7. Inkludera säsongsrelevanta kampanjer baserade på adress och årstid (mars 2026)

Returnera ENBART ett JSON-objekt (ingen annan text):
{
  "main_goal": "Det övergripande målet för hela 3-månadsperioden",
  "opportunity": "Den specifika möjligheten baserad på research och konkurrensläget",
  "current_problem": "De specifika problemen identifierade i researchen",
  "area_analysis": "Analys av faktiska konkurrenter och marknadsläge i just detta område",
  "trend_analysis": "Säsonger och trender relevanta för just denna restaurang och plats",
  "month1": {
    "goal": "Månadens övergripande mål",
    "subgoals": ["Specifikt delmål 1", "Specifikt delmål 2", "Specifikt delmål 3", "Specifikt delmål 4"],
    "actions": [
      "Vecka 1: Specifik handling med plattform och innehållstyp",
      "Vecka 2: Specifik handling",
      "Vecka 3: Specifik handling",
      "Vecka 4: Specifik handling"
    ]
  },
  "month2": {
    "goal": "...",
    "subgoals": ["...", "...", "...", "..."],
    "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."]
  },
  "month3": {
    "goal": "...",
    "subgoals": ["...", "...", "...", "..."],
    "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."]
  }
}`

    const planRes = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const planContent = planRes.content[0]
    if (planContent.type !== "text") {
      throw new Error("Oväntat svarsformat från Claude")
    }

    const start = planContent.text.indexOf("{")
    const end = planContent.text.lastIndexOf("}")
    if (start === -1 || end === -1) {
      throw new Error("Kunde inte hitta JSON i svaret från Claude")
    }
    const planData = JSON.parse(planContent.text.slice(start, end + 1))

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

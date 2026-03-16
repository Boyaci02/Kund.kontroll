import { schedules, logger } from "@trigger.dev/sdk/v3"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getPkgFrequency(pkg: string): string {
  const lower = (pkg ?? "").toLowerCase()
  if (lower.includes("lilla")) return "8"
  if (lower.includes("mellan")) return "12"
  if (lower.includes("stora")) return "20"
  if (lower.includes("extra")) return "24+"
  if (lower.includes("special")) return "16"
  return "12"
}

function getTemaText(tema: Record<string, string> | null | undefined): string {
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

async function generatePlanForKund(
  supabase: ReturnType<typeof createClient>,
  kund: Record<string, unknown>
): Promise<void> {
  const kundId = kund.id as number
  const name = kund.name as string

  logger.info(`Genererar plan för: ${name} (id: ${kundId})`)

  // ─── Fas 1: Webbresearch ────────────────────────────────────────────────────
  logger.info(`Research startar för ${name}...`)
  const researchRes = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 } as any],
    messages: [
      {
        role: "user",
        content: `Researcha restaurangen "${name}"${kund.adr ? ` på adressen ${kund.adr}` : " i Sverige"}.

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

  const research = researchRes.content
    .filter((c) => c.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c) => (c as any).text as string)
    .join("\n")
    .trim()

  logger.info(`Research klar för ${name}`)

  // ─── Fas 2: Plansgenerering ─────────────────────────────────────────────────
  const pkgFrequency = getPkgFrequency((kund.pkg as string) ?? "")
  const temaText = getTemaText(kund.tema as Record<string, string> | null)
  const currentMonth = new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })

  const planRes = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Du är social media-strateg specialiserad på svenska restauranger.
Du arbetar för Syns Nu Media som producerar Instagram/TikTok/Facebook-innehåll åt restauranger.

=== RESTAURANGINFORMATION ===
Namn: ${name}
Adress: ${(kund.adr as string) || "Sverige"}
Paket: ${(kund.pkg as string) || "okänt"} (${pkgFrequency} inlägg/månad)
Anteckningar från oss: ${(kund.notes as string) || "–"}
Varumärkesidentitet: ${temaText}

=== RESEARCH (automatiskt insamlad) ===
${research || "Ingen research tillgänglig – basera planen på restaurangens namn och adress."}

=== DIN UPPGIFT ===
Skapa en 3-månaders social media-marknadsföringsplan specifikt för ${name}. Startmånad: ${currentMonth}.

ABSOLUTA KRAV:
1. Planen ska vara 100% unik för ${name} — omöjlig att kopiera till en annan restaurang
2. Nämn faktiska konkurrenter som hittades i researchen och hur ${name} differentierar sig
3. Föreslå KONKRETA innehållsidéer som matchar restaurangens matkoncept, stämning och varumärke
4. Handlingsplanen (actions) per månad ska vara VECKOVIS och plattformsspecifik (t.ex. "Vecka 1: 2 Reels på Instagram med…")
5. Anpassa inläggsvolym till paketet: ${pkgFrequency} inlägg/månad
6. Ton och stil ska matcha varumärkesidentiteten
7. Inkludera säsongsrelevanta kampanjer baserade på adress och årstid

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
    "actions": ["Vecka 1: ...", "Vecka 2: ...", "Vecka 3: ...", "Vecka 4: ..."]
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
}`,
      },
    ],
  })

  const planContent = planRes.content[0]
  if (planContent.type !== "text") throw new Error("Oväntat svarsformat från Claude")

  const start = planContent.text.indexOf("{")
  const end = planContent.text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Kunde inte hitta JSON i svaret")

  const planData = JSON.parse(planContent.text.slice(start, end + 1))

  // ─── Spara planen i Supabase ────────────────────────────────────────────────
  const { error } = await supabase.from("marketing_plans").insert({
    kund_id: kundId,
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

  if (error) throw new Error(`Supabase-fel: ${error.message}`)

  logger.info(`Plan sparad för ${name}`)
}

export const dailyMarketingPlans = schedules.task({
  id: "daily-marketing-plans",
  cron: { pattern: "0 8 * * *", timezone: "Europe/Stockholm" },

  run: async () => {
    logger.info("Daglig marknadsplansgenerering startar")

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Steg 1: Hämta onboarding-enrollments
    const { data: obData, error: obError } = await supabase
      .from("app_state")
      .select("data")
      .eq("id", "ob_state")
      .single()

    if (obError || !obData) {
      logger.warn("Kunde inte hämta ob_state — inga enrollments att behandla")
      return { generatedCount: 0 }
    }

    const enrollments: Array<{ kundId: number; name: string }> =
      (obData.data as Record<string, unknown>)?.obEnrollments as Array<{ kundId: number; name: string }> ?? []

    if (enrollments.length === 0) {
      logger.info("Inga kunder i onboarding — inget att göra")
      return { generatedCount: 0 }
    }

    logger.info(`Hittade ${enrollments.length} kunder i onboarding`)

    // Steg 2: Kolla vilka som redan har en plan
    const kundIds = enrollments.map((e) => e.kundId)
    const { data: existingPlans } = await supabase
      .from("marketing_plans")
      .select("kund_id")
      .in("kund_id", kundIds)

    const withPlan = new Set((existingPlans ?? []).map((p) => p.kund_id as number))
    const missing = enrollments.filter((e) => !withPlan.has(e.kundId))

    logger.info(`${missing.length} kunder saknar marknadsföringsplan`)

    if (missing.length === 0) {
      return { generatedCount: 0 }
    }

    // Steg 3: Hämta kunddata och generera plan för varje kund
    const generated: string[] = []
    const failed: string[] = []

    for (const enrollment of missing) {
      try {
        const { data: kund, error: kundError } = await supabase
          .from("kunder")
          .select("*")
          .eq("id", enrollment.kundId)
          .single()

        if (kundError || !kund) {
          logger.error(`Kund ${enrollment.kundId} (${enrollment.name}) hittades inte i kunder-tabellen`)
          failed.push(enrollment.name)
          continue
        }

        await generatePlanForKund(supabase, kund as Record<string, unknown>)
        generated.push(enrollment.name)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "okänt fel"
        logger.error(`Misslyckades generera plan för ${enrollment.name}: ${msg}`)
        failed.push(enrollment.name)
      }
    }

    logger.info(`Klart — ${generated.length} planer genererade, ${failed.length} misslyckades`)
    if (failed.length > 0) logger.warn(`Misslyckades: ${failed.join(", ")}`)

    return { generatedCount: generated.length, generated, failed }
  },
})

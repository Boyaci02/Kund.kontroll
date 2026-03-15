import { schedules, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";

const KUND_KONTROLL_URL = process.env.KUND_KONTROLL_URL!;
const KUND_KONTROLL_KEY = process.env.KUND_KONTROLL_API_KEY!;

export const weeklyLeadHunt = schedules.task({
  id: "weekly-lead-hunt",
  // Varje måndag kl 09:00 — Europe/Stockholm
  cron: { pattern: "0 9 * * 1", timezone: "Europe/Stockholm" },

  run: async () => {
    logger.info("Weekly lead hunt startar");

    // Steg 1 — Hämta befintliga kunder & leads (undvik dubbletter)
    const [clientsRes, leadsRes] = await Promise.all([
      fetch(`${KUND_KONTROLL_URL}/api/claude/clients`, {
        headers: { "x-claude-api-key": KUND_KONTROLL_KEY },
      }),
      fetch(`${KUND_KONTROLL_URL}/api/claude/leads`, {
        headers: { "x-claude-api-key": KUND_KONTROLL_KEY },
      }),
    ]);

    const clients: Array<{ name?: string }> = await clientsRes.json();
    const leads: Array<{ company?: string }> = await leadsRes.json();

    const existingNames = [
      ...clients.map((c) => c.name?.toLowerCase()),
      ...leads.map((l) => l.company?.toLowerCase()),
    ].filter(Boolean);

    logger.info(`Exkluderar ${existingNames.length} befintliga kunder/leads`);

    // Steg 2 — Kalla Claude för att hitta + researcha 5 leads
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `
Du är en säljassistent för Syns Nu Media — en digital marknadsföringsbyrå specialiserad på restauranger i Stockholm.

UPPGIFT: Hitta och researcha 5 Stockholmsrestauranger som troligtvis behöver hjälp med sin digitala närvaro.

EXKLUDERA dessa (redan kunder eller leads): ${existingNames.join(", ")}

För varje restaurang, bedöm deras svagaste punkt och anpassa pitchen:
- Ingen/dålig hemsida → pitch hemsida 500 kr/mån
- Svag social media (få followers, inget content) → pitch Basic Plan 7 500 kr/mån
- Aktiv restaurang men vill växa snabbt → pitch Pro Plan 12 500 kr/mån

Svara ENBART med ett JSON-objekt i detta format (inga förklaringar utanför JSON):

{
  "leads": [
    {
      "name": "Kontaktpersonens namn om känt, annars restaurangnamnet",
      "company": "Restaurangnamn",
      "area": "Stadsdel i Stockholm",
      "email": "info@restaurang.se eller null om okänd",
      "phone": "telefonnummer eller null",
      "service": "Hemsida 500kr/mån | Basic Plan 7500kr/mån | Pro Plan 12500kr/mån",
      "weakness": "Kort beskrivning av deras svagaste punkt",
      "research_notes": "Hemsida: [status] | Instagram: [status] | Google: [betyg, antal recensioner]",
      "email_draft": {
        "subject": "Ämnesrad på svenska",
        "body": "Hela mailets brödtext på svenska. Ska vara personligt och referera till deras specifika svaghet. Max 150 ord. Signatur: Emanuel Boyaci, Syns Nu Media, 070-888 01 98"
      }
    }
  ]
}

Tänk på:
- Fokusera på verkliga restaurangtyper i Stockholm (sushi, pizza, kebab, café, burger, thaimat etc.)
- Var specifik i email-draftet — nämn restaurangens svaghet konkret
- Inkludera relevant social proof baserat på pitchen:
  - Hemsida: "Flipp Burgers och Caliente fick professionella sidor som drar in fler bokningar"
  - SMM: "Stuvstagrillen ökade sin dagskassa med 50% efter att vi tog hand om deras digitala närvaro"
- Avsluta alltid med CTA: föreslå ett 15-minuters samtal
`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // Steg 3 — Parsa JSON-svaret
    const content = message.content[0];
    if (content.type !== "text") throw new Error("Oväntat svar från Claude");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Kunde inte hitta JSON i Claude-svaret");

    const { leads: newLeads } = JSON.parse(jsonMatch[0]) as {
      leads: Array<{
        name: string;
        company: string;
        area: string;
        email: string | null;
        phone: string | null;
        service: string;
        weakness: string;
        research_notes: string;
        email_draft: { subject: string; body: string };
      }>;
    };

    logger.info(`Claude hittade ${newLeads.length} leads`);

    // Steg 4 — Spara varje lead i Kund.kontroll
    const savedLeads: string[] = [];
    for (const lead of newLeads) {
      const notes = [
        `[Auto-genererat ${new Date().toLocaleDateString("sv-SE")}]`,
        ``,
        `Område: ${lead.area}`,
        `Svaghet: ${lead.weakness}`,
        ``,
        `Research:`,
        lead.research_notes,
        ``,
        `---`,
        `Email-draft:`,
        `Ämne: ${lead.email_draft.subject}`,
        ``,
        lead.email_draft.body,
      ].join("\n");

      const res = await fetch(`${KUND_KONTROLL_URL}/api/leads`, {
        method: "POST",
        headers: {
          "x-claude-api-key": KUND_KONTROLL_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${lead.company} — ${lead.area}`,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          status: "Ny lead",
          notes,
        }),
      });

      if (res.ok) {
        savedLeads.push(lead.company);
        logger.info(`Lead sparad: ${lead.company}`);
      } else {
        logger.error(`Misslyckades spara lead: ${lead.company}`, {
          status: res.status,
        });
      }
    }

    logger.info(`Klart — ${savedLeads.length} leads sparade i Kund.kontroll`);
    return { savedCount: savedLeads.length, leads: savedLeads };
  },
});

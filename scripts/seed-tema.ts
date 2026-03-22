/**
 * Engångsskript: Populera Tema-data för alla kunder i Supabase.
 *
 * Kör med:
 *   npx tsx scripts/seed-tema.ts
 *
 * Kräver att NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY
 * finns i .env.local.
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Ladda .env.local manuellt (tsx kör utanför Next.js context)
const envPath = path.join(__dirname, "../.env.local")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL saknas i .env.local")
  process.exit(1)
}
if (!supabaseKey || supabaseKey.includes("placeholder")) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY saknas i .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface KundTema {
  musik: string
  kansla: string
  typ: string
  farg: string
  typsnitt: string
}

const temaData: Array<{ name: string; tema: KundTema }> = [
  {
    name: "Drippin Burgers",
    tema: {
      musik: "Familjevänlig förorts-musik, Svensk Rap, Spansk Rap, Fransk Rap, Hip-hop. Gungiga och upbeat låtar med tunga beats.",
      kansla: "Positiv / Glad / Kaxig / Förort / Varm",
      typ: "Högt tempo, Snabba klipp, Snabba transitions",
      farg: "Varmare / Gulare",
      typsnitt: "BUNGEE",
    },
  },
  {
    name: "Berra Burras Kebab",
    tema: {
      musik: "Hip-hop, Gungiga beats med lite sång/rap, glada och upbeat låtar.",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Variation: Högt tempo / Lugnare videos",
      farg: "Kallare / Blått",
      typsnitt: "Montserrat (Fetstilt)",
    },
  },
  {
    name: "KEB",
    tema: {
      musik: "Hip-hop, Gungiga beats med lite sång/rap, tunga och upbeat beats.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt / 50 Cent-ish",
      typ: "Högt tempo, Snabba klipp, Snabba transitions",
      farg: "Kallare / Blått",
      typsnitt: "Bebas Neue",
    },
  },
  {
    name: "Berlin Döner",
    tema: {
      musik: "Gungiga beats, mestadels instrumentala, glada och inbjudande.",
      kansla: "Glad / Positiv / Inbjudande / Chill / Lugn",
      typ: "Högt tempo, Snabba klipp, Snabba transitions / Variation med lugnare videos",
      farg: "Varmare / Gulare",
      typsnitt: "Staatliches-Regular",
    },
  },
  {
    name: "CGs Streetfood",
    tema: {
      musik: "Hip-hop, Street, Gungiga beats med lite sång/rap, positiva och sköna beats.",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt / Lite street-ish",
      typ: "Högt tempo, Snabba klipp, Snabba transitions",
      farg: "Varmare / Gulare",
      typsnitt: "Uninsta-Hv",
    },
  },
  {
    name: "Saya Sushi",
    tema: {
      musik: "Positiva och eleganta låtar, lugn och stilren musik.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Chill / Lugn",
      typ: "Mer långsamma eleganta videos, ibland snabbare klipp för variation.",
      farg: "Kallare / Blått / Neutral",
      typsnitt: "Goudy Old Style Bold",
    },
  },
  {
    name: "Caliente Tapas & Bar",
    tema: {
      musik: "Spanska låtar med mycket energi, elegant och stilren musik, ibland högre tempo.",
      kansla: "Spansk / Latina / Glad / Positivt / Varmt / Elegant / Stilrent",
      typ: "Högt tempo, Snabba klipp, Snabba transitions / Variation med lugnare eleganta videos.",
      farg: "Varmare / Gulare",
      typsnitt: "Montserrat Bold",
    },
  },
  {
    name: "Nuudle House",
    tema: {
      musik: "Hip-hop, Gungiga beats, positiva och sköna låtar med lite tempo.",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt / Lite street-ish",
      typ: "Högt tempo, Snabba klipp, Snabba transitions / Variation med lugnare videos.",
      farg: "Varmare / Gulare",
      typsnitt: "ZY Majestic",
    },
  },
  {
    name: "Stuvstagrillen",
    tema: {
      musik: "Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba Klipp, Snabba transitions",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Montserrat Bold",
    },
  },
  {
    name: "Östermalmsgrillen",
    tema: {
      musik: "Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba Klipp, Snabba transitions",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Montserrat Bold",
    },
  },
  {
    name: "Fullmoon Wok",
    tema: {
      musik: "Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba Klipp, Snabba transitions / Variation med lugnare videos.",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "TOMO-Fango",
    },
  },
  {
    name: "Uncle Phils",
    tema: {
      musik: "Amerikansk Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba Klipp, Snabba transitions / Variation med lugnare videos.",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Modern",
    },
  },
  {
    name: "Mums Burgers",
    tema: {
      musik: "Lofi Chill Beats, Hip-hop, Gungiga låtar, upbeat och sköna beats.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Variation lugnare videos / mer upbeat",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Uninsta-Hv (Bold)",
    },
  },
  {
    name: "Hornstull Burgers & Grill",
    tema: {
      musik: "Lofi Chill Beats, Hip-hop, Gungiga låtar, upbeat och sköna beats.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Variation lugnare videos / mer upbeat",
      farg: "Neutral",
      typsnitt: "Helvetica",
    },
  },
  {
    name: "Flipp Burgers",
    tema: {
      musik: "Lofi Chill Beats, Hip-hop, Gungiga låtar, upbeat och sköna beats.",
      kansla: "Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Variation lugnare videos / mer upbeat",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Anton",
    },
  },
  {
    name: "Yume Sushi",
    tema: {
      musik: "Positiva låtar, orientalisk musik, variation mellan elegant och upbeat musik.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Chill / Lugn",
      typ: "Mer långsamma eleganta videos, ibland snabbare klipp för variation.",
      farg: "Orange / Varmare",
      typsnitt: "Klop",
    },
  },
  {
    name: "Let's Malatang",
    tema: {
      musik: "Lofi Chill Beats, Orientalisk musik, Hip-hop, upbeat låtar med energi.",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, ljus- och glitch-effekter",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Integraf-CF-Heavy (Bold)",
    },
  },
  {
    name: "The Lounge Bar",
    tema: {
      musik: "Gungiga låtar, populära dance hits, club-låtar, upbeat och hög energi.",
      kansla: "Drinkar / Gäster i Baren / Personal som jobbar / Inbjudande känsla",
      typ: "Högt tempo, Snabba klipp, Snabba transitions, Flashande ljuseffekter / upbeat med energi.",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Bebas Neue",
    },
  },
  {
    name: "STEKT Burgers & Stuff",
    tema: {
      musik: "Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, lite ljus- och glitch-effekter",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Clarify-Blk / Poppins",
    },
  },
  {
    name: "Efendi Kolgrill",
    tema: {
      musik: "Turkisk Type Beats / Turkisk Musik / Mellanöstern musik",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Variation lugnare videos / mer upbeat",
      farg: "Orange / Varmare",
      typsnitt: "Montserrat",
    },
  },
  {
    name: "Käk & Bar",
    tema: {
      musik: "Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, lite ljus- och glitch-effekter",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Clarify-Blk",
    },
  },
  {
    name: "Southside Burgers",
    tema: {
      musik: "Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, lite ljus- och glitch-effekter",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Helvetica",
    },
  },
  {
    name: "Retro Bar",
    tema: {
      musik: "Amerikansk Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, lite ljus- och glitch-effekter",
      farg: "Kallare / Blåare / Neutral",
      typsnitt: "Akzidenz-Grotesk (Tiktok: Indivisible)",
    },
  },
  {
    name: "Ristorante Buono",
    tema: {
      musik: "Stilren Musik / Klassisk Musik / Italiensk Musik / Piano",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Mer långsamma eleganta videos (Caprica)",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Zilla Slab",
    },
  },
  {
    name: "The Public",
    tema: {
      musik: "Stilren Musik / Klassisk Musik / Hip-hop / Upbeat",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Mer långsamma eleganta videos (Caprica)",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Anton",
    },
  },
  {
    name: "DAP - Döner and Pizza",
    tema: {
      musik: "Amerikansk Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Variation lugnare videos / mer upbeat",
      farg: "Orange / Varmare",
      typsnitt: "Chewy",
    },
  },
  {
    name: "Sonjas Burgare",
    tema: {
      musik: "Hip-hop, Gungiga beats, positiva och sköna låtar med lite tempo.",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba klipp, Snabba transitions / Variation med lugnare videos.",
      farg: "Varmare / Gulare / Neutral. Starka färger",
      typsnitt: "Ubuntu",
    },
  },
  {
    name: "Lucas Kvarterskrog",
    tema: {
      musik: "Stilren Musik / Klassisk Musik / Piano / Variation med Funk och Jazz",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Mer långsamma eleganta videos / Variera med lite högre tempo ibland",
      farg: "Varmare / Gulare / Lila / Neutral",
      typsnitt: "Har ingen vald",
    },
  },
  {
    name: "Brams Burgers",
    tema: {
      musik: "Ingen musik",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Högt tempo, Snabba klipp, Snabba transitions. Text animation: Reveal. Lite skugga på texten.",
      farg: "Varmare / Gulare / Neutral. Starka färger",
      typsnitt: "League Gothic",
    },
  },
  {
    name: "Fluffy House",
    tema: {
      musik: "Glad Musik, POP, Låtar från toppen på Världslistan på Spotify, Lugna låtar, Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Mer långsamma stilrena videos",
      farg: "Varmare / Gulare",
      typsnitt: "Bebas Neue",
    },
  },
  {
    name: "Tokyo Trio",
    tema: {
      musik: "Glad Musik, POP, Hip-Hop, Funk. Låtar från toppen på Världslistan på Spotify, Lugna låtar.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Playfair Display (BOLD)",
    },
  },
  {
    name: "Sushi Revolution",
    tema: {
      musik: "Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv",
      kansla: "Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Upbeat med energi, snabba klipp, fokus på visuellt coola shots: t.ex eld på sushi / doppar sushi i sås etc.",
      farg: "Varmare / Neutral",
      typsnitt: "Dosis (Bold)",
    },
  },
  {
    name: "Tasty Bro's",
    tema: {
      musik: "Hip-hop, Gungiga beats med lite sång/rap, glada och upbeat låtar.",
      kansla: "Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt",
      typ: "Variation: Högt tempo / Lugnare videos / Längre videos med mer naturlig känsla",
      farg: "Kallare / Blått",
      typsnitt: "Luckiest Guy",
    },
  },
  {
    name: "Asian BBQ & Bistro",
    tema: {
      musik: "Glad Musik, POP, Hip-Hop, Funk. Låtar från toppen på Världslistan på Spotify, Lugna låtar.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Poppins (Bold)",
    },
  },
  {
    name: "White Rice",
    tema: {
      musik: "Glad Musik, POP, Hip-Hop, Funk. Låtar från toppen på Världslistan på Spotify, Lugna låtar.",
      kansla: "Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Varmare / Gulare / Neutral",
      typsnitt: "Bebas Neue (Bold)",
    },
  },
  {
    name: "K25",
    tema: {
      musik: "Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify, Lugna låtar. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "Zurich BT Black Font",
    },
  },
  {
    name: "Falafelbaren",
    tema: {
      musik: "Arabisk musik, orientalisk musik. Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "Baskervville / Serif (Bold)",
    },
  },
  {
    name: "Dunder Smash",
    tema: {
      musik: "Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "ANTON",
    },
  },
  {
    name: "The Holly Bush",
    tema: {
      musik: "Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "ArchivoBlack-Rg",
    },
  },
  {
    name: "Rosa Pantern",
    tema: {
      musik: "Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "pantherfont",
    },
  },
  {
    name: "Chopchop",
    tema: {
      musik: "(ENDAST COPYRIGHT FRITT) Glad Musik, POP, Hip-hop Beats, Positiv Vibe",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Neutral",
      typsnitt: "Poppins (Bold)",
    },
  },
  {
    name: "Thai House Wok",
    tema: {
      musik: "Glad Musik, POP, Hip-hop Beats, Positiv Vibe",
      kansla: "Glad / Positiv / Inbjudande / TIKTOK Känsla",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Orange, Lilla är deras färger",
      typsnitt: "Anton",
    },
  },
  {
    name: "Avidental",
    tema: {
      musik: "Avslappnad, Funk, Lo-fi Beats",
      kansla: "Glad / Positiv / Inbjudande / Professionell",
      typ: "Högt Tempo, Kortare Klipp / Variation med Lugnare videos",
      farg: "Naturligt",
      typsnitt: "Poppins (Bold)",
    },
  },
]

async function main() {
  console.log(`\n🎨 Startar tema-populering för ${temaData.length} kunder...\n`)

  let updated = 0
  let notFound = 0
  const notFoundNames: string[] = []

  for (const { name, tema } of temaData) {
    const { data, error } = await supabase
      .from("kunder")
      .update({ tema })
      .ilike("name", name)
      .select("id, name")

    if (error) {
      console.error(`❌ Fel vid uppdatering av "${name}":`, error.message)
      continue
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️  EJ HITTAD: "${name}"`)
      notFound++
      notFoundNames.push(name)
    } else {
      console.log(`✅ Uppdaterad: ${data[0].name} (id: ${data[0].id})`)
      updated++
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Uppdaterade: ${updated}`)
  console.log(`⚠️  Ej hittade: ${notFound}`)
  if (notFoundNames.length > 0) {
    console.log(`\nEj hittade kunder (kontrollera stavning i databasen):`)
    notFoundNames.forEach((n) => console.log(`  - ${n}`))
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

main().catch(console.error)

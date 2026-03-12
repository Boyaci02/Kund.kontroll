import type { HemsidaClient, Lead, CrmTask } from "./hemsidor-types"

export const INIT_HEMSIDA_CLIENTS: HemsidaClient[] = [
  { id: 1, name: "Bergström & Co",   contact: "Anna Bergström",  email: "anna@bergstrom.se",     phone: "070-123 45 67", website: "bergstrom.se",    status: "aktiv",    plan: "Pro",      monthlyFee: 2500, startDate: "2024-03-15", renewalDate: "2026-03-15", notes: "" },
  { id: 2, name: "Nordic Bygg AB",   contact: "Erik Lindqvist",  email: "erik@nordicbygg.se",    phone: "073-987 65 43", website: "nordicbygg.se",   status: "aktiv",    plan: "Standard", monthlyFee: 1500, startDate: "2024-06-01", renewalDate: "2026-06-01", notes: "" },
  { id: 3, name: "Café Solros",      contact: "Maria Johansson", email: "maria@cafesolros.se",   phone: "076-456 78 90", website: "cafesolros.se",   status: "pausad",   plan: "Basic",    monthlyFee: 799,  startDate: "2023-11-20", renewalDate: "2026-11-20", notes: "" },
  { id: 4, name: "Teknikproffs AB",  contact: "Jonas Svensson",  email: "jonas@teknikproffs.se", phone: "072-111 22 33", website: "teknikproffs.se", status: "aktiv",    plan: "Pro",      monthlyFee: 2500, startDate: "2025-01-10", renewalDate: "2026-04-10", notes: "" },
  // ── Qopla-kunder (Oktober 2025) ─────────────────────────────────────────────
  { id: 10, name: "Levadura Pizzeria Göteborg", contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-10", notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Domän: Överför domän" },
  { id: 11, name: "Partille Sushi",             contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-10", notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Domän: Överför domän" },
  { id: 12, name: "Nilssons Pizzeria",          contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-10", notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Kör på svartvita färger för att hålla det enkelt, använd lite gul från loggan för lite känsla bara" },
  { id: 13, name: "Lilla Rustik",               contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-22", notes: "Ansvarig: Emanuel | Tilldelad av: Vilma - Qopla | Domän: Överför domän" },
  { id: 14, name: "Milano Pizzeria",            contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-17", notes: "Ansvarig: Ivan | Tilldelad av: Emanuel | Domän: Ny domän" },
  { id: 15, name: "Milos Pizzeria",             contact: "",               email: "",                           phone: "",             website: "",                    status: "pausad", plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-15", notes: "Ansvarig: Emanuel | Tilldelad av: Goran - Qopla | Domän: Ny domän | Status: Påbörjad" },
  { id: 16, name: "Lilla Olofstorp",            contact: "",               email: "",                           phone: "",             website: "lillaolofstorp.se",   status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-20", notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Har befintlig hemsida: lillaolofstorp.se – info/färger/logga kan tas därifrån" },
  { id: 17, name: "Sushimi",                    contact: "",               email: "",                           phone: "",             website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "",           renewalDate: "2025-10-20", notes: "Ansvarig: Ivan | Tilldelad av: Hamon - Qopla | Domän: Ny domän" },
  { id: 18, name: "La Pizza",                   contact: "",               email: "",                           phone: "0760309600",   website: "",                    status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "2025-10-27", renewalDate: "2025-10-30", notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Domän: Ny domän" },
  { id: 19, name: "Ferrari Pizzeria",           contact: "Antonio Ezad",   email: "antonioezat@hotmail.se",     phone: "0704584701",   website: "pizzeriaferrari.se",  status: "aktiv",  plan: "Basic",    monthlyFee: 1000, startDate: "2025-10-27", renewalDate: "2025-10-31", notes: "Ansvarig: Ivan | Tilldelad av: Saga - Qopla | Domän: Överför domän (nuvarande: pizzeriaferrari.se)" },
  { id: 20, name: "Strand 38 Gula Huset",       contact: "Arif",           email: "263030@gmail.com",           phone: "0730263030",   website: "strand38gulahuset.se", status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-10-28", renewalDate: "2025-10-31", notes: "Ansvarig: Ivan | Tilldelad av: Fares - Qopla | Caféi Halmstad, ingen befintlig domän" },
  { id: 21, name: "Sam's Café",                 contact: "Samer Alzubi",   email: "info@vrpark.se",             phone: "0720071007",   website: "",                    status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-11-21", renewalDate: "2025-11-27", notes: "Ansvarig: Ivan | Tilldelad av: Fares - Qopla | Domän: Ny domän" },
  { id: 22, name: "Oishi Sushi - Knivsta",      contact: "Enne",           email: "oishisushirotebro@gmail.com", phone: "0764014360",  website: "",                    status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-11-21", renewalDate: "2025-11-27", notes: "Ansvarig: Ivan | Tilldelad av: Fares - Qopla | Domän: Ny domän" },
  { id: 23, name: "Oishi Sushi - Rotebro",      contact: "Enne",           email: "oishisushirotebro@gmail.com", phone: "0764014360",  website: "",                    status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-11-21", renewalDate: "2025-11-27", notes: "Ansvarig: Ivan | Tilldelad av: Fares - Qopla | Domän: Ny domän" },
  { id: 24, name: "Yafa Restaurang Hayat",      contact: "Hayat",          email: "hayat.restaurang.ab@gmail.com", phone: "0761613500", website: "",                   status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-12-15", renewalDate: "2026-01-06", notes: "Ansvarig: Ivan | Domän: Ny domän" },
  { id: 25, name: "Shui Yin Bo Tuo",            contact: "Xiang nu lin",   email: "linxiangnu10@hotmail.com",   phone: "0707700058",   website: "",                    status: "aktiv",  plan: "Standard", monthlyFee: 2500, startDate: "2025-12-05", renewalDate: "2026-01-19", notes: "Ansvarig: Ivan | Tilldelad av: Hampus - Qopla | Checka domän" },
  { id: 26, name: "Alpina Urban",               contact: "Malik Kirbas",   email: "malik.kirbas@gmail.com",     phone: "0790487578",   website: "",                    status: "pausad", plan: "Standard", monthlyFee: 2500, startDate: "2026-02-26", renewalDate: "",           notes: "Ansvarig: Ivan | Tilldelad av: Amin - Qopla | Status: Inväntar domän" },
  { id: 27, name: "Markivast",                  contact: "Philip Andersson", email: "philip@markivast.se",      phone: "070-2446326",  website: "",                    status: "pausad", plan: "Standard", monthlyFee: 2500, startDate: "2026-03-03", renewalDate: "2026-03-13", notes: "Ansvarig: Ivan | Tilldelad av: Johanna - Qopla | Domän på Loopia | Bett kund kontakta med önskemål, de siktar på att öppna fler restauranger framöver | Status: Påbörjad" },
]

export const INIT_HEMSIDA_LEADS: Lead[] = [
  { id: 1, name: "Grön Trädgård AB",  contact: "Petra Nilsson",   email: "petra@grontr.se",  phone: "070-888 77 66", source: "Hemsida",        status: "kontaktad",      created: "2026-02-20", notes: "Intresserad av hemsida + SEO",   estimatedValue: 15000, followUpDate: "2026-03-06", lostReason: "", timeline: [] },
  { id: 2, name: "Restaurang Smak",   contact: "Lars Eriksson",   email: "lars@smak.se",     phone: "073-222 33 44", source: "Rekommendation", status: "offert_skickad", created: "2026-02-25", notes: "Ny hemsida, budget 15 000 kr",   estimatedValue: 15000, followUpDate: "",           lostReason: "", timeline: [] },
  { id: 3, name: "Modebutiken Belle", contact: "Sofia Andersson", email: "sofia@belle.se",   phone: "076-555 44 33", source: "Instagram",      status: "avtal_signerat", created: "2026-03-01", notes: "E-handelshemsida",               estimatedValue: 25000, followUpDate: "",           lostReason: "", timeline: [] },
]

export const INIT_HEMSIDA_TASKS: CrmTask[] = [
  { id: 1, clientId: 1, clientName: "Bergström & Co",  title: "Uppdatera öppettider på kontaktsidan", description: "Nya öppettider från 1 april: Mån-Fre 09-18, Lör 10-15",   status: "inkommen",  priority: "normal", created: "2026-03-03", dueDate: "2026-03-07", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: "2026-03-03" },
  { id: 2, clientId: 2, clientName: "Nordic Bygg AB",  title: "Lägg till 3 nya projektbilder",        description: "Bilder från projektet Villastaden – skickat via mail",     status: "pagaende",  priority: "normal", created: "2026-03-01", dueDate: "2026-03-05", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: "2026-03-01" },
  { id: 3, clientId: 4, clientName: "Teknikproffs AB", title: "Ny landningssida för kampanj",         description: "Påsk-kampanj, ska vara live senast 15 mars",                status: "pagaende",  priority: "hog",    created: "2026-02-28", dueDate: "2026-03-15", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: "2026-02-28" },
  { id: 4, clientId: 1, clientName: "Bergström & Co",  title: "Fixa bruten länk på Om oss-sidan",    description: "Länken till LinkedIn är bruten",                            status: "klar",      priority: "lag",    created: "2026-02-20", dueDate: "2026-02-22", completedDate: "2026-02-21", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: "2026-02-21" },
  { id: 5, clientId: 3, clientName: "Café Solros",     title: "Uppdatera meny för sommaren",          description: "Ny säsongsmeny ska läggas till under fliken Mat & Dryck",   status: "granskning",priority: "normal", created: "2026-03-02", dueDate: "2026-03-10", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: "2026-03-02" },
]

export const CLIENT_STATUS_STYLE: Record<string, string> = {
  aktiv:    "bg-emerald-100 text-emerald-700",
  pausad:   "bg-amber-100 text-amber-700",
  avslutas: "bg-red-100 text-red-700",
}

export const CLIENT_STATUS_LABEL: Record<string, string> = {
  aktiv: "Aktiv",
  pausad: "Pausad",
  avslutas: "Avslutas",
}

export const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  kontaktad:      { label: "Kontaktad",      color: "bg-sky-100 text-sky-700"      },
  offert_skickad: { label: "Offert skickad", color: "bg-violet-100 text-violet-700" },
  avtal_signerat: { label: "Avtal signerat", color: "bg-emerald-100 text-emerald-700" },
  forlorad:       { label: "Förlorad",       color: "bg-red-100 text-red-700"       },
}

export const LEAD_COLUMNS = ["kontaktad", "offert_skickad", "avtal_signerat", "forlorad"] as const

export const TASK_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  inkommen:   { label: "Inkommen",   color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"    },
  pagaende:   { label: "Pågående",   color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  granskning: { label: "Granskning", color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"   },
  klar:       { label: "Klar",       color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
}

export const PRIORITY: Record<string, { label: string; style: string }> = {
  hog:    { label: "Hög",    style: "border-red-200 bg-red-50 text-red-600"    },
  normal: { label: "Normal", style: "border-gray-200 bg-gray-50 text-gray-600" },
  lag:    { label: "Låg",    style: "border-green-200 bg-green-50 text-green-600" },
}

export const PRIORITY_CYCLE: Record<string, string> = {
  lag: "normal",
  normal: "hog",
  hog: "lag",
}

export const ALL_TASK_STATUSES = ["inkommen", "pagaende", "granskning", "klar"] as const

export const REQUEST_CATEGORIES = ["Ny funktion", "Buggfix", "Innehållsuppdatering", "Övrigt"]

export const REQUEST_PRIORITY: Record<string, { label: string; style: string }> = {
  lag:        { label: "Låg",        style: "bg-slate-100 text-slate-600 border-slate-200" },
  normal:     { label: "Normal",     style: "bg-blue-100 text-blue-700 border-blue-200"    },
  bradskande: { label: "Brådskande", style: "bg-red-100 text-red-700 border-red-200"       },
}

export const LEAD_SOURCES = ["Hemsida", "Rekommendation", "Instagram", "LinkedIn", "Google", "Övrigt"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function isOverdue(task: CrmTask): boolean {
  return !!(task.dueDate && task.dueDate < todayStr() && task.status !== "klar" && !task.archivedAt)
}

export function isStale(task: CrmTask): boolean {
  if (task.status === "klar" || task.archivedAt) return false
  const last = task.lastUpdated || task.created
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  return !!(last && last < sevenDaysAgo)
}

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date(todayStr()).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatSEK(n: number): string {
  return Number(n || 0).toLocaleString("sv-SE") + " kr"
}

export function nextDueDate(dueDate: string, interval: string): string {
  const d = dueDate ? new Date(dueDate) : new Date()
  if (interval === "weekly") d.setDate(d.getDate() + 7)
  if (interval === "monthly") d.setMonth(d.getMonth() + 1)
  return d.toISOString().split("T")[0]
}

export function weekDays(): Array<{ date: string; label: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      date:  d.toISOString().split("T")[0],
      label: d.toLocaleDateString("sv-SE", { weekday: "long", month: "short", day: "numeric" }),
    }
  })
}

export function exportCSV(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => {
      const v = r[h]
      const s = Array.isArray(v) ? v.length : (v ?? "")
      return `"${String(s).replace(/"/g, '""')}"`
    }).join(";")),
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

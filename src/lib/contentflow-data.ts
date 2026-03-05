import type { CFClient, CFClientState, CFFilter, CFSortCol, CFColumn } from "./contentflow-types"
import type { Veckoschema } from "./types"

export const CF_COLORS = [
  "#00C9B8", "#5AC8FA", "#bf7fff", "#30D158",
  "#FF453A", "#FFD60A", "#FF9F0A",
]

export const QC_ITEMS = [
  "Videos matchar innehållsplanen",
  "Varumärkesriktlinjer följda genomgående",
  "Alla bildtexter och CTA:er är korrekta",
  "Videokvalitet — upplösning, ljud & belysning",
  "Innehållsplanen täcker hela 3-månadersperioden",
  "Filer korrekt namngivna och organiserade",
  "Thumbnails och länkar tillhandahållna",
]

export const STATUS_LABELS: Record<string, string> = {
  scheduled:  "Planerad",
  inprogress: "Pågår",
  review:     "Granskning",
  delivered:  "Levererat",
}

export const STATUS_STYLES: Record<string, string> = {
  scheduled:  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  review:     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  delivered:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
}

export const FILTER_LABELS: Record<string, string> = {
  all:        "Alla kunder",
  overdue:    "Försenade",
  upcoming:   "Inom 14 dagar",
  inprogress: "Pågår",
  review:     "Granskning",
  delivered:  "Levererat",
  nodate:     "Ej planerade",
}

export const WEEK_LABELS: Record<string, string> = {
  v1: "Vecka 1",
  v2: "Vecka 2",
  v3: "Vecka 3",
  v4: "Vecka 4",
}

// ── localStorage helper ───────────────────────────────────────────────

export function cfLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}

// ── Swedish date parser ───────────────────────────────────────────────

const SV_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, mars: 3, apr: 4, maj: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
}

/**
 * Försöker tolka fritext som "10 mars", "9 mars + 11 mars" etc.
 * Tar det FÖRSTA datumet om flera finns.
 * Returnerar null om ej tolkbar.
 */
export function parseNr(nr: string): Date | null {
  if (!nr || nr === "?" || !nr.trim()) return null
  const m = nr.match(/(\d{1,2})\s*(jan|feb|mar|mars|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i)
  if (!m) return null
  const day = parseInt(m[1])
  const month = SV_MONTHS[m[2].toLowerCase()]
  if (!month || day < 1 || day > 31) return null
  const now = new Date()
  let year = now.getFullYear()
  // Om månaden redan passerat i år, anta nästa år
  const d = new Date(year, month - 1, day)
  if (d < now) {
    d.setFullYear(year + 1)
  }
  return d
}

/** Content-deadline = inspelningsdatum − 7 dagar */
export function contentDeadline(nr: string): Date | null {
  const rec = parseNr(nr)
  if (!rec) return null
  const d = new Date(rec)
  d.setDate(d.getDate() - 7)
  return d
}

/** Dagar kvar till content-deadline. Returnerar Infinity om ej tolkbar. */
export function cfDLeft(c: CFClient): number {
  if (c.s === "delivered") return Infinity
  const dl = contentDeadline(c.recordingDate)
  if (!dl) return Infinity
  const n = new Date()
  n.setHours(0, 0, 0, 0)
  return Math.round((dl.getTime() - n.getTime()) / 86400000)
}

/** Vilket vecko-slot kunden är i (v1/v2/v3/v4) */
export function getWeekSlot(name: string, schedule: Veckoschema | null): string | null {
  if (!schedule) return null
  for (const [key, names] of Object.entries(schedule)) {
    if ((names as string[]).includes(name)) return key
  }
  return null
}

/** Standard CF-state för en ny kund */
export function defaultCFState(): CFClientState {
  return {
    s: "scheduled",
    qc: [],
    qn: "",
    rev: 0,
    contentBoard: { columns: [] as CFColumn[] },
    assignee: null,
  }
}

// ── Counts ────────────────────────────────────────────────────────────

export function cfCounts(clients: CFClient[]) {
  return {
    all:        clients.length,
    overdue:    clients.filter(c => { const d = cfDLeft(c); return d !== Infinity && d < 0 && c.s !== "delivered" }).length,
    upcoming:   clients.filter(c => { const d = cfDLeft(c); return d !== Infinity && d >= 0 && d <= 14 && c.s !== "delivered" }).length,
    inprogress: clients.filter(c => c.s === "inprogress").length,
    review:     clients.filter(c => c.s === "review").length,
    delivered:  clients.filter(c => c.s === "delivered").length,
    nodate:     clients.filter(c => !parseNr(c.recordingDate) && c.s !== "delivered").length,
  }
}

// ── Filter + sort ─────────────────────────────────────────────────────

export function cfGetList(
  clients: CFClient[],
  fil: CFFilter,
  q: string,
  sortCol: CFSortCol,
  sortDir: 1 | -1,
  filterAssignee: number | null,
): CFClient[] {
  let l = [...clients]

  if (q) {
    const lq = q.toLowerCase()
    l = l.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      (c.tag || "").toLowerCase().includes(lq),
    )
  }
  if (filterAssignee != null) l = l.filter(c => c.assignee === filterAssignee)

  if (fil === "overdue")    l = l.filter(c => { const d = cfDLeft(c); return d !== Infinity && d < 0 && c.s !== "delivered" })
  if (fil === "upcoming")   l = l.filter(c => { const d = cfDLeft(c); return d !== Infinity && d >= 0 && d <= 14 && c.s !== "delivered" })
  if (fil === "inprogress") l = l.filter(c => c.s === "inprogress")
  if (fil === "review")     l = l.filter(c => c.s === "review")
  if (fil === "delivered")  l = l.filter(c => c.s === "delivered")
  if (fil === "noddate")    l = l.filter(c => !parseNr(c.recordingDate) && c.s !== "delivered")

  l.sort((a, b) => {
    // Levererade alltid sist om ej levererat-filter
    if (fil !== "delivered") {
      if (a.s === "delivered" && b.s !== "delivered") return 1
      if (b.s === "delivered" && a.s !== "delivered") return -1
    }

    let va: string | number
    let vb: string | number

    if (sortCol === "name")      { va = a.name.toLowerCase();   vb = b.name.toLowerCase() }
    else if (sortCol === "status")    { va = a.s;               vb = b.s }
    else if (sortCol === "recording") { va = parseNr(a.recordingDate)?.getTime() ?? 99999999999; vb = parseNr(b.recordingDate)?.getTime() ?? 99999999999 }
    else if (sortCol === "week")      { va = a.weekSlot ?? "z"; vb = b.weekSlot ?? "z" }
    else { // "due" = content deadline
      va = cfDLeft(a) === Infinity ? 99999 : cfDLeft(a)
      vb = cfDLeft(b) === Infinity ? 99999 : cfDLeft(b)
    }

    return va < vb ? -sortDir : va > vb ? sortDir : 0
  })

  return l
}

export function cfTodayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function cfNextId(clients: CFClient[]): number {
  return Math.max(0, ...clients.map(c => c.id)) + 1
}

import type { CFClient, CFFilter, CFSortCol } from "./contentflow-types"

export const CF_DEFAULT_CYCLE = 90

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
  scheduled:  "Scheduled",
  inprogress: "In Progress",
  review:     "Manager Review",
  delivered:  "Delivered",
}

export const STATUS_STYLES: Record<string, string> = {
  scheduled:  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  review:     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  delivered:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
}

export const FILTER_LABELS: Record<string, string> = {
  all:        "Alla klienter",
  overdue:    "Försenade",
  upcoming:   "Inom 14 dagar",
  inprogress: "Pågår",
  review:     "Granskning",
  delivered:  "Levererade",
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

// ── Date helpers ──────────────────────────────────────────────────────

export function cfCyc(c: CFClient): number {
  return c.cycle || CF_DEFAULT_CYCLE
}

export function cfNextDue(c: CFClient): Date {
  const d = new Date(c.last)
  d.setDate(d.getDate() + cfCyc(c))
  return d
}

export function cfDLeft(c: CFClient): number {
  const n = new Date()
  n.setHours(0, 0, 0, 0)
  return Math.round((cfNextDue(c).getTime() - n.getTime()) / 86400000)
}

export function cfPct(c: CFClient): number {
  const s = new Date(c.last).getTime()
  const e = cfNextDue(c).getTime()
  const n = Date.now()
  return Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100))
}

export function cfCounts(clients: CFClient[]) {
  return {
    all:        clients.length,
    overdue:    clients.filter(c => cfDLeft(c) < 0 && c.s !== "delivered").length,
    upcoming:   clients.filter(c => cfDLeft(c) >= 0 && cfDLeft(c) <= 14 && c.s !== "delivered").length,
    inprogress: clients.filter(c => c.s === "inprogress").length,
    review:     clients.filter(c => c.s === "review").length,
    delivered:  clients.filter(c => c.s === "delivered").length,
  }
}

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
  if (fil === "overdue")    l = l.filter(c => cfDLeft(c) < 0 && c.s !== "delivered")
  if (fil === "upcoming")   l = l.filter(c => cfDLeft(c) >= 0 && cfDLeft(c) <= 14 && c.s !== "delivered")
  if (fil === "inprogress") l = l.filter(c => c.s === "inprogress")
  if (fil === "review")     l = l.filter(c => c.s === "review")
  if (fil === "delivered")  l = l.filter(c => c.s === "delivered")

  l.sort((a, b) => {
    if (fil !== "delivered") {
      if (a.s === "delivered" && b.s !== "delivered") return 1
      if (b.s === "delivered" && a.s !== "delivered") return -1
    }
    let va: string | number
    let vb: string | number
    if (sortCol === "name")   { va = a.name.toLowerCase();      vb = b.name.toLowerCase() }
    else if (sortCol === "status") { va = a.s;                  vb = b.s }
    else if (sortCol === "cycle")  { va = cfPct(a);             vb = cfPct(b) }
    else                           { va = cfDLeft(a);           vb = cfDLeft(b) }
    return va < vb ? -sortDir : va > vb ? sortDir : 0
  })
  return l
}

export function cfTodayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function cfAgoStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0]
}

// ── Initial seed data ─────────────────────────────────────────────────

export const INIT_CF_CLIENTS: CFClient[] = [
  { id: 1,  name: "Acme Corp",         tag: "E-commerce",  last: cfAgoStr(97),  s: "scheduled",  cycle: 90, assignee: null, notes: "Prefers short reels",     qc: [],           qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 2,  name: "BlueWave Media",    tag: "SaaS",        last: cfAgoStr(91),  s: "scheduled",  cycle: 90, assignee: null, notes: "",                        qc: [],           qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 3,  name: "Sunrise Foods",     tag: "Food & Bev",  last: cfAgoStr(85),  s: "inprogress", cycle: 90, assignee: null, notes: "Seasonal promos",         qc: [],           qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 4,  name: "NextGen Realty",    tag: "Real Estate", last: cfAgoStr(76),  s: "review",     cycle: 90, assignee: null, notes: "",                        qc: [0, 1, 2, 3], qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 5,  name: "Pixel Studio",      tag: "Design",      last: cfAgoStr(60),  s: "scheduled",  cycle: 90, assignee: null, notes: "",                        qc: [],           qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 6,  name: "OakPath Finance",   tag: "Finance",     last: cfAgoStr(28),  s: "delivered",  cycle: 90, assignee: null, notes: "",                        qc: [0,1,2,3,4,5,6], qn: "Great work!", rev: 1, pdf: null, contentBoard: { columns: [] } },
  { id: 7,  name: "FitLife Gym",       tag: "Fitness",     last: cfAgoStr(52),  s: "scheduled",  cycle: 90, assignee: null, notes: "Motivational content",    qc: [],           qn: "",           rev: 0, pdf: null, contentBoard: { columns: [] } },
  { id: 8,  name: "Metro Tech",        tag: "Tech",        last: cfAgoStr(12),  s: "delivered",  cycle: 90, assignee: null, notes: "",                        qc: [0,1,2,3,4,5,6], qn: "",       rev: 0, pdf: null, contentBoard: { columns: [] } },
]

export function cfNextId(clients: CFClient[]): number {
  return Math.max(0, ...clients.map(c => c.id)) + 1
}

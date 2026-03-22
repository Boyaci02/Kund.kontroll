export type CFStatus = "scheduled" | "inprogress" | "review" | "delivered"

/** En videoidé-rad i kundens arbetsyta */
export interface ContentRow {
  id: number
  title: string
  format: string    // "Reel" | "Story" | "TikTok" | "Shorts" | "YouTube" | "Övrigt" | ""
  pubDate: string   // ISO-datum eller ""
  hook: string
  notes: string     // script / anteckningar
  comments: string  // kommentarer
  status?: "Todo" | "In progress" | "Done"  // content creation-status
}

export interface CFCardComment {
  id: number
  text: string
  author: string
  createdAt: string
}

export interface CFCard {
  id: number
  title: string
  notes: string
  hook?: string
  status?: "idea" | "planned" | "filming" | "editing" | "published"
  assignee?: string
  comments?: CFCardComment[]
  createdAt?: string
}

export interface CFColumn {
  id: number
  label: string
  cards: CFCard[]
}

/** CF-specifik state per kund — sparas i cf3-state localStorage */
export interface CFClientState {
  s: CFStatus
  qc: number[]       // indices av checkade QC-punkter
  qn: string         // QC-noteringar
  rev: number        // revisionsantal
  contentBoard: { columns: CFColumn[] }
  contentTable: ContentRow[]  // arbetsyta med videoidéer
  assignee: number | null  // CF-teammedlem (för QC-granskning)
  deliveredAt: string | null  // ISO-tidsstämpel när leverans godkändes
}

/** Sammanslagen vy av Kund + CFClientState — används i UI */
export interface CFClient {
  id: number
  name: string
  tag: string            // kund.pkg (paket)
  recordingDate: string  // kund.nr (fritext, t.ex. "10 mars")
  last: string           // kund.lr (senaste inspelning)
  weekSlot: string | null // "v1"|"v2"|"v3"|"v4"|null (från veckoplanering)
  vg: string             // videograf
  ed: string             // editor
  cc: string             // content creator
  // CF-state (från CFClientState):
  s: CFStatus
  qc: number[]
  qn: string
  rev: number
  contentBoard: { columns: CFColumn[] }
  contentTable: ContentRow[]
  assignee: number | null
  deliveredAt: string | null
}

export interface CFMember {
  id: number
  name: string
  color: string
}

export interface CFTeam {
  id: number
  name: string
  memberIds: number[]
}

export type CFFilter = "all" | "overdue" | "upcoming" | "inprogress" | "review" | "delivered"
export type CFSortCol = "name" | "status" | "due" | "recording" | "week"

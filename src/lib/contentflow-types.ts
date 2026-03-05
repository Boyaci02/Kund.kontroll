export type CFStatus = "scheduled" | "inprogress" | "review" | "delivered"

export interface CFCard {
  id: number
  title: string
  notes: string
}

export interface CFColumn {
  id: number
  label: string
  cards: CFCard[]
}

export interface CFPdf {
  name: string
  size: number
  data: string // base64 data URL
}

export interface CFClient {
  id: number
  name: string
  tag: string
  last: string       // ISO date of last delivery
  s: CFStatus
  cycle: number      // days between deliveries
  assignee: number | null
  notes: string
  qc: number[]       // indices of checked QC items
  qn: string         // QC notes
  rev: number        // revision count
  pdf: CFPdf | null
  contentBoard: { columns: CFColumn[] }
}

export interface CFMember {
  id: number
  name: string
  color: string
}

export type CFFilter = "all" | "overdue" | "upcoming" | "inprogress" | "review" | "delivered"
export type CFSortCol = "name" | "status" | "due" | "cycle"

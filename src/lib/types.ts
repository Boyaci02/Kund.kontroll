export type Paket =
  | "Lilla Paketet"
  | "Stora Paketet"
  | "Mellan Paketet"
  | "Extra Stort Paket"
  | "Special Paket"
  | ""

export type Status = "AKTIV" | "INAKTIV" | ""

export type TeamMedlem =
  | "Philip"
  | "Etienne"
  | "Danah"
  | "Edvin"
  | "Jakob"
  | "Sami"
  | "Matteus"
  | "Emanuel"
  | "Ingen"
  | ""

export interface KundTema {
  musik: string
  kansla: string
  typ: string
  farg: string
  typsnitt: string
}

export interface Kund {
  id: number
  name: string
  pkg: Paket
  vg: string // Videograf
  ed: string // Editor
  cc: string // Content Creator
  lr: string // Senaste inspelning
  nr: string // Nästa inspelning
  ns: string // Nästa SMS
  adr: string
  cnt: string // Kontaktperson
  ph: string
  em: string // E-post
  st: Status
  notes: string
  gmbLocationId?: string // Google Business Profile location ID, e.g. "locations/123456789"
  tema?: KundTema
}

export type GmbReviewStatus = "new" | "replied" | "flagged" | "forwarded"

export interface GmbReview {
  reviewId: string
  kundId: number
  locationId: string
  reviewer: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
  createTime: string
  status: GmbReviewStatus
  replyText?: string
  repliedAt?: string
  flaggedAt?: string
  forwardedAt?: string
  internalNote?: string
}

export interface OnboardingUppgift {
  id: string
  text: string
  who: string
}

export interface OnboardingSteg {
  n: number
  title: string
  time: string
  tasks: OnboardingUppgift[]
}

export interface OnboardingTillstand {
  [kundId: number]: {
    [taskId: string]: boolean
  }
}

export interface Veckoschema {
  v1: string[]
  v2: string[]
  v3: string[]
  v4: string[]
}

export interface Kontakt {
  name: string
  day: string
  note: string
}

export interface KontaktLista {
  booking: Kontakt[]
  sms: Kontakt[]
  quarterly: Kontakt[]
}

export interface SMSMall {
  id: string
  title: string
  sub: string
  who: string
  vars: string[]
  text: string
}

export type LeadStatus =
  | "Ny lead"
  | "Kontaktad"
  | "Möte bokat"
  | "Offert skickad"
  | "Vunnen"
  | "Förlorad"

export interface Lead {
  id: number
  name: string
  status: LeadStatus
  email: string
  phone: string
  notes: string
  createdAt: string
}

export type KontaktTyp = "booking" | "sms" | "quarterly"

export interface KontaktPost {
  id: number
  name: string
  day: string
  note: string
  typ: KontaktTyp
}

export interface ObEnrollment {
  id: number
  kundId: number
  name: string
  pkg: string
  addedAt: string
  priority: "hog" | "normal" | "lag"
  order: number
}

export type NotifPage = "tasks" | "leads" | "onboarding" | "kunder"

export interface AppNotification {
  id: number
  title: string
  body: string
  page: NotifPage
  createdBy: string
  createdAt: string
}

export interface DB {
  clients: Kund[]
  gmbReviews: GmbReview[]
  obState: OnboardingTillstand
  contactLog: Record<string, "contacted" | "confirmed">
  schedule: Veckoschema | null
  nextId: number
  leads: Lead[]
  nextLeadId: number
  contacts: KontaktPost[]
  nextContactId: number
  notifications: AppNotification[]
  nextNotifId: number
  notifReadAt: Record<string, Record<string, string>>
  obEnrollments: ObEnrollment[]
  lastWeeklyResetAt?: string
  lastWedSmsResetAt?: string
  lastFriSmsResetAt?: string
}

export const TEAM_FARGER: Record<string, string> = {
  Philip: "#7C3AED",
  Etienne: "#0891B2",
  Danah: "#DB2777",
  Edvin: "#059669",
  Jakob: "#D97706",
  Sami: "#DC2626",
  Matteus: "#2563EB",
  Emanuel: "#111827",
  Ivan: "#EA580C",
  Ingen: "#9CA3AF",
}

export const TEAM_MEDLEMMAR: TeamMedlem[] = [
  "Philip",
  "Etienne",
  "Danah",
  "Edvin",
  "Jakob",
  "Sami",
  "Matteus",
  "Emanuel",
  "Ingen",
]

export const PAKET_LISTA: Paket[] = [
  "Lilla Paketet",
  "Stora Paketet",
  "Mellan Paketet",
  "Extra Stort Paket",
  "Special Paket",
]

export type QoplaStatus =
  | "Ny lead"
  | "Kontaktad"
  | "Möte bokat"
  | "Offert skickad"
  | "Vunnen"
  | "Förlorad"

export type QoplaTjanst = "Social Media" | "Hemsida"

export interface QoplaComment {
  id: number
  lead_id: number
  text: string
  author: string
  needs_followup: boolean
  created_at: string
}

export interface QoplaLead {
  id: number
  name: string
  company?: string
  phone?: string
  email?: string
  services: QoplaTjanst[]
  signed_services?: QoplaTjanst[]
  status: QoplaStatus
  notes?: string
  created_at: string
}

// Airtable Content Creation types
export type AirtableStatus = "Todo" | "In progress" | "Done" | ""

export interface AirtableRecord {
  id: string
  fields: Record<string, string | undefined>
  createdTime: string
}

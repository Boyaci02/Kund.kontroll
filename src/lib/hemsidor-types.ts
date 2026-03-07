export interface HemsidaClient {
  id: number
  name: string
  contact: string
  email: string
  phone: string
  website: string
  status: "aktiv" | "pausad" | "avslutas"
  plan: string
  monthlyFee: number
  startDate: string
  renewalDate: string
  notes: string
}

export interface TimelineEntry {
  text: string
  date: string
}

export interface Lead {
  id: number
  name: string
  contact: string
  email: string
  phone: string
  source: string
  status: "kontaktad" | "offert_skickad" | "avtal_signerat" | "forlorad"
  created: string
  notes: string
  estimatedValue: number
  followUpDate: string
  lostReason: string
  timeline: TimelineEntry[]
}

export interface Comment {
  text: string
  date: string
}

export interface CrmTask {
  id: number
  clientId: number | null
  clientName: string
  title: string
  description: string
  status: "inkommen" | "pagaende" | "granskning" | "klar"
  priority: "hog" | "normal" | "lag"
  created: string
  lastUpdated: string
  dueDate: string
  completedDate?: string
  assignee: string
  isRecurring: boolean
  recurringInterval: string
  comments: Comment[]
  archivedAt: string | null
}

export interface OnboardingSubmission {
  name: string
  contact: string
  email: string
  phone: string
  businessType: string
  hasExistingWebsite: boolean | null
  existingWebsiteUrl: string
  hasLogo: boolean | null
  hasBrandColors: boolean | null
  hasDomain: boolean | null
  domainName: string
  hasTexts: boolean | null
  hasPhotos: boolean | null
  wantsContactForm: boolean
  wantsBooking: boolean
  wantsEcommerce: boolean
  wantsMaps: boolean
  wantsSocialMedia: boolean
  wantsNewsletter: boolean
  wantsGoogleBusiness: boolean
  purpose: string
  targetAudience: string
  competitors: string
  additionalNotes: string
  submittedAt: string
}

export interface TaskRequest {
  id: number
  name: string
  email: string
  category: string
  title: string
  description: string
  priority: "lag" | "normal" | "bradskande"
  status: "ny" | "omvandlad" | "avvisad"
  submittedAt: string
}

export interface ActivityEntry {
  id: number
  message: string
  type: string
  date: string
}

export interface OnboardingQueueEntry {
  id: number
  clientId: number
  name: string
  plan: string
  addedAt: string
  priority: "hog" | "normal" | "lag"
  order: number
}

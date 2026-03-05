export type EditorStatus =
  | ""
  | "Material not uploaded"
  | "Material Uploaded"
  | "Started Editing"
  | "Second editing round"
  | "Feedback given"
  | "Waiting on feedback"
  | "Last Look"
  | "Done"

export type ApprovedStatus = "" | "Not approved" | "Looking through" | "Approved"

export interface EditorRow {
  id: number
  status: EditorStatus
  comments: string
  approved: ApprovedStatus
  materialDate: string  // ISO datum eller ""
  deadline: string      // ISO datum eller ""
  linkBank: string
  linkFeedback: string
  linkSocial: string
}

export interface EditorClientState {
  rows: EditorRow[]
}

export const EP_KEY = "ep-state"

export const STATUS_COLORS: Record<string, string> = {
  "Done":                   "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Material not uploaded":  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Material Uploaded":      "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Started Editing":        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Second editing round":   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Feedback given":         "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Waiting on feedback":    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Last Look":              "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
}

export const APPROVED_COLORS: Record<string, string> = {
  "Approved":       "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Looking through":"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Not approved":   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

export const STATUS_OPTIONS: EditorStatus[] = [
  "", "Material not uploaded", "Material Uploaded", "Started Editing",
  "Second editing round", "Feedback given", "Waiting on feedback", "Last Look", "Done",
]

export const APPROVED_OPTIONS: ApprovedStatus[] = [
  "", "Not approved", "Looking through", "Approved",
]

export function loadEpState(): Record<number, EditorClientState> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(EP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveEpState(state: Record<number, EditorClientState>): void {
  if (typeof window === "undefined") return
  try { localStorage.setItem(EP_KEY, JSON.stringify(state)) } catch {}
}

export function getClientRows(state: Record<number, EditorClientState>, id: number): EditorRow[] {
  return state[id]?.rows ?? []
}

let nextRowId = 100000
export function newRow(): EditorRow {
  return {
    id: nextRowId++,
    status: "",
    comments: "",
    approved: "",
    materialDate: "",
    deadline: "",
    linkBank: "",
    linkFeedback: "",
    linkSocial: "",
  }
}

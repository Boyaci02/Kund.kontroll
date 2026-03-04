export const AUTH_KEY = "kk_auth"
export const SHARED_PASSWORD = "syns2025"
export const VALID_USERS = [
  "Philip",
  "Etienne",
  "Danah",
  "Edvin",
  "Jakob",
  "Sami",
  "Matteus",
  "Emanuel",
]

export interface AuthUser {
  name: string
  loggedInAt: number
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_KEY)
}

export async function isValidLogin(name: string, password: string): Promise<boolean> {
  const trimmed = name.trim()
  const normalized = VALID_USERS.find(
    (u) => u.toLowerCase() === trimmed.toLowerCase()
  )
  if (!normalized) return false

  const { supabase } = await import("@/lib/supabase")
  const { data, error } = await supabase
    .from("team_members")
    .select("name")
    .eq("name", normalized)
    .eq("password", password)
    .single()

  return !error && !!data
}

export function normalizeUserName(name: string): string {
  const trimmed = name.trim()
  return VALID_USERS.find((u) => u.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
}

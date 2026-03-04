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

export function isValidLogin(name: string, password: string): boolean {
  const trimmed = name.trim()
  const matched = VALID_USERS.find(
    (u) => u.toLowerCase() === trimmed.toLowerCase()
  )
  return !!matched && password === SHARED_PASSWORD
}

export function normalizeUserName(name: string): string {
  const trimmed = name.trim()
  return VALID_USERS.find((u) => u.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
}

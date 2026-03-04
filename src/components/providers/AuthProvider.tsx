"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import {
  getAuthUser,
  setAuthUser,
  clearAuth,
  isValidLogin,
  normalizeUserName,
  type AuthUser,
} from "@/lib/auth"

interface AuthContextValue {
  user: AuthUser | null
  login: (name: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setUser(getAuthUser())
    setLoaded(true)
  }, [])

  const login = useCallback(async (name: string, password: string): Promise<boolean> => {
    const valid = await isValidLogin(name, password)
    if (!valid) return false
    const authUser: AuthUser = {
      name: normalizeUserName(name),
      loggedInAt: Date.now(),
    }
    setAuthUser(authUser)
    setUser(authUser)
    return true
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  if (!loaded) return null

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

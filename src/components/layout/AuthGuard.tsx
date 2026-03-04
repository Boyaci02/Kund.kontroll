"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { Sidebar } from "./Sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (!user && !isLoginPage) {
      router.replace("/login")
    }
    if (user && isLoginPage) {
      router.replace("/")
    }
  }, [user, isLoginPage, router])

  // Login page — no sidebar
  if (!user) {
    return <>{children}</>
  }

  // Authenticated — show sidebar + main
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen bg-background">
        {children}
      </main>
    </div>
  )
}

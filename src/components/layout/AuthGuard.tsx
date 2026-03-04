"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

const PUBLIC_ROUTES = ["/login", "/hemsidor/onboarding", "/hemsidor/forfragan"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  useEffect(() => {
    if (!user && !isPublicRoute) {
      router.replace("/login")
    }
    if (user && isLoginPage) {
      router.replace("/")
    }
  }, [user, isPublicRoute, isLoginPage, router])

  // Public routes (login, public forms) — no sidebar
  if (!user) {
    return <>{children}</>
  }

  // Authenticated — show sidebar + main
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}

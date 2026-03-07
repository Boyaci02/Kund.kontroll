"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { NotificationPanel } from "@/components/ui/NotificationPanel"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const PUBLIC_ROUTES = ["/login", "/hemsidor/onboarding", "/hemsidor/forfragan"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user && !isPublicRoute) {
      router.replace("/login")
    }
    if (user && isLoginPage) {
      router.replace("/")
    }
  }, [user, isPublicRoute, isLoginPage, router])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Public routes (login, public forms) — no sidebar
  if (!user) {
    return <>{children}</>
  }

  // Authenticated — show sidebar + main
  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
      <NotificationPanel />
    </div>
  )
}

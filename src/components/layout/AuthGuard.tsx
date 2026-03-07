"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useDB } from "@/lib/store"
import { Sidebar, MobileBottomNav } from "./Sidebar"
import { Topbar } from "./Topbar"
import { NotificationPanel } from "@/components/ui/NotificationPanel"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

const PUBLIC_ROUTES = ["/login", "/hemsidor/onboarding", "/hemsidor/forfragan"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { db } = useDB()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  const [notifOpen, setNotifOpen] = useState(false)

  const unreadCount = useMemo(() => {
    if (!user) return 0
    const notifReadAt = db.notifReadAt?.[user.name] ?? {}
    return (db.notifications ?? []).filter(n => {
      return n.createdAt > (notifReadAt[n.page] ?? "1970-01-01")
    }).length
  }, [db.notifications, db.notifReadAt, user])

  useEffect(() => {
    if (!user && !isPublicRoute) {
      router.replace("/login")
    }
    if (user && isLoginPage) {
      router.replace("/")
    }
  }, [user, isPublicRoute, isLoginPage, router])

  // Public routes — no sidebar
  if (!user) {
    return <>{children}</>
  }

  // Authenticated — sidebar + main + mobile bottom nav
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-60 min-w-0 overflow-x-hidden flex flex-col min-h-screen pb-16 md:pb-0">
        <Topbar onAvatarClick={() => setNotifOpen(v => !v)} unreadCount={unreadCount} />
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}

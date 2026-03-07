"use client"

import { useEffect, useRef } from "react"
import { X, CheckCheck, ClipboardList, UserPlus, CheckSquare, Bell } from "lucide-react"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import type { AppNotification, NotifPage } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE_ICONS: Record<NotifPage, React.ElementType> = {
  tasks: ClipboardList,
  leads: UserPlus,
  onboarding: CheckSquare,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just nu"
  if (m < 60) return `${m} min sedan`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} tim sedan`
  const d = Math.floor(h / 24)
  return `${d} dag${d > 1 ? "ar" : ""} sedan`
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, markPageRead } = useDB()
  const { user } = useAuth()
  const panelRef = useRef<HTMLDivElement>(null)

  const notifications: AppNotification[] = (db.notifications ?? []).slice().reverse()

  const unreadCount = (() => {
    if (!user) return 0
    return notifications.filter((n) => {
      const lastRead = db.notifReadAt?.[user.name]?.[n.page] ?? "1970-01-01"
      return n.createdAt > lastRead
    }).length
  })()

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])

  function handleMarkAllRead() {
    if (!user) return
    const pages: NotifPage[] = ["tasks", "leads", "onboarding"]
    pages.forEach((page) => markPageRead(page, user.name))
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="fixed top-14 right-4 z-50 w-80 max-h-[480px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Aktivitet</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
              title="Markera alla som lästa"
            >
              <CheckCheck className="h-3 w-3" />
              Markera lästa
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Ingen aktivitet ännu</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = PAGE_ICONS[n.page]
            const lastRead = user ? (db.notifReadAt?.[user.name]?.[n.page] ?? "1970-01-01") : "9999"
            const isUnread = n.createdAt > lastRead
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                  isUnread ? "bg-primary/5" : "bg-transparent"
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  n.page === "tasks" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : n.page === "leads" ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {isUnread && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

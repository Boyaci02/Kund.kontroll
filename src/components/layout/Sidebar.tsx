"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  PhoneCall,
  MessageSquare,
  ClipboardList,
  DoorOpen,
  Clapperboard,
  TrendingUp,
  Globe,
  Workflow,
  UserPlus,
  Film,
  MoreHorizontal,
  Handshake,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/components/providers/AuthProvider"
import { useDB } from "@/lib/store"
import { TEAM_FARGER } from "@/lib/types"
import { useState } from "react"

const EKONOMI_USERS = ["Emanuel", "Philip", "Jakob"]
const QOPLA_USERS = ["Emanuel", "Philip", "Jakob"]

function NavLink({ href, label, icon: Icon, indent, active, badge }: {
  href: string
  label: string
  icon: React.ElementType
  indent?: boolean
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
        indent && "ml-3 text-xs",
        active
          ? "bg-foreground/8 text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 leading-none min-w-[16px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  )
}

function SubNav({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      "grid transition-all duration-200 ease-in-out",
      show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
    )}>
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { db } = useDB()

  const showLeads = pathname.startsWith("/kunder") || pathname === "/leads"
  const showContentFlow = pathname.startsWith("/content") || pathname.startsWith("/editor-pipeline")

  function unreadFor(page: string): number {
    if (!user) return 0
    const lastRead = db.notifReadAt?.[user.name]?.[page] ?? "1970-01-01"
    return (db.notifications ?? []).filter((n) => n.page === page && n.createdAt > lastRead).length
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r border-border bg-card fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
          <span className="text-[10px] font-bold text-background">SN</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">Syns Nu</p>
          <p className="text-[10px] text-muted-foreground">Kundhantering</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <NavLink href="/"               label="Översikt"         icon={LayoutDashboard} active={pathname === "/"} />
        <NavLink href="/kunder"         label="Kunder"           icon={Users}           active={pathname === "/kunder"} badge={unreadFor("kunder")} />
        <SubNav show={showLeads}>
          <div className="pb-0.5">
            <NavLink href="/leads"      label="Leads"            icon={UserPlus}        active={pathname === "/leads"} indent badge={unreadFor("leads")} />
          </div>
        </SubNav>
        <NavLink href="/onboarding"     label="Onboarding"       icon={CheckSquare}     active={pathname === "/onboarding"} badge={unreadFor("onboarding")} />
        <NavLink href="/tasks"          label="Tasks"            icon={ClipboardList}   active={pathname === "/tasks"} badge={unreadFor("tasks")} />
        <NavLink href="/kalender"       label="Kalender"         icon={Calendar}        active={pathname === "/kalender"} />
        <NavLink href="/veckoplanering" label="Veckoplanering"   icon={Calendar}        active={pathname === "/veckoplanering"} />
        <NavLink href="/kundkontakt"    label="Kundkontakt"      icon={PhoneCall}       active={pathname === "/kundkontakt"} />
        <NavLink href="/sms-mallar"     label="SMS-mallar"       icon={MessageSquare}   active={pathname === "/sms-mallar"} />

        <div className="my-2 mx-1 border-t border-border/60" />

        <NavLink href="/content"        label="Content Creation" icon={Clapperboard}   active={pathname === "/content"} />
        <SubNav show={showContentFlow}>
          <div className="space-y-0.5 pb-0.5">
            <NavLink href="/content-flow"    label="Content Flow"    icon={Workflow} active={pathname === "/content-flow"}                 indent />
            <NavLink href="/editor-pipeline" label="Editor Pipeline" icon={Film}     active={pathname.startsWith("/editor-pipeline")}      indent />
          </div>
        </SubNav>

        <div className="my-2 mx-1 border-t border-border/60" />

        <NavLink href="/hemsidor"       label="Hemsidor"         icon={Globe}           active={pathname === "/hemsidor"} />

        {user && EKONOMI_USERS.includes(user.name) && (
          <>
            <div className="my-2 mx-1 border-t border-border/60" />
            <NavLink href="/ekonomi"    label="Ekonomi"          icon={TrendingUp}      active={pathname === "/ekonomi"} />
          </>
        )}

        {user && QOPLA_USERS.includes(user.name) && (
          <>
            <div className="my-2 mx-1 border-t border-border/60" />
            <NavLink href="/qopla"      label="Qopla"            icon={Handshake}       active={pathname === "/qopla"} />
          </>
        )}
      </nav>

      {/* Footer */}
      {user && (
        <div className="px-3 py-3 border-t border-border flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: TEAM_FARGER[user.name] ?? "#9CA3AF" }}
          >
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">Inloggad</p>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Logga ut"
          >
            <DoorOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </aside>
  )
}

// ── Mobile bottom navigation ───────────────────────────────────────────────────

const BOTTOM_TABS = [
  { href: "/",           label: "Start",      icon: LayoutDashboard },
  { href: "/kunder",     label: "Kunder",     icon: Users            },
  { href: "/tasks",      label: "Tasks",      icon: ClipboardList    },
  { href: "/onboarding", label: "Onboarding", icon: CheckSquare      },
  { href: "/more",       label: "Mer",        icon: MoreHorizontal   },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()
  const { db } = useDB()

  function unreadFor(page: string): number {
    if (!user) return 0
    const lastRead = db.notifReadAt?.[user.name]?.[page] ?? "1970-01-01"
    return (db.notifications ?? []).filter((n) => n.page === page && n.createdAt > lastRead).length
  }

  const MORE_LINKS = [
    { href: "/veckoplanering", label: "Veckoplanering", icon: Calendar },
    { href: "/kundkontakt",    label: "Kundkontakt",    icon: PhoneCall },
    { href: "/sms-mallar",     label: "SMS-mallar",     icon: MessageSquare },
    { href: "/content",        label: "Content",        icon: Clapperboard },
    { href: "/hemsidor",       label: "Hemsidor",       icon: Globe },
  ]

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* "Mer"-drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-2xl px-4 pt-4 pb-6 shadow-xl">
            <div className="w-8 h-1 rounded-full bg-border mx-auto mb-4" />
            <div className="grid grid-cols-2 gap-2">
              {MORE_LINKS.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => { setMoreOpen(false); router.push(href) }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors text-left",
                    isActive(href)
                      ? "bg-foreground/8 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
              <button
                onClick={() => { setMoreOpen(false); logout(); router.push("/login") }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors col-span-2"
              >
                <DoorOpen className="h-4 w-4 shrink-0" />
                Logga ut
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/more" ? moreOpen : isActive(href)
            const badge = href === "/tasks" ? unreadFor("tasks")
                        : href === "/onboarding" ? unreadFor("onboarding")
                        : 0
            return (
              <button
                key={href}
                onClick={() => {
                  if (href === "/more") { setMoreOpen(o => !o) }
                  else { setMoreOpen(false); router.push(href) }
                }}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative"
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium leading-none transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

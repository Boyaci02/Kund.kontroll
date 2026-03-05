"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  PhoneCall,
  MessageSquare,
  Download,
  Upload,
  ClipboardList,
  LogOut,
  Clapperboard,
  ChevronDown,
  TrendingUp,
  Globe,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { TEAM_FARGER } from "@/lib/types"
import type { LucideIcon } from "lucide-react"

const EKONOMI_USERS = ["Emanuel", "Philip", "Jakob"]

type NavItem = { href: string; label: string; icon: LucideIcon } | { separator: true }

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Översikt", icon: LayoutDashboard },
  { href: "/kunder", label: "Kunder", icon: Users },
  { href: "/onboarding", label: "Onboarding", icon: CheckSquare },
  { href: "/tasks", label: "Uppgifter", icon: ClipboardList },
  { href: "/veckoplanering", label: "Veckoplanering", icon: Calendar },
  { href: "/kundkontakt", label: "Kundkontakt", icon: PhoneCall },
  { href: "/sms-mallar", label: "SMS-mallar", icon: MessageSquare },
  { separator: true },
  { href: "/content", label: "Content Creation", icon: Clapperboard },
  { href: "/content-flow", label: "Content Flow", icon: Workflow },
  { separator: true },
  { href: "/hemsidor", label: "Hemsidor", icon: Globe },
]

const TEAM = [
  "Philip",
  "Etienne",
  "Danah",
  "Edvin",
  "Jakob",
  "Sami",
  "Matteus",
  "Emanuel",
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { exportData, importData } = useDB()
  const { user, logout } = useAuth()
  const [teamOpen, setTeamOpen] = useState(true)

  function handleImport() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        importData(text)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
          <span className="text-xs font-bold text-primary-foreground">SN</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Syns Nu</p>
          <p className="text-xs text-muted-foreground">Kundhantering</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item, i) => {
          if ("separator" in item) {
            return <div key={`sep-${i}`} className="my-2 mx-1 border-t border-border" />
          }
          const { href, label, icon: Icon } = item
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
        {user && EKONOMI_USERS.includes(user.name) && (
          <>
            <div className="my-2 mx-1 border-t border-border" />
            <Link
              href="/ekonomi"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/ekonomi"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              Ekonomi
            </Link>
          </>
        )}
      </nav>

      {/* Team */}
      <div className="px-3 py-3 border-t border-border">
        <button
          onClick={() => setTeamOpen((v) => !v)}
          className="flex items-center justify-between w-full px-2 mb-2"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</p>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              !teamOpen && "-rotate-90"
            )}
          />
        </button>
        {teamOpen && (
          <div className="space-y-0.5">
            {TEAM.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                  style={{ background: TEAM_FARGER[name] ?? "#9CA3AF" }}
                >
                  {name[0]}
                </div>
                <span className="text-xs text-sidebar-foreground">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logged in user */}
      {user && (
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
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
            <button
              onClick={handleLogout}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              title="Logga ut"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={exportData}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Exportera data"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleImport}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Importera data"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}

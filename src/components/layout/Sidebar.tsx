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
  ClipboardList,
  DoorOpen,
  Clapperboard,
  ChevronDown,
  TrendingUp,
  Globe,
  Workflow,
  UserPlus,
  Film,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/components/providers/AuthProvider"
import { TEAM_FARGER } from "@/lib/types"

const EKONOMI_USERS = ["Emanuel", "Philip", "Jakob"]

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

function NavLink({ href, label, icon: Icon, indent, active }: {
  href: string
  label: string
  icon: React.ElementType
  indent?: boolean
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        indent && "ml-4 text-[0.8rem]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SubNav({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      "grid transition-all duration-200 ease-in-out",
      show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
    )}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [teamOpen, setTeamOpen] = useState(true)

  const showLeads = pathname.startsWith("/kunder") || pathname === "/leads"
  const showContentFlow = pathname.startsWith("/content") || pathname.startsWith("/editor-pipeline")

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
        <NavLink href="/"           label="Översikt"        icon={LayoutDashboard} active={pathname === "/"} />
        <NavLink href="/kunder"     label="Kunder"          icon={Users}           active={pathname === "/kunder"} />
        <SubNav show={showLeads}>
          <div className="pb-0.5">
            <NavLink href="/leads"  label="Leads"           icon={UserPlus}        active={pathname === "/leads"} indent />
          </div>
        </SubNav>
        <NavLink href="/onboarding" label="Onboarding"      icon={CheckSquare}     active={pathname === "/onboarding"} />
        <NavLink href="/tasks"      label="Tasks"           icon={ClipboardList}   active={pathname === "/tasks"} />
        <NavLink href="/veckoplanering" label="Veckoplanering" icon={Calendar}     active={pathname === "/veckoplanering"} />
        <NavLink href="/kundkontakt" label="Kundkontakt"    icon={PhoneCall}       active={pathname === "/kundkontakt"} />
        <NavLink href="/sms-mallar" label="SMS-mallar"      icon={MessageSquare}   active={pathname === "/sms-mallar"} />

        <div className="my-2 mx-1 border-t border-border" />

        <NavLink href="/content"    label="Content Creation" icon={Clapperboard}  active={pathname === "/content"} />
        <SubNav show={showContentFlow}>
          <div className="space-y-0.5 pb-0.5">
            <NavLink href="/content-flow"     label="Content Flow"     icon={Workflow} active={pathname === "/content-flow"}     indent />
            <NavLink href="/editor-pipeline"  label="Editor Pipeline"  icon={Film}     active={pathname.startsWith("/editor-pipeline")} indent />
          </div>
        </SubNav>

        <div className="my-2 mx-1 border-t border-border" />

        <NavLink href="/hemsidor"   label="Hemsidor"        icon={Globe}           active={pathname === "/hemsidor"} />

        {user && EKONOMI_USERS.includes(user.name) && (
          <>
            <div className="my-2 mx-1 border-t border-border" />
            <NavLink href="/ekonomi" label="Ekonomi"        icon={TrendingUp}      active={pathname === "/ekonomi"} />
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
              <div key={name} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
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

      {/* Footer — profil + tema + logga ut */}
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

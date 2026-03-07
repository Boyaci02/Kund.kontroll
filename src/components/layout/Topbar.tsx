"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useDB } from "@/lib/store"
import { useAuth } from "@/components/providers/AuthProvider"
import { TEAM_FARGER } from "@/lib/types"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "God natt"
  if (h < 10) return "God morgon"
  if (h < 12) return "God förmiddag"
  if (h < 18) return "God eftermiddag"
  return "God kväll"
}

function formatDate(): string {
  return new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function Topbar({ onMenuClick: _onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { db } = useDB()
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return db.clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.cnt || "").toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [db.clients, query])

  const showDropdown = focused && results.length > 0

  function handleSelect(id: number) {
    setQuery("")
    setFocused(false)
    router.push(`/kunder/${id}`)
  }

  const userColor = TEAM_FARGER[user?.name ?? ""] ?? "#9CA3AF"
  const date = formatDate()
  const greeting = `${getGreeting()}, ${user?.name ?? ""}!`

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border bg-background/80 backdrop-blur-sm gap-3">
{/* Left: greeting + date */}
      <div className="min-w-0 hidden sm:block">
        <p className="text-sm font-semibold text-foreground truncate">{greeting}</p>
        <p className="text-xs text-muted-foreground capitalize">{date}</p>
      </div>

      {/* Center: Search */}
      <div className="relative w-72 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Sök kund..."
          className="w-full h-9 rounded-xl border border-border bg-muted/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50">
            {results.map((c) => (
              <button
                key={c.id}
                onMouseDown={() => handleSelect(c.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  {c.cnt && (
                    <p className="text-xs text-muted-foreground">{c.cnt}</p>
                  )}
                </div>
                {c.st && (
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                      c.st === "AKTIV"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {c.st === "AKTIV" ? "Aktiv" : "Inaktiv"}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: User avatar */}
      {user && (
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: userColor }}
          >
            {user.name[0]}
          </div>
          <span className="text-sm font-medium text-foreground hidden md:block">{user.name}</span>
        </div>
      )}
    </div>
  )
}

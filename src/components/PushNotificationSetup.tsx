"use client"

import { useState, useEffect } from "react"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { TEAM_MEDLEMMAR } from "@/lib/types"
import { Bell, BellOff, BellRing } from "lucide-react"

export function PushNotificationSetup() {
  const { permission, isSubscribed, teamMember, loading, subscribe, unsubscribe } = usePushNotifications()
  const [selectedMember, setSelectedMember] = useState("")
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error)
    }
  }, [])

  if (!mounted || !("Notification" in window)) return null

  // Already subscribed — show compact status
  if (permission === "granted" && isSubscribed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BellRing className="h-3.5 w-3.5 text-primary" />
        <span className="hidden md:inline">{teamMember}</span>
        <button
          onClick={unsubscribe}
          className="ml-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title="Avaktivera notiser"
        >
          <BellOff className="h-3 w-3" />
        </button>
      </div>
    )
  }

  // Blocked
  if (permission === "denied") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60" title="Notiser blockerade i webbläsaren">
        <BellOff className="h-3.5 w-3.5" />
      </div>
    )
  }

  // Not yet set up
  return (
    <div className="relative">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Aktivera push-notiser"
      >
        <Bell className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Aktivera notiser</span>
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute right-0 top-7 z-50 bg-card border border-border rounded-xl shadow-xl p-4 w-64">
            <p className="text-sm font-semibold text-foreground mb-1">Push-notiser</p>
            <p className="text-xs text-muted-foreground mb-3">
              Välj ditt namn för att få notiser när uppgifter tilldelas dig.
            </p>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 mb-3 text-foreground"
            >
              <option value="">Välj ditt namn...</option>
              {TEAM_MEDLEMMAR.filter((m) => m && m !== "Ingen").map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              disabled={!selectedMember || loading}
              onClick={async () => {
                const ok = await subscribe(selectedMember)
                if (ok) setShow(false)
              }}
              className="w-full text-xs bg-primary text-primary-foreground rounded-lg py-1.5 font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {loading ? "Aktiverar..." : "Aktivera notiser"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

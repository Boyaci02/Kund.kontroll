"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "push-team-member"

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [teamMember, setTeamMember] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return

    setPermission(Notification.permission)
    setTeamMember(localStorage.getItem(STORAGE_KEY) ?? "")

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }
  }, [])

  const subscribe = useCallback(async (member: string) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Din webbläsare stöder inte push-notiser.")
      return false
    }

    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") return false

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMember: member, subscription: sub }),
      })

      if (!res.ok) throw new Error("Subscription failed")

      localStorage.setItem(STORAGE_KEY, member)
      setTeamMember(member)
      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error("[push:subscribe]", err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    localStorage.removeItem(STORAGE_KEY)
    setTeamMember("")
    setIsSubscribed(false)
  }, [])

  return { permission, isSubscribed, teamMember, loading, subscribe, unsubscribe }
}

// Utility: convert base64 VAPID public key to ArrayBuffer (avoids TS Uint8Array generic mismatch)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

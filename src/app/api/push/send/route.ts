import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    const { teamMember, title, body, url } = await req.json() as {
      teamMember: string
      title: string
      body?: string
      url?: string
    }

    if (!teamMember || !title) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("team_member", teamMember)

    if (error) throw error
    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/tasks", tag: "kk-task" })
    const staleIds: string[] = []

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh } },
            payload
          )
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            staleIds.push(sub.id)
          }
        }
      })
    )

    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds)
    }

    return NextResponse.json({ sent: subs.length - staleIds.length })
  } catch (err) {
    console.error("[push/send]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

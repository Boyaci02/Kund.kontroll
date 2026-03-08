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

  const { teamMember } = await req.json() as { teamMember: string }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("team_member", teamMember)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json({ error: "Inga prenumerationer hittades för: " + teamMember }, { status: 404 })

  const results: { endpoint: string; status: string; error?: string }[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh } },
          JSON.stringify({ title: "Testnotis", body: "Om du ser detta funkar push!", url: "/tasks", tag: "kk-test" })
        )
        results.push({ endpoint: sub.endpoint.slice(0, 40), status: "ok" })
      } catch (err: unknown) {
        const e = err as { message?: string; statusCode?: number }
        results.push({ endpoint: sub.endpoint.slice(0, 40), status: "fel", error: `${e.statusCode}: ${e.message}` })
      }
    })
  )

  return NextResponse.json({ subs: subs.length, results })
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { teamMember, subscription } = await req.json() as {
      teamMember: string
      subscription: { endpoint: string; keys: { auth: string; p256dh: string } }
    }

    if (!teamMember || !subscription?.endpoint) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        team_member: teamMember,
        endpoint: subscription.endpoint,
        auth_key: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      { onConflict: "endpoint" }
    )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[push/subscribe]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

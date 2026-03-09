import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// GET /api/claude/comments — Hämta kommentarer med valfria filter
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const client_id = searchParams.get("client_id")

  let query = supabase
    .from("comment_queue")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (client_id) query = query.eq("client_id", client_id)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/claude/comments — Lägg till kommentar
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { comment_text, client_id, platform, commenter_name, post_url, suggested_response } = body

  if (!comment_text) {
    return NextResponse.json({ error: "comment_text krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("comment_queue")
    .insert({ comment_text, client_id, platform, commenter_name, post_url, suggested_response })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

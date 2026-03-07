import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// GET /api/claude/leads — Hämta alla leads
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const bolag = searchParams.get("bolag")

  let query = supabase
    .from("claude_leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (bolag) query = query.eq("bolag", bolag)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/claude/leads — Lägg till nytt lead
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { name, company, phone, email, status, bolag, notes } = body

  if (!name) {
    return NextResponse.json({ error: "name krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("claude_leads")
    .insert({ name, company, phone, email, status, bolag, notes })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

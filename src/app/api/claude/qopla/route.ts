import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// GET /api/claude/qopla — Hämta alla Qopla-leads
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("qopla_leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/claude/qopla — Skapa nytt Qopla-lead
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { name, company, phone, email, services, notes } = body

  if (!name) {
    return NextResponse.json({ error: "name krävs" }, { status: 400 })
  }

  if (!services || !Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: "services krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("qopla_leads")
    .insert({ name, company, phone, email, services, notes })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

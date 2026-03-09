import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// GET /api/claude/clients — Hämta alla aktiva kunder
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("active", true)
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/claude/clients — Skapa ny kund
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { name, metricool_blog_id, tone, bolag } = body

  if (!name) {
    return NextResponse.json({ error: "name krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, metricool_blog_id, tone, bolag })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

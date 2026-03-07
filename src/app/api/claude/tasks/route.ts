import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// GET /api/claude/tasks — Hämta alla uppgifter
export async function GET(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // optional filter: pending|in_progress|done

  let query = supabase
    .from("claude_tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/claude/tasks — Skapa ny uppgift
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { title, description, assigned_to, priority, bolag } = body

  if (!title) {
    return NextResponse.json({ error: "title krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("claude_tasks")
    .insert({ title, description, assigned_to, priority, bolag })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

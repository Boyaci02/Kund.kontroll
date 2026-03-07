import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// PATCH /api/claude/leads/:id — Uppdatera lead-status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { id } = await params
  const body = await req.json()
  const { status, notes, phone, email, company } = body

  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (notes) updates.notes = notes
  if (phone) updates.phone = phone
  if (email) updates.email = email
  if (company) updates.company = company

  const { data, error } = await supabase
    .from("claude_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

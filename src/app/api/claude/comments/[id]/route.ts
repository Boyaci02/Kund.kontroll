import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// PATCH /api/claude/comments/:id — Uppdatera svar och/eller status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { id } = await params
  const body = await req.json()
  const { suggested_response, status } = body

  const updates: Record<string, string> = {}
  if (suggested_response) updates.suggested_response = suggested_response
  if (status) updates.status = status

  const { data, error } = await supabase
    .from("comment_queue")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

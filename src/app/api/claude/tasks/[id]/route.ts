import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// PATCH /api/claude/tasks/:id — Uppdatera uppgift (t.ex. markera som klar)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { id } = await params
  const body = await req.json()
  const { status, assigned_to, priority, description } = body

  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (assigned_to) updates.assigned_to = assigned_to
  if (priority) updates.priority = priority
  if (description) updates.description = description

  const { data, error } = await supabase
    .from("claude_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

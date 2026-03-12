import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"

// PATCH /api/claude/qopla/[id] — Uppdatera Qopla-lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { id } = await params
  const body = await req.json()
  const { status, notes, signed_services } = body

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (notes !== undefined) updates.notes = notes
  if (signed_services !== undefined) updates.signed_services = signed_services

  const { data, error } = await supabase
    .from("qopla_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/claude/qopla/[id] — Ta bort Qopla-lead
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const { id } = await params

  const { error } = await supabase
    .from("qopla_leads")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

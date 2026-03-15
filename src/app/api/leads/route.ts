import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateClaudeKey, unauthorizedResponse } from "@/lib/claude-auth"
import type { Lead, LeadStatus } from "@/lib/types"

// POST /api/leads — Lägg till ett lead direkt i app_state (synkas till UI)
export async function POST(req: NextRequest) {
  if (!validateClaudeKey(req)) return unauthorizedResponse()

  const body = await req.json()
  const { name, status = "Ny lead", email = "", phone = "", notes = "" } = body

  if (!name) {
    return NextResponse.json({ error: "name krävs" }, { status: 400 })
  }

  // Läs aktuell app_state
  const { data: stateRow, error: readError } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", "main")
    .single()

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 })
  }

  const state = (stateRow?.data ?? {}) as Record<string, unknown>
  const leads = (state.leads as Lead[]) ?? []
  const nextId = (state.nextLeadId as number) ?? (leads.length > 0 ? Math.max(...leads.map(l => l.id)) + 1 : 1)

  const newLead: Lead = {
    id: nextId,
    name,
    status: status as LeadStatus,
    email,
    phone,
    notes,
    createdAt: new Date().toISOString(),
  }

  const updatedState = {
    ...state,
    leads: [...leads, newLead],
    nextLeadId: nextId + 1,
  }

  const { error: writeError } = await supabase
    .from("app_state")
    .upsert({ id: "main", data: updatedState, updated_at: new Date().toISOString() })

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 })
  }

  return NextResponse.json(newLead, { status: 201 })
}

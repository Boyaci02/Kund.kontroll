import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { MarketingPlan } from "@/lib/types"

// PATCH /api/marketing-plan/[id] — Uppdatera plan
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  // Bygg update-objekt från body
  const update: Record<string, unknown> = {}

  if (body.status !== undefined) update.status = body.status
  if (body.main_goal !== undefined) update.main_goal = body.main_goal
  if (body.opportunity !== undefined) update.opportunity = body.opportunity
  if (body.current_problem !== undefined) update.current_problem = body.current_problem
  if (body.area_analysis !== undefined) update.area_analysis = body.area_analysis
  if (body.trend_analysis !== undefined) update.trend_analysis = body.trend_analysis

  if (body.month1) {
    if (body.month1.goal !== undefined) update.month1_goal = body.month1.goal
    if (body.month1.subgoals !== undefined) update.month1_subgoals = body.month1.subgoals
    if (body.month1.actions !== undefined) update.month1_actions = body.month1.actions
  }
  if (body.month2) {
    if (body.month2.goal !== undefined) update.month2_goal = body.month2.goal
    if (body.month2.subgoals !== undefined) update.month2_subgoals = body.month2.subgoals
    if (body.month2.actions !== undefined) update.month2_actions = body.month2.actions
  }
  if (body.month3) {
    if (body.month3.goal !== undefined) update.month3_goal = body.month3.goal
    if (body.month3.subgoals !== undefined) update.month3_subgoals = body.month3.subgoals
    if (body.month3.actions !== undefined) update.month3_actions = body.month3.actions
  }

  const { data, error } = await supabase
    .from("marketing_plans")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const row = data as Record<string, unknown>
  const plan: MarketingPlan = {
    id: row.id as string,
    kund_id: row.kund_id as number,
    status: (row.status as MarketingPlan["status"]) ?? "draft",
    main_goal: (row.main_goal as string) ?? "",
    opportunity: (row.opportunity as string) ?? "",
    current_problem: (row.current_problem as string) ?? "",
    area_analysis: (row.area_analysis as string) ?? "",
    trend_analysis: (row.trend_analysis as string) ?? "",
    month1: {
      goal: (row.month1_goal as string) ?? "",
      subgoals: (row.month1_subgoals as string[]) ?? [],
      actions: (row.month1_actions as string[]) ?? [],
    },
    month2: {
      goal: (row.month2_goal as string) ?? "",
      subgoals: (row.month2_subgoals as string[]) ?? [],
      actions: (row.month2_actions as string[]) ?? [],
    },
    month3: {
      goal: (row.month3_goal as string) ?? "",
      subgoals: (row.month3_subgoals as string[]) ?? [],
      actions: (row.month3_actions as string[]) ?? [],
    },
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }

  return NextResponse.json(plan)
}

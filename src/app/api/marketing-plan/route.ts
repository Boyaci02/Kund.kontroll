import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { MarketingPlan } from "@/lib/types"

function toMarketingPlan(row: Record<string, unknown>): MarketingPlan {
  return {
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
}

// GET /api/marketing-plan?kund_id=X — Hämta plan för kund
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kundId = searchParams.get("kund_id")

  if (!kundId) {
    return NextResponse.json({ error: "kund_id krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("marketing_plans")
    .select("*")
    .eq("kund_id", parseInt(kundId))
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(null)
  }

  return NextResponse.json(toMarketingPlan(data as Record<string, unknown>))
}

// POST /api/marketing-plan — Skapa ny plan-post (status: generating)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { kund_id } = body

  if (!kund_id) {
    return NextResponse.json({ error: "kund_id krävs" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("marketing_plans")
    .insert({ kund_id, status: "generating" })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(toMarketingPlan(data as Record<string, unknown>), { status: 201 })
}

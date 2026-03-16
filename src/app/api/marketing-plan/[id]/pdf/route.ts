import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer"

// Registrera ett standardtypsnitt
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  },
  // Header
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 12,
  },
  brandName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 11,
    color: "#444444",
  },
  // Section
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#333333",
  },
  // Month card
  monthCard: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1a1a1a",
  },
  monthLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  monthGoal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subgoalRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  subgoalNum: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    width: 18,
    marginTop: 1,
  },
  subgoalText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#333333",
    flex: 1,
  },
  actionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#aaaaaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  actionBullet: {
    fontSize: 9,
    color: "#2563eb",
    width: 14,
    marginTop: 1,
  },
  actionText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#444444",
    flex: 1,
  },
  // Two-column layout for analysis
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  colLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#aaaaaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#aaaaaa",
  },
})

interface PlanRow {
  id: string
  kund_id: number
  main_goal: string
  opportunity: string
  current_problem: string
  area_analysis: string
  trend_analysis: string
  month1_goal: string
  month1_subgoals: string[]
  month1_actions: string[]
  month2_goal: string
  month2_subgoals: string[]
  month2_actions: string[]
  month3_goal: string
  month3_subgoals: string[]
  month3_actions: string[]
  created_at: string
}

function MarketingPlanPDF({ plan, name }: { plan: PlanRow; name: string }) {
  const date = new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })

  const months = [
    { label: "Månad 1", goal: plan.month1_goal, subgoals: plan.month1_subgoals ?? [], actions: plan.month1_actions ?? [] },
    { label: "Månad 2", goal: plan.month2_goal, subgoals: plan.month2_subgoals ?? [], actions: plan.month2_actions ?? [] },
    { label: "Månad 3", goal: plan.month3_goal, subgoals: plan.month3_subgoals ?? [], actions: plan.month3_actions ?? [] },
  ]

  return React.createElement(
    Document,
    { title: `Marknadsföringsplan – ${name}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.brandName }, "Syns Nu Media"),
        React.createElement(Text, { style: styles.docTitle }, "Marknadsföringsplan"),
        React.createElement(Text, { style: styles.docSubtitle }, `${name} · ${date}`)
      ),
      // Övergripande mål
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionHeader }, "Övergripande mål"),
        React.createElement(Text, { style: styles.bodyText }, plan.main_goal || "–")
      ),
      // Möjlighet & Problem (2 kolumner)
      React.createElement(
        View,
        { style: { ...styles.section, ...styles.twoCol } },
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.colLabel }, "Möjlighet & differentiering"),
          React.createElement(Text, { style: styles.bodyText }, plan.opportunity || "–")
        ),
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.colLabel }, "Nuläge & problem"),
          React.createElement(Text, { style: styles.bodyText }, plan.current_problem || "–")
        )
      ),
      // Marknadsanalys
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionHeader }, "Marknadsanalys"),
        React.createElement(Text, { style: styles.colLabel }, "Områdesanalys"),
        React.createElement(Text, { style: { ...styles.bodyText, marginBottom: 10 } }, plan.area_analysis || "–"),
        React.createElement(Text, { style: styles.colLabel }, "Trender & säsonger"),
        React.createElement(Text, { style: styles.bodyText }, plan.trend_analysis || "–")
      ),
      // Månadsplaner
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionHeader }, "3-månaders plan"),
        ...months.map((month) =>
          React.createElement(
            View,
            { key: month.label, style: styles.monthCard },
            React.createElement(Text, { style: styles.monthLabel }, month.label),
            React.createElement(Text, { style: styles.monthGoal }, month.goal || "–"),
            ...(month.subgoals ?? []).map((sg, i) =>
              React.createElement(
                View,
                { key: `sg-${i}`, style: styles.subgoalRow },
                React.createElement(Text, { style: styles.subgoalNum }, `${i + 1}.`),
                React.createElement(Text, { style: styles.subgoalText }, sg)
              )
            ),
            ...(month.actions && month.actions.length > 0
              ? [
                  React.createElement(Text, { key: "action-label", style: styles.actionLabel }, "Handlingsplan"),
                  ...(month.actions ?? []).map((action, i) =>
                    React.createElement(
                      View,
                      { key: `act-${i}`, style: styles.actionRow },
                      React.createElement(Text, { style: styles.actionBullet }, "▶"),
                      React.createElement(Text, { style: styles.actionText }, action)
                    )
                  ),
                ]
              : [])
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, "Konfidentiellt – Syns Nu Media"),
        React.createElement(
          Text,
          { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }
        )
      )
    )
  )
}

// GET /api/marketing-plan/[id]/pdf?name=Restaurangnamn
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const name = searchParams.get("name") || "Restaurang"

  const { data, error } = await supabase
    .from("marketing_plans")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Plan hittades inte" }, { status: 404 })
  }

  const plan = data as PlanRow

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(MarketingPlanPDF({ plan, name }) as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="marknadsforingsplan-${name.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  })
}

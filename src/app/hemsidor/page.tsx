"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useHemsidor } from "@/components/providers/HemsidorProvider"
import HemsidorDashboard from "@/components/hemsidor/HemsidorDashboard"
import LeadsKanban       from "@/components/hemsidor/LeadsKanban"
import ClientsTable      from "@/components/hemsidor/ClientsTable"
import TasksList         from "@/components/hemsidor/TasksList"
import SubmissionsList   from "@/components/hemsidor/SubmissionsList"
import RequestsList      from "@/components/hemsidor/RequestsList"
import OnboardingQueue   from "@/components/hemsidor/OnboardingQueue"
import GmbProfile        from "@/components/hemsidor/GmbProfile"
import { useDB }         from "@/lib/store"

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard",   label: "Dashboard" },
  { id: "leads",       label: "Nya kunder" },
  { id: "clients",     label: "Kunder" },
  { id: "onboarding",  label: "Onboarding" },
  { id: "tasks",       label: "Tasks" },
  { id: "submissions", label: "Onboarding-svar" },
  { id: "requests",    label: "Förfrågningar" },
  { id: "gmb",         label: "GMB Profile" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HemsidorPage() {
  const [tab, setTab] = useState("dashboard")
  const {
    db, setClients, setLeads, setTasks, setActivity, setSubmissions, setRequests, setOnboarding, addActivity,
  } = useHemsidor()
  const { db: crmDb, updateGmbReviews } = useDB()

  const { clients, leads, tasks, activity, submissions, requests, onboarding } = db

  const showToast = (message: string) => { toast(message) }

  // Badge counts
  const pendingTasks   = tasks.filter(t => t.status !== "klar" && !t.archivedAt).length
  const newLeads       = leads.length
  const newSubmissions = submissions.length
  const newRequests    = requests.filter(r => r.status === "ny").length

  const badges: Record<string, number> = {
    leads:       newLeads,
    tasks:       pendingTasks,
    submissions: newSubmissions,
    requests:    newRequests,
    onboarding:  onboarding.length,
  }

  const sharedProps = { clients, setClients, leads, setLeads, tasks, setTasks, addActivity, showToast, setTab, setOnboarding }

  return (
    <div className="p-6 md:p-8 min-h-screen bg-background">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 bg-card border border-border rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => {
          const badge = badges[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {t.label}
              {badge != null && badge > 0 && (
                <span className={`text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center ${
                  tab === t.id ? "bg-white/30 text-white" : "bg-primary/10 text-primary"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === "dashboard"   && <HemsidorDashboard {...sharedProps} activity={activity} />}
      {tab === "leads"       && <LeadsKanban       {...sharedProps} />}
      {tab === "clients"     && <ClientsTable      {...sharedProps} />}
      {tab === "onboarding"  && <OnboardingQueue   onboarding={onboarding} setOnboarding={setOnboarding} setTab={setTab} />}
      {tab === "tasks"       && <TasksList         tasks={tasks} setTasks={setTasks} clients={clients} addActivity={addActivity} />}
      {tab === "submissions" && <SubmissionsList   submissions={submissions} clients={clients} setTab={setTab} />}
      {tab === "requests"    && <RequestsList      requests={requests} setRequests={setRequests} clients={clients} setTasks={setTasks} addActivity={addActivity} showToast={showToast} />}
      {tab === "gmb"         && <GmbProfile        clients={crmDb.clients} gmbReviews={crmDb.gmbReviews ?? []} updateGmbReviews={updateGmbReviews} />}
    </div>
  )
}

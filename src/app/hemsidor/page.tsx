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

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard",   label: "Dashboard" },
  { id: "leads",       label: "Nya kunder" },
  { id: "clients",     label: "Kunder" },
  { id: "tasks",       label: "Tasks" },
  { id: "submissions", label: "Onboarding-svar" },
  { id: "requests",    label: "Förfrågningar" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HemsidorPage() {
  const [tab, setTab] = useState("dashboard")
  const {
    db, setClients, setLeads, setTasks, setActivity, setSubmissions, setRequests, addActivity,
  } = useHemsidor()

  const { clients, leads, tasks, activity, submissions, requests } = db

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
  }

  const sharedProps = { clients, setClients, leads, setLeads, tasks, setTasks, addActivity, showToast, setTab }

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-background">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => {
          const badge = badges[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t.label}
              {badge != null && badge > 0 && (
                <span className={`text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center ${
                  tab === t.id ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"
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
      {tab === "tasks"       && <TasksList         tasks={tasks} setTasks={setTasks} clients={clients} addActivity={addActivity} />}
      {tab === "submissions" && <SubmissionsList   submissions={submissions} clients={clients} setTab={setTab} />}
      {tab === "requests"    && <RequestsList      requests={requests} setRequests={setRequests} clients={clients} setTasks={setTasks} addActivity={addActivity} showToast={showToast} />}
    </div>
  )
}

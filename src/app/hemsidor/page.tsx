"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import {
  INIT_HEMSIDA_CLIENTS, INIT_HEMSIDA_LEADS, INIT_HEMSIDA_TASKS, todayStr,
} from "@/lib/hemsidor-data"
import type { HemsidaClient, Lead, CrmTask, OnboardingSubmission, TaskRequest, ActivityEntry } from "@/lib/hemsidor-types"
import HemsidorDashboard from "@/components/hemsidor/HemsidorDashboard"
import LeadsKanban       from "@/components/hemsidor/LeadsKanban"
import ClientsTable      from "@/components/hemsidor/ClientsTable"
import TasksList         from "@/components/hemsidor/TasksList"
import SubmissionsList   from "@/components/hemsidor/SubmissionsList"
import RequestsList      from "@/components/hemsidor/RequestsList"

// ─── localStorage helpers ─────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}

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
  const [tab,         setTab]         = useState("dashboard")
  const [clients,     setClients]     = useState<HemsidaClient[]>(() => load("crm_clients", INIT_HEMSIDA_CLIENTS))
  const [leads,       setLeads]       = useState<Lead[]>(() => load("crm_leads", INIT_HEMSIDA_LEADS))
  const [tasks,       setTasks]       = useState<CrmTask[]>(() => load("crm_tasks", INIT_HEMSIDA_TASKS))
  const [activity,    setActivity]    = useState<ActivityEntry[]>(() => load("crm_activity", []))
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>(() => load("crm_onboarding_submissions", []))
  const [requests,    setRequests]    = useState<TaskRequest[]>(() => load("crm_task_requests", []))

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("crm_clients",  JSON.stringify(clients))  }, [clients])
  useEffect(() => { localStorage.setItem("crm_leads",    JSON.stringify(leads))    }, [leads])
  useEffect(() => { localStorage.setItem("crm_tasks",    JSON.stringify(tasks))    }, [tasks])
  useEffect(() => { localStorage.setItem("crm_activity", JSON.stringify(activity)) }, [activity])
  useEffect(() => { localStorage.setItem("crm_onboarding_submissions", JSON.stringify(submissions)) }, [submissions])
  useEffect(() => { localStorage.setItem("crm_task_requests", JSON.stringify(requests)) }, [requests])

  // Poll for new submissions and requests from public form pages
  useEffect(() => {
    const check = () => {
      setSubmissions(load("crm_onboarding_submissions", []))
      setRequests(load("crm_task_requests", []))
    }
    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [])

  const addActivity = useCallback((message: string, type = "general") => {
    setActivity(prev => [{ id: Date.now(), message, type, date: todayStr() }, ...prev].slice(0, 100))
  }, [])

  const showToast = useCallback((message: string) => {
    toast(message)
  }, [])

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

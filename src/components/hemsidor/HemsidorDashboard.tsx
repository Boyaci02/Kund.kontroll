"use client"

import { useState } from "react"
import { CheckCircle, ChevronRight, AlertTriangle, Clock, Link as LinkIcon, Plus, UserPlus } from "lucide-react"
import { TASK_STATUS, LEAD_STATUS, CLIENT_STATUS_STYLE, todayStr, isOverdue, isStale, daysUntil, formatSEK } from "@/lib/hemsidor-data"
import type { HemsidaClient, Lead, CrmTask, ActivityEntry } from "@/lib/hemsidor-types"

interface Props {
  clients: HemsidaClient[]
  leads: Lead[]
  tasks: CrmTask[]
  setTasks: React.Dispatch<React.SetStateAction<CrmTask[]>>
  setTab: (tab: string) => void
  activity: ActivityEntry[]
  addActivity: (message: string, type?: string) => void
  showToast: (msg: string) => void
}

export default function HemsidorDashboard({ clients, leads, tasks, setTasks, setTab, activity, addActivity, showToast }: Props) {
  const activeClients  = clients.filter(c => c.status === "aktiv")
  const openTasks      = tasks.filter(t => t.status !== "klar" && !t.archivedAt)
  const urgentTasks    = openTasks.filter(t => t.priority === "hog")
  const overdueTasks   = openTasks.filter(t => isOverdue(t))
  const staleTasks     = openTasks.filter(t => isStale(t))
  const monthlyRevenue = activeClients.reduce((s, c) => s + c.monthlyFee, 0)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const doneThisWeek = tasks.filter(t => t.completedDate && t.completedDate >= weekAgo).length

  const followUpsToday = leads.filter(l => l.followUpDate === todayStr())

  const stats = [
    { label: "Aktiva kunder",    value: activeClients.length,      sub: `av ${clients.length} totalt`,        accent: "text-amber-600",   bg: "bg-amber-50",   tab: "clients"  },
    { label: "Öppna tasks",      value: openTasks.length,          sub: `${urgentTasks.length} med hög prio`, accent: "text-orange-600",  bg: "bg-orange-50",  tab: "tasks"    },
    { label: "Leads i pipeline", value: leads.length,              sub: "nya potentiella kunder",             accent: "text-emerald-600", bg: "bg-emerald-50", tab: "leads"    },
    { label: "Månadsintäkt",     value: formatSEK(monthlyRevenue), sub: "från aktiva avtal",                  accent: "text-violet-600",  bg: "bg-violet-50",  tab: null       },
  ]

  const markTaskDone = (taskId: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: "klar" as const, completedDate: todayStr(), lastUpdated: todayStr() } : t
    ))
    addActivity("Task markerades som klar från dashboard", "task")
  }

  const copyOnboardingLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/hemsidor/onboarding")
    showToast("Onboarding-länk kopierad!")
  }

  const sources = leads.reduce<Record<string, number>>((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc }, {})
  const maxSource = Math.max(...Object.values(sources), 1)

  return (
    <div>
      <div className="mb-7 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Hemsidaavdelningen – Webb CRM</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab("tasks")} className="flex items-center gap-1.5 text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Ny task
          </button>
          <button onClick={() => setTab("clients")} className="flex items-center gap-1.5 text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Ny kund
          </button>
          <button onClick={copyOnboardingLink} className="flex items-center gap-1.5 text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-colors">
            <LinkIcon className="w-3.5 h-3.5" /> Kopiera onboarding-länk
          </button>
        </div>
      </div>

      {(overdueTasks.length > 0 || staleTasks.length > 0 || followUpsToday.length > 0) && (
        <div className="flex flex-col gap-2 mb-6">
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {overdueTasks.length} task{overdueTasks.length > 1 ? "s" : ""} har passerat sin deadline
            </div>
          )}
          {staleTasks.length > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-amber-700">
              <Clock className="w-4 h-4 flex-shrink-0" />
              {staleTasks.length} task{staleTasks.length > 1 ? "s" : ""} har inte uppdaterats på över 7 dagar
            </div>
          )}
          {followUpsToday.length > 0 && (
            <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-100 rounded-xl px-4 py-2.5 text-sm text-sky-700">
              <Clock className="w-4 h-4 flex-shrink-0" />
              {followUpsToday.length} lead{followUpsToday.length > 1 ? "s" : ""} har uppföljning idag: {followUpsToday.map(l => l.name).join(", ")}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {stats.map((s, i) => (
          <div key={i}
            onClick={() => s.tab && setTab(s.tab)}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 ${s.tab ? "cursor-pointer hover:border-amber-100 hover:shadow-sm" : ""} transition-all`}>
            <p className="text-xs text-slate-500 font-medium mb-2">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            {i === 1 && doneThisWeek > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-1.5">{doneThisWeek} klara denna veckan</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Öppna tasks</h2>
            <button onClick={() => setTab("tasks")} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
              Visa alla <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {openTasks.slice(0, 6).map(task => {
              const overdue = isOverdue(task)
              return (
                <div key={task.id} className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-red-500" : TASK_STATUS[task.status]?.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${overdue ? "text-red-700" : "text-slate-800 dark:text-slate-200"}`}>{task.title}</p>
                    <p className="text-xs text-slate-400">{task.clientName}{task.dueDate && <span className={`ml-2 ${overdue ? "text-red-500 font-medium" : ""}`}>{task.dueDate}</span>}</p>
                  </div>
                  <button onClick={() => markTaskDone(task.id)} title="Markera klar" className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-emerald-500 transition-all flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${TASK_STATUS[task.status]?.color}`}>
                    {TASK_STATUS[task.status]?.label}
                  </span>
                </div>
              )
            })}
            {openTasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Inga öppna tasks 🎉</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Lead pipeline</h2>
            <button onClick={() => setTab("leads")} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
              Visa alla <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 mb-5">
            {leads.slice(0, 4).map(lead => (
              <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="w-7 h-7 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-500">{lead.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{lead.name}</p>
                  <p className="text-xs text-slate-400">{lead.source}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${LEAD_STATUS[lead.status]?.color}`}>
                  {LEAD_STATUS[lead.status]?.label}
                </span>
              </div>
            ))}
          </div>

          {Object.keys(sources).length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">Leads per källa</p>
              <div className="space-y-2">
                {Object.entries(sources).map(([src, count]) => (
                  <div key={src} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-28 truncate">{src}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${(count / maxSource) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {activity.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 md:col-span-2">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-4">Senaste aktivitet</h2>
            <div className="space-y-2">
              {activity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{a.message}</p>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

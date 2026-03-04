"use client"

import { FileText, User, Calendar, CheckCircle } from "lucide-react"
import { todayStr } from "@/lib/hemsidor-data"
import { HPageHeader } from "./shared"
import type { OnboardingSubmission, HemsidaClient } from "@/lib/hemsidor-types"

interface Props {
  submissions: OnboardingSubmission[]
  clients: HemsidaClient[]
  setTab: (tab: string) => void
}

export default function SubmissionsList({ submissions, clients, setTab }: Props) {
  if (submissions.length === 0) {
    return (
      <div>
        <HPageHeader title="Onboarding-svar" sub="Inskickade kundformulär" />
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400 mb-1">Inga formulär inskickade än</p>
          <p className="text-xs text-slate-300">
            Skicka onboarding-länken till en kund för att komma igång
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.origin + "/hemsidor/onboarding") }}
            className="mt-4 text-xs text-amber-600 hover:underline">
            Kopiera länk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <HPageHeader title="Onboarding-svar" sub={`${submissions.length} inskickade formulär`} />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        {submissions.map((sub, i) => {
          const matchedClient = clients.find(c => c.email === sub.email)
          const features = [
            sub.wantsContactForm    && "Kontaktformulär",
            sub.wantsBooking        && "Bokningssystem",
            sub.wantsEcommerce      && "E-handel",
            sub.wantsMaps           && "Karta",
            sub.wantsSocialMedia    && "Sociala medier",
            sub.wantsNewsletter     && "Nyhetsbrev",
            sub.wantsGoogleBusiness && "Google Business",
          ].filter(Boolean) as string[]

          return (
            <div key={i} className="border-b border-slate-50 dark:border-slate-700 last:border-0 p-5 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-amber-600">{(sub.name || "?")[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{sub.name || "Okänd"}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{sub.contact}</span>
                      <span>{sub.email}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{sub.submittedAt || todayStr()}</span>
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {sub.businessType && <span>Bransch: <span className="font-medium text-slate-700 dark:text-slate-300">{sub.businessType}</span></span>}
                      {sub.hasExistingWebsite === true && sub.existingWebsiteUrl && (
                        <span>Befintlig hemsida: <span className="font-medium text-slate-700 dark:text-slate-300">{sub.existingWebsiteUrl}</span></span>
                      )}
                      {sub.hasLogo !== null && (
                        <span>Logo: <span className={`font-medium ${sub.hasLogo ? "text-emerald-600" : "text-red-500"}`}>{sub.hasLogo ? "Ja" : "Nej"}</span></span>
                      )}
                      {sub.hasDomain !== null && (
                        <span>Domän: <span className={`font-medium ${sub.hasDomain ? "text-emerald-600" : "text-red-500"}`}>{sub.hasDomain ? (sub.domainName || "Ja") : "Nej"}</span></span>
                      )}
                    </div>

                    {features.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {features.map(f => (
                          <span key={f} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{f}</span>
                        ))}
                      </div>
                    )}

                    {sub.purpose && (
                      <p className="mt-2 text-xs text-slate-500 italic">"{sub.purpose}"</p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {matchedClient ? (
                    <button onClick={() => setTab("clients")}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Visa kund
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Ej konverterad</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { CheckCircle, ChevronRight, ChevronLeft, Save, Eye } from "lucide-react"

// ─── Konstanter ───────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, title: "Grunduppgifter",   subtitle: "Berätta lite om er verksamhet" },
  { number: 2, title: "Hemsidan idag",    subtitle: "Vad finns redan på plats?" },
  { number: 3, title: "Innehåll",         subtitle: "Text och bilder till hemsidan" },
  { number: 4, title: "Funktioner",       subtitle: "Vad ska hemsidan kunna göra?" },
  { number: 5, title: "Mål & strategi",   subtitle: "Vart vill ni nå med hemsidan?" },
  { number: 6, title: "Granska svar",     subtitle: "Kontrollera att allt stämmer" },
]

interface FormData {
  name: string; contact: string; email: string; phone: string; businessType: string
  hasExistingWebsite: boolean | null; existingWebsiteUrl: string
  hasLogo: boolean | null; hasBrandColors: boolean | null; hasDomain: boolean | null; domainName: string
  hasTexts: boolean | null; hasPhotos: boolean | null
  wantsContactForm: boolean; wantsBooking: boolean; wantsEcommerce: boolean
  wantsMaps: boolean; wantsSocialMedia: boolean; wantsNewsletter: boolean; wantsGoogleBusiness: boolean
  purpose: string; targetAudience: string; competitors: string; additionalNotes: string
}

const INIT_FORM: FormData = {
  name: "", contact: "", email: "", phone: "", businessType: "",
  hasExistingWebsite: null, existingWebsiteUrl: "", hasLogo: null,
  hasBrandColors: null, hasDomain: null, domainName: "",
  hasTexts: null, hasPhotos: null,
  wantsContactForm: false, wantsBooking: false, wantsEcommerce: false,
  wantsMaps: false, wantsSocialMedia: false, wantsNewsletter: false,
  wantsGoogleBusiness: false,
  purpose: "", targetAudience: "", competitors: "", additionalNotes: "",
}

// ─── Task-generering ──────────────────────────────────────────────────────────

function generateTasks(form: FormData, clientId: number, clientName: string) {
  const created = new Date().toISOString().split("T")[0]
  const base = { clientId, clientName, status: "inkommen", created, dueDate: "", assignee: "", isRecurring: false, recurringInterval: "", comments: [], archivedAt: null, lastUpdated: created }
  const tasks: unknown[] = []
  let i = 0
  const add = (title: string, description: string, priority: string) =>
    tasks.push({ ...base, id: Date.now() * 100 + i++, title, description, priority })

  add("Kickoff-möte med kunden",   "Genomgång av onboarding-svar och projektplan", "hog")
  add("Skapa webbdesign mockup",   "Första utkast baserat på kundens önskemål", "normal")

  if (form.hasLogo === false)           add("Designa logotyp",                  "Kunden saknar logotyp – ta fram förslag", "hog")
  if (form.hasDomain === false)         add("Registrera domän",                 "Kunden har ingen domän – köp och konfigurera", "hog")
  if (form.hasBrandColors === false)    add("Ta fram färgprofil och typografi", "Definiera färger, typsnitt och grafisk profil", "normal")
  if (form.hasExistingWebsite === true) add("Analysera befintlig hemsida",      `URL: ${form.existingWebsiteUrl || "ej angiven"}`, "normal")
  if (form.hasTexts === false)          add("Skriva texter för hemsidan",       "Kunden har inga texter klara", "normal")
  if (form.hasPhotos === false)         add("Bildbank eller fotografering",     "Kunden saknar bilder", "normal")
  if (form.wantsBooking)               add("Integrera bokningssystem",         "Välj och integrera bokningslösning", "normal")
  if (form.wantsEcommerce)             add("Konfigurera e-handel och betalning","Sätt upp produktkatalog och betalning", "hog")
  if (form.wantsGoogleBusiness)        add("Skapa Google Business-profil",     "Sätt upp eller optimera Google Business", "lag")
  if (form.wantsNewsletter)            add("Konfigurera nyhetsbrev",           "Integrera e-postverktyg", "lag")
  if (form.wantsSocialMedia)           add("Koppla sociala medier",            "Integrera kundens sociala medier", "lag")
  add("Publicera hemsida", "Slutkontroll, staging-test och publicering", "normal")

  return tasks
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step,      setStep]      = useState(1)
  const [form,      setForm]      = useState<FormData>(INIT_FORM)
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [hasDraft,  setHasDraft]  = useState(false)

  useEffect(() => {
    const draft = localStorage.getItem("crm_onboarding_draft")
    if (draft) setHasDraft(true)
  }, [])

  const set = (field: keyof FormData, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const saveDraft = () => {
    localStorage.setItem("crm_onboarding_draft", JSON.stringify({ ...form, savedAt: new Date().toISOString() }))
    setHasDraft(true)
    alert("Formuläret sparat! Du kan fortsätta senare.")
  }

  const loadDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem("crm_onboarding_draft") || "{}")
      if (draft) { const { savedAt: _, ...rest } = draft; setForm({ ...INIT_FORM, ...rest }); setHasDraft(false) }
    } catch {}
  }

  const validate = (stepNum: number) => {
    const errs: Record<string, string> = {}
    if (stepNum === 1) {
      if (!form.name.trim())    errs.name    = "Obligatoriskt fält"
      if (!form.contact.trim()) errs.contact = "Obligatoriskt fält"
      if (!form.email.trim())   errs.email   = "Obligatoriskt fält"
    }
    if (stepNum === 2) {
      if (form.hasExistingWebsite === null) errs.hasExistingWebsite = "Välj ett alternativ"
      if (form.hasLogo === null)            errs.hasLogo            = "Välj ett alternativ"
      if (form.hasBrandColors === null)     errs.hasBrandColors     = "Välj ett alternativ"
      if (form.hasDomain === null)          errs.hasDomain          = "Välj ett alternativ"
    }
    return errs
  }

  const next = () => {
    const errs = validate(step)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep(s => s + 1)
  }

  const back = () => { setErrors({}); setStep(s => s - 1) }

  const handleSubmit = () => {
    const submittedAt = new Date().toISOString().split("T")[0]
    const newClient = {
      id: Date.now(), name: form.name, contact: form.contact, email: form.email,
      phone: form.phone, website: form.domainName || "", status: "aktiv",
      plan: "Standard", monthlyFee: 0, startDate: submittedAt,
      renewalDate: "", notes: "",
    }
    const newTasks = generateTasks(form, newClient.id, newClient.name)
    const submission = { ...form, submittedAt }

    try {
      const existingClients     = JSON.parse(localStorage.getItem("crm_clients")                   || "[]")
      const existingTasks       = JSON.parse(localStorage.getItem("crm_tasks")                     || "[]")
      const existingSubmissions = JSON.parse(localStorage.getItem("crm_onboarding_submissions")    || "[]")
      localStorage.setItem("crm_clients",                JSON.stringify([...existingClients, newClient]))
      localStorage.setItem("crm_tasks",                  JSON.stringify([...existingTasks, ...newTasks]))
      localStorage.setItem("crm_onboarding_submissions", JSON.stringify([...existingSubmissions, submission]))
      localStorage.removeItem("crm_onboarding_draft")
    } catch (e) {
      console.error("Kunde inte spara till localStorage:", e)
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Tack{form.name ? `, ${form.name}` : ""}!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Vi har tagit emot dina uppgifter och återkommer inom kort för att boka in ett kickoff-möte.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">Syns Nu · Hemsidaavdelningen</p>
          </div>
        </div>
      </div>
    )
  }

  const current = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-amber-500 px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">SN</span>
            </div>
            <span className="text-white font-bold text-sm">Syns Nu · Hemsidaavdelningen</span>
          </div>
          <h1 className="text-white text-xl font-bold">Onboarding – Ny hemsida</h1>
          <p className="text-amber-200 text-sm mt-1">Fyll i formuläret så förbereder vi allt inför uppstart</p>
        </div>

        {/* Draft-banner */}
        {hasDraft && step === 1 && (
          <div className="bg-amber-50 border-b border-amber-100 px-8 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-700">Du har ett sparat utkast.</p>
            <button onClick={loadDraft} className="text-sm font-semibold text-amber-600 hover:text-amber-800">
              Fortsätt utkast →
            </button>
          </div>
        )}

        {/* Steg-indikator */}
        <div className="px-8 py-4 border-b border-slate-100">
          <div className="flex items-center">
            {Array.from({ length: 6 }, (_, i) => i + 1).map(n => (
              <div key={n} className="flex items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  n < step   ? "bg-amber-500 text-white" :
                  n === step ? "bg-amber-500 text-white ring-4 ring-amber-100" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {n < step ? <CheckCircle className="w-4 h-4" /> : n}
                </div>
                {n < 6 && (
                  <div className={`h-0.5 flex-1 mx-1 transition-all ${n < step ? "bg-amber-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Steg {step} av 6 — {current.title}</p>
        </div>

        {/* Steg-innehåll */}
        <div className="px-8 py-6">
          <h2 className="text-lg font-bold text-slate-900 mb-0.5">{current.title}</h2>
          <p className="text-slate-500 text-sm mb-6">{current.subtitle}</p>

          {step === 1 && <Step1 form={form} set={set} errors={errors} />}
          {step === 2 && <Step2 form={form} set={set} errors={errors} />}
          {step === 3 && <Step3 form={form} set={set} />}
          {step === 4 && <Step4 form={form} set={set} />}
          {step === 5 && <Step5 form={form} set={set} />}
          {step === 6 && <Step6 form={form} />}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {step > 1
              ? <button onClick={back} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Föregående
                </button>
              : <div />}
          </div>
          <div className="flex items-center gap-3">
            {step < 6 && (
              <button onClick={saveDraft}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                <Save className="w-3.5 h-3.5" /> Spara utkast
              </button>
            )}
            {step < 6 ? (
              <button onClick={next}
                className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm">
                Nästa <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                Skicka in <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Steg-komponenter ─────────────────────────────────────────────────────────

type SetFn = (field: keyof FormData, value: unknown) => void

function OnbField({ label, value, onChange, error, multiline, type, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string
  multiline?: boolean; type?: string; placeholder?: string
}) {
  const cls = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all ${
    error ? "border-red-300 bg-red-50" : "border-slate-200"
  }`
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls} placeholder={placeholder} />
        : <input type={type || "text"} value={value} onChange={e => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      }
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function YesNo({ label, value, onChange, error }: { label: string; value: boolean | null; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-2">{label}</label>
      <div className="flex gap-3">
        {[true, false].map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              value === v
                ? (v ? "bg-amber-500 border-amber-500 text-white shadow-sm" : "bg-slate-700 border-slate-700 text-white shadow-sm")
                : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
            }`}>
            {v ? "Ja" : "Nej"}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  )
}

function Step1({ form, set, errors }: { form: FormData; set: SetFn; errors: Record<string,string> }) {
  return (
    <div className="space-y-4">
      <OnbField label="Företagsnamn *"              value={form.name}         onChange={v => set("name", v)}         error={errors.name} />
      <OnbField label="Kontaktperson *"             value={form.contact}      onChange={v => set("contact", v)}      error={errors.contact} />
      <OnbField label="E-post *"                    value={form.email}        onChange={v => set("email", v)}        error={errors.email} type="email" />
      <OnbField label="Telefon"                     value={form.phone}        onChange={v => set("phone", v)}        type="tel" />
      <OnbField label="Bransch / typ av verksamhet" value={form.businessType} onChange={v => set("businessType", v)} placeholder="T.ex. restaurang, byggfirma, frisör..." />
    </div>
  )
}

function Step2({ form, set, errors }: { form: FormData; set: SetFn; errors: Record<string,string> }) {
  return (
    <div className="space-y-5">
      <YesNo label="Har ni en befintlig hemsida?"           value={form.hasExistingWebsite} onChange={v => set("hasExistingWebsite", v)} error={errors.hasExistingWebsite} />
      {form.hasExistingWebsite === true && (
        <OnbField label="URL till befintlig hemsida" value={form.existingWebsiteUrl} onChange={v => set("existingWebsiteUrl", v)} placeholder="www.example.se" />
      )}
      <YesNo label="Har ni en logotyp klar?"                value={form.hasLogo}            onChange={v => set("hasLogo", v)}            error={errors.hasLogo} />
      <YesNo label="Har ni en färgprofil / varumärkesguide?" value={form.hasBrandColors}    onChange={v => set("hasBrandColors", v)}     error={errors.hasBrandColors} />
      <YesNo label="Har ni ett domännamn?"                   value={form.hasDomain}          onChange={v => set("hasDomain", v)}          error={errors.hasDomain} />
      {form.hasDomain === true && (
        <OnbField label="Domännamn" value={form.domainName} onChange={v => set("domainName", v)} placeholder="example.se" />
      )}
    </div>
  )
}

function Step3({ form, set }: { form: FormData; set: SetFn }) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
        Texter och bilder är ofta det som tar längst tid. Ju mer som är klart, desto snabbare kan vi bygga klart hemsidan.
      </p>
      <YesNo label="Har ni texter klara för hemsidan?" value={form.hasTexts}  onChange={v => set("hasTexts", v)} />
      <YesNo label="Har ni bilder / foton klara?"      value={form.hasPhotos} onChange={v => set("hasPhotos", v)} />
    </div>
  )
}

function Step4({ form, set }: { form: FormData; set: SetFn }) {
  const features = [
    { key: "wantsContactForm"    as keyof FormData, label: "Kontaktformulär",              desc: "Besökare kan skicka meddelanden direkt från hemsidan" },
    { key: "wantsBooking"        as keyof FormData, label: "Bokningssystem",               desc: "Online-bokning av tider, bord, möten etc." },
    { key: "wantsEcommerce"      as keyof FormData, label: "E-handel / webshop",          desc: "Sälja produkter eller tjänster direkt på hemsidan" },
    { key: "wantsMaps"           as keyof FormData, label: "Karta / Hitta hit",           desc: "Google Maps inbäddad på hemsidan" },
    { key: "wantsSocialMedia"    as keyof FormData, label: "Koppling till sociala medier", desc: "Instagram-flöde, Facebook-widget etc." },
    { key: "wantsNewsletter"     as keyof FormData, label: "Nyhetsbrev",                  desc: "Samla e-postadresser och skicka utskick" },
    { key: "wantsGoogleBusiness" as keyof FormData, label: "Google Business-profil",      desc: "Synas bättre på Google Maps och i sökresultaten" },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Kryssa i det ni vill ha på hemsidan – ni kan alltid lägga till mer senare.</p>
      <div className="space-y-2">
        {features.map(({ key, label, desc }) => (
          <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            form[key] ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-amber-200"
          }`}>
            <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} className="w-4 h-4 accent-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function Step5({ form, set }: { form: FormData; set: SetFn }) {
  const purposes = [
    "Visa upp tjänster och få leads",
    "Sälja produkter (e-handel)",
    "Ta emot bokningar",
    "Bygga varumärke och trovärdighet",
    "Informera kunder / portfolio",
  ]
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">Vad är det primära syftet med hemsidan?</label>
        <div className="space-y-2">
          {purposes.map(p => (
            <label key={p} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              form.purpose === p ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-amber-200"
            }`}>
              <input type="radio" name="purpose" value={p} checked={form.purpose === p} onChange={() => set("purpose", p)} className="accent-amber-500" />
              <span className="text-sm text-slate-700">{p}</span>
            </label>
          ))}
        </div>
      </div>
      <OnbField label="Vem är er målgrupp?" value={form.targetAudience} onChange={v => set("targetAudience", v)} multiline placeholder="T.ex. privatpersoner i Göteborg, företag inom bygg..." />
      <OnbField label="Hemsidor ni gillar / vill inspireras av" value={form.competitors} onChange={v => set("competitors", v)} multiline placeholder="Länka gärna eller beskriv vad ni gillar" />
      <OnbField label="Övriga önskemål" value={form.additionalNotes} onChange={v => set("additionalNotes", v)} multiline placeholder="Är det något mer vi bör veta?" />
    </div>
  )
}

function Step6({ form }: { form: FormData }) {
  const features = [
    { key: "wantsContactForm"    as keyof FormData, label: "Kontaktformulär" },
    { key: "wantsBooking"        as keyof FormData, label: "Bokningssystem" },
    { key: "wantsEcommerce"      as keyof FormData, label: "E-handel" },
    { key: "wantsMaps"           as keyof FormData, label: "Karta" },
    { key: "wantsSocialMedia"    as keyof FormData, label: "Sociala medier" },
    { key: "wantsNewsletter"     as keyof FormData, label: "Nyhetsbrev" },
    { key: "wantsGoogleBusiness" as keyof FormData, label: "Google Business" },
  ].filter(f => form[f.key])

  const yesNo = (v: boolean | null) => v === true ? "Ja" : v === false ? "Nej" : "–"

  const sections = [
    {
      title: "Grunduppgifter",
      rows: [
        ["Företag",   form.name],
        ["Kontakt",   form.contact],
        ["E-post",    form.email],
        ["Telefon",   form.phone || "–"],
        ["Bransch",   form.businessType || "–"],
      ],
    },
    {
      title: "Hemsidan idag",
      rows: [
        ["Befintlig hemsida", yesNo(form.hasExistingWebsite) + (form.existingWebsiteUrl ? ` (${form.existingWebsiteUrl})` : "")],
        ["Logotyp klar",      yesNo(form.hasLogo)],
        ["Färgprofil",        yesNo(form.hasBrandColors)],
        ["Domän",             yesNo(form.hasDomain) + (form.domainName ? ` (${form.domainName})` : "")],
      ],
    },
    {
      title: "Innehåll",
      rows: [
        ["Texter klara", yesNo(form.hasTexts)],
        ["Bilder klara", yesNo(form.hasPhotos)],
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
        <Eye className="w-4 h-4 flex-shrink-0" />
        Kontrollera att allt stämmer innan du skickar in. Gå tillbaka om något behöver ändras.
      </div>

      {sections.map(sec => (
        <div key={sec.title} className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{sec.title}</p>
          <div className="space-y-1.5">
            {sec.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-800 font-medium text-right max-w-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {features.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Önskade funktioner</p>
          <div className="flex flex-wrap gap-2">
            {features.map(f => (
              <span key={String(f.key)} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{f.label}</span>
            ))}
          </div>
        </div>
      )}

      {form.purpose && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Syfte med hemsidan</p>
          <p className="text-sm text-slate-800">{form.purpose}</p>
        </div>
      )}
    </div>
  )
}

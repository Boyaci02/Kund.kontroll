"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { TrendingUp, Lock, RefreshCw } from "lucide-react"

const ALLOWED = ["Emanuel", "Philip", "Jakob"]

// ── Number formatting ─────────────────────────────────────────────────────────
function kr(n: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n)
}
function pct(n: number) {
  return (n * 100).toFixed(1) + "%"
}

// ── Base values from Excel ────────────────────────────────────────────────────
const BASE_PERSONAL = [
  { name: "Emanuel", netto: 9000 },
  { name: "Jakob", netto: 9000 },
  { name: "Philip", netto: 9000 },
  { name: "Matteus", netto: 9000 },
  { name: "Sami", netto: 9000 },
]

const BASE_UNDERLEV = {
  "Firma Vogel": 29000,
  "Danah": 22500,
  "Edvin": 13500,
  "Ivan (hemsidor)": 15000,
}

const BASE_FASTA = {
  "HighLevel": 3800,
  "Billeasing": 9770,
  "DLE Redovisning": 5500,
  "Facebook Ads": 5000,
  "Telecom": 2200,
  "Drivmedel & resor": 8200,
  "Mjukvara/Fortnox/övrigt": 1529,
}

// Lönetrappa: Emanuel, Jakob, Philip 9k→25k over 8 months
const MONTHS_12 = ["Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec", "Jan 27", "Feb 27"]
const LONETRAPPA_EJP = [9000, 12000, 15000, 17000, 19000, 21000, 23000, 25000, 25000, 25000, 25000, 25000]

// ── Tiny reusable components ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 flex flex-col gap-1", highlight && "border-primary/30 bg-primary/5")}>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-2xl font-bold", highlight ? "text-primary" : "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  min = 0,
  step = 1,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  className?: string
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      className={cn(
        "h-8 w-full rounded-lg border border-border bg-background px-2 text-right text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors",
        className
      )}
    />
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 first:mt-0">{children}</p>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "oversikt" | "kostnader" | "tillvaxt" | "lonetrappa"

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EkonomiPage() {
  const { user } = useAuth()

  // State: revenue inputs
  const [someKunder, setSomeKunder] = useState(34)
  const [someSnittPris, setSomeSnittPris] = useState(10921)
  const [hemsidKunder, setHemsidKunder] = useState(10)
  const [hemsidPris, setHemsidPris] = useState(500)

  // State: costs (personal netto, underlev, fasta)
  const [personal, setPersonal] = useState(BASE_PERSONAL.map((p) => ({ ...p })))
  const [underlev, setUnderlev] = useState({ ...BASE_UNDERLEV })
  const [fasta, setFasta] = useState({ ...BASE_FASTA })

  // State: growth inputs
  const [nyaSome, setNyaSome] = useState(4)
  const [nyaHemsidor, setNyaHemsidor] = useState(10)

  const [tab, setTab] = useState<Tab>("oversikt")

  // ── Computed values ──────────────────────────────────────────────────────────
  const computed = useMemo(() => {
    const someIntakt = someKunder * someSnittPris
    const hemsidIntakt = hemsidKunder * hemsidPris
    const totalIntakt = someIntakt + hemsidIntakt

    // Personal: netto × 1.933 ≈ total inkl bruttolön + AG (31.42%)
    const totalPersonal = personal.reduce((s, p) => s + p.netto * 1.933, 0)
    const totalUnderlev = Object.values(underlev).reduce((s, v) => s + v, 0)
    const totalFasta = Object.values(fasta).reduce((s, v) => s + v, 0)
    const totalKostnad = totalPersonal + totalUnderlev + totalFasta

    const bruttoVinst = totalIntakt - totalKostnad
    const margin = totalIntakt > 0 ? bruttoVinst / totalIntakt : 0

    // Skatter: ~37.9% av intäkt (från Excel)
    const skatter = totalIntakt * 0.379
    const verkligtKvar = bruttoVinst - skatter
    const goalProgress = Math.min(totalIntakt / 1_000_000, 1)

    return { someIntakt, hemsidIntakt, totalIntakt, totalPersonal, totalUnderlev, totalFasta, totalKostnad, bruttoVinst, margin, skatter, verkligtKvar, goalProgress }
  }, [someKunder, someSnittPris, hemsidKunder, hemsidPris, personal, underlev, fasta])

  // ── 12-month growth projection ────────────────────────────────────────────────
  const tillvaxt = useMemo(() => {
    const rows = []
    let kunder = someKunder
    let hemsid = hemsidKunder
    for (let i = 0; i < 12; i++) {
      if (i > 0) {
        kunder = kunder + nyaSome - 1 // 1 churn/mån
        hemsid = hemsid + nyaHemsidor
      }
      const intakt = kunder * someSnittPris + hemsid * hemsidPris

      // Salary follows lönetrappa for E/J/P
      const ejpNetto = LONETRAPPA_EJP[i]
      const totalNetto = ejpNetto * 3 + 9000 * 2
      const totalPersonal = totalNetto * 1.933

      const totalUnderlev = Object.values(underlev).reduce((s, v) => s + v, 0)
      const totalFasta = Object.values(fasta).reduce((s, v) => s + v, 0)
      const kostnad = totalPersonal + totalUnderlev + totalFasta

      const vinst = intakt - kostnad
      const skatter = intakt * 0.379
      const kvar = vinst - skatter

      rows.push({ month: MONTHS_12[i], kunder, hemsid, intakt, kostnad, vinst, margin: intakt > 0 ? vinst / intakt : 0, kvar })
    }
    return rows
  }, [someKunder, someSnittPris, hemsidKunder, hemsidPris, nyaSome, nyaHemsidor, underlev, fasta])

  // ── Role guard ────────────────────────────────────────────────────────────────
  if (!user || !ALLOWED.includes(user.name)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-2">Åtkomst nekad</h2>
          <p className="text-sm text-muted-foreground">Ekonomisidan är bara tillgänglig för Emanuel, Philip och Jakob.</p>
        </div>
      </div>
    )
  }

  function resetAll() {
    setSomeKunder(34)
    setSomeSnittPris(10921)
    setHemsidKunder(10)
    setHemsidPris(500)
    setPersonal(BASE_PERSONAL.map((p) => ({ ...p })))
    setUnderlev({ ...BASE_UNDERLEV })
    setFasta({ ...BASE_FASTA })
    setNyaSome(4)
    setNyaHemsidor(10)
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Ekonomi</h1>
            <p className="text-xs text-muted-foreground">Interaktiv kalkylator · Syns Nu Media 2026</p>
          </div>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Återställ
        </button>
      </div>

      {/* KPI cards — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total månadsintäkt" value={kr(computed.totalIntakt)} sub={`${someKunder} SoMe + ${hemsidKunder} hemsidor`} />
        <KpiCard label="Totala kostnader" value={kr(computed.totalKostnad)} sub={`${pct(computed.totalKostnad / computed.totalIntakt)} av intäkt`} />
        <KpiCard label="Bruttovinst" value={kr(computed.bruttoVinst)} sub={`Marginal ${pct(computed.margin)}`} highlight={computed.bruttoVinst > 0} />
        <KpiCard label="Verkligt kvar" value={kr(computed.verkligtKvar)} sub={`Efter skatter (${pct(0.379)} avsättning)`} highlight />
      </div>

      {/* Progress to 1M */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Mål: 1 000 000 kr/mån</p>
          <span className="text-sm font-bold text-primary">{pct(computed.goalProgress)}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${computed.goalProgress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{kr(computed.totalIntakt)}</span>
          <span className="text-[10px] text-muted-foreground">Gap: {kr(Math.max(0, 1_000_000 - computed.totalIntakt))}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {([
            ["oversikt", "Intäktsantaganden"],
            ["kostnader", "Kostnader"],
            ["tillvaxt", "12-månadersprognos"],
            ["lonetrappa", "Lönetrappa"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-xs font-semibold transition-colors border-b-2",
                tab === t
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Översikt / Intäktsantaganden */}
        {tab === "oversikt" && (
          <div className="p-5">
            <div className="grid md:grid-cols-2 gap-6">
              {/* SoMe */}
              <div>
                <SectionHeader>SoMe</SectionHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-foreground flex-1">Antal kunder</label>
                    <div className="flex items-center gap-2 w-48">
                      <input
                        type="range"
                        min={0}
                        max={150}
                        value={someKunder}
                        onChange={(e) => setSomeKunder(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <NumInput value={someKunder} onChange={setSomeKunder} className="w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-foreground flex-1">Genomsnittspris (kr/mån)</label>
                    <NumInput value={someSnittPris} onChange={setSomeSnittPris} step={100} className="w-28" />
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    SoMe-intäkt: {kr(computed.someIntakt)}
                  </div>
                </div>
              </div>

              {/* Hemsidor */}
              <div>
                <SectionHeader>Hemsidor (recurring)</SectionHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-foreground flex-1">Antal hemsidkunder</label>
                    <div className="flex items-center gap-2 w-48">
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={hemsidKunder}
                        onChange={(e) => setHemsidKunder(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <NumInput value={hemsidKunder} onChange={setHemsidKunder} className="w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-foreground flex-1">Pris per hemsida (kr/mån)</label>
                    <NumInput value={hemsidPris} onChange={setHemsidPris} step={50} className="w-28" />
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Hemsidintäkt: {kr(computed.hemsidIntakt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Skattesummering */}
            <div className="mt-6 rounded-xl bg-muted/40 border border-border p-4 space-y-2 text-sm">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-3">Resultatsammanfattning</p>
              {[
                ["Total intäkt", kr(computed.totalIntakt), ""],
                ["- Kostnader", kr(computed.totalKostnad), ""],
                ["= Bruttovinst", kr(computed.bruttoVinst), pct(computed.margin)],
                ["- Skatter (37.9%)", kr(computed.skatter), ""],
                ["= Verkligt kvar", kr(computed.verkligtKvar), pct(computed.verkligtKvar / computed.totalIntakt)],
              ].map(([label, val, extra]) => (
                <div key={label} className={cn("flex justify-between", label.startsWith("=") && "font-bold text-foreground border-t border-border pt-2 mt-1")}>
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">
                    {val} {extra && <span className="text-muted-foreground font-normal ml-1">{extra}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Kostnader */}
        {tab === "kostnader" && (
          <div className="p-5">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Personal */}
              <div>
                <SectionHeader>Personal</SectionHeader>
                <div className="space-y-2">
                  {personal.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="text-sm text-foreground flex-1">{p.name}</span>
                      <NumInput
                        value={p.netto}
                        onChange={(v) => setPersonal((prev) => prev.map((x, j) => j === i ? { ...x, netto: v } : x))}
                        step={500}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground w-4">kr</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Totalt (inkl. AG+skatt)</span>
                    <span>{kr(computed.totalPersonal)}</span>
                  </div>
                </div>
              </div>

              {/* Underleverantörer */}
              <div>
                <SectionHeader>Underleverantörer</SectionHeader>
                <div className="space-y-2">
                  {Object.entries(underlev).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm text-foreground flex-1 truncate">{key}</span>
                      <NumInput
                        value={val}
                        onChange={(v) => setUnderlev((prev) => ({ ...prev, [key]: v }))}
                        step={500}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground w-4">kr</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Totalt</span>
                    <span>{kr(computed.totalUnderlev)}</span>
                  </div>
                </div>
              </div>

              {/* Fasta */}
              <div>
                <SectionHeader>Fasta driftskostnader</SectionHeader>
                <div className="space-y-2">
                  {Object.entries(fasta).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm text-foreground flex-1 truncate">{key}</span>
                      <NumInput
                        value={val}
                        onChange={(v) => setFasta((prev) => ({ ...prev, [key]: v }))}
                        step={100}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground w-4">kr</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Totalt</span>
                    <span>{kr(computed.totalFasta)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grand total */}
            <div className="mt-6 rounded-xl bg-muted/40 border border-border px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Total månadsutgift</span>
              <span className="text-xl font-bold text-foreground">{kr(computed.totalKostnad)}</span>
            </div>
          </div>
        )}

        {/* Tab: Tillväxt */}
        {tab === "tillvaxt" && (
          <div className="p-5">
            {/* Inputs */}
            <div className="flex flex-wrap gap-4 mb-5">
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground whitespace-nowrap">Nya SoMe-kunder/mån</label>
                <NumInput value={nyaSome} onChange={setNyaSome} className="w-16" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground whitespace-nowrap">Nya hemsidkunder/mån</label>
                <NumInput value={nyaHemsidor} onChange={setNyaHemsidor} className="w-16" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Månad", "SoMe-kunder", "Hemsidkunder", "Intäkt", "Kostnader", "Bruttovinst", "Marginal", "Verkligt kvar"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tillvaxt.map((row, i) => (
                    <tr
                      key={row.month}
                      className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors", row.intakt >= 1_000_000 && "bg-green-50/60 dark:bg-green-900/10")}
                    >
                      <td className="py-2 px-2 font-semibold text-foreground">{row.month}</td>
                      <td className="py-2 px-2 text-foreground">{row.kunder}</td>
                      <td className="py-2 px-2 text-foreground">{row.hemsid}</td>
                      <td className="py-2 px-2 font-medium text-foreground">
                        {row.intakt >= 1_000_000 ? <span className="text-green-600 dark:text-green-400 font-bold">✅ {kr(row.intakt)}</span> : kr(row.intakt)}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{kr(row.kostnad)}</td>
                      <td className="py-2 px-2 text-foreground">{kr(row.vinst)}</td>
                      <td className="py-2 px-2 text-muted-foreground">{pct(row.margin)}</td>
                      <td className={cn("py-2 px-2 font-semibold", row.kvar >= 100_000 ? "text-green-600 dark:text-green-400" : "text-foreground")}>{kr(row.kvar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Lönetrappa */}
        {tab === "lonetrappa" && (
          <div className="p-5">
            <p className="text-xs text-muted-foreground mb-4">Emanuel, Jakob &amp; Philip: gradvis ökning 9 000 → 25 000 kr netto. Matteus &amp; Sami kvar på 9 000 kr.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Person</th>
                    {MONTHS_12.map((m) => (
                      <th key={m} className="text-right py-2 px-2 text-muted-foreground font-semibold whitespace-nowrap">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* EJP */}
                  {["Emanuel", "Jakob", "Philip"].map((name) => (
                    <tr key={name} className="border-b border-border/50">
                      <td className="py-2 px-2 font-semibold text-foreground">{name}</td>
                      {LONETRAPPA_EJP.map((v, i) => (
                        <td key={i} className={cn("py-2 px-2 text-right", v === 25000 ? "text-green-600 dark:text-green-400 font-bold" : "text-foreground")}>
                          {kr(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Matteus, Sami */}
                  {["Matteus", "Sami"].map((name) => (
                    <tr key={name} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium text-foreground">{name}</td>
                      {MONTHS_12.map((_, i) => (
                        <td key={i} className="py-2 px-2 text-right text-muted-foreground">{kr(9000)}</td>
                      ))}
                    </tr>
                  ))}
                  {/* Total netto */}
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="py-2 px-2 font-bold text-foreground">Total netto</td>
                    {MONTHS_12.map((_, i) => {
                      const ejpNetto = LONETRAPPA_EJP[i]
                      const total = ejpNetto * 3 + 9000 * 2
                      return (
                        <td key={i} className="py-2 px-2 text-right font-bold text-foreground">{kr(total)}</td>
                      )
                    })}
                  </tr>
                  {/* Total lönekostnad inkl AG+skatt */}
                  <tr className="bg-muted/30">
                    <td className="py-2 px-2 font-bold text-foreground text-[10px]">Total kostnad (inkl. skatt+AG)</td>
                    {MONTHS_12.map((_, i) => {
                      const ejpNetto = LONETRAPPA_EJP[i]
                      const totalNetto = ejpNetto * 3 + 9000 * 2
                      const totalKostnad = totalNetto * 1.933
                      return (
                        <td key={i} className="py-2 px-2 text-right font-semibold text-muted-foreground text-[10px]">{kr(totalKostnad)}</td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

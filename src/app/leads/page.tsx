"use client"

import { useEffect, useState, useCallback } from "react"
import { useDB } from "@/lib/store"
import { cn } from "@/lib/utils"
import { RefreshCw, UserPlus, ExternalLink, Search, AlertCircle, Loader2 } from "lucide-react"

// ── Notion property value extraction ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(prop: any): string {
  if (!prop) return ""
  switch (prop.type) {
    case "title":
      return prop.title?.map((t: { plain_text: string }) => t.plain_text).join("") ?? ""
    case "rich_text":
      return prop.rich_text?.map((t: { plain_text: string }) => t.plain_text).join("") ?? ""
    case "select":
      return prop.select?.name ?? ""
    case "multi_select":
      return prop.multi_select?.map((s: { name: string }) => s.name).join(", ") ?? ""
    case "email":
      return prop.email ?? ""
    case "phone_number":
      return prop.phone_number ?? ""
    case "url":
      return prop.url ?? ""
    case "number":
      return prop.number?.toString() ?? ""
    case "checkbox":
      return prop.checkbox ? "✓" : ""
    case "date":
      return prop.date?.start ?? ""
    case "status":
      return prop.status?.name ?? ""
    default:
      return ""
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface NotionPage {
  id: string
  url: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>
}

// ── Status badge colors ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "Ny lead":       "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Kontaktad":     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Möte bokat":    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Offert skickad":"bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Vunnen":        "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Förlorad":      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

// ── Page title extraction (finds the title property) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTitle(properties: Record<string, any>): string {
  const titleProp = Object.values(properties).find(p => p?.type === "title")
  return titleProp ? extractText(titleProp) : "Utan namn"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTitleKey(properties: Record<string, any>): string {
  return Object.keys(properties).find(k => properties[k]?.type === "title") ?? ""
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { addKund } = useDB()
  const [pages, setPages] = useState<NotionPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [converted, setConverted] = useState<Set<string>>(new Set())

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch("/api/notion/leads")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Okänt fel")
      setPages(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta leads")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Derive columns from all pages (except title column — shown first)
  const titleKey = pages.length > 0 ? getTitleKey(pages[0].properties) : ""
  const allKeys = pages.length > 0
    ? Object.keys(pages[0].properties).filter(k => k !== titleKey)
    : []

  const filtered = pages.filter(p =>
    getTitle(p.properties).toLowerCase().includes(q.toLowerCase())
  )

  function handleConvert(page: NotionPage) {
    const name = getTitle(page.properties)
    addKund({
      name,
      pkg: "",
      vg: "", ed: "", cc: "",
      lr: "", nr: "", ns: "",
      adr: "", cnt: "", ph: "",
      em: extractText(Object.values(page.properties).find(p => p?.type === "email")) ?? "",
      st: "AKTIV",
      notes: `Importerad från Notion lead (${new Date().toLocaleDateString("sv-SE")})`,
    })
    setConverted(prev => new Set([...prev, page.id]))
  }

  return (
    <main className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prospekts och inkommande kunder från Notion CRM
          </p>
        </div>
        <button
          onClick={fetch}
          className="flex items-center gap-2 text-sm border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Uppdatera
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Sök lead…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Hämtar leads från Notion…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold text-sm">Anslutningsfel</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md text-center">{error}</p>
          <div className="text-xs text-muted-foreground bg-muted rounded-xl px-4 py-3 max-w-md text-left space-y-1">
            <p className="font-semibold text-foreground mb-1">Setup-guide:</p>
            <p>1. Skapa en integration på notion.so/my-integrations</p>
            <p>2. Kopiera token → sätt NOTION_API_KEY i .env.local</p>
            <p>3. Dela databasen med integrationen i Notion</p>
            <p>4. Kopiera databas-ID från URL → sätt NOTION_DATABASE_ID i .env.local</p>
            <p>5. Starta om dev-servern</p>
          </div>
        </div>
      )}

      {!loading && !error && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <p className="text-sm">Inga leads hittades i Notion-databasen</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && pages.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Namn
                </th>
                {allKeys.map(key => (
                  <th key={key} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                    {key}
                  </th>
                ))}
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(page => {
                const name = getTitle(page.properties)
                const isConverted = converted.has(page.id)
                return (
                  <tr key={page.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{name || "—"}</span>
                    </td>
                    {allKeys.map(key => {
                      const prop = page.properties[key]
                      const val = extractText(prop)
                      const isStatus = prop?.type === "status" || prop?.type === "select"
                      const colorCls = isStatus ? (STATUS_COLORS[val] ?? "bg-muted text-muted-foreground") : ""
                      return (
                        <td key={key} className="px-4 py-3">
                          {val ? (
                            isStatus ? (
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", colorCls)}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-xs text-foreground">{val}</span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isConverted ? (
                          <span className="text-xs text-teal-600 font-medium">✓ Tillagd</span>
                        ) : (
                          <button
                            onClick={() => handleConvert(page)}
                            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 hover:opacity-90 transition-opacity font-medium"
                          >
                            <UserPlus className="w-3 h-3" />
                            Gör till kund
                          </button>
                        )}
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center w-7 h-7 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                          title="Öppna i Notion"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/10 border-t border-border">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
            {q && ` · filtrerat på "${q}"`}
          </div>
        </div>
      )}
    </main>
  )
}

import { cfCounts, cfDLeft } from "@/lib/contentflow-data"
import type { CFClient } from "@/lib/contentflow-types"

interface Props {
  clients: CFClient[]
}

export default function KpiBand({ clients }: Props) {
  const ct = cfCounts(clients)

  const kpis = [
    { n: ct.overdue,    label: "Försenade",     color: "text-red-500",    dot: "bg-red-500" },
    { n: ct.upcoming,   label: "Inom 14 dagar", color: "text-violet-500", dot: "bg-violet-500" },
    { n: ct.inprogress, label: "Pågår",         color: "text-sky-500",    dot: "bg-sky-500" },
    { n: ct.review,     label: "Granskning",    color: "text-teal-500",   dot: "bg-teal-500" },
  ]

  return (
    <div className="grid grid-cols-4 border-b border-border bg-muted/30">
      {kpis.map((k, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 px-7 py-5 border-r border-border last:border-r-0 hover:bg-muted/50 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.dot}`} />
          <div>
            <div className={`text-3xl font-bold leading-none tracking-tight ${k.color}`}>
              {k.n}
            </div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mt-1">
              {k.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


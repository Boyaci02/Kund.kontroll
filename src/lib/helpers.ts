import type { Paket, Status } from "./types"

export function paketVariant(pkg: Paket): string {
  if (!pkg) return "secondary"
  const l = pkg.toLowerCase()
  if (l.includes("lilla")) return "lilla"
  if (l.includes("stora")) return "stora"
  if (l.includes("mellan")) return "mellan"
  if (l.includes("extra")) return "extra"
  if (l.includes("special")) return "special"
  return "secondary"
}

export function paketClass(pkg: Paket): string {
  if (!pkg) return "bg-muted text-muted-foreground"
  const l = pkg.toLowerCase()
  if (l.includes("lilla")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
  if (l.includes("stora")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
  if (l.includes("mellan")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
  if (l.includes("extra")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  if (l.includes("special")) return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
  return "bg-muted text-muted-foreground"
}

export function statusClass(st: Status): string {
  if (st === "AKTIV") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  if (st === "INAKTIV") return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
  return "bg-muted text-muted-foreground"
}

export function statusLabel(st: Status): string {
  if (st === "AKTIV") return "Aktiv"
  if (st === "INAKTIV") return "Inaktiv"
  return "Okänd"
}

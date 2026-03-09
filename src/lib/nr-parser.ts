export const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mars: 2, mar: 2, apr: 3, maj: 4,
  jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
}

// Parse the free-text `nr` field into Date[]
export function parseNrDates(nr: string, year: number): Date[] {
  if (!nr) return []
  const lower = nr.toLowerCase().trim()
  if (["?", "avvakta", "planera inspelning", ""].includes(lower)) return []

  const dates: Date[] = []
  const parts = nr.split("+").map((p) => p.trim())

  for (const part of parts) {
    const dayMonth = part.match(/^(\d{1,2})\s+(\w+)$/i)
    if (dayMonth) {
      const day = parseInt(dayMonth[1])
      const month = MONTH_MAP[dayMonth[2].toLowerCase()]
      if (month !== undefined && day >= 1 && day <= 31) {
        dates.push(new Date(year, month, day))
      }
      continue
    }

    const weekMatch = part.match(/^(\w+)\s+v\.?(\d)$/i)
    if (weekMatch) {
      const month = MONTH_MAP[weekMatch[1].toLowerCase()]
      const week = parseInt(weekMatch[2])
      if (month !== undefined && week >= 1 && week <= 5) {
        const startDay = (week - 1) * 7 + 1
        dates.push(new Date(year, month, startDay))
      }
    }
  }
  return dates
}

// June 2026 has exactly 30 days
export const JUNE_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = i + 1
  return `2026-06-${String(d).padStart(2, '0')}`
})

export const WEEKS = [
  { number: 1, start: '2026-06-01', end: '2026-06-07', label: 'Неделя 1', sublabel: '1–7 июня' },
  { number: 2, start: '2026-06-08', end: '2026-06-14', label: 'Неделя 2', sublabel: '8–14 июня' },
  { number: 3, start: '2026-06-15', end: '2026-06-21', label: 'Неделя 3', sublabel: '15–21 июня' },
  { number: 4, start: '2026-06-22', end: '2026-06-30', label: 'Неделя 4', sublabel: '22–30 июня' },
]

export function getWeekForDate(date: string): number {
  for (const w of WEEKS) {
    if (date >= w.start && date <= w.end) return w.number
  }
  return -1
}

export function getDatesForWeek(weekNumber: number): string[] {
  const w = WEEKS.find((w) => w.number === weekNumber)
  if (!w) return []
  return JUNE_DAYS.filter((d) => d >= w.start && d <= w.end)
}

export function formatDate(dateStr: string): string {
  const day = parseInt(dateStr.slice(8), 10)
  return String(day)
}

export function todayInJune(): string | null {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  if (year !== 2026 || month !== 6) return null
  const day = today.getDate()
  if (day < 1 || day > 30) return null
  return `2026-06-${String(day).padStart(2, '0')}`
}

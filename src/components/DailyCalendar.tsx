'use client'

import { JUNE_DAYS, formatDate } from '@/lib/june2026'
import type { TaskData, CompletionData } from '@/types'

interface Props {
  task: TaskData
  completions: CompletionData[]
  color: 'rose' | 'blue'
  onToggle: (taskId: string, date: string) => void
}

const colorMap = {
  rose: {
    active: 'bg-rose-400 text-white shadow-rose-200 shadow-md',
    hover: 'hover:bg-rose-100 hover:text-rose-700',
    heading: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-600',
    empty: 'bg-slate-100 text-slate-500',
  },
  blue: {
    active: 'bg-blue-400 text-white shadow-blue-200 shadow-md',
    hover: 'hover:bg-blue-100 hover:text-blue-700',
    heading: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-600',
    empty: 'bg-slate-100 text-slate-500',
  },
}

// June 1 2026 is a Monday
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function DailyCalendar({ task, completions, color, onToggle }: Props) {
  const c = colorMap[color]

  const completedDates = new Set(
    completions.filter((comp) => comp.taskId === task.id && comp.completed).map((comp) => comp.date)
  )

  const doneCount = completedDates.size

  // June 1, 2026 is Monday (day index 0)
  // Build 5 rows × 7 cols grid; first cell = June 1 (Monday = index 0)
  const totalCells = 35 // 5 weeks × 7 days; June has 30 days, so 5 trailing empty
  const cells: (string | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayIndex = i // 0 = June 1
    return dayIndex < 30 ? JUNE_DAYS[dayIndex] : null
  })

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${c.heading}`}>📅 {task.title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {doneCount} / 30 дней
        </span>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} />
          }
          const done = completedDates.has(date)
          return (
            <button
              key={date}
              onClick={() => onToggle(task.id, date)}
              className={`day-cell ${done ? c.active : `${c.empty} ${c.hover}`}`}
              title={date}
            >
              {formatDate(date)}
            </button>
          )
        })}
      </div>

      {/* Mini progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color === 'rose' ? 'bg-rose-400' : 'bg-blue-400'}`}
            style={{ width: `${(doneCount / 30) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 text-right">{Math.round((doneCount / 30) * 100)}%</p>
      </div>
    </div>
  )
}

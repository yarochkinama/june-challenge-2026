'use client'

import { WEEKS, getDatesForWeek, formatDate } from '@/lib/june2026'
import type { TaskData, CompletionData } from '@/types'

interface Props {
  tasks: TaskData[] // WEEKLY_COUNT tasks
  completions: CompletionData[]
  color: 'rose' | 'blue'
  onToggle: (taskId: string, date: string) => void
}

const colorMap = {
  rose: {
    active: 'bg-rose-400 text-white shadow-sm',
    hover: 'hover:bg-rose-100 hover:text-rose-700',
    heading: 'text-rose-600',
    badge: (ok: boolean) => (ok ? 'bg-rose-400 text-white' : 'bg-rose-100 text-rose-500'),
    empty: 'bg-slate-100 text-slate-400',
    bar: 'bg-rose-400',
  },
  blue: {
    active: 'bg-blue-400 text-white shadow-sm',
    hover: 'hover:bg-blue-100 hover:text-blue-700',
    heading: 'text-blue-600',
    badge: (ok: boolean) => (ok ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-500'),
    empty: 'bg-slate-100 text-slate-400',
    bar: 'bg-blue-400',
  },
}

export default function WeeklyTrainings({ tasks, completions, color, onToggle }: Props) {
  const c = colorMap[color]

  return (
    <div className="card p-4 space-y-4">
      <h3 className={`font-semibold ${c.heading}`}>🏃 Тренировки по неделям</h3>

      {WEEKS.map((week) => {
        const task = tasks.find((t) => t.weekNumber === week.number)
        if (!task) return null

        const weekDates = getDatesForWeek(week.number)
        const completedDates = new Set(
          completions.filter((comp) => comp.taskId === task.id && comp.completed).map((comp) => comp.date)
        )
        const doneCount = weekDates.filter((d) => completedDates.has(d)).length
        const isComplete = doneCount >= task.targetCount

        return (
          <div key={week.number} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-700">{week.label}</span>
                <span className="text-xs text-slate-400 ml-2">{week.sublabel}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge(isComplete)}`}>
                {doneCount} / {task.targetCount}
                {isComplete && ' ✓'}
              </span>
            </div>

            {/* Mini progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                style={{ width: `${Math.min(100, (doneCount / task.targetCount) * 100)}%` }}
              />
            </div>

            {/* Day chips */}
            <div className="flex flex-wrap gap-1.5">
              {weekDates.map((date) => {
                const done = completedDates.has(date)
                return (
                  <button
                    key={date}
                    onClick={() => onToggle(task.id, date)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center
                      ${done ? c.active : `${c.empty} ${c.hover}`}`}
                    title={date}
                  >
                    {formatDate(date)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

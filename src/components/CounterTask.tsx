'use client'

import { JUNE_DAYS, formatDate } from '@/lib/june2026'
import type { TaskData, CompletionData } from '@/types'

interface Props {
  task: TaskData
  completions: CompletionData[]
  color: 'rose' | 'blue'
  emoji: string
  onToggle: (taskId: string, date: string) => void
}

const colorMap = {
  rose: {
    active: 'bg-rose-400 text-white',
    hover: 'hover:bg-rose-100 hover:text-rose-700',
    heading: 'text-rose-600',
    badge: (ok: boolean) => (ok ? 'bg-rose-400 text-white' : 'bg-rose-100 text-rose-500'),
    empty: 'bg-slate-100 text-slate-400',
  },
  blue: {
    active: 'bg-blue-400 text-white',
    hover: 'hover:bg-blue-100 hover:text-blue-700',
    heading: 'text-blue-600',
    badge: (ok: boolean) => (ok ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-500'),
    empty: 'bg-slate-100 text-slate-400',
  },
}

export default function CounterTask({ task, completions, color, emoji, onToggle }: Props) {
  const c = colorMap[color]

  const completedDates = new Set(
    completions.filter((comp) => comp.taskId === task.id && comp.completed).map((comp) => comp.date)
  )
  const doneCount = completedDates.size
  const isComplete = doneCount >= task.targetCount

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold flex items-center gap-2 ${c.heading}`}>
          <span>{emoji}</span> {task.title}
        </h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge(isComplete)}`}>
          {doneCount} / {task.targetCount}
          {isComplete && ' ✓'}
        </span>
      </div>
      <p className="text-xs text-slate-400">Отметь дни, в которые было событие:</p>
      <div className="flex flex-wrap gap-1.5">
        {JUNE_DAYS.map((date) => {
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
}

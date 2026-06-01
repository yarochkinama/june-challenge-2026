'use client'

import type { TaskData, CompletionData } from '@/types'

interface Props {
  title: string
  emoji: string
  tasks: TaskData[]
  completions: CompletionData[]
  color: 'rose' | 'blue'
  onToggle: (taskId: string, date?: string) => void
}

const colorMap = {
  rose: {
    checked: 'bg-rose-400 border-rose-400 text-white',
    unchecked: 'border-slate-300 hover:border-rose-300',
    heading: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-600',
  },
  blue: {
    checked: 'bg-blue-400 border-blue-400 text-white',
    unchecked: 'border-slate-300 hover:border-blue-300',
    heading: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-600',
  },
}

export default function OneTimeTasks({ title, emoji, tasks, completions, color, onToggle }: Props) {
  const c = colorMap[color]
  const completedCount = tasks.filter((t) =>
    completions.some((comp) => comp.taskId === t.id && comp.completed)
  ).length

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold flex items-center gap-2 ${c.heading}`}>
          <span>{emoji}</span> {title}
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {completedCount} / {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const done = completions.some((comp) => comp.taskId === task.id && comp.completed)
          return (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left
                ${done ? 'bg-slate-50 border-transparent' : 'bg-white border-slate-100 hover:border-slate-200'}`}
            >
              <span
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200
                  ${done ? c.checked : c.unchecked}`}
              >
                {done && (
                  <svg className="w-3 h-3" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {task.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

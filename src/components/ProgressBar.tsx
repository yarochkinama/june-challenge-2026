'use client'

interface Props {
  percent: number
  color: 'rose' | 'blue'
  label?: string
}

const colorMap = {
  rose: 'bg-rose-400',
  blue: 'bg-blue-400',
}

export default function ProgressBar({ percent, color, label }: Props) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-slate-500">{label}</p>}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorMap[color]}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}

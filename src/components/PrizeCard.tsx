'use client'

interface Props {
  prizeTitle: string
  prizeEmoji: string
  color: 'rose' | 'blue'
  isPlanComplete: boolean
}

const colorMap = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', emoji: 'bg-rose-100', text: 'text-rose-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', emoji: 'bg-blue-100', text: 'text-blue-700' },
}

export default function PrizeCard({ prizeTitle, prizeEmoji, color, isPlanComplete }: Props) {
  const c = colorMap[color]
  return (
    <div
      className={`${c.bg} border ${c.border} rounded-2xl p-4 flex items-center gap-4 ${isPlanComplete ? 'ring-2 ring-yellow-400' : ''}`}
    >
      <div className={`${c.emoji} rounded-xl p-3 text-2xl flex-shrink-0`}>{prizeEmoji}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Супер-приз</p>
        <p className={`font-semibold ${c.text} leading-tight mt-0.5`}>{prizeTitle}</p>
        {isPlanComplete && (
          <p className="text-xs text-yellow-600 font-semibold mt-1 animate-bounce-in">✨ Заслужен!</p>
        )}
      </div>
    </div>
  )
}

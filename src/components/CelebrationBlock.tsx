'use client'

interface Props {
  name: string
  prizeTitle: string
  prizeEmoji: string
  isVanya: boolean
}

export default function CelebrationBlock({ prizeTitle, prizeEmoji, isVanya }: Props) {
  return (
    <div className="card p-6 text-center bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 animate-scale-in">
      <div className="text-5xl mb-3">{isVanya ? '⚽' : '🐠'}</div>
      <h2 className="text-2xl font-bold text-amber-700 mb-1">
        {isVanya ? 'Барса ждёт!' : 'Египет зовёт!'}
      </h2>
      <p className="text-amber-600 font-medium">
        {isVanya ? 'Plan выполнен — билет на матч «Барселоны» заслужен ⚽' : `План выполнен — ${prizeTitle} заслужен ${prizeEmoji}`}
      </p>
      <div className="mt-4 flex justify-center gap-2 text-2xl">
        {['🎉', '🥳', '🎊', '✨', '🏆'].map((e, i) => (
          <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}

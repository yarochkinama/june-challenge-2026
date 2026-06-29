'use client'

import type { ProfileData } from '@/types'
import { computeProgress } from './progress'
import PrizeCard from './PrizeCard'
import ProgressBar from './ProgressBar'
import OneTimeTasks from './OneTimeTasks'
import DailyCalendar from './DailyCalendar'
import WeeklyTrainings from './WeeklyTrainings'
import CounterTask from './CounterTask'
import WeightTracker from './WeightTracker'
import CelebrationBlock from './CelebrationBlock'

interface Props {
  profile: ProfileData
  onToggle: (taskId: string, date?: string) => void
  onWeightSave: (profileId: string, date: string, weight: number) => Promise<void>
  onWeightDelete: (profileId: string, date: string) => Promise<void>
}

export default function UserDashboard({ profile, onToggle, onWeightSave, onWeightDelete }: Props) {
  const color = profile.colorScheme === 'rose' ? 'rose' : 'blue'
  const progress = computeProgress(profile)
  const isVanya = profile.slug === 'vanya'
  const isMasha = profile.slug === 'masha'

  const tasksByCategory = (category: string) => profile.tasks.filter((t) => t.category === category)

  const statusLabel =
    progress.percent >= 100
      ? '🏆 План выполнен!'
      : progress.percent >= 66
      ? '🔥 Почти выполнено'
      : progress.percent >= 33
      ? '⚡ В процессе'
      : '🌱 Только начало'

  return (
    <div className="space-y-4">
      {/* Progress overview */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{profile.name}</h2>
          <span className="text-sm font-medium text-slate-500">{statusLabel}</span>
        </div>
        <ProgressBar percent={progress.percent} color={color} label={`${progress.completedItems} из ${progress.totalItems} целей выполнено`} />
        <p className="text-xs text-slate-400 text-right font-semibold">{progress.percent}% плана</p>
      </div>

      {/* Prize card */}
      <PrizeCard
        prizeTitle={profile.prizeTitle}
        prizeEmoji={profile.prizeEmoji}
        color={color}
        isPlanComplete={progress.isPlanComplete}
      />

      {/* Celebration */}
      {progress.isPlanComplete && (
        <CelebrationBlock
          name={profile.name}
          prizeTitle={profile.prizeTitle}
          prizeEmoji={profile.prizeEmoji}
          isVanya={isVanya}
        />
      )}

      {/* ─── Masha sections ─── */}
      {isMasha && (
        <>
          <WeightTracker
            checkpointTasks={tasksByCategory('Вес')}
            weightEntries={profile.weightEntries}
            profileId={profile.id}
            onWeightSave={onWeightSave}
            onWeightDelete={onWeightDelete}
          />
          <OneTimeTasks
            title="Стартап"
            emoji="🚀"
            tasks={tasksByCategory('Стартап')}
            completions={profile.completions}
            color={color}
            onToggle={onToggle}
          />
        </>
      )}

      {/* ─── Vanya sections ─── */}
      {isVanya && (
        <>
          <OneTimeTasks
            title="Сдача на права"
            emoji="🚗"
            tasks={tasksByCategory('Права')}
            completions={profile.completions}
            color={color}
            onToggle={onToggle}
          />
          {tasksByCategory('Футбол').map((task) => (
            <CounterTask
              key={task.id}
              task={task}
              completions={profile.completions}
              color={color}
              emoji="⚽"
              onToggle={onToggle}
            />
          ))}
          <OneTimeTasks
            title="Стоматолог"
            emoji="🦷"
            tasks={tasksByCategory('Стоматолог')}
            completions={profile.completions}
            color={color}
            onToggle={onToggle}
          />
        </>
      )}

      {/* Weekly trainings — both users */}
      <WeeklyTrainings
        tasks={tasksByCategory('Тренировки')}
        completions={profile.completions}
        color={color}
        onToggle={onToggle}
      />

      {/* Daily habit — both users */}
      {tasksByCategory('Гигиена').map((task) => (
        <DailyCalendar
          key={task.id}
          task={task}
          completions={profile.completions}
          color={color}
          onToggle={onToggle}
        />
      ))}

    </div>
  )
}

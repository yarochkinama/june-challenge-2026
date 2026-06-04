import type { ProfileData, ProfileProgress } from '@/types'
import { getDatesForWeek } from '@/lib/june2026'

function getCompletedDates(completions: ProfileData['completions'], taskId: string): string[] {
  return completions
    .filter((c) => c.taskId === taskId && c.completed && c.date !== 'none')
    .map((c) => c.date)
}

function isOneTimeComplete(completions: ProfileData['completions'], taskId: string): boolean {
  return completions.some((c) => c.taskId === taskId && c.completed)
}

export function computeProgress(profile: ProfileData): ProfileProgress {
  const { tasks, completions, weightEntries } = profile

  const minWeight = weightEntries.length > 0 ? Math.min(...weightEntries.map((w) => w.weight)) : Infinity

  // Fractional score: each item contributes 0.0–1.0
  let completedScore = 0
  let totalItems = 0

  // ── Weekly trainings: each week = 1 item, partial credit ──
  const weeklyTasks = tasks.filter((t) => t.type === 'WEEKLY_COUNT')
  const weekNumbers = Array.from(new Set(weeklyTasks.map((t) => t.weekNumber!)))
  weekNumbers.sort()

  for (const wn of weekNumbers) {
    const task = weeklyTasks.find((t) => t.weekNumber === wn)!
    const weekDates = getDatesForWeek(wn)
    const done = getCompletedDates(completions, task.id).filter((d) => weekDates.includes(d)).length
    totalItems++
    completedScore += Math.min(1, done / task.targetCount)
  }

  // ── All other tasks ──
  for (const task of tasks) {
    if (task.type === 'WEEKLY_COUNT') continue

    if (task.type === 'ONE_TIME') {
      totalItems++
      if (isOneTimeComplete(completions, task.id)) completedScore++

    } else if (task.type === 'DAILY') {
      totalItems++
      const done = getCompletedDates(completions, task.id).length
      completedScore += Math.min(1, done / task.targetCount)

    } else if (task.type === 'COUNTER') {
      totalItems++
      const done = getCompletedDates(completions, task.id).length
      completedScore += Math.min(1, done / task.targetCount)

    } else if (task.type === 'WEIGHT_CHECKPOINT') {
      totalItems++
      if (task.thresholdValue != null && minWeight < task.thresholdValue) completedScore++
    }
  }

  const percent = totalItems > 0 ? Math.round((completedScore / totalItems) * 100) : 0

  // Plan is complete only when every item is fully done (score == totalItems)
  const isPlanComplete = totalItems > 0 && Math.abs(completedScore - totalItems) < 0.001

  return {
    completedItems: Math.round(completedScore),
    totalItems,
    percent,
    isPlanComplete,
  }
}

export function isWeightCheckpointMet(threshold: number, weightEntries: ProfileData['weightEntries']): boolean {
  if (weightEntries.length === 0) return false
  return Math.min(...weightEntries.map((w) => w.weight)) < threshold
}

export function countMetWeightCheckpoints(
  tasks: ProfileData['tasks'],
  weightEntries: ProfileData['weightEntries']
): { met: number; total: number } {
  const checkpoints = tasks.filter((t) => t.type === 'WEIGHT_CHECKPOINT')
  const met = checkpoints.filter(
    (t) => t.thresholdValue != null && isWeightCheckpointMet(t.thresholdValue, weightEntries)
  ).length
  return { met, total: checkpoints.length }
}

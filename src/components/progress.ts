import type { ProfileData, ProfileProgress } from '@/types'
import { WEEKS, getDatesForWeek } from '@/lib/june2026'

function getCompletedDates(completions: ProfileData['completions'], taskId: string): string[] {
  return completions.filter((c) => c.taskId === taskId && c.completed && c.date !== 'none').map((c) => c.date)
}

function isOneTimeComplete(completions: ProfileData['completions'], taskId: string): boolean {
  return completions.some((c) => c.taskId === taskId && c.completed)
}

export function computeProgress(profile: ProfileData): ProfileProgress {
  const { tasks, completions, weightEntries } = profile

  const minWeight = weightEntries.length > 0 ? Math.min(...weightEntries.map((w) => w.weight)) : Infinity

  let completedItems = 0
  let totalItems = 0

  // Weekly training: one item per week that is "complete"
  const weeklyTasks = tasks.filter((t) => t.type === 'WEEKLY_COUNT')
  const weekNumbers = Array.from(new Set(weeklyTasks.map((t) => t.weekNumber!)))
  weekNumbers.sort()

  for (const wn of weekNumbers) {
    const task = weeklyTasks.find((t) => t.weekNumber === wn)!
    const weekDates = getDatesForWeek(wn)
    const done = getCompletedDates(completions, task.id).filter((d) => weekDates.includes(d)).length
    totalItems++
    if (done >= task.targetCount) completedItems++
  }

  for (const task of tasks) {
    if (task.type === 'WEEKLY_COUNT') continue // handled above

    if (task.type === 'ONE_TIME') {
      totalItems++
      if (isOneTimeComplete(completions, task.id)) completedItems++
    } else if (task.type === 'DAILY') {
      totalItems++
      const done = getCompletedDates(completions, task.id).length
      if (done >= task.targetCount) completedItems++
    } else if (task.type === 'COUNTER') {
      totalItems++
      const done = getCompletedDates(completions, task.id).length
      if (done >= task.targetCount) completedItems++
    } else if (task.type === 'WEIGHT_CHECKPOINT') {
      totalItems++
      if (task.thresholdValue != null && minWeight < task.thresholdValue) completedItems++
    }
  }

  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const isPlanComplete = totalItems > 0 && completedItems === totalItems

  return { completedItems, totalItems, percent, isPlanComplete }
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

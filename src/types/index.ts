export type TaskType = 'ONE_TIME' | 'DAILY' | 'WEEKLY_COUNT' | 'COUNTER' | 'WEIGHT_CHECKPOINT'

export interface TaskData {
  id: string
  title: string
  category: string
  type: TaskType
  targetCount: number
  weekNumber: number | null
  thresholdValue: number | null
  order: number
}

export interface CompletionData {
  id: string
  taskId: string
  date: string
  completed: boolean
}

export interface WeightEntryData {
  id: string
  date: string
  weight: number
}

export interface ProfileData {
  id: string
  slug: string
  name: string
  prizeTitle: string
  prizeEmoji: string
  colorScheme: string
  tasks: TaskData[]
  completions: CompletionData[]
  weightEntries: WeightEntryData[]
}

export interface AppData {
  profiles: ProfileData[]
}

// Computed progress for a profile
export interface ProfileProgress {
  completedItems: number
  totalItems: number
  percent: number
  isPlanComplete: boolean
}

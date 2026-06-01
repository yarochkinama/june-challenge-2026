'use client'

import { useState } from 'react'
import { JUNE_DAYS, formatDate } from '@/lib/june2026'
import type { TaskData, WeightEntryData } from '@/types'
import { isWeightCheckpointMet } from './progress'

interface Props {
  checkpointTasks: TaskData[]
  weightEntries: WeightEntryData[]
  profileId: string
  onWeightSave: (profileId: string, date: string, weight: number) => Promise<void>
  onWeightDelete: (profileId: string, date: string) => Promise<void>
}

export default function WeightTracker({
  checkpointTasks,
  weightEntries,
  profileId,
  onWeightSave,
  onWeightDelete,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)

  const weightMap = Object.fromEntries(weightEntries.map((w) => [w.date, w.weight]))
  const metCheckpoints = checkpointTasks.filter(
    (t) => t.thresholdValue != null && isWeightCheckpointMet(t.thresholdValue, weightEntries)
  ).length

  const minWeight = weightEntries.length > 0 ? Math.min(...weightEntries.map((w) => w.weight)) : null

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setInputValue(weightMap[date] != null ? String(weightMap[date]) : '')
  }

  const handleSave = async () => {
    if (!selectedDate || !inputValue) return
    const w = parseFloat(inputValue.replace(',', '.'))
    if (isNaN(w) || w < 30 || w > 200) return
    setSaving(true)
    await onWeightSave(profileId, selectedDate, w)
    setSaving(false)
    setSelectedDate(null)
  }

  const handleDelete = async () => {
    if (!selectedDate) return
    setSaving(true)
    await onWeightDelete(profileId, selectedDate)
    setSaving(false)
    setSelectedDate(null)
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-rose-600">⚖️ Прогресс по весу</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-500">
          {metCheckpoints} / {checkpointTasks.length} чекпоинта
        </span>
      </div>

      {/* Current best weight */}
      <div className="flex items-center gap-4 p-3 bg-rose-50 rounded-xl">
        <div>
          <p className="text-xs text-slate-400">Стартовый вес</p>
          <p className="font-bold text-slate-700">63.5 кг</p>
        </div>
        <div className="text-rose-300">→</div>
        <div>
          <p className="text-xs text-slate-400">Лучший результат</p>
          <p className="font-bold text-rose-600">{minWeight != null ? `${minWeight} кг` : '—'}</p>
        </div>
        <div className="text-rose-300">→</div>
        <div>
          <p className="text-xs text-slate-400">Цель</p>
          <p className="font-bold text-slate-700">&lt; 62 кг</p>
        </div>
      </div>

      {/* Checkpoints */}
      <div className="space-y-2">
        {checkpointTasks.map((task) => {
          const met = task.thresholdValue != null && isWeightCheckpointMet(task.thresholdValue, weightEntries)
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                met ? 'bg-rose-50' : 'bg-slate-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs
                  ${met ? 'bg-rose-400 border-rose-400 text-white' : 'border-slate-300'}`}
              >
                {met && '✓'}
              </span>
              <span className={`text-sm font-medium ${met ? 'text-rose-600' : 'text-slate-500'}`}>
                {task.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Day picker for weight entry */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Выбери дату и введи вес:</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {JUNE_DAYS.map((date) => {
            const hasWeight = weightMap[date] != null
            const isSelected = selectedDate === date
            return (
              <button
                key={date}
                onClick={() => handleDayClick(date)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center relative
                  ${isSelected ? 'bg-rose-500 text-white ring-2 ring-rose-300' :
                    hasWeight ? 'bg-rose-300 text-white' : 'bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700'}`}
                title={hasWeight ? `${date}: ${weightMap[date]} кг` : date}
              >
                {formatDate(date)}
                {hasWeight && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-slate-500 flex-shrink-0">
              {parseInt(selectedDate.slice(8), 10)} июня:
            </span>
            <input
              type="number"
              step="0.1"
              min="30"
              max="200"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="кг"
              className="w-24 border border-rose-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !inputValue}
              className="bg-rose-400 text-white px-3 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-rose-500 transition-colors"
            >
              {saving ? '...' : 'Сохранить'}
            </button>
            {weightMap[selectedDate] != null && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="text-slate-400 hover:text-red-400 transition-colors text-sm"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setSelectedDate(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm ml-auto"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

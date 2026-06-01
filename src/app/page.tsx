'use client'

import { useEffect, useState, useCallback } from 'react'
import type { AppData, ProfileData } from '@/types'
import UserDashboard from '@/components/UserDashboard'

type TabSlug = 'masha' | 'vanya'

export default function HomePage() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabSlug>('masha')
  const [resetting, setResetting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data')
      if (!res.ok) throw new Error('Ошибка загрузки данных')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Optimistic toggle completion
  const handleToggle = useCallback(
    async (taskId: string, date?: string) => {
      if (!data) return

      // Optimistic update
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          profiles: prev.profiles.map((profile) => {
            const task = profile.tasks.find((t) => t.id === taskId)
            if (!task) return profile

            const key = date ?? 'none'
            const existing = profile.completions.find((c) => c.taskId === taskId && c.date === key)

            let completions
            if (existing) {
              completions = profile.completions.map((c) =>
                c.taskId === taskId && c.date === key ? { ...c, completed: !c.completed } : c
              )
            } else {
              completions = [
                ...profile.completions,
                { id: `tmp-${Date.now()}`, taskId, date: key, completed: true },
              ]
            }

            return { ...profile, completions }
          }),
        }
      })

      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, date }),
        })
        if (!res.ok) throw new Error('Failed')
      } catch {
        // Revert on error
        fetchData()
      }
    },
    [data, fetchData]
  )

  const handleWeightSave = useCallback(
    async (profileId: string, date: string, weight: number) => {
      // Optimistic update
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          profiles: prev.profiles.map((p) => {
            if (p.id !== profileId) return p
            const existing = p.weightEntries.find((w) => w.date === date)
            const weightEntries = existing
              ? p.weightEntries.map((w) => (w.date === date ? { ...w, weight } : w))
              : [...p.weightEntries, { id: `tmp-${Date.now()}`, date, weight }]
            return { ...p, weightEntries }
          }),
        }
      })

      try {
        const res = await fetch('/api/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, date, weight }),
        })
        if (!res.ok) throw new Error('Failed')
        await fetchData()
      } catch {
        fetchData()
      }
    },
    [fetchData]
  )

  const handleWeightDelete = useCallback(
    async (profileId: string, date: string) => {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          profiles: prev.profiles.map((p) =>
            p.id !== profileId ? p : { ...p, weightEntries: p.weightEntries.filter((w) => w.date !== date) }
          ),
        }
      })

      try {
        await fetch('/api/weight', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, date }),
        })
      } catch {
        fetchData()
      }
    },
    [fetchData]
  )

  const handleReset = async () => {
    if (!confirm('Сбросить все данные? Это нельзя отменить.')) return
    setResetting(true)
    await fetch('/api/reset', { method: 'POST' })
    await fetchData()
    setResetting(false)
  }

  const activeProfile: ProfileData | undefined = data?.profiles.find((p) => p.slug === activeTab)

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold text-slate-800">Июньский челлендж ☀️</h1>
            <p className="text-xs text-slate-400">1–30 июня 2026</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
            {(['masha', 'vanya'] as TabSlug[]).map((slug) => {
              const profile = data?.profiles.find((p) => p.slug === slug)
              const name = profile?.name ?? (slug === 'masha' ? 'Машуня' : 'Ванюша')
              const emoji = slug === 'masha' ? '🐠' : '⚽'
              const isActive = activeTab === slug
              const activeClass =
                slug === 'masha'
                  ? 'bg-rose-400 text-white shadow-sm'
                  : 'bg-blue-400 text-white shadow-sm'

              return (
                <button
                  key={slug}
                  onClick={() => setActiveTab(slug)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive ? activeClass : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {emoji} {name}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Загружаем данные…</p>
          </div>
        )}

        {error && !loading && (
          <div className="card p-6 text-center space-y-3">
            <p className="text-2xl">😕</p>
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && activeProfile && (
          <UserDashboard
            profile={activeProfile}
            onToggle={handleToggle}
            onWeightSave={handleWeightSave}
            onWeightDelete={handleWeightDelete}
          />
        )}

        {!loading && !error && !activeProfile && (
          <div className="card p-6 text-center space-y-3">
            <p className="text-2xl">🌱</p>
            <p className="text-slate-600 font-medium">Данные не найдены</p>
            <p className="text-slate-400 text-sm">Запусти seed-скрипт: <code className="bg-slate-100 px-1.5 py-0.5 rounded">npm run db:seed</code></p>
          </div>
        )}

        {/* Dev-only reset button */}
        {process.env.NODE_ENV !== 'production' && !loading && data && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center mb-2">Dev-режим</p>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-2 px-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-sm hover:border-red-300 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {resetting ? 'Сброс…' : '🗑 Сбросить тестовые данные'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────
interface Account {
  id: string
  name: string
  icon: string
  type: 'savings' | 'debt' | 'investment' | 'goal'
  balance: number
  note: string
}

interface Tx {
  id: string
  date: string
  amount: number
  accountId: string
  comment: string
}

interface FinanceData {
  accounts: Account[]
  txs: Tx[]
}

// ── Defaults ───────────────────────────────────────────────
const DEFAULT_DATA: FinanceData = {
  accounts: [
    { id: 'main',    name: 'Основной',   icon: '💜', type: 'savings',    balance: 0, note: '' },
    { id: 'savings', name: 'Накопления', icon: '🏦', type: 'savings',    balance: 0, note: '' },
    { id: 'invest',  name: 'Инвестиции', icon: '📈', type: 'investment', balance: 0, note: '' },
    { id: 'goal',    name: 'Цель',       icon: '🎯', type: 'goal',       balance: 0, note: '' },
  ],
  txs: [],
}

const LOCAL_KEY = 'finances_masha_v1'
const PWD_KEY   = 'finances_masha_pwd'

// ── Utils ──────────────────────────────────────────────────
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const rub = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽'

const dateRu = (iso: string) =>
  new Date(iso + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

const COLOR: Record<string, string> = {
  debt: 'text-red-500',
  savings: 'text-emerald-500',
  investment: 'text-blue-500',
  goal: 'text-purple-500',
}

// ══════════════════════════════════════════════════════════
export default function FinancesSection() {
  // lock states: 'locked' | 'entering' | 'unlocked'
  const [lockState, setLockState] = useState<'locked' | 'entering' | 'unlocked'>('locked')
  const [pwdInput,  setPwdInput]  = useState('')
  const [pwdError,  setPwdError]  = useState('')
  const [isFirstPwd, setIsFirstPwd] = useState(false)

  const [data,      setData]      = useState<FinanceData>(DEFAULT_DATA)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [syncState, setSyncState] = useState<'ok' | 'syncing' | 'error'>('ok')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showTxModal,  setShowTxModal]  = useState(false)
  const [selAccId,     setSelAccId]     = useState<string | null>(null)
  const [selSign,      setSelSign]      = useState<1 | -1>(1)
  const [txAmt,        setTxAmt]        = useState('')
  const [txComment,    setTxComment]    = useState('')
  const [txDate,       setTxDate]       = useState('')

  // ── Load local on mount ──
  useEffect(() => {
    setIsFirstPwd(!localStorage.getItem(PWD_KEY))
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  // ── Sync from API after unlock ──
  const syncFromAPI = useCallback(async () => {
    if (apiLoaded) return
    setSyncState('syncing')
    try {
      const res = await fetch('/api/finances?id=masha')
      const { data: raw } = await res.json()
      if (raw) {
        const parsed: FinanceData = JSON.parse(raw)
        setData(parsed)
        localStorage.setItem(LOCAL_KEY, raw)
      }
      setApiLoaded(true)
      setSyncState('ok')
    } catch {
      setApiLoaded(true)
      setSyncState('error')
    }
  }, [apiLoaded])

  // ── Save to API (debounced) ──
  const saveToAPI = useCallback((d: FinanceData) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(d))
    setSyncState('syncing')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/finances', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'masha', data: JSON.stringify(d) }),
        })
        if (!res.ok) throw new Error()
        setSyncState('ok')
      } catch {
        setSyncState('error')
      }
    }, 1200)
  }, [])

  // ── Password check ──
  const checkPwd = async () => {
    if (!pwdInput.trim()) return
    const stored = localStorage.getItem(PWD_KEY)
    const hash   = await sha256(pwdInput)

    if (!stored) {
      if (pwdInput.length < 3) { setPwdError('Минимум 3 символа'); return }
      localStorage.setItem(PWD_KEY, hash)
      setLockState('unlocked')
      syncFromAPI()
    } else if (hash === stored) {
      setPwdError('')
      setLockState('unlocked')
      syncFromAPI()
    } else {
      setPwdError('Неверный пароль ❌')
      setPwdInput('')
    }
  }

  // ── Mutation helpers ──
  const mutate = (fn: (d: FinanceData) => FinanceData) => {
    setData(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)))
      saveToAPI(next)
      return next
    })
  }

  const addTx = () => {
    if (!selAccId) return
    const raw = parseFloat(txAmt)
    if (!raw || raw <= 0) return
    const amount = raw * selSign
    const acc = data.accounts.find(a => a.id === selAccId)!
    mutate(d => {
      const a = d.accounts.find(x => x.id === selAccId)!
      if (a.type === 'debt') a.balance = Math.max(0, a.balance - amount)
      else a.balance = Math.max(0, a.balance + amount)
      d.txs.push({ id: String(Date.now()), date: txDate || new Date().toISOString().slice(0, 10), amount, accountId: selAccId, comment: txComment.trim() })
      return d
    })
    setShowTxModal(false)
    setTxAmt(''); setTxComment(''); setSelAccId(null); setSelSign(1)
  }

  const delTx = (id: string) => {
    if (!confirm('Удалить операцию?')) return
    mutate(d => {
      const tx = d.txs.find(t => t.id === id)
      if (tx) {
        const a = d.accounts.find(x => x.id === tx.accountId)
        if (a) {
          if (a.type === 'debt') a.balance = Math.max(0, a.balance + tx.amount)
          else a.balance = Math.max(0, a.balance - tx.amount)
        }
      }
      d.txs = d.txs.filter(t => t.id !== id)
      return d
    })
  }

  const openTxModal = (accId?: string) => {
    setSelAccId(accId ?? null)
    setSelSign(1)
    setTxAmt('')
    setTxComment('')
    setTxDate(new Date().toISOString().slice(0, 10))
    setShowTxModal(true)
  }

  // ── Computed ──
  const assets = data.accounts.filter(a => a.type !== 'debt').reduce((s, a) => s + a.balance, 0)
  const debts  = data.accounts.filter(a => a.type === 'debt').reduce((s, a) => s + a.balance, 0)
  const nw     = assets - debts

  const recentTxs = [...data.txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)

  // ══════════════════════════════════════════════════════
  // LOCKED / ENTERING PASSWORD STATE
  // ══════════════════════════════════════════════════════
  if (lockState !== 'unlocked') {
    return (
      <div className="card overflow-hidden">
        {/* Header — always visible */}
        <button
          onClick={() => setLockState(s => s === 'locked' ? 'entering' : 'locked')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-semibold text-purple-600 flex items-center gap-2">
            💜 Финансы Маши
          </span>
          <span className="text-slate-400 text-sm">
            {lockState === 'entering' ? '✕' : '🔒 Открыть'}
          </span>
        </button>

        {/* Password entry — slides in */}
        {lockState === 'entering' && (
          <div className="px-4 pb-4 space-y-3 animate-fade-in">
            <p className="text-sm text-slate-400">
              {isFirstPwd ? 'Первый вход — придумай пароль' : 'Введи пароль'}
            </p>
            <input
              type="password"
              value={pwdInput}
              onChange={e => { setPwdInput(e.target.value); setPwdError('') }}
              onKeyDown={e => e.key === 'Enter' && checkPwd()}
              placeholder="Пароль"
              autoFocus
              className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"
            />
            {pwdError && <p className="text-red-400 text-xs">{pwdError}</p>}
            <button
              onClick={checkPwd}
              className="w-full bg-purple-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-600 transition-colors"
            >
              {isFirstPwd ? 'Установить пароль' : 'Войти'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // UNLOCKED STATE
  // ══════════════════════════════════════════════════════
  return (
    <>
      <div className="space-y-3">
        {/* Header with sync badge */}
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-purple-600">💜 Финансы Маши</h3>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs ${syncState === 'error' ? 'text-red-400' : syncState === 'syncing' ? 'text-amber-400' : 'text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncState === 'syncing' ? 'bg-amber-400 animate-pulse' : syncState === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {syncState === 'syncing' ? 'Сохранение…' : syncState === 'error' ? 'Нет сети' : '☁️ Синк'}
            </span>
            <button
              onClick={() => setLockState('locked')}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              🔒
            </button>
          </div>
        </div>

        {/* Net worth card */}
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(145deg, #BF5AF2 0%, #9B35D1 100%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Итого</p>
          <p className="text-3xl font-bold tracking-tight">
            {(nw >= 0 ? '+' : '−') + rub(Math.abs(nw))}
          </p>
          <p className="text-xs opacity-60 mt-1">
            активы {rub(assets)}{debts > 0 ? ` · долги ${rub(debts)}` : ''}
          </p>
        </div>

        {/* Accounts grid */}
        <div className="grid grid-cols-2 gap-2">
          {data.accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => openTxModal(acc.id)}
              className="card p-3 text-left hover:shadow-md transition-shadow active:scale-95"
            >
              <span className="text-2xl block mb-2">{acc.icon}</span>
              <p className="text-xs text-slate-400 mb-0.5">{acc.name}</p>
              <p className={`text-base font-bold ${COLOR[acc.type] || ''}`}>
                {acc.type === 'debt' ? '−' : ''}{rub(acc.balance)}
              </p>
              {acc.note && <p className="text-xs text-slate-300 mt-0.5 truncate">{acc.note}</p>}
            </button>
          ))}
        </div>

        {/* Add transaction button */}
        <button
          onClick={() => openTxModal()}
          className="w-full py-3.5 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 active:scale-98 transition-all"
        >
          + Записать операцию
        </button>

        {/* Transactions list */}
        <div className="card overflow-hidden">
          {recentTxs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">Операций пока нет</p>
            </div>
          ) : (
            recentTxs.map(tx => {
              const acc = data.accounts.find(a => a.id === tx.accountId)
              const isIn = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isIn ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {acc?.icon ?? '💫'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.comment || acc?.name || 'Операция'}</p>
                    <p className="text-xs text-slate-400">{acc?.name} · {dateRu(tx.date)}</p>
                  </div>
                  <p className={`text-sm font-semibold whitespace-nowrap ${isIn ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isIn ? '+' : '−'}{rub(Math.abs(tx.amount))}
                  </p>
                  <button
                    onClick={() => delTx(tx.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-xs px-1.5 py-1 rounded-lg hover:bg-red-50 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Transaction Modal ─────────────────────────────── */}
      {showTxModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          style={{ backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowTxModal(false) }}
        >
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4 animate-fade-in">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold">💜 Новая операция</h3>

            {/* Account picker */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Счёт</p>
              <div className="grid grid-cols-2 gap-2">
                {data.accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelAccId(acc.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selAccId === acc.id ? 'border-purple-400 bg-purple-50' : 'border-slate-100'
                    }`}
                  >
                    <span className="text-lg block mb-1">{acc.icon}</span>
                    <span className="text-xs text-slate-500 block">{acc.name}</span>
                    <span className={`text-sm font-semibold ${COLOR[acc.type] || ''}`}>
                      {acc.type === 'debt' ? '−' : ''}{rub(acc.balance)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sign */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Направление</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelSign(1)}
                  className={`flex-1 py-3 rounded-xl border-2 text-lg font-bold transition-all ${
                    selSign === 1 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-100'
                  }`}
                >+</button>
                <button
                  onClick={() => setSelSign(-1)}
                  className={`flex-1 py-3 rounded-xl border-2 text-lg font-bold transition-all ${
                    selSign === -1 ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-100'
                  }`}
                >−</button>
              </div>
              {selAccId && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {(() => {
                    const a = data.accounts.find(x => x.id === selAccId)
                    if (!a) return ''
                    return a.type === 'debt'
                      ? (selSign === 1 ? '✅ Оплата — долг уменьшится' : '⬆️ Трата — долг вырастет')
                      : (selSign === 1 ? '✅ Пополнение счёта' : '⬇️ Списание со счёта')
                  })()}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Сумма</p>
              <input
                type="number"
                value={txAmt}
                onChange={e => setTxAmt(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                autoFocus
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Comment */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Комментарий</p>
              <input
                type="text"
                value={txComment}
                onChange={e => setTxComment(e.target.value)}
                placeholder="Зарплата, кафе, перевод…"
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Дата</p>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            <button
              onClick={addTx}
              disabled={!selAccId || !txAmt}
              className="w-full py-4 rounded-xl bg-purple-500 text-white font-semibold disabled:opacity-40 hover:bg-purple-600 transition-colors"
            >
              Записать
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────
type Currency = 'RUB' | 'USD' | 'EUR' | 'MDL'
interface Account {
  id: string; name: string; icon: string
  type: 'debt' | 'savings' | 'investment' | 'goal' | 'checking'
  medium: 'online' | 'cash'
  currency: Currency
  balance: number; note: string
}
interface Rates { usd: number; eur: number; mdl: number; fetchedAt: number }
interface Tx {
  id: string; date: string; amount: number
  accountId: string; comment: string
}
interface FinanceData { accounts: Account[]; txs: Tx[] }

// ── Constants ────────────────────────────────────────────
const CREDIT_START = 439000
const BCN_GOAL     = 250000
const BCN_M1       = 130000
const CREDIT_DL    = '2026-07-31'
const BCN_DL_AUG   = '2026-08-10'

const DEFAULTS: FinanceData = {
  accounts: [
    { id:'credit', name:'Кредитка',    icon:'💳', type:'debt',       medium:'online', currency:'RUB', balance:439000, note:'Закрыть к 31 июля' },
    { id:'mag',    name:'Вклад · Маг', icon:'🎓', type:'savings',    medium:'online', currency:'RUB', balance:190000, note:'Магистратура' },
    { id:'invest', name:'Инвестиции',  icon:'📈', type:'investment', medium:'online', currency:'RUB', balance:80000,  note:'' },
    { id:'vklad',  name:'Вклад 3 мес', icon:'⏳', type:'savings',    medium:'online', currency:'RUB', balance:50000,  note:'До конца июля' },
    { id:'bcn',    name:'Барселона',   icon:'✈️', type:'goal',       medium:'online', currency:'RUB', balance:40000,  note:'/ 250 000 ₽' },
  ],
  txs: [],
}

const LOCAL_KEY = 'finances_masha_v1'
const PWD_KEY   = 'finances_masha_pwd'

// ── Utils ─────────────────────────────────────────────────
async function sha256(str: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}
const rub = (n: number) =>
  new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n) + ' ₽'
const dateRu = (iso: string) =>
  new Date(iso+'T00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'})
function daysTo(iso: string) {
  const d = new Date(iso+'T00:00'), n = new Date()
  n.setHours(0,0,0,0)
  return Math.ceil((d.getTime()-n.getTime())/864e5)
}
const colorOf = (t: string) => ({debt:'#FF3B30',savings:'#30B95B',investment:'#007AFF',goal:'#BF5AF2',checking:'#FF9500'}[t]||'#1C1C1E')

const CURR_SYMBOLS: Record<Currency, string> = { RUB:'₽', USD:'$', EUR:'€', MDL:'L' }
const RATES_KEY = 'fx_rates_v1'
const RATES_TTL = 60 * 60 * 1000 // 1 hour

function fmtCurr(n: number, currency: Currency) {
  const abs = Math.abs(n)
  if (currency === 'RUB') return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(abs) + ' ₽'
  if (currency === 'MDL') return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(abs) + ' L'
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(abs) + ' ' + CURR_SYMBOLS[currency]
}

// Ensure all accounts have required fields (backwards compat)
function normalize(d: FinanceData): FinanceData {
  return {
    ...d,
    accounts: d.accounts.map(a => ({
      ...a,
      medium: (a.medium ?? 'online') as 'online' | 'cash',
      currency: (a.currency ?? 'RUB') as Currency,
    }))
  }
}

async function fetchRates(): Promise<Rates | null> {
  try {
    const cached = localStorage.getItem(RATES_KEY)
    if (cached) {
      const r = JSON.parse(cached) as Rates
      if (Date.now() - r.fetchedAt < RATES_TTL) return r
    }
    // fawazahmed0 currency API via jsDelivr CDN — free, no key
    const res  = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/rub.json')
    const json = await res.json()
    const r: Rates = { usd: json.rub.usd, eur: json.rub.eur, mdl: json.rub.mdl, fetchedAt: Date.now() }
    localStorage.setItem(RATES_KEY, JSON.stringify(r))
    return r
  } catch { return null }
}

// Convert account balance to RUB using rates (1 RUB = rates.usd USD etc.)
function toRub(balance: number, currency: Currency, rates: Rates | null): number {
  if (currency === 'RUB' || !rates) return balance
  if (currency === 'USD') return balance / rates.usd
  if (currency === 'EUR') return balance / rates.eur
  if (currency === 'MDL') return balance / rates.mdl
  return balance
}

// ══════════════════════════════════════════════════════════
export default function FinancesSection() {
  // ── Lock ──
  const [lockState, setLockState] = useState<'locked'|'entering'|'unlocked'>('locked')
  const [pwdInput,  setPwdInput]  = useState('')
  const [pwdError,  setPwdError]  = useState('')
  const [isFirst,   setIsFirst]   = useState(false)

  // ── Data ──
  const [data,      setData]      = useState<FinanceData>(DEFAULTS)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [sync,      setSync]      = useState<'ok'|'saving'|'err'>('ok')
  const [rates,     setRates]     = useState<Rates | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  // ── Transaction modal ──
  const [modal,   setModal]   = useState(false)
  const [selAcc,  setSelAcc]  = useState<string|null>(null)
  const [sign,    setSign]    = useState<1|-1>(1)
  const [amt,     setAmt]     = useState('')
  const [comment, setComment] = useState('')
  const [date,    setDate]    = useState('')

  // ── Add account modal ──
  const [addAccModal,    setAddAccModal]    = useState(false)
  const [addAccMedium,   setAddAccMedium]   = useState<'online'|'cash'>('online')
  const [addAccName,     setAddAccName]     = useState('')
  const [addAccIcon,     setAddAccIcon]     = useState('💰')
  const [addAccType,     setAddAccType]     = useState<Account['type']>('savings')
  const [addAccCurrency, setAddAccCurrency] = useState<Currency>('RUB')
  const [addAccBalance,  setAddAccBalance]  = useState('')

  // ── Edit account modal ──
  const [editAccId,   setEditAccId]   = useState<string|null>(null)
  const [editAccName, setEditAccName] = useState('')
  const [editAccIcon, setEditAccIcon] = useState('')

  // ── Init ──
  useEffect(() => {
    setIsFirst(!localStorage.getItem(PWD_KEY))
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) setData(normalize(JSON.parse(raw)))
    } catch {}
    // Load cached rates immediately if available
    try {
      const cached = localStorage.getItem(RATES_KEY)
      if (cached) { const r = JSON.parse(cached) as Rates; setRates(r) }
    } catch {}
  }, [])

  // ── API sync ──
  const syncFromAPI = useCallback(async () => {
    if (apiLoaded) return
    setSync('saving')
    try {
      const [res, freshRates] = await Promise.all([
        fetch('/api/finances?id=masha'),
        fetchRates(),
      ])
      const json = await res.json()
      if (json.data) {
        const parsed = normalize(JSON.parse(json.data) as FinanceData)
        setData(parsed)
        localStorage.setItem(LOCAL_KEY, json.data)
      }
      if (freshRates) setRates(freshRates)
      setApiLoaded(true); setSync('ok')
    } catch { setApiLoaded(true); setSync('err') }
  }, [apiLoaded])

  const saveToAPI = useCallback((d: FinanceData) => {
    const raw = JSON.stringify(d)
    localStorage.setItem(LOCAL_KEY, raw)
    setSync('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/finances', {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id:'masha', data: raw }),
        })
        setSync('ok')
      } catch { setSync('err') }
    }, 1200)
  }, [])

  // ── Password ──
  const checkPwd = async () => {
    if (!pwdInput.trim()) return
    const stored = localStorage.getItem(PWD_KEY)
    const hash   = await sha256(pwdInput)
    if (!stored) {
      if (pwdInput.length < 3) { setPwdError('Минимум 3 символа'); return }
      localStorage.setItem(PWD_KEY, hash)
      setLockState('unlocked'); syncFromAPI()
    } else if (hash === stored) {
      setPwdError(''); setLockState('unlocked'); syncFromAPI()
    } else {
      setPwdError('Неверный пароль ❌'); setPwdInput('')
    }
  }

  // ── Mutations ──
  const mutate = (fn: (d: FinanceData) => void) => {
    setData(prev => {
      const next: FinanceData = JSON.parse(JSON.stringify(prev))
      fn(next); saveToAPI(next); return next
    })
  }

  const getAcc = (id: string) => data.accounts.find(a => a.id === id)

  const submitTx = () => {
    if (!selAcc) return
    const raw = parseFloat(amt)
    if (!raw || raw <= 0) return
    const amount = raw * sign
    mutate(d => {
      const a = d.accounts.find(x => x.id === selAcc)!
      a.type === 'debt'
        ? (a.balance = Math.max(0, a.balance - amount))
        : (a.balance = Math.max(0, a.balance + amount))
      d.txs.push({ id: String(Date.now()), date: date || new Date().toISOString().slice(0,10), amount, accountId: selAcc, comment: comment.trim() })
    })
    closeModal()
  }

  const delTx = (id: string) => {
    if (!confirm('Удалить операцию? Баланс вернётся.')) return
    mutate(d => {
      const tx = d.txs.find(t => t.id === id)
      if (tx) {
        const a = d.accounts.find(x => x.id === tx.accountId)
        if (a) a.type === 'debt'
          ? (a.balance = Math.max(0, a.balance + tx.amount))
          : (a.balance = Math.max(0, a.balance - tx.amount))
      }
      d.txs = d.txs.filter(t => t.id !== id)
    })
  }

  const openModal = (accId?: string) => {
    setSelAcc(accId ?? null); setSign(1); setAmt(''); setComment('')
    setDate(new Date().toISOString().slice(0,10)); setModal(true)
  }
  const closeModal = () => { setModal(false); setAmt(''); setComment(''); setSelAcc(null) }

  // ── Add account ──
  const openAddAcc = (medium: 'online' | 'cash') => {
    setAddAccMedium(medium); setAddAccName(''); setAddAccIcon('💰')
    setAddAccType('savings'); setAddAccCurrency('RUB'); setAddAccBalance(''); setAddAccModal(true)
  }
  const submitAddAcc = () => {
    if (!addAccName.trim()) return
    const bal = parseFloat(addAccBalance) || 0
    mutate(d => {
      d.accounts.push({
        id: String(Date.now()),
        name: addAccName.trim(),
        icon: addAccIcon.trim() || '💰',
        type: addAccType,
        medium: addAccMedium,
        currency: addAccCurrency,
        balance: bal,
        note: '',
      })
    })
    setAddAccModal(false)
  }

  // ── Edit account ──
  const openEditAcc = (acc: Account) => {
    setEditAccId(acc.id); setEditAccName(acc.name); setEditAccIcon(acc.icon)
  }
  const submitEditAcc = () => {
    if (!editAccId || !editAccName.trim()) return
    mutate(d => {
      const a = d.accounts.find(x => x.id === editAccId)
      if (a) { a.name = editAccName.trim(); a.icon = editAccIcon.trim() || a.icon }
    })
    setEditAccId(null)
  }

  // ── Export ──
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `finances_masha_${new Date().toISOString().slice(0,10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Computed ──
  const credit = getAcc('credit')
  const bcn    = getAcc('bcn')
  const paid   = credit ? Math.max(0, CREDIT_START - credit.balance) : 0
  const pct    = Math.min(100, (paid / CREDIT_START) * 100)
  const dl     = daysTo(CREDIT_DL)
  const creditPill = !credit ? '' : credit.balance === 0 ? '🎉 Закрыто!' : dl > 0 ? `⏱ ${dl} дн. до 31 июля` : dl === 0 ? '🎉 Сегодня!' : '📅 Срок прошёл'
  const creditSub  = paid > 0 ? `Погашено ${rub(paid)} из ${rub(CREDIT_START)}` : `Начальный долг: ${rub(CREDIT_START)}`
  const bcnPct     = bcn ? Math.min(100, (bcn.balance / BCN_GOAL) * 100) : 0
  const bcnPill    = !bcn ? '' : bcn.balance >= BCN_GOAL ? '🎉 Цель!' : bcn.balance >= BCN_M1 ? `✅ Авг. ок · ещё ${rub(BCN_GOAL-bcn.balance)}` : `До авг.: ещё ${rub(BCN_M1-bcn.balance)} · ${daysTo(BCN_DL_AUG)} дн.`

  const onlineAccounts = data.accounts.filter(a => (a.medium ?? 'online') === 'online')
  const cashAccounts   = data.accounts.filter(a => a.medium === 'cash')

  const onlineAssets = onlineAccounts.filter(a => a.type !== 'debt').reduce((s,a) => s + toRub(a.balance, a.currency ?? 'RUB', rates), 0)
  const onlineDebt   = onlineAccounts.filter(a => a.type === 'debt').reduce((s,a) => s + toRub(a.balance, a.currency ?? 'RUB', rates), 0)
  const onlineNW     = onlineAssets - onlineDebt

  const cashAssets   = cashAccounts.reduce((s,a) => s + toRub(a.balance, a.currency ?? 'RUB', rates), 0)
  const totalNW      = onlineNW + cashAssets

  const ratesAge = rates ? Math.round((Date.now() - rates.fetchedAt) / 60000) : null

  const sortedTxs = [...data.txs].sort((a,b)=>b.date.localeCompare(a.date))

  // ══════════════════════════════════════════════════════
  // LOCKED
  // ══════════════════════════════════════════════════════
  if (lockState !== 'unlocked') return (
    <div className="card overflow-hidden">
      <button onClick={() => setLockState(s => s==='locked'?'entering':'locked')}
        className="w-full flex items-center justify-between p-4 text-left">
        <span className="font-semibold text-purple-600">💜 Финансы</span>
        <span className="text-slate-400 text-sm">{lockState==='entering'?'✕':'🔒 Открыть'}</span>
      </button>
      {lockState==='entering' && (
        <div className="px-4 pb-5 space-y-3 animate-fade-in">
          <p className="text-sm text-slate-400">{isFirst?'Первый вход — придумай пароль':'Введи пароль для доступа'}</p>
          <input type="password" value={pwdInput} onChange={e=>{setPwdInput(e.target.value);setPwdError('')}}
            onKeyDown={e=>e.key==='Enter'&&checkPwd()} placeholder="Пароль" autoFocus
            className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"/>
          {pwdError && <p className="text-red-400 text-xs">{pwdError}</p>}
          <button onClick={checkPwd}
            className="w-full bg-purple-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-600 transition-colors">
            {isFirst?'Установить пароль':'Войти'}
          </button>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════
  // UNLOCKED
  // ══════════════════════════════════════════════════════
  return (
    <>
    <div style={{fontFamily:"inherit"}} className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-purple-600">💜 Финансы</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${sync==='saving'?'bg-amber-400 animate-pulse':sync==='err'?'bg-red-400':'bg-emerald-400'}`}/>
            {sync==='saving'?'Сохранение…':sync==='err'?'Нет сети':'☁️ Синк'}
          </span>
          <button onClick={()=>setLockState('locked')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">🔒</button>
        </div>
      </div>

      {/* ── HERO: credit card ── */}
      <div style={{background:'linear-gradient(145deg,#FF3B30 0%,#C0392B 100%)',borderRadius:22,padding:'20px 22px',color:'white',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,0.13) 0%,transparent 55%)',pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.6px',textTransform:'uppercase',opacity:0.72,marginBottom:4}}>💳 Кредитка</p>
          <p style={{fontSize:30,fontWeight:800,letterSpacing:'-0.8px',lineHeight:1.1,marginBottom:2}}>{rub(credit?.balance??0)}</p>
          <p style={{fontSize:13,opacity:0.68,marginBottom:12}}>{creditSub}</p>
          <div style={{background:'rgba(255,255,255,0.2)',borderRadius:100,height:6,marginBottom:5,position:'relative'}}>
            <div style={{height:'100%',borderRadius:100,background:'rgba(255,255,255,0.85)',width:`${pct}%`,transition:'width 0.5s ease'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:0.62,marginBottom:10}}>
            <span>Остаток долга</span><span>{Math.round(pct)}%</span><span>31 июля ✓</span>
          </div>
          <span style={{display:'inline-flex',alignItems:'center',background:'rgba(255,255,255,0.16)',borderRadius:100,padding:'4px 12px',fontSize:12,fontWeight:600}}>{creditPill}</span>
        </div>
      </div>

      {/* ── HERO row: Нетто онлайн (full width) ── */}
      <div style={{background:'linear-gradient(145deg,#1C4B82 0%,#0F2F52 100%)',borderRadius:22,padding:'18px 22px',color:'white',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,0.13) 0%,transparent 55%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:10,fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase',opacity:0.72,marginBottom:4}}>💻 Нетто онлайн</p>
            <p style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px',lineHeight:1.1,marginBottom:2}}>{(onlineNW>=0?'+':'−')+rub(Math.abs(onlineNW))}</p>
            <p style={{fontSize:12,opacity:0.68}}>активы {rub(onlineAssets)}</p>
          </div>
          <span style={{display:'inline-flex',alignItems:'center',background:'rgba(255,255,255,0.16)',borderRadius:100,padding:'6px 14px',fontSize:13,fontWeight:600}}>долг {rub(onlineDebt)}</span>
        </div>
      </div>

      {/* ── Нетто всё ── */}
      <div style={{background:'linear-gradient(145deg,#2C2C2E 0%,#1C1C1E 100%)',borderRadius:22,padding:'16px 22px',color:'white',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,0.13) 0%,transparent 55%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:10,fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase',opacity:0.72,marginBottom:4}}>📊 Нетто всё · в ₽</p>
            <p style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px',lineHeight:1.1}}>{(totalNW>=0?'+':'−')+rub(Math.abs(totalNW))}</p>
            {ratesAge !== null && <p style={{fontSize:10,opacity:0.4,marginTop:4}}>курс {ratesAge < 1 ? 'только что' : `${ratesAge} мин. назад`}</p>}
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:11,opacity:0.55,marginBottom:3}}>💻 онлайн {(onlineNW>=0?'+':'−')+rub(Math.abs(onlineNW))}</p>
            <p style={{fontSize:11,opacity:0.55}}>💵 наличка +{rub(cashAssets)}</p>
          </div>
        </div>
      </div>

      {/* ── Accounts: Online | Cash side by side ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1 px-0.5">Счета</p>
      <div className="grid grid-cols-2 gap-3 items-start">

        {/* Online column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-blue-500 px-0.5">💻 Онлайн</p>
          {onlineAccounts.map(acc => {
            const cur = acc.currency ?? 'RUB'
            const rubVal = cur !== 'RUB' ? toRub(acc.balance, cur, rates) : null
            return (
              <div key={acc.id} className="relative">
                <button onClick={()=>openModal(acc.id)}
                  className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100 hover:shadow-md active:scale-95 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{acc.icon}</span>
                    {cur !== 'RUB' && <span className="text-xs font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500">{cur}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mb-0.5 pr-6 leading-tight">{acc.name}</p>
                  <p className="text-base font-bold" style={{color:colorOf(acc.type)}}>
                    {acc.type==='debt'?'−':''}{fmtCurr(acc.balance, cur)}
                  </p>
                  {rubVal !== null && <p className="text-xs text-slate-400 mt-0.5">≈ {rub(rubVal)}</p>}
                  {acc.note&&<p className="text-xs text-slate-300 mt-0.5 truncate">{acc.note}</p>}
                </button>
                <button onClick={e=>{e.stopPropagation();openEditAcc(acc)}}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-purple-400 hover:bg-purple-50 transition-all text-xs">
                  ✏️
                </button>
              </div>
            )
          })}
          <button onClick={()=>openAddAcc('online')}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium hover:border-blue-300 hover:text-blue-400 transition-colors">
            + счёт
          </button>
        </div>

        {/* Cash column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-600 px-0.5">💵 Наличка</p>
          {cashAccounts.map(acc => {
            const cur = acc.currency ?? 'RUB'
            const rubVal = cur !== 'RUB' ? toRub(acc.balance, cur, rates) : null
            return (
              <div key={acc.id} className="relative">
                <button onClick={()=>openModal(acc.id)}
                  className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100 hover:shadow-md active:scale-95 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{acc.icon}</span>
                    {cur !== 'RUB' && <span className="text-xs font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500">{cur}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mb-0.5 pr-6 leading-tight">{acc.name}</p>
                  <p className="text-base font-bold" style={{color:colorOf(acc.type)}}>
                    {acc.type==='debt'?'−':''}{fmtCurr(acc.balance, cur)}
                  </p>
                  {rubVal !== null && <p className="text-xs text-slate-400 mt-0.5">≈ {rub(rubVal)}</p>}
                  {acc.note&&<p className="text-xs text-slate-300 mt-0.5 truncate">{acc.note}</p>}
                </button>
                <button onClick={e=>{e.stopPropagation();openEditAcc(acc)}}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-purple-400 hover:bg-purple-50 transition-all text-xs">
                  ✏️
                </button>
              </div>
            )
          })}
          {cashAccounts.length === 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 text-center text-slate-300 text-xs border border-dashed border-slate-200">
              Нет счетов
            </div>
          )}
          <button onClick={()=>openAddAcc('cash')}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium hover:border-emerald-300 hover:text-emerald-500 transition-colors">
            + счёт
          </button>
        </div>
      </div>

      {/* ── Add transaction ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-0.5">Операции</p>
      <button onClick={()=>openModal()}
        className="w-full py-4 rounded-2xl text-white text-base font-semibold transition-all active:scale-98"
        style={{background:'#BF5AF2',boxShadow:'0 4px 16px rgba(191,90,242,0.3)'}}>
        + Записать операцию
      </button>

      {/* ── Transactions list ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        {sortedTxs.length===0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">Операций пока нет</p>
          </div>
        ) : sortedTxs.map(tx => {
          const a    = getAcc(tx.accountId)
          const isIn = tx.amount > 0
          return (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${isIn?'bg-emerald-50':'bg-red-50'}`}>
                {a?.icon??'💫'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.comment||a?.name||'Операция'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a?.name} · {dateRu(tx.date)}</p>
              </div>
              <p className={`text-sm font-semibold whitespace-nowrap ${isIn?'text-emerald-500':'text-red-500'}`}>
                {isIn?'+':'−'}{rub(Math.abs(tx.amount))}
              </p>
              <button onClick={()=>delTx(tx.id)}
                className="text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all text-xs px-2 py-1.5 rounded-lg flex-shrink-0">✕</button>
            </div>
          )
        })}
      </div>

      {/* ── Export ── */}
      <button onClick={exportData}
        className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors">
        💾 Экспорт JSON
      </button>

    </div>

    {/* ══════════════════════════════════════════════════
        TRANSACTION MODAL
    ══════════════════════════════════════════════════ */}
    {modal && (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(6px)'}}
        onClick={e=>e.target===e.currentTarget&&closeModal()}>
        <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto animate-fade-in"
          style={{maxHeight:'92vh',paddingBottom:'env(safe-area-inset-bottom,8px)'}}>
          <div className="px-5 pb-6">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-5"/>
            <h3 className="text-xl font-bold mb-5">Новая операция</h3>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Счёт</p>
              <div className="grid grid-cols-2 gap-2">
                {data.accounts.map(acc=>(
                  <button key={acc.id} onClick={()=>setSelAcc(acc.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${selAcc===acc.id?'border-purple-400 bg-purple-50':'border-slate-100'}`}>
                    <span className="text-lg block mb-1">{acc.icon}</span>
                    <span className="text-xs text-slate-400 block leading-tight">{acc.name}</span>
                    <span className="text-sm font-semibold block mt-0.5" style={{color:colorOf(acc.type)}}>
                      {acc.type==='debt'?'−':''}{rub(acc.balance)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Направление</p>
              <div className="flex gap-2">
                <button onClick={()=>setSign(1)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-2xl font-bold transition-all ${sign===1?'border-emerald-400 bg-emerald-50 text-emerald-700':'border-slate-100'}`}>+</button>
                <button onClick={()=>setSign(-1)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-2xl font-bold transition-all ${sign===-1?'border-red-400 bg-red-50 text-red-700':'border-slate-100'}`}>−</button>
              </div>
              {selAcc && (
                <p className="text-xs text-slate-400 mt-2">
                  {(()=>{
                    const a=getAcc(selAcc)
                    if(!a) return ''
                    return a.type==='debt'
                      ?(sign===1?'✅ Оплата кредитки — долг уменьшится':'⬆️ Трата с кредитки — долг вырастет')
                      :(sign===1?'✅ Пополнение счёта':'⬇️ Списание / трата со счёта')
                  })()}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Сумма</p>
              <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0"
                inputMode="decimal" autoFocus
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Комментарий</p>
              <input type="text" value={comment} onChange={e=>setComment(e.target.value)}
                placeholder="Зарплата, оплата кредитки…"
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>

            <div className="mb-5">
              <p className="text-xs font-medium text-slate-400 mb-2">Дата</p>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>

            <button onClick={submitTx} disabled={!selAcc||!amt}
              className="w-full py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40 transition-opacity"
              style={{background:'#BF5AF2'}}>
              Записать
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════
        ADD ACCOUNT MODAL
    ══════════════════════════════════════════════════ */}
    {addAccModal && (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(6px)'}}
        onClick={e=>e.target===e.currentTarget&&setAddAccModal(false)}>
        <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto animate-fade-in"
          style={{maxHeight:'92vh',paddingBottom:'env(safe-area-inset-bottom,8px)'}}>
          <div className="px-5 pb-6">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-5"/>
            <h3 className="text-xl font-bold mb-1">Новый счёт</h3>
            <p className="text-sm text-slate-400 mb-5">{addAccMedium==='online'?'💻 Онлайн':'💵 Наличка'}</p>

            {/* Icon + Name */}
            <div className="flex gap-2 mb-4">
              <input type="text" value={addAccIcon} onChange={e=>setAddAccIcon(e.target.value)}
                maxLength={2} placeholder="💰"
                className="w-16 border-2 border-slate-100 rounded-2xl px-3 py-3.5 text-2xl text-center focus:outline-none focus:border-purple-400 transition-colors"/>
              <input type="text" value={addAccName} onChange={e=>setAddAccName(e.target.value)}
                placeholder="Название счёта" autoFocus
                className="flex-1 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>

            {/* Type */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Тип</p>
              <div className="grid grid-cols-2 gap-2">
                {(['checking','savings','investment','goal','debt'] as Account['type'][]).map(t=>(
                  <button key={t} onClick={()=>setAddAccType(t)}
                    className={`py-2.5 px-3 rounded-2xl border-2 text-sm font-medium transition-all ${addAccType===t?'border-purple-400 bg-purple-50 text-purple-700':'border-slate-100 text-slate-500'}`}>
                    {t==='checking'?'🏦 Операционный':t==='savings'?'💰 Накопления':t==='investment'?'📈 Инвестиции':t==='goal'?'🎯 Цель':'💳 Долг'}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Валюта</p>
              <div className="grid grid-cols-4 gap-2">
                {(['RUB','USD','EUR','MDL'] as Currency[]).map(c=>(
                  <button key={c} onClick={()=>setAddAccCurrency(c)}
                    className={`py-2.5 rounded-2xl border-2 text-sm font-bold transition-all ${addAccCurrency===c?'border-purple-400 bg-purple-50 text-purple-700':'border-slate-100 text-slate-500'}`}>
                    {CURR_SYMBOLS[c]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {(['RUB','USD','EUR','MDL'] as Currency[]).map(c=>(
                  <p key={c} className="text-center text-xs text-slate-400">{c}</p>
                ))}
              </div>
            </div>

            {/* Initial balance */}
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-400 mb-2">Начальный баланс ({addAccCurrency})</p>
              <input type="number" value={addAccBalance} onChange={e=>setAddAccBalance(e.target.value)}
                placeholder="0" inputMode="decimal"
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>

            <button onClick={submitAddAcc} disabled={!addAccName.trim()}
              className="w-full py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40 transition-opacity"
              style={{background:'#BF5AF2'}}>
              Добавить счёт
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════
        EDIT ACCOUNT MODAL
    ══════════════════════════════════════════════════ */}
    {editAccId && (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(6px)'}}
        onClick={e=>e.target===e.currentTarget&&setEditAccId(null)}>
        <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto animate-fade-in"
          style={{maxHeight:'92vh',paddingBottom:'env(safe-area-inset-bottom,8px)'}}>
          <div className="px-5 pb-6">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-5"/>
            <h3 className="text-xl font-bold mb-5">Редактировать счёт</h3>
            <div className="flex gap-2 mb-6">
              <input type="text" value={editAccIcon} onChange={e=>setEditAccIcon(e.target.value)}
                maxLength={2}
                className="w-16 border-2 border-slate-100 rounded-2xl px-3 py-3.5 text-2xl text-center focus:outline-none focus:border-purple-400 transition-colors"/>
              <input type="text" value={editAccName} onChange={e=>setEditAccName(e.target.value)}
                placeholder="Название" autoFocus
                onKeyDown={e=>e.key==='Enter'&&submitEditAcc()}
                className="flex-1 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-purple-400 transition-colors"/>
            </div>
            <button onClick={submitEditAcc} disabled={!editAccName.trim()}
              className="w-full py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40 transition-opacity"
              style={{background:'#BF5AF2'}}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

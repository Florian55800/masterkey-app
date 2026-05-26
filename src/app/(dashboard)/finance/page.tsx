'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Save, Check, Calculator, TrendingUp, TrendingDown,
  Euro, Wallet, Building2, PiggyBank, ChevronDown, ChevronUp,
  Info, Pencil, X, Copy,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  label: string
  amount: number
}

interface Simulation {
  id: number
  name: string
  revenues: string   // JSON
  expenses: string   // JSON
  salary: number
  loanTotal: number
  loanRemaining: number
  loanMonthly: number
  notes: string | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function parseLines(json: string): LineItem[] {
  try { return JSON.parse(json) } catch { return [] }
}

function calcIS(annualProfit: number) {
  if (annualProfit <= 0) return 0
  const tranche1 = Math.min(annualProfit, 42500)
  const tranche2 = Math.max(0, annualProfit - 42500)
  return tranche1 * 0.15 + tranche2 * 0.25
}

function moisLabel(n: number) {
  if (n <= 0) return '—'
  if (n < 12) return `${n} mois`
  const y = Math.floor(n / 12)
  const m = n % 12
  return m === 0 ? `${y} an${y > 1 ? 's' : ''}` : `${y} an${y > 1 ? 's' : ''} ${m} mois`
}

// ─── Composant ligne éditable ─────────────────────────────────────────────────

function LineRow({
  item, onChange, onDelete,
}: {
  item: LineItem
  onChange: (id: string, field: 'label' | 'amount', value: string | number) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={item.label}
        onChange={e => onChange(item.id, 'label', e.target.value)}
        placeholder="Libellé"
        className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/50"
      />
      <div className="relative w-32">
        <input
          type="number"
          value={item.amount || ''}
          onChange={e => onChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
          placeholder="0"
          min={0}
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 pr-8 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/50 text-right"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">€</span>
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Résultat card ─────────────────────────────────────────────────────────────

function ResultRow({
  label, value, sub, positive, neutral, bold, indent, highlight,
}: {
  label: string
  value: number | null
  sub?: string
  positive?: boolean
  neutral?: boolean
  bold?: boolean
  indent?: boolean
  highlight?: boolean
}) {
  const color = value === null ? 'text-white/30'
    : neutral ? 'text-white/60'
    : value >= 0 ? (positive !== false ? 'text-green-400' : 'text-white/80')
    : 'text-red-400'

  return (
    <div className={`flex items-center justify-between py-2 ${indent ? 'pl-4' : ''} ${highlight ? 'bg-white/[0.03] -mx-4 px-4 rounded-lg' : ''}`}>
      <div>
        <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-white/50'}`}>{label}</span>
        {sub && <span className="text-xs text-white/25 ml-2">{sub}</span>}
      </div>
      <span className={`text-sm font-mono ${bold ? 'font-bold text-base' : 'font-medium'} ${color}`}>
        {value === null ? '—' : formatCurrency(value)}
      </span>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FinancePage() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  // Local editable state (for the active simulation)
  const [revenues, setRevenues] = useState<LineItem[]>([])
  const [expenses, setExpenses] = useState<LineItem[]>([])
  const [salary, setSalary] = useState(0)
  const [loanTotal, setLoanTotal] = useState(10000)
  const [loanRemaining, setLoanRemaining] = useState(10000)
  const [loanMonthly, setLoanMonthly] = useState(0)
  const [notes, setNotes] = useState('')
  const [simName, setSimName] = useState('')

  // UI state
  const [extraPayment, setExtraPayment] = useState(0)
  const [showTVA, setShowTVA] = useState(false)
  const [showLoanDetail, setShowLoanDetail] = useState(true)
  const [showNotes, setShowNotes] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadSimulations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/simulations')
      const data: Simulation[] = await res.json()
      setSimulations(data)
      if (data.length > 0) {
        const first = data[0]
        setActiveId(first.id)
        applySimulation(first)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSimulations() }, [loadSimulations])

  function applySimulation(sim: Simulation) {
    setRevenues(parseLines(sim.revenues))
    setExpenses(parseLines(sim.expenses))
    setSalary(sim.salary)
    setLoanTotal(sim.loanTotal)
    setLoanRemaining(sim.loanRemaining)
    setLoanMonthly(sim.loanMonthly)
    setNotes(sim.notes ?? '')
    setSimName(sim.name)
    setSaved(false)
  }

  function switchSim(sim: Simulation) {
    setActiveId(sim.id)
    applySimulation(sim)
  }

  // ── CRUD simulations ────────────────────────────────────────────────────────

  async function createSimulation() {
    const res = await fetch('/api/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Simulation ${simulations.length + 1}` }),
    })
    const newSim: Simulation = await res.json()
    setSimulations(prev => [newSim, ...prev])
    setActiveId(newSim.id)
    applySimulation(newSim)
  }

  async function deleteSim(id: number) {
    if (!confirm('Supprimer cette simulation ?')) return
    await fetch(`/api/simulations/${id}`, { method: 'DELETE' })
    const remaining = simulations.filter(s => s.id !== id)
    setSimulations(remaining)
    if (remaining.length > 0) {
      setActiveId(remaining[0].id)
      applySimulation(remaining[0])
    } else {
      setActiveId(null)
    }
  }

  async function saveSimulation() {
    if (!activeId) return
    setSaving(true)
    try {
      const body = {
        name: simName,
        revenues: JSON.stringify(revenues),
        expenses: JSON.stringify(expenses),
        salary,
        loanTotal,
        loanRemaining,
        loanMonthly,
        notes: notes || null,
      }
      const res = await fetch(`/api/simulations/${activeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const updated: Simulation = await res.json()
      setSimulations(prev => prev.map(s => s.id === activeId ? updated : s))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // ── Line item helpers ───────────────────────────────────────────────────────

  function addRevenue() { setRevenues(p => [...p, { id: uid(), label: '', amount: 0 }]) }
  function addExpense() { setExpenses(p => [...p, { id: uid(), label: '', amount: 0 }]) }

  function updateRevenue(id: string, field: 'label' | 'amount', value: string | number) {
    setRevenues(p => p.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  function updateExpense(id: string, field: 'label' | 'amount', value: string | number) {
    setExpenses(p => p.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  // ── Calculs ─────────────────────────────────────────────────────────────────

  const totalCA      = revenues.reduce((s, r) => s + (r.amount || 0), 0)
  const totalCharges = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const cotisations  = salary * 0.45
  const resultatAvIS = totalCA - totalCharges - salary - cotisations
  const isAnnuel     = calcIS(resultatAvIS * 12)
  const isMensuel    = isAnnuel / 12
  const resultatNet  = resultatAvIS - isMensuel
  const disponible   = resultatNet - loanMonthly

  // Taux IS effectif
  const tauxISEffectif = resultatAvIS > 0
    ? Math.round((isMensuel / resultatAvIS) * 100)
    : 0

  // Remboursement prêt
  const totalPayment   = loanMonthly + extraPayment
  const moisNormal     = loanRemaining > 0 && loanMonthly > 0
    ? Math.ceil(loanRemaining / loanMonthly) : null
  const moisAccelere   = loanRemaining > 0 && totalPayment > 0
    ? Math.ceil(loanRemaining / totalPayment) : null
  const moisGagnes     = moisNormal !== null && moisAccelere !== null
    ? moisNormal - moisAccelere : null

  // TVA (informatif)
  const tvaCollectee   = totalCA * 0.20
  const tvaDeduc       = totalCharges * 0.20
  const tvaNette       = tvaCollectee - tvaDeduc

  // Rentabilité par logement
  const nbLogements    = revenues.filter(r => r.amount > 0).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inputCls = 'w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/50 transition-colors'
  const numberInputCls = inputCls + ' text-right font-mono'

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#D4AF37]" />
            Simulateur Finance
          </h1>
          <p className="text-white/30 text-sm mt-0.5">SARL · IS 15%/25% · Gérant majoritaire TNS</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveSimulation}
            disabled={saving || !activeId}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20'
            } disabled:opacity-40`}
          >
            {saved ? <><Check className="w-4 h-4" />Enregistré</> : <><Save className="w-4 h-4" />Enregistrer</>}
          </button>
        </div>
      </div>

      {/* ── Onglets simulations ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {simulations.map(sim => (
          <div
            key={sim.id}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm cursor-pointer transition-all ${
              activeId === sim.id
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70'
            }`}
            onClick={() => switchSim(sim)}
          >
            {renamingId === sim.id ? (
              <input
                ref={renameRef}
                defaultValue={sim.name}
                onClick={e => e.stopPropagation()}
                onBlur={e => {
                  const newName = e.target.value.trim() || sim.name
                  setSimName(newName)
                  setSimulations(prev => prev.map(s => s.id === sim.id ? { ...s, name: newName } : s))
                  setRenamingId(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                className="bg-transparent outline-none w-28 text-sm"
                autoFocus
              />
            ) : (
              <span onDoubleClick={e => { e.stopPropagation(); setRenamingId(sim.id) }}>
                {sim.name}
              </span>
            )}
            {simulations.length > 1 && activeId === sim.id && (
              <button
                onClick={e => { e.stopPropagation(); deleteSim(sim.id) }}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-white/30 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={createSimulation}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle
        </button>
      </div>

      {!activeId ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Calculator className="w-12 h-12 text-gray-700" />
          <p className="text-gray-500">Crée une simulation pour commencer</p>
          <button onClick={createSimulation}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-sm font-medium hover:bg-[#D4AF37]/20 transition-all">
            <Plus className="w-4 h-4" /> Créer ma première simulation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Colonne gauche : saisie ───────────────────────────────────── */}
          <div className="space-y-5">

            {/* Revenus */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">CA Mensuel HT</p>
                    <p className="text-white/30 text-xs">{nbLogements} logement{nbLogements > 1 ? 's' : ''} · {formatCurrency(totalCA)}/mois</p>
                  </div>
                </div>
                <span className="text-green-400 font-bold text-lg font-mono">{formatCurrency(totalCA)}</span>
              </div>

              <div className="space-y-2">
                {revenues.map(r => (
                  <LineRow key={r.id} item={r} onChange={updateRevenue} onDelete={id => setRevenues(p => p.filter(x => x.id !== id))} />
                ))}
              </div>

              <button onClick={addRevenue}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all text-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter un logement / revenu
              </button>
            </Card>

            {/* Charges */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Charges fixes mensuelles</p>
                    <p className="text-white/30 text-xs">Logiciels, compta, assurance…</p>
                  </div>
                </div>
                <span className="text-red-400 font-bold text-lg font-mono">−{formatCurrency(totalCharges)}</span>
              </div>

              <div className="space-y-2">
                {expenses.map(e => (
                  <LineRow key={e.id} item={e} onChange={updateExpense} onDelete={id => setExpenses(p => p.filter(x => x.id !== id))} />
                ))}
              </div>

              <button onClick={addExpense}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all text-sm">
                <Plus className="w-3.5 h-3.5" /> Ajouter une charge
              </button>
            </Card>

            {/* Rémunération gérant */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Rémunération gérant</p>
                  <p className="text-white/30 text-xs">Gérant majoritaire · TNS · Cotisations ≈ 45%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Salaire brut mensuel</label>
                  <div className="relative">
                    <input type="number" value={salary || ''} onChange={e => setSalary(parseFloat(e.target.value) || 0)}
                      placeholder="0" min={0}
                      className={numberInputCls + ' pr-8'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">€</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Cotisations TNS (≈45%)</label>
                  <div className="flex items-center h-[42px] px-4 rounded-xl bg-white/[0.02] border border-white/[0.05] font-mono text-sm text-red-400 justify-end">
                    −{formatCurrency(cotisations)}
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs text-blue-300/60">
                  Coût total pour la société : <strong className="text-blue-300">{formatCurrency(salary + cotisations)}/mois</strong>
                  {' '}· Salaire net estimé avant IR : <strong className="text-blue-300">{formatCurrency(salary * 0.55)}/mois</strong>
                </p>
              </div>
            </Card>

            {/* Emprunt */}
            <Card>
              <button
                className="w-full flex items-center justify-between mb-2"
                onClick={() => setShowLoanDetail(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">Emprunt familial</p>
                    <p className="text-white/30 text-xs">Restant : {formatCurrency(loanRemaining)}</p>
                  </div>
                </div>
                {showLoanDetail ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>

              {showLoanDetail && (
                <div className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Montant initial</label>
                      <div className="relative">
                        <input type="number" value={loanTotal || ''} onChange={e => setLoanTotal(parseFloat(e.target.value) || 0)}
                          placeholder="10000" min={0} className={numberInputCls + ' pr-8'} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">€</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Restant dû</label>
                      <div className="relative">
                        <input type="number" value={loanRemaining || ''} onChange={e => setLoanRemaining(parseFloat(e.target.value) || 0)}
                          placeholder="10000" min={0} className={numberInputCls + ' pr-8'} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">€</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Mensualité prévue</label>
                    <div className="relative">
                      <input type="number" value={loanMonthly || ''} onChange={e => setLoanMonthly(parseFloat(e.target.value) || 0)}
                        placeholder="0" min={0} className={numberInputCls + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">€</span>
                    </div>
                  </div>

                  {/* Barre progression remboursement */}
                  {loanTotal > 0 && (
                    <div className="mt-1">
                      <div className="flex justify-between text-xs text-white/30 mb-1">
                        <span>Remboursé</span>
                        <span>{Math.round(((loanTotal - loanRemaining) / loanTotal) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round(((loanTotal - loanRemaining) / loanTotal) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Simulateur remboursement accéléré */}
                  <div className="pt-2 border-t border-white/[0.05]">
                    <label className="text-xs text-white/40 mb-2 block flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Simuler un remboursement accéléré (+€/mois)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(2000, disponible > 0 ? Math.round(disponible) : 500)}
                      step={50}
                      value={extraPayment}
                      onChange={e => setExtraPayment(Number(e.target.value))}
                      className="w-full accent-[#D4AF37]"
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>+0 €</span>
                      <span className="text-[#D4AF37] font-medium">+{formatCurrency(extraPayment)}/mois</span>
                      <span>+{formatCurrency(Math.max(2000, disponible > 0 ? Math.round(disponible) : 500))}</span>
                    </div>

                    {moisNormal !== null && moisAccelere !== null && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                          <p className="text-xs text-white/30 mb-1">Sans accélération</p>
                          <p className="text-white font-semibold text-sm">{moisLabel(moisNormal)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-center">
                          <p className="text-xs text-[#D4AF37]/60 mb-1">Avec +{formatCurrency(extraPayment)}</p>
                          <p className="text-[#D4AF37] font-semibold text-sm">{moisLabel(moisAccelere)}</p>
                        </div>
                      </div>
                    )}
                    {moisGagnes !== null && moisGagnes > 0 && (
                      <p className="text-center text-xs text-green-400/70 mt-2">
                        🎉 Tu gagnes <strong>{moisLabel(moisGagnes)}</strong> sur le remboursement
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Notes */}
            <div>
              <button onClick={() => setShowNotes(v => !v)}
                className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1 transition-colors mb-2">
                <Pencil className="w-3 h-3" />
                {showNotes ? 'Masquer les notes' : 'Ajouter des notes'}
              </button>
              {showNotes && (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes, hypothèses, commentaires…"
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
                />
              )}
            </div>
          </div>

          {/* ── Colonne droite : bilan ────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Bilan mensuel */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Euro className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-white font-semibold">Bilan mensuel estimé</h2>
              </div>

              <div className="divide-y divide-white/[0.04]">
                <ResultRow label="CA total HT" value={totalCA} neutral bold />
                <ResultRow label="Charges fixes" value={-totalCharges} indent />
                <ResultRow label="Rémunération gérant" value={-salary} indent sub="brut" />
                <ResultRow label="Cotisations TNS" value={-cotisations} indent sub="≈45%" />
                <ResultRow
                  label="Résultat avant IS"
                  value={resultatAvIS}
                  bold
                  highlight
                  positive={resultatAvIS >= 0}
                />
                <ResultRow
                  label="IS mensuel estimé"
                  value={-isMensuel}
                  indent
                  sub={`${tauxISEffectif}% effectif (15%/25% annuel)`}
                />
                <ResultRow
                  label="Résultat net mensuel"
                  value={resultatNet}
                  bold
                  highlight
                  positive={resultatNet >= 0}
                />
                <ResultRow label="Mensualité emprunt" value={-loanMonthly} indent />
                <ResultRow
                  label="Disponible après emprunt"
                  value={disponible}
                  bold
                  highlight
                  positive={disponible >= 0}
                />
              </div>
            </Card>

            {/* Indicateurs clés */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'IS annuel estimé',
                  value: formatCurrency(isAnnuel),
                  sub: resultatAvIS > 0 ? (resultatAvIS * 12 <= 42500 ? 'Taux 15%' : 'Taux mixte 15%/25%') : 'Pas d\'IS',
                  color: 'text-orange-400',
                  bg: 'bg-orange-500/10 border-orange-500/20',
                },
                {
                  label: 'CA annuel HT',
                  value: formatCurrency(totalCA * 12),
                  sub: `${nbLogements} logements actifs`,
                  color: 'text-green-400',
                  bg: 'bg-green-500/10 border-green-500/20',
                },
                {
                  label: 'Marge nette',
                  value: totalCA > 0 ? `${Math.round((resultatNet / totalCA) * 100)}%` : '—',
                  sub: 'après IS, avant emprunt',
                  color: resultatNet / totalCA > 0.2 ? 'text-green-400' : 'text-amber-400',
                  bg: 'bg-white/[0.03] border-white/[0.07]',
                },
                {
                  label: 'CA / logement',
                  value: nbLogements > 0 ? formatCurrency(totalCA / nbLogements) : '—',
                  sub: 'moyenne mensuelle',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10 border-blue-500/20',
                },
              ].map(k => (
                <div key={k.label} className={`p-4 rounded-2xl border ${k.bg}`}>
                  <p className="text-xs text-white/40 mb-1">{k.label}</p>
                  <p className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Remboursement résumé */}
            {loanRemaining > 0 && loanMonthly > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <PiggyBank className="w-4 h-4 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">Remboursement emprunt</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Restant dû</span>
                    <span className="text-white font-mono font-medium">{formatCurrency(loanRemaining)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Mensualité actuelle</span>
                    <span className="text-white font-mono font-medium">{formatCurrency(loanMonthly)}/mois</span>
                  </div>
                  {moisNormal !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Durée estimée</span>
                      <span className="text-amber-400 font-semibold">{moisLabel(moisNormal)}</span>
                    </div>
                  )}
                  {extraPayment > 0 && moisAccelere !== null && (
                    <>
                      <div className="h-px bg-white/[0.05] my-1" />
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Avec +{formatCurrency(extraPayment)}/mois</span>
                        <span className="text-[#D4AF37] font-semibold">{moisLabel(moisAccelere)}</span>
                      </div>
                      {moisGagnes !== null && moisGagnes > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40">Économie de temps</span>
                          <span className="text-green-400 font-semibold">−{moisLabel(moisGagnes)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* TVA (informatif) */}
            <div>
              <button onClick={() => setShowTVA(v => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-white/30" />
                  <span className="text-sm text-white/50 font-medium">TVA — estimation indicative</span>
                </div>
                {showTVA ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              {showTVA && (
                <div className="mt-2 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                  <p className="text-xs text-white/30 mb-3 leading-relaxed">
                    Estimation basée sur TVA 20% sur CA et charges. Consulte ton expert-comptable pour les taux réels applicables à ta SARL.
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">TVA collectée (CA × 20%)</span>
                    <span className="text-white/70 font-mono">{formatCurrency(tvaCollectee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">TVA déductible (charges × 20%)</span>
                    <span className="text-white/70 font-mono">−{formatCurrency(tvaDeduc)}</span>
                  </div>
                  <div className="h-px bg-white/[0.05]" />
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60 font-medium">TVA nette à reverser / trimestre</span>
                    <span className="text-orange-400 font-mono font-semibold">{formatCurrency(tvaNette * 3)}</span>
                  </div>
                  <p className="text-xs text-white/20 mt-2">Déclaration CA3 trimestrielle (ou mensuelle si CA &gt; 800k€)</p>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.02]">
              <p className="text-xs text-white/20 leading-relaxed">
                <strong className="text-white/30">Simulation indicative.</strong> Cotisations TNS estimées à 45% (taux réel variable selon revenus et régime). IS calculé sur le résultat fiscal estimé. Ces chiffres ne remplacent pas l'avis d'un expert-comptable.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

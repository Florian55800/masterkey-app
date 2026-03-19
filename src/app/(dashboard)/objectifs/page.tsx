'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Target, UserSearch, PenSquare, Phone, Calendar, Building2,
  Euro, TrendingUp, Trophy, Lock, ChevronRight, Edit2, X, Check
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { formatCurrency, getMilestoneProgress } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodTargets {
  leads: number
  signatures: number
  visites: number
  appels: number
  caParLogement: number
  logements: number
}

interface PeriodActuals {
  leads: number
  signatures: number
  visites: number
  appels: number
  caParLogement: number | null
  logements: number | null
}

interface Period {
  month: number
  year: number
  label: string
  isAnnual: boolean
  targets: PeriodTargets | null
  actuals: PeriodActuals | null
}

interface ObjectivesData {
  activeProperties: number
  activeCities: number
  totalRevenue: number
}

// ─── KPI Config ───────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  {
    key: 'leads' as const,
    label: 'Leads générés',
    icon: UserSearch,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    unit: 'leads',
    formatValue: (v: number) => String(v),
  },
  {
    key: 'signatures' as const,
    label: 'Signatures',
    icon: PenSquare,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10',
    unit: 'signatures',
    formatValue: (v: number) => String(v),
  },
  {
    key: 'visites' as const,
    label: 'Visites / RDV',
    icon: Calendar,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    unit: 'visites',
    formatValue: (v: number) => String(v),
  },
  {
    key: 'appels' as const,
    label: 'Appels passés',
    icon: Phone,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    unit: 'appels',
    formatValue: (v: number) => String(v),
  },
  {
    key: 'caParLogement' as const,
    label: 'CA / logement',
    icon: Euro,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    unit: '€',
    formatValue: (v: number) => formatCurrency(v),
  },
  {
    key: 'logements' as const,
    label: 'Logements actifs',
    icon: Building2,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    unit: 'logements',
    formatValue: (v: number) => String(v),
  },
]

const PROPERTY_MILESTONES = [
  { value: 5, label: 'Premier pas' },
  { value: 10, label: 'En route' },
  { value: 25, label: 'En croissance' },
  { value: 50, label: 'Leader local' },
  { value: 100, label: 'Référence' },
]

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const pct = Math.min(100, Math.max(0, percent))
  return (
    <div className="h-1.5 bg-[#1b1b1b] rounded-full overflow-hidden mt-3">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KPIObjectiveCard({
  config,
  target,
  actual,
}: {
  config: (typeof KPI_CONFIG)[0]
  target: number | null
  actual: number | null
}) {
  const Icon = config.icon
  const hasTarget = target !== null && target > 0
  const hasActual = actual !== null && actual !== undefined
  const percent = hasTarget && hasActual ? (actual! / target!) * 100 : 0
  const isAchieved = percent >= 100

  const barColor = isAchieved
    ? 'bg-green-400'
    : percent >= 70
    ? 'bg-[#D4AF37]'
    : percent >= 40
    ? 'bg-amber-500'
    : 'bg-white/20'

  const textColor = isAchieved
    ? 'text-green-400'
    : percent >= 70
    ? 'text-[#D4AF37]'
    : percent >= 40
    ? 'text-amber-500'
    : config.color

  return (
    <div className={`bg-[#181818] border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
      isAchieved ? 'border-green-500/20' : 'border-white/[0.06]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <span className="text-white/60 text-sm font-medium">{config.label}</span>
        </div>
        {isAchieved && hasActual && (
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-[10px] font-medium">Atteint</span>
          </div>
        )}
      </div>

      {/* Fraction X / Y — central, prominent */}
      {hasTarget ? (
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold leading-none ${hasActual ? textColor : 'text-white/20'}`}>
            {hasActual ? config.formatValue(actual!) : '0'}
          </span>
          <span className="text-white/25 text-xl font-light">/</span>
          <span className="text-white/50 text-xl font-semibold">
            {config.formatValue(target!)}
          </span>
        </div>
      ) : (
        <div>
          <p className={`text-3xl font-bold ${hasActual ? config.color : 'text-white/20'}`}>
            {hasActual ? config.formatValue(actual!) : '—'}
          </p>
          <p className="text-white/30 text-xs mt-0.5">Pas de cible définie</p>
        </div>
      )}

      {/* Progress bar */}
      {hasTarget && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-[11px]">
                {hasActual
                  ? isAchieved
                    ? '✓ Objectif atteint !'
                    : `${config.formatValue(target! - actual!)} restant${config.key === 'caParLogement' ? '' : 's'}`
                  : 'Aucune donnée'}
              </span>
              <span className={`text-[11px] font-semibold ${hasActual && percent > 0 ? textColor : 'text-white/20'}`}>
                {hasActual ? `${Math.round(percent)}%` : '0%'}
              </span>
            </div>
            <ProgressBar percent={percent} color={barColor} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditObjectiveModal({
  isOpen,
  onClose,
  period,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  period: Period | null
  onSave: (targets: PeriodTargets) => Promise<void>
}) {
  const [form, setForm] = useState<PeriodTargets>({
    leads: 0, signatures: 0, visites: 0, appels: 0, caParLogement: 0, logements: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (period?.targets) {
      setForm(period.targets)
    } else {
      setForm({ leads: 0, signatures: 0, visites: 0, appels: 0, caParLogement: 0, logements: 0 })
    }
  }, [period])

  const handleSave = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Objectifs — ${period?.label ?? ''}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {KPI_CONFIG.map((kpi) => (
            <div key={kpi.key} className="space-y-1.5">
              <label className="text-sm text-white/40 flex items-center gap-1.5">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                {kpi.label}
              </label>
              <input
                type="number"
                min="0"
                value={form[kpi.key] || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [kpi.key]: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button isLoading={saving} onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjectifsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [overviewData, setOverviewData] = useState<ObjectivesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [monthlyRes, overviewRes] = await Promise.all([
        fetch('/api/objectives/monthly'),
        fetch('/api/objectives'),
      ])
      const [monthlyData, overview] = await Promise.all([monthlyRes.json(), overviewRes.json()])
      setPeriods(monthlyData.periods ?? [])
      setOverviewData(typeof overview?.activeProperties === 'number' ? overview : null)
    } catch (e) {
      console.error('Objectifs load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const selectedPeriod = periods[selectedIdx] ?? null

  const handleSaveTargets = async (targets: PeriodTargets) => {
    if (!selectedPeriod) return
    await fetch('/api/objectives/monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: selectedPeriod.month, year: selectedPeriod.year, targets }),
    })
    await loadAll()
  }

  const propProgress = useMemo(() => {
    if (!overviewData) return { percent: 0, next: null }
    return getMilestoneProgress(overviewData.activeProperties, PROPERTY_MILESTONES)
  }, [overviewData])

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Objectifs & Performance</h1>
          <p className="text-white/40 mt-1">Cibles mensuelles et suivi de progression</p>
        </div>
        {selectedPeriod && (
          <Button
            variant="outline"
            onClick={() => setEditModalOpen(true)}
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifier les cibles
          </Button>
        )}
      </div>

      {/* Overview KPIs */}
      {overviewData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className="text-white/40 text-xs mb-1">Logements actifs</p>
            <p className="text-[#D4AF37] text-3xl font-bold">{overviewData.activeProperties}</p>
          </div>
          <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className="text-white/40 text-xs mb-1">Villes couvertes</p>
            <p className="text-blue-400 text-3xl font-bold">{overviewData.activeCities}</p>
          </div>
          <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className="text-white/40 text-xs mb-1">CA total cumulé</p>
            <p className="text-green-400 text-2xl font-bold">{formatCurrency(overviewData.totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {periods.map((p, i) => (
          <button
            key={`${p.year}-${p.month}`}
            onClick={() => setSelectedIdx(i)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedIdx === i
                ? p.isAnnual
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#D4AF37] text-black'
                : p.isAnnual
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                : 'bg-[#242424] border border-white/[0.06] text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            {p.isAnnual ? '🎯 ' : ''}{p.label.replace(' 2026', '').replace(' 2027', '')}
            {p.isAnnual ? ' 2027' : ''}
          </button>
        ))}
      </div>

      {/* Selected Period — KPI Grid */}
      {selectedPeriod && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">{selectedPeriod.label}</h2>
            {!selectedPeriod.targets && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors flex items-center gap-1"
              >
                <Target className="w-3.5 h-3.5" />
                Définir les cibles
              </button>
            )}
          </div>

          {selectedPeriod.isAnnual ? (
            /* Annual 2027 objective */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {KPI_CONFIG.map((kpi) => {
                const target = selectedPeriod.targets?.[kpi.key] ?? null
                return (
                  <div
                    key={kpi.key}
                    className="bg-[#181818] border border-purple-500/10 rounded-2xl p-4 text-center"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} mx-auto mb-3`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    <p className="text-white/50 text-xs mb-2">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${target ? kpi.color : 'text-white/20'}`}>
                      {target ? kpi.formatValue(target) : '—'}
                    </p>
                    <p className="text-white/30 text-xs mt-1">objectif 2027</p>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Monthly objectives */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {KPI_CONFIG.map((kpi) => {
                const target = selectedPeriod.targets?.[kpi.key] ?? null
                const actual = selectedPeriod.actuals?.[kpi.key] ?? null
                return (
                  <KPIObjectiveCard
                    key={kpi.key}
                    config={kpi}
                    target={target}
                    actual={actual}
                  />
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!selectedPeriod.targets && !selectedPeriod.isAnnual && (
            <div className="text-center py-6 bg-[#181818] border border-white/[0.06] rounded-2xl">
              <Target className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm mb-4">Aucune cible définie pour cette période</p>
              <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                <Target className="w-4 h-4 mr-1.5" />
                Définir les objectifs
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Milestones timeline */}
      {overviewData && (
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <h3 className="text-white font-semibold">Paliers logements</h3>
            <span className="ml-auto text-white/30 text-sm">{overviewData.activeProperties} logements</span>
          </div>

          <div className="relative">
            {/* Track */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#2e2e2e]" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-[#B8962B] to-[#D4AF37] transition-all duration-700"
              style={{ width: `${Math.min(100, (overviewData.activeProperties / 100) * 100)}%` }}
            />
            <div className="relative flex justify-between">
              {PROPERTY_MILESTONES.map((ms) => {
                const unlocked = overviewData.activeProperties >= ms.value
                return (
                  <div key={ms.value} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 relative transition-all ${
                        unlocked
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-black'
                          : 'border-[#2e2e2e] bg-[#1b1b1b] text-gray-600'
                      }`}
                    >
                      {unlocked ? (
                        <span className="text-sm font-bold">✓</span>
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`font-bold text-sm ${unlocked ? 'text-[#D4AF37]' : 'text-gray-600'}`}>
                        {ms.value}
                      </p>
                      <p className={`text-xs ${unlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                        {ms.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {propProgress.next && (
            <div className="mt-6 flex items-center gap-3 p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl">
              <TrendingUp className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <p className="text-white/50 text-sm">
                <span className="text-[#D4AF37] font-semibold">{propProgress.next.value - overviewData.activeProperties} logements</span>
                {' '}avant "{propProgress.next.label}"
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      <EditObjectiveModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        period={selectedPeriod}
        onSave={handleSaveTargets}
      />
    </div>
  )
}

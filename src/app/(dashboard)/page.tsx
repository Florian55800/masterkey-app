'use client'

import { useEffect, useState, useRef } from 'react'
import { Building2, TrendingUp, Euro, Star, Bell, Phone, Calculator, ChevronDown } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { MilestoneWidget } from '@/components/dashboard/MilestoneWidget'
import { TeamChallengeWidget } from '@/components/dashboard/TeamChallengeWidget'
import { Card } from '@/components/ui/Card'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { SeasonalityChart } from '@/components/charts/SeasonalityChart'
import { formatCurrency, formatPercent, getMonthName } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DashboardData {
  currentMonth: {
    month: number
    year: number
    report: {
      id: number
      caBrut: number
      commissions: number
      netProfit: number
      activeProperties: number
      newSignatures: number
      teamGoals: Array<{
        id: number
        userId: number
        propertiesSigned: number
        appointmentsMade: number
        goalStatus: string
        user: { id: number; name: string; color: string }
      }>
    } | null
    activeProperties: number
  }
  historical: Array<{
    month: number
    year: number
    caBrut: number
    commissions: number
    netProfit: number
    activeProperties: number
    newSignatures: number
  }>
  availableMonths: Array<{ month: number; year: number }>
  upcomingRelances: Array<{
    id: number
    name: string
    phone: string | null
    relanceDate: string
    relanceNote: string | null
    properties: Array<{ id: number; name: string }>
  }>
  overdueRelances: Array<{
    id: number
    name: string
    phone: string | null
    relanceDate: string
    relanceNote: string | null
    properties: Array<{ id: number; name: string }>
  }>
  prevReport: {
    caBrut: number
    netProfit: number
    activeProperties: number
    newSignatures: number
  } | null
}

const PROPERTY_MILESTONES = [
  { value: 5, label: 'Premier pas' },
  { value: 10, label: 'En route' },
  { value: 25, label: 'En croissance' },
  { value: 50, label: 'Leader local' },
  { value: 100, label: 'Référence régionale' },
]

function calcTrend(current: number, prev: number | null | undefined): number | undefined {
  if (!prev || prev === 0) return undefined
  return ((current - prev) / prev) * 100
}

export default function DashboardPage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [commission, setCommission] = useState({ revenue: '', rate: '20' })
  const [commissionResult, setCommissionResult] = useState<number | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/summary?month=${selectedMonth}&year=${selectedYear}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const simulateCommission = () => {
    const rev = parseFloat(commission.revenue)
    const rate = parseFloat(commission.rate)
    if (!isNaN(rev) && !isNaN(rate)) setCommissionResult((rev * rate) / 100)
  }

  if (loading) return <LoadingPage />
  if (!data) return <div className="text-gray-400">Erreur de chargement</div>

  const { currentMonth, historical, upcomingRelances, overdueRelances, prevReport, availableMonths } = data
  const report = currentMonth.report
  const caData = historical.map((h) => h.caBrut)
  const propData = historical.map((h) => h.activeProperties)
  const allRelances = [...overdueRelances, ...upcomingRelances]
  const currentMonthLabel = `${getMonthName(currentMonth.month)} ${currentMonth.year}`
  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()

  const teamMembers = report?.teamGoals.map((g) => ({
    id: g.user.id,
    name: g.user.name,
    color: g.user.color,
    propertiesSigned: g.propertiesSigned,
    appointmentsMade: g.appointmentsMade,
    goalStatus: g.goalStatus,
  })) ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-gray-400 mt-1 capitalize">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* Month picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-4 py-2 hover:bg-[#D4AF37]/20 transition-all"
          >
            <span className="text-[#D4AF37] font-semibold text-sm">{currentMonthLabel}</span>
            <ChevronDown className={`w-4 h-4 text-[#D4AF37] transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
          </button>

          {showMonthPicker && (
            <div className="absolute right-0 top-12 z-50 bg-[#1c1c1c] border border-white/[0.08] rounded-2xl shadow-2xl p-2 min-w-[180px] max-h-64 overflow-y-auto">
              {/* Current month always available */}
              <button
                onClick={() => { setSelectedMonth(now.getMonth() + 1); setSelectedYear(now.getFullYear()); setShowMonthPicker(false) }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                  isCurrentMonth ? 'bg-[#D4AF37] text-black font-semibold' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {getMonthName(now.getMonth() + 1)} {now.getFullYear()}
                {isCurrentMonth && <span className="ml-2 text-xs opacity-70">En cours</span>}
              </button>
              {availableMonths
                .filter((m) => !(m.month === now.getMonth() + 1 && m.year === now.getFullYear()))
                .map((m) => {
                  const isSelected = m.month === selectedMonth && m.year === selectedYear
                  return (
                    <button
                      key={`${m.year}-${m.month}`}
                      onClick={() => { setSelectedMonth(m.month); setSelectedYear(m.year); setShowMonthPicker(false) }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                        isSelected ? 'bg-[#D4AF37] text-black font-semibold' : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {getMonthName(m.month)} {m.year}
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="CA Brut"
          value={formatCurrency(report?.caBrut ?? 0)}
          trend={calcTrend(report?.caBrut ?? 0, prevReport?.caBrut)}
          trendLabel="vs mois précédent"
          sparklineData={caData}
          icon={<Euro className="w-4 h-4 text-[#D4AF37]" />}
        />
        <KPICard
          label="Bénéfice Net"
          value={formatCurrency(report?.netProfit ?? 0)}
          trend={calcTrend(report?.netProfit ?? 0, prevReport?.netProfit)}
          trendLabel="vs mois précédent"
          sparklineData={historical.map((h) => h.netProfit)}
          icon={<TrendingUp className="w-4 h-4 text-green-400" />}
          valueColor="text-green-400"
          formatSparkline={formatCurrency}
        />
        <KPICard
          label="Logements Actifs"
          value={String(currentMonth.activeProperties)}
          trend={calcTrend(currentMonth.activeProperties, prevReport?.activeProperties)}
          trendLabel="vs mois précédent"
          sparklineData={propData}
          icon={<Building2 className="w-4 h-4 text-blue-400" />}
          valueColor="text-blue-400"
          formatSparkline={(v) => `${v} logements`}
        />
        <KPICard
          label="Nouvelles Signatures"
          value={String(report?.newSignatures ?? 0)}
          trend={calcTrend(report?.newSignatures ?? 0, prevReport?.newSignatures)}
          trendLabel="vs mois précédent"
          sparklineData={historical.map((h) => h.newSignatures)}
          icon={<Star className="w-4 h-4 text-amber-400" />}
          valueColor="text-amber-400"
          formatSparkline={(v) => `${v} signatures`}
        />
      </div>

      {/* Charts + Widgets Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Évolution du CA</h3>
              <span className="text-gray-400 text-sm">6 derniers mois</span>
            </div>
            <SeasonalityChart data={historical} />
          </Card>
        </div>
        <div>
          <MilestoneWidget
            current={currentMonth.activeProperties}
            milestones={PROPERTY_MILESTONES}
            title="Paliers logements"
            unit="logements"
          />
        </div>
      </div>

      {/* Team Challenge + Relances */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TeamChallengeWidget members={teamMembers} month={currentMonthLabel} />
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-white font-semibold">Relances à venir</h3>
            {allRelances.length > 0 && (
              <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {allRelances.length}
              </span>
            )}
          </div>
          {allRelances.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucune relance dans les 7 prochains jours</p>
          ) : (
            <div className="space-y-3">
              {allRelances.map((owner) => {
                const isOverdue = new Date(owner.relanceDate) < new Date()
                return (
                  <div key={owner.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{owner.name}</p>
                      {owner.relanceNote && <p className="text-gray-400 text-xs mt-0.5 truncate">{owner.relanceNote}</p>}
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        {isOverdue ? 'En retard · ' : ''}{format(new Date(owner.relanceDate), "d MMM", { locale: fr })}
                      </p>
                    </div>
                    {owner.phone && (
                      <a href={`tel:${owner.phone}`} className="text-gray-400 hover:text-white flex-shrink-0 p-1 rounded-lg hover:bg-[#2e2e2e] transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Commission Simulator */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold">Simulateur de commission</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">CA mensuel estimé (€)</label>
            <input type="number" value={commission.revenue} onChange={(e) => setCommission({ ...commission, revenue: e.target.value })} placeholder="Ex: 10000" className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Taux de commission (%)</label>
            <input type="number" value={commission.rate} onChange={(e) => setCommission({ ...commission, rate: e.target.value })} placeholder="Ex: 20" className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
          </div>
          <button onClick={simulateCommission} className="bg-[#D4AF37] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#E8C84D] transition-colors">Calculer</button>
        </div>
        {commissionResult !== null && (
          <div className="mt-4 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl">
            <p className="text-gray-400 text-sm">Commission estimée</p>
            <p className="text-[#D4AF37] text-3xl font-bold mt-1">{formatCurrency(commissionResult)}</p>
            <p className="text-gray-500 text-xs mt-1">= {formatPercent(parseFloat(commission.rate))} de {formatCurrency(parseFloat(commission.revenue))}</p>
          </div>
        )}
      </Card>

      {/* Quick stats */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center">
            <p className="text-gray-400 text-xs mb-1">Taux de marge</p>
            <p className="text-white font-bold text-lg">{report.caBrut > 0 ? formatPercent((report.netProfit / report.caBrut) * 100) : '—'}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-gray-400 text-xs mb-1">Dépenses</p>
            <p className="text-red-400 font-bold text-lg">{formatCurrency(report.commissions)}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-gray-400 text-xs mb-1">Taux commission</p>
            <p className="text-white font-bold text-lg">{report.caBrut > 0 ? formatPercent((report.commissions / report.caBrut) * 100) : '—'}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-gray-400 text-xs mb-1">CA / logement</p>
            <p className="text-white font-bold text-lg">{currentMonth.activeProperties > 0 ? formatCurrency(report.caBrut / currentMonth.activeProperties) : '—'}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

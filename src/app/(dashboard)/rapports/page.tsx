'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileBarChart, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatPercent, getMonthName } from '@/lib/utils'

interface Report {
  id: number
  month: number
  year: number
  caBrut: number
  commissions: number
  activeProperties: number
  totalNights: number
  newSignatures: number
  lostProperties: number
  netProfit: number
  notes: string | null
  targetMargin: number | null
  expenses: Array<{ id: number; amount: number }>
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function RapportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    caBrut: '',
    commissions: '',
    activeProperties: '',
    totalNights: '',
    newSignatures: '',
    lostProperties: '',
    netProfit: '',
    notes: '',
    targetMargin: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateFinances = (field: 'caBrut' | 'commissions', value: string) => {
    const ca = parseFloat(field === 'caBrut' ? value : form.caBrut) || 0
    const dep = parseFloat(field === 'commissions' ? value : form.commissions) || 0
    setForm(f => ({ ...f, [field]: value, netProfit: String(ca - dep) }))
  }

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const availableYears = Array.from(
    new Set([
      ...reports.map((r) => r.year),
      new Date().getFullYear(),
      new Date().getFullYear() - 1,
    ])
  ).sort((a, b) => b - a)

  const getReportForMonth = (month: number): Report | null => {
    return reports.find((r) => r.month === month && r.year === selectedYear) ?? null
  }

  const getPrevReport = (month: number, year: number): Report | null => {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    return reports.find((r) => r.month === prevMonth && r.year === prevYear) ?? null
  }

  const calcTrend = (current: number, prev: number | null): number | undefined => {
    if (!prev || prev === 0) return undefined
    return ((current - prev) / prev) * 100
  }

  const openCreateModal = (month?: number) => {
    setEditingReport(null)
    setForm({
      month: String(month ?? new Date().getMonth() + 1),
      year: String(selectedYear),
      caBrut: '',
      commissions: '',
      activeProperties: '',
      totalNights: '',
      newSignatures: '',
      lostProperties: '',
      netProfit: '',
      notes: '',
      targetMargin: '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (report: Report) => {
    setEditingReport(report)
    setForm({
      month: String(report.month),
      year: String(report.year),
      caBrut: String(report.caBrut),
      commissions: String(report.commissions),
      activeProperties: String(report.activeProperties),
      totalNights: String(report.totalNights),
      newSignatures: String(report.newSignatures),
      lostProperties: String(report.lostProperties),
      netProfit: String(report.netProfit),
      notes: report.notes ?? '',
      targetMargin: report.targetMargin ? String(report.targetMargin) : '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const url = editingReport ? `/api/reports/${editingReport.id}` : '/api/reports'
      const method = editingReport ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la sauvegarde')
        return
      }

      await loadReports()
      setIsModalOpen(false)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapports mensuels</h1>
          <p className="text-gray-400 mt-1">{reports.length} rapport(s) enregistré(s)</p>
        </div>
        <Button onClick={() => openCreateModal()}>
          <Plus className="w-4 h-4" />
          Nouveau rapport
        </Button>
      </div>

      {/* Year Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedYear === year
                ? 'bg-[#D4AF37] text-black'
                : 'bg-[#242424] border border-[#2e2e2e] text-gray-400 hover:text-white'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Monthly Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTHS.map((month) => {
          const report = getReportForMonth(month)
          const prevReport = getPrevReport(month, selectedYear)
          const trend = report ? calcTrend(report.caBrut, prevReport?.caBrut ?? null) : undefined
          const totalExpenses = report?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0
          const margin = report && report.caBrut > 0 ? (report.netProfit / report.caBrut) * 100 : 0
          const isPast = new Date(selectedYear, month - 1, 1) <= new Date()

          return (
            <div key={month}>
              {report ? (
                <Card className="hover:border-[#D4AF37]/30 transition-colors group">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">{getMonthName(month)}</h3>
                    <div className="flex items-center gap-1">
                      {trend !== undefined && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(trend).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">CA Brut</span>
                      <span className="text-[#D4AF37] font-semibold text-sm">{formatCurrency(report.caBrut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Dépenses</span>
                      <span className="text-white text-sm">{formatCurrency(report.commissions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Bénéfice</span>
                      <span className={`font-semibold text-sm ${report.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(report.netProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <Badge variant={margin >= 15 ? 'success' : margin >= 10 ? 'warning' : 'danger'}>
                      Marge: {formatPercent(margin)}
                    </Badge>
                    <Badge variant="default">
                      {report.activeProperties} biens
                    </Badge>
                    {report.newSignatures > 0 && (
                      <Badge variant="gold">
                        +{report.newSignatures} signature(s)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/rapports/${report.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#1b1b1b] border border-[#2e2e2e] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition-all text-sm"
                    >
                      Voir détails
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => openEditModal(report)}
                      className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#2e2e2e] text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all text-sm"
                    >
                      Modifier
                    </button>
                  </div>
                </Card>
              ) : (
                <div
                  className={`rounded-xl border border-dashed border-[#2e2e2e] p-6 flex flex-col items-center justify-center min-h-[180px] transition-all ${
                    isPast ? 'hover:border-[#D4AF37]/30 cursor-pointer group' : 'opacity-40'
                  }`}
                  onClick={() => isPast && openCreateModal(month)}
                >
                  <p className="text-gray-500 font-medium text-sm">{getMonthName(month)}</p>
                  {isPast && (
                    <>
                      <Plus className="w-5 h-5 text-gray-600 group-hover:text-[#D4AF37] mt-2 transition-colors" />
                      <p className="text-gray-600 text-xs mt-1 group-hover:text-gray-400 transition-colors">
                        Ajouter rapport
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReport ? 'Modifier le rapport' : 'Nouveau rapport mensuel'}
        size="lg"
      >
        <div className="space-y-4">
          {!editingReport && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Mois</label>
                <select
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Année"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CA (€)"
              type="number"
              value={form.caBrut}
              onChange={(e) => updateFinances('caBrut', e.target.value)}
              placeholder="10000"
            />
            <Input
              label="Dépenses (€)"
              type="number"
              value={form.commissions}
              onChange={(e) => updateFinances('commissions', e.target.value)}
              placeholder="2000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/40 font-medium">Bénéfice Net (€)</label>
              <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ color: parseFloat(form.netProfit) >= 0 ? '#22c55e' : '#ef4444' }}>
                {form.netProfit !== '' ? `${parseFloat(form.netProfit).toLocaleString('fr-FR')} €` : '—'}
              </div>
            </div>
            <Input
              label="Logements actifs"
              type="number"
              value={form.activeProperties}
              onChange={(e) => setForm({ ...form, activeProperties: e.target.value })}
              placeholder="5"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Nuitées"
              type="number"
              value={form.totalNights}
              onChange={(e) => setForm({ ...form, totalNights: e.target.value })}
              placeholder="90"
            />
            <Input
              label="Nouvelles signatures"
              type="number"
              value={form.newSignatures}
              onChange={(e) => setForm({ ...form, newSignatures: e.target.value })}
              placeholder="2"
            />
            <Input
              label="Logements perdus"
              type="number"
              value={form.lostProperties}
              onChange={(e) => setForm({ ...form, lostProperties: e.target.value })}
              placeholder="0"
            />
          </div>

          <Input
            label="Objectif de marge (%)"
            type="number"
            value={form.targetMargin}
            onChange={(e) => setForm({ ...form, targetMargin: e.target.value })}
            placeholder="15"
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observations, événements marquants..."
            rows={3}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingReport ? 'Enregistrer' : 'Créer le rapport'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

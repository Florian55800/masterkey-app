'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, CreditCard, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExpenseDonut } from '@/components/charts/ExpenseDonut'
import { formatCurrency, getMonthName, EXPENSE_CATEGORIES, getCategoryLabel } from '@/lib/utils'

interface Report {
  id: number
  month: number
  year: number
  caBrut: number
}

interface Expense {
  id: number
  category: string
  description: string | null
  amount: number
  isRecurring: boolean
  reportId: number
}

export default function DepensesPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    category: 'logiciel',
    description: '',
    amount: '',
    isRecurring: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setReports(arr)
      if (arr.length > 0) {
        const latest = arr[0]
        setSelectedReportId(latest.id)
        setSelectedReport(latest)
        loadExpenses(latest.id)
      }
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const loadExpenses = async (reportId: number) => {
    try {
      const res = await fetch(`/api/expenses?reportId=${reportId}`)
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch {
      setExpenses([])
    }
  }

  const handleSelectReport = async (reportId: number) => {
    const report = reports.find((r) => r.id === reportId)
    setSelectedReportId(reportId)
    setSelectedReport(report ?? null)
    await loadExpenses(reportId)
  }

  const handleAddExpense = async () => {
    if (!selectedReportId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, reportId: selectedReportId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return
      }
      await loadExpenses(selectedReportId)
      setIsModalOpen(false)
      setForm({ category: 'logiciel', description: '', amount: '', isRecurring: false })
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (selectedReportId) await loadExpenses(selectedReportId)
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const recurringExpenses = expenses.filter((e) => e.isRecurring)
  const oneTimeExpenses = expenses.filter((e) => !e.isRecurring)
  const totalRecurring = recurringExpenses.reduce((s, e) => s + e.amount, 0)
  const totalOneTime = oneTimeExpenses.reduce((s, e) => s + e.amount, 0)

  // Expense data by category for donut
  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat.value,
    amount: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((d) => d.amount > 0)

  // Get previous report expenses for comparison
  const currentReportIndex = reports.findIndex((r) => r.id === selectedReportId)
  const prevReport = currentReportIndex < reports.length - 1 ? reports[currentReportIndex + 1] : null

  const marginRate = selectedReport && selectedReport.caBrut > 0
    ? ((selectedReport.caBrut - totalExpenses) / selectedReport.caBrut) * 100
    : 0

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dépenses</h1>
          <p className="text-gray-400 mt-1">Gestion et analyse des dépenses</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={!selectedReportId}>
          <Plus className="w-4 h-4" />
          Ajouter dépense
        </Button>
      </div>

      {/* Report Selector */}
      {reports.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-400 text-sm">Rapport :</span>
          {reports.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectReport(r.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedReportId === r.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#242424] border border-[#2e2e2e] text-gray-400 hover:text-white'
              }`}
            >
              {getMonthName(r.month).substring(0, 3)} {r.year}
            </button>
          ))}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun rapport disponible"
          description="Créez d'abord un rapport mensuel pour ajouter des dépenses."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card padding="sm" className="text-center">
              <p className="text-gray-400 text-xs mb-1">Total dépenses</p>
              <p className="text-red-400 font-bold text-xl">{formatCurrency(totalExpenses)}</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-gray-400 text-xs mb-1">Récurrentes</p>
              <p className="text-amber-400 font-bold text-xl">{formatCurrency(totalRecurring)}</p>
              <p className="text-gray-500 text-xs">{recurringExpenses.length} poste(s)</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-gray-400 text-xs mb-1">Ponctuelles</p>
              <p className="text-blue-400 font-bold text-xl">{formatCurrency(totalOneTime)}</p>
              <p className="text-gray-500 text-xs">{oneTimeExpenses.length} poste(s)</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-gray-400 text-xs mb-1">Impact sur marge</p>
              <p className={`font-bold text-xl ${marginRate >= 15 ? 'text-green-400' : marginRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                {selectedReport?.caBrut ? `${marginRate.toFixed(1)}%` : '—'}
              </p>
              <p className="text-gray-500 text-xs">marge résiduelle</p>
            </Card>
          </div>

          {/* Chart + Table Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <Card>
              <h3 className="text-white font-semibold mb-4">Répartition</h3>
              <ExpenseDonut data={expenseByCategory} />
            </Card>

            {/* Expenses Table */}
            <div className="xl:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">
                    Détail des dépenses
                    {selectedReport && (
                      <span className="text-gray-400 font-normal ml-2">
                        — {getMonthName(selectedReport.month)} {selectedReport.year}
                      </span>
                    )}
                  </h3>
                  <span className="text-gray-400 text-sm">{expenses.length} ligne(s)</span>
                </div>

                {expenses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-3">Aucune dépense pour ce mois</p>
                    <Button size="sm" onClick={() => setIsModalOpen(true)}>
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                          <th className="text-left pb-3 pr-4">Catégorie</th>
                          <th className="text-left pb-3 pr-4">Description</th>
                          <th className="text-left pb-3 pr-4">Type</th>
                          <th className="text-right pb-3 pr-4">Montant</th>
                          <th className="pb-3 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2e2e2e]">
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="group hover:bg-[#1b1b1b] transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.color,
                                  }}
                                />
                                <span className="text-white text-sm">
                                  {getCategoryLabel(expense.category)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-gray-400 text-sm">
                              {expense.description || '—'}
                            </td>
                            <td className="py-3 pr-4">
                              {expense.isRecurring ? (
                                <Badge variant="info" className="flex items-center gap-1 w-fit">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Récurrent
                                </Badge>
                              ) : (
                                <Badge variant="default">Ponctuel</Badge>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-right text-white font-medium text-sm">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#2e2e2e]">
                          <td colSpan={3} className="py-3 text-gray-400 text-sm font-medium">
                            Total
                          </td>
                          <td className="py-3 text-right text-[#D4AF37] font-bold">
                            {formatCurrency(totalExpenses)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Category Breakdown */}
          {expenseByCategory.length > 0 && (
            <Card>
              <h3 className="text-white font-semibold mb-4">Par catégorie</h3>
              <div className="space-y-3">
                {expenseByCategory
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => {
                    const cat = EXPENSE_CATEGORIES.find((c) => c.value === item.category)
                    const pct = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0
                    return (
                      <div key={item.category}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat?.color }}
                            />
                            <span className="text-gray-300 text-sm">{getCategoryLabel(item.category)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
                            <span className="text-white font-medium text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1b1b1b] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: cat?.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter une dépense"
      >
        <div className="space-y-4">
          <Select
            label="Catégorie"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </Select>

          <Input
            label="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Abonnement Airbnb Pro"
          />

          <Input
            label="Montant (€)"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="150"
          />

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#1b1b1b] border border-[#2e2e2e] hover:border-[#D4AF37]/30 transition-colors">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <div>
              <p className="text-white text-sm font-medium">Dépense récurrente</p>
              <p className="text-gray-500 text-xs">Se répète chaque mois</p>
            </div>
          </label>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleAddExpense}>Ajouter</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

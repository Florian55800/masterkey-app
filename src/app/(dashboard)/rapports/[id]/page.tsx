'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Edit2, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { ExpenseDonut } from '@/components/charts/ExpenseDonut'
import { formatCurrency, formatPercent, getMonthName, EXPENSE_CATEGORIES, getCategoryLabel } from '@/lib/utils'

interface Expense {
  id: number
  category: string
  description: string | null
  amount: number
  isRecurring: boolean
}

interface TeamGoal {
  id: number
  userId: number
  propertiesSigned: number
  appointmentsMade: number
  personalGoal: string | null
  goalStatus: string
  user: { id: number; name: string; color: string }
}

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
  expenses: Expense[]
  teamGoals: TeamGoal[]
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [expenseModal, setExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: 'logiciel',
    description: '',
    amount: '',
    isRecurring: false,
  })
  const [savingExpense, setSavingExpense] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    loadReport()
  }, [params.id])

  const loadReport = async () => {
    const res = await fetch(`/api/reports/${params.id}`)
    if (!res.ok) {
      router.push('/rapports')
      return
    }
    const data = await res.json()
    setReport(data)
    setNotesValue(data.notes ?? '')
    setLoading(false)
  }

  const handleAddExpense = async () => {
    if (!report) return
    setSavingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, reportId: report.id }),
      })
      if (res.ok) {
        await loadReport()
        setExpenseModal(false)
        setExpenseForm({ category: 'logiciel', description: '', amount: '', isRecurring: false })
      }
    } finally {
      setSavingExpense(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await loadReport()
  }

  const handleSaveNotes = async () => {
    if (!report) return
    setSavingNotes(true)
    await fetch(`/api/reports/${report.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValue }),
    })
    await loadReport()
    setSavingNotes(false)
    setEditingNotes(false)
  }

  if (loading) return <LoadingPage />
  if (!report) return null

  const totalExpenses = report.expenses.reduce((s, e) => s + e.amount, 0)
  const margin = report.caBrut > 0 ? (report.netProfit / report.caBrut) * 100 : 0
  const commissionRate = report.caBrut > 0 ? (report.commissions / report.caBrut) * 100 : 0
  const costPerProperty = report.activeProperties > 0 ? totalExpenses / report.activeProperties : 0
  const avgRevenuePerNight = report.totalNights > 0 ? report.caBrut / report.totalNights : 0

  // Expense data by category
  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat.value,
    amount: report.expenses
      .filter((e) => e.category === cat.value)
      .reduce((s, e) => s + e.amount, 0),
  })).filter((d) => d.amount > 0)

  // Chart data
  const chartData = [{
    month: report.month,
    year: report.year,
    caBrut: report.caBrut,
    commissions: report.commissions,
    expenses: totalExpenses,
    netProfit: report.netProfit,
  }]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/rapports" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getMonthName(report.month)} {report.year}
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">Rapport mensuel détaillé</p>
        </div>
      </div>

      {/* KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">CA Brut</p>
          <p className="text-[#D4AF37] font-bold text-xl">{formatCurrency(report.caBrut)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Commissions</p>
          <p className="text-white font-bold text-xl">{formatCurrency(report.commissions)}</p>
          <p className="text-gray-500 text-xs">{formatPercent(commissionRate)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Dépenses</p>
          <p className="text-red-400 font-bold text-xl">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Bénéfice Net</p>
          <p className={`font-bold text-xl ${report.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(report.netProfit)}
          </p>
          <p className={`text-xs ${margin >= 15 ? 'text-green-500' : margin >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
            Marge: {formatPercent(margin)}
          </p>
        </Card>
      </div>

      {/* Metric badges */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[#242424] border border-[#2e2e2e] rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Logements actifs:</span>
          <span className="text-white font-semibold">{report.activeProperties}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#242424] border border-[#2e2e2e] rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Nuitées:</span>
          <span className="text-white font-semibold">{report.totalNights}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#242424] border border-[#2e2e2e] rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Nouvelles signatures:</span>
          <span className="text-[#D4AF37] font-semibold">{report.newSignatures}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#242424] border border-[#2e2e2e] rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Coût / logement:</span>
          <span className="text-white font-semibold">{formatCurrency(costPerProperty)}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#242424] border border-[#2e2e2e] rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Rev. moy / nuit:</span>
          <span className="text-white font-semibold">{formatCurrency(avgRevenuePerNight)}</span>
        </div>
        {report.targetMargin && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
            margin >= report.targetMargin
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <span className="text-gray-400 text-sm">Objectif marge:</span>
            <span className={`font-semibold ${margin >= report.targetMargin ? 'text-green-400' : 'text-red-400'}`}>
              {margin >= report.targetMargin ? '✓' : '✗'} {formatPercent(report.targetMargin)} obj.
            </span>
          </div>
        )}
      </div>

      {/* Revenue Chart + Expense Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <h3 className="text-white font-semibold mb-4">Ventilation financière</h3>
            <RevenueChart data={chartData} />
          </Card>
        </div>
        <div>
          <Card>
            <h3 className="text-white font-semibold mb-4">Répartition des dépenses</h3>
            <ExpenseDonut data={expenseByCategory} />
          </Card>
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Dépenses ({report.expenses.length})</h3>
          <Button size="sm" onClick={() => setExpenseModal(true)}>
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </Button>
        </div>

        {report.expenses.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Aucune dépense enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                  <th className="text-left pb-3 pr-4">Catégorie</th>
                  <th className="text-left pb-3 pr-4">Description</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-right pb-3">Montant</th>
                  <th className="pb-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2e2e]">
                {report.expenses.map((expense) => (
                  <tr key={expense.id} className="group">
                    <td className="py-3 pr-4">
                      <span className="text-white text-sm">{getCategoryLabel(expense.category)}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-sm">{expense.description || '—'}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={expense.isRecurring ? 'info' : 'default'}>
                        {expense.isRecurring ? 'Récurrent' : 'Ponctuel'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right text-white font-medium text-sm">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[#D4AF37]/20">
                  <td colSpan={3} className="py-3 text-gray-400 text-sm font-medium">Total</td>
                  <td className="py-3 text-right text-[#D4AF37] font-bold">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Team Goals */}
      {report.teamGoals.length > 0 && (
        <Card>
          <h3 className="text-white font-semibold mb-4">Objectifs équipe</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.teamGoals.map((goal) => (
              <div key={goal.id} className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2e2e2e]">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: goal.user.color }}
                  >
                    {goal.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{goal.user.name}</p>
                    <Badge variant={goal.goalStatus === 'atteint' ? 'success' : 'warning'}>
                      {goal.goalStatus === 'atteint' ? '✓ Atteint' : 'En cours'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#242424] rounded-lg p-3 text-center">
                    <p className="text-[#D4AF37] font-bold text-xl">{goal.propertiesSigned}</p>
                    <p className="text-gray-400 text-xs">Signatures</p>
                  </div>
                  <div className="bg-[#242424] rounded-lg p-3 text-center">
                    <p className="text-white font-bold text-xl">{goal.appointmentsMade}</p>
                    <p className="text-gray-400 text-xs">RDV</p>
                  </div>
                </div>
                {goal.personalGoal && (
                  <p className="text-gray-400 text-sm mt-3 italic">"{goal.personalGoal}"</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Notes</h3>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-3">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              placeholder="Observations, points marquants..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>
                Annuler
              </Button>
              <Button size="sm" isLoading={savingNotes} onClick={handleSaveNotes}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm leading-relaxed">
            {report.notes || 'Aucune note pour ce rapport.'}
          </p>
        )}
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)} title="Ajouter une dépense">
        <div className="space-y-4">
          <Select
            label="Catégorie"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </Select>

          <Input
            label="Description (optionnel)"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            placeholder="Ex: Abonnement mensuel"
          />

          <Input
            label="Montant (€)"
            type="number"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            placeholder="150"
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={expenseForm.isRecurring}
              onChange={(e) => setExpenseForm({ ...expenseForm, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-[#2e2e2e] bg-[#1b1b1b] accent-[#D4AF37]"
            />
            <span className="text-gray-300 text-sm">Dépense récurrente</span>
          </label>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setExpenseModal(false)}>Annuler</Button>
            <Button isLoading={savingExpense} onClick={handleAddExpense}>Ajouter</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

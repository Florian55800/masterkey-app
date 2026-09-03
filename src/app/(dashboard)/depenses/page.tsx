'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, CreditCard, RefreshCw, Home, TrendingDown, Check, Clock, BarChart2, CalendarDays, Repeat, AlertCircle } from 'lucide-react'
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
  tva?: number
  isRecurring: boolean
  payDate: string | null
  paymentDay: number | null
  reportId: number
  month?: number
  year?: number
  caBrut?: number
}

interface SubletExpense {
  id: number
  month: number
  year: number
  loyer: number
  electricite: number
  wifi: number
  autresCharges: number
  nbSejours: number
  nbNuits: number
  notes: string | null
}

interface SousLocProperty {
  id: number
  name: string
  city: string
  owner: { name: string }
  subletExpenses: SubletExpense[]
}

interface Advance {
  id: number
  description: string
  amount: number
  status: 'en_attente' | 'rembourse'
  date: string
  notes: string | null
  owner:    { id: number; name: string } | null
  property: { id: number; name: string } | null
}

export default function DepensesPage() {
  const [mainTab, setMainTab] = useState<'conciergerie' | 'sous-location' | 'avances' | 'global'>('conciergerie')

  // ── Conciergerie state ─────────────────────────────────────────────────────
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState({ category: 'logiciel', description: '', amount: '', tva: '', isRecurring: false, payDate: new Date().toISOString().split('T')[0], paymentDay: '' })
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [targetReportId, setTargetReportId] = useState<number | null>(null)
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false)
  const [newReportForm, setNewReportForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [newReportSaving, setNewReportSaving] = useState(false)
  const [newReportError, setNewReportError] = useState('')

  // ── Sous-location state ────────────────────────────────────────────────────
  const [sousLocProps, setSousLocProps] = useState<SousLocProperty[]>([])
  const [selectedPropId, setSelectedPropId] = useState<number | null>(null)
  const [loadingSousLoc, setLoadingSousLoc] = useState(false)
  const [isSubletModalOpen, setIsSubletModalOpen] = useState(false)
  const [subletForm, setSubletForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    loyer: '', electricite: '', wifi: '', autresCharges: '', nbSejours: '', nbNuits: '', notes: '',
  })
  const [subletSaving, setSubletSaving] = useState(false)
  const [subletError, setSubletError] = useState('')

  // ── Avances state ──────────────────────────────────────────────────────────
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loadingAdvances, setLoadingAdvances] = useState(false)
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({
    description: '', amount: '', ownerId: '', propertyId: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advanceError, setAdvanceError] = useState('')
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    loadReports()
    loadSousLoc()
    loadAdvances()
    loadOwnersAndProperties()
    fetch('/api/expenses').then(r => r.json()).then(d => setAllExpenses(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setReports(arr)
      if (arr.length > 0) {
        const nowM = new Date().getMonth() + 1
        const nowY = new Date().getFullYear()
        // Ignorer les rapports du mois courant qui sont vides (créés sans données)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const best = arr.find((r: any) => !(r.month === nowM && r.year === nowY && r.caBrut === 0 && (!r.expenses || r.expenses.length === 0))) ?? arr[0]
        setSelectedReportId(best.id)
        setSelectedReport(best)
        loadExpenses(best.id)
      }
    } catch { setReports([]) }
    finally { setLoading(false) }
  }

  const handleCreateReport = async () => {
    setNewReportSaving(true)
    setNewReportError('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: newReportForm.month, year: newReportForm.year, caBrut: 0, commissions: 0, activeProperties: 0, totalNights: 0, newSignatures: 0, lostProperties: 0, netProfit: 0 }),
      })
      const created = await res.json()
      if (!res.ok) { setNewReportError(created.error || 'Erreur'); return }
      setIsNewReportModalOpen(false)

      // ── Copier les dépenses récurrentes du rapport le plus récent ──────────
      // Trouver le rapport précédent le plus récent parmi ceux déjà chargés
      const sortedReports = [...reports].sort((a, b) =>
        b.year !== a.year ? b.year - a.year : b.month - a.month
      )
      const sourceReport = sortedReports[0] // le plus récent avant création
      if (sourceReport) {
        const expRes = await fetch(`/api/expenses?reportId=${sourceReport.id}`)
        const expData = await expRes.json()
        const recurring: Expense[] = Array.isArray(expData) ? expData.filter((e: Expense) => e.isRecurring) : []
        if (recurring.length > 0) {
          // Calculer la payDate ajustée au nouveau mois
          const pad2 = (n: number) => String(n).padStart(2, '0')
          const daysInMonth = new Date(newReportForm.year, newReportForm.month, 0).getDate()
          await Promise.all(recurring.map(e => {
            let payDate: string | null = null
            if (e.paymentDay) {
              const day = Math.min(e.paymentDay, daysInMonth)
              payDate = `${newReportForm.year}-${pad2(newReportForm.month)}-${pad2(day)}`
            }
            return fetch('/api/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reportId: created.id,
                category: e.category,
                description: e.description,
                amount: e.amount,
                tva: e.tva ?? 0,
                isRecurring: true,
                payDate,
                paymentDay: e.paymentDay ?? null,
              }),
            })
          }))
        }
      }

      // Recharger la liste et afficher le nouveau rapport
      const listRes = await fetch('/api/reports')
      const listData = await listRes.json()
      const arr = Array.isArray(listData) ? listData : []
      setReports(arr)
      setSelectedReportId(created.id)
      setSelectedReport(created)
      await loadExpenses(created.id)
    } catch { setNewReportError('Erreur de connexion') }
    finally { setNewReportSaving(false) }
  }

  const loadSousLoc = async () => {
    setLoadingSousLoc(true)
    try {
      const res = await fetch('/api/facturation/sous-location')
      const data = await res.json()
      if (Array.isArray(data)) {
        setSousLocProps(data)
        if (data.length > 0) setSelectedPropId(data[0].id)
      }
    } catch {}
    finally { setLoadingSousLoc(false) }
  }

  const loadExpenses = async (reportId: number) => {
    try {
      const res = await fetch(`/api/expenses?reportId=${reportId}`)
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch { setExpenses([]) }
  }

  const handleSelectReport = async (reportId: number) => {
    const report = reports.find((r) => r.id === reportId)
    setSelectedReportId(reportId)
    setSelectedReport(report ?? null)
    await loadExpenses(reportId)
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setTargetReportId(expense.reportId)
    setForm({
      category: expense.category,
      description: expense.description ?? '',
      amount: String(expense.amount),
      tva: expense.tva ? String(expense.tva) : '',
      isRecurring: expense.isRecurring,
      payDate: expense.payDate ? expense.payDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentDay: expense.paymentDay ? String(expense.paymentDay) : '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleAddExpense = async () => {
    const effectiveReportId = targetReportId ?? selectedReportId
    if (!effectiveReportId && !editingExpense) return
    setSaving(true)
    setError('')
    const refreshAll = () => fetch('/api/expenses').then(r => r.json()).then(d => setAllExpenses(Array.isArray(d) ? d : [])).catch(() => {})
    try {
      const payload = { ...form, tva: parseFloat(form.tva) || 0 }
      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); return }
        // Reload whichever report is currently displayed
        if (selectedReportId) await loadExpenses(selectedReportId)
        await refreshAll()
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, reportId: effectiveReportId }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); return }
        // If the expense was added to the currently viewed report, refresh it
        if (effectiveReportId === selectedReportId) {
          await loadExpenses(selectedReportId!)
        } else if (effectiveReportId !== null) {
          // Switch to the target report so the user sees the newly added expense
          setSelectedReportId(effectiveReportId)
          setSelectedReport(reports.find(r => r.id === effectiveReportId) ?? null)
          await loadExpenses(effectiveReportId)
        }
        await refreshAll()
      }
      setIsModalOpen(false)
      setEditingExpense(null)
      setForm({ category: 'logiciel', description: '', amount: '', tva: '', isRecurring: false, payDate: new Date().toISOString().split('T')[0], paymentDay: '' })
    } catch { setError('Erreur de connexion') }
    finally { setSaving(false) }
  }

  const handleAddSubletExpense = async () => {
    if (!selectedPropId) return
    setSubletSaving(true)
    setSubletError('')
    try {
      const res = await fetch('/api/facturation/sous-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropId,
          month: Number(subletForm.month),
          year: Number(subletForm.year),
          loyer: Number(subletForm.loyer) || 0,
          electricite: Number(subletForm.electricite) || 0,
          wifi: Number(subletForm.wifi) || 0,
          autresCharges: Number(subletForm.autresCharges) || 0,
          nbSejours: Number(subletForm.nbSejours) || 0,
          nbNuits: Number(subletForm.nbNuits) || 0,
          notes: subletForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setSubletError(d.error || 'Erreur'); return }
      await loadSousLoc()
      setIsSubletModalOpen(false)
      setSubletForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), loyer: '', electricite: '', wifi: '', autresCharges: '', nbSejours: '', nbNuits: '', notes: '' })
    } catch { setSubletError('Erreur de connexion') }
    finally { setSubletSaving(false) }
  }

  const handleDeleteSubletExpense = async (id: number) => {
    if (!confirm('Supprimer cette entrée ?')) return
    await fetch(`/api/facturation/sous-location/${id}`, { method: 'DELETE' })
    await loadSousLoc()
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (selectedReportId) await loadExpenses(selectedReportId)
  }

  const loadAdvances = async () => {
    setLoadingAdvances(true)
    try {
      const res = await fetch('/api/advances')
      const data = await res.json()
      setAdvances(Array.isArray(data) ? data : [])
    } catch {} finally { setLoadingAdvances(false) }
  }

  const loadOwnersAndProperties = async () => {
    try {
      const [oRes, pRes] = await Promise.all([fetch('/api/owners'), fetch('/api/properties')])
      const oData = await oRes.json(); const pData = await pRes.json()
      setOwners(Array.isArray(oData) ? oData.map((o: { id: number; name: string }) => ({ id: o.id, name: o.name })) : [])
      setProperties(Array.isArray(pData) ? pData.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })) : [])
    } catch {}
  }

  const handleAddAdvance = async () => {
    if (!advanceForm.description || !advanceForm.amount) { setAdvanceError('Description et montant requis'); return }
    setAdvanceSaving(true); setAdvanceError('')
    try {
      const res = await fetch('/api/advances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: advanceForm.description,
          amount: Number(advanceForm.amount),
          ownerId: advanceForm.ownerId ? Number(advanceForm.ownerId) : null,
          propertyId: advanceForm.propertyId ? Number(advanceForm.propertyId) : null,
          date: advanceForm.date,
          notes: advanceForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setAdvanceError(d.error || 'Erreur'); return }
      await loadAdvances()
      setIsAdvanceModalOpen(false)
      setAdvanceForm({ description: '', amount: '', ownerId: '', propertyId: '', date: new Date().toISOString().split('T')[0], notes: '' })
    } catch { setAdvanceError('Erreur de connexion') } finally { setAdvanceSaving(false) }
  }

  const handleToggleAdvanceStatus = async (advance: Advance) => {
    const newStatus = advance.status === 'en_attente' ? 'rembourse' : 'en_attente'
    await fetch(`/api/advances/${advance.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...advance, ownerId: advance.owner?.id, propertyId: advance.property?.id, status: newStatus, date: advance.date }),
    })
    await loadAdvances()
  }

  const handleDeleteAdvance = async (id: number) => {
    if (!confirm('Supprimer cette avance ?')) return
    await fetch(`/api/advances/${id}`, { method: 'DELETE' })
    await loadAdvances()
  }

  // ── Conciergerie computed ──────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalExpensesHT = expenses.reduce((s, e) => {
    const tva = e.tva ?? 0
    return s + (tva > 0 ? e.amount / (1 + tva / 100) : e.amount)
  }, 0)
  const hasTvaExpenses = expenses.some(e => (e.tva ?? 0) > 0)
  const recurringExpenses = expenses.filter((e) => e.isRecurring)
  const oneTimeExpenses = expenses.filter((e) => !e.isRecurring)
  const totalRecurring = recurringExpenses.reduce((s, e) => s + e.amount, 0)
  const totalOneTime = oneTimeExpenses.reduce((s, e) => s + e.amount, 0)
  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat.value,
    amount: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((d) => d.amount > 0)
  const marginRate = selectedReport && selectedReport.caBrut > 0
    ? ((selectedReport.caBrut - totalExpenses) / selectedReport.caBrut) * 100 : 0

  // ── Sous-location computed ─────────────────────────────────────────────────
  const selectedProp = sousLocProps.find(p => p.id === selectedPropId) ?? null
  const sortedExpenses = [...(selectedProp?.subletExpenses ?? [])].sort((a, b) =>
    b.year !== a.year ? b.year - a.year : b.month - a.month
  )

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dépenses</h1>
          <p className="text-gray-400 mt-1">Gestion et analyse des dépenses</p>
        </div>
        {mainTab === 'conciergerie' && (
          <Button onClick={() => { setTargetReportId(selectedReportId); setIsModalOpen(true) }} disabled={reports.length === 0}>
            <Plus className="w-4 h-4" />Ajouter dépense
          </Button>
        )}
        {mainTab === 'sous-location' && (
          <Button onClick={() => setIsSubletModalOpen(true)} disabled={!selectedPropId}>
            <Plus className="w-4 h-4" />Ajouter dépense
          </Button>
        )}
        {mainTab === 'avances' && (
          <Button onClick={() => setIsAdvanceModalOpen(true)}>
            <Plus className="w-4 h-4" />Ajouter avance
          </Button>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-1 w-fit flex-wrap gap-1">
        {([['conciergerie', 'Conciergerie'], ['sous-location', 'Sous-location'], ['avances', 'Avances'], ['global', 'Vue globale']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${mainTab === tab ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
            {tab === 'global' && <BarChart2 className="w-3.5 h-3.5" />}
            {label}
            {tab === 'avances' && advances.filter(a => a.status === 'en_attente').length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${mainTab === tab ? 'bg-black/20 text-black/70' : 'bg-red-500/20 text-red-400'}`}>
                {advances.filter(a => a.status === 'en_attente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════ ONGLET CONCIERGERIE ═══════════════════ */}
      {mainTab === 'conciergerie' && (
        <>
          {/* Report Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-400 text-sm">Rapport :</span>
            {reports.map((r) => (
              <button key={r.id} onClick={() => handleSelectReport(r.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedReportId === r.id ? 'bg-[#D4AF37] text-black' : 'bg-[#242424] border border-[#2e2e2e] text-gray-400 hover:text-white'
                }`}>
                {getMonthName(r.month).substring(0, 3)} {r.year}
              </button>
            ))}
            <button
              onClick={() => {
                // Trouver le premier mois non encore créé, en remontant depuis le mois courant
                const existing = new Set(reports.map((r: Report) => `${r.year}-${r.month}`))
                let m = new Date().getMonth() + 1
                let y = new Date().getFullYear()
                for (let i = 0; i < 24; i++) {
                  if (!existing.has(`${y}-${m}`)) break
                  m--; if (m < 1) { m = 12; y-- }
                }
                setNewReportForm({ month: m, year: y })
                setNewReportError('')
                setIsNewReportModalOpen(true)
              }}
              className="px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap border border-dashed border-[#2e2e2e] text-gray-500 hover:text-white hover:border-[#D4AF37]/40 transition-all flex items-center gap-1"
              title="Ouvrir un nouveau mois">
              <Plus className="w-3.5 h-3.5" /> Nouveau mois
            </button>
          </div>

          {reports.length === 0 ? (
            <EmptyState icon={CreditCard} title="Aucun rapport disponible"
              description="Créez d'abord un rapport mensuel pour ajouter des dépenses." />
          ) : (
            <>
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

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card>
                  <h3 className="text-white font-semibold mb-4">Répartition</h3>
                  <ExpenseDonut data={expenseByCategory} />
                </Card>
                <div className="xl:col-span-2">
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">
                        Détail des dépenses
                        {selectedReport && <span className="text-gray-400 font-normal ml-2">— {getMonthName(selectedReport.month)} {selectedReport.year}</span>}
                      </h3>
                      <span className="text-gray-400 text-sm">{expenses.length} ligne(s)</span>
                    </div>
                    {expenses.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm mb-3">Aucune dépense pour ce mois</p>
                        <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-3.5 h-3.5" />Ajouter</Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                              <th className="text-left pb-3 pr-4">Catégorie</th>
                              <th className="text-left pb-3 pr-4">Description</th>
                              <th className="text-left pb-3 pr-4">Type</th>
                              <th className="text-left pb-3 pr-4">Date paiement</th>
                              <th className="text-right pb-3 pr-2">TTC</th>
                              <th className="text-right pb-3 pr-2">TVA%</th>
                              <th className="text-right pb-3 pr-4">HT</th>
                              <th className="pb-3 w-14"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2e2e2e]">
                            {expenses.map((expense) => {
                              const tva = expense.tva ?? 0
                              const ht = tva > 0 ? expense.amount / (1 + tva / 100) : null
                              return (
                                <tr key={expense.id} className="group hover:bg-[#1b1b1b] transition-colors">
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.color }} />
                                      <span className="text-white text-sm">{getCategoryLabel(expense.category)}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-gray-400 text-sm">{expense.description || '—'}</td>
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-col gap-1">
                                      {expense.isRecurring
                                        ? <Badge variant="info" className="flex items-center gap-1 w-fit"><RefreshCw className="w-2.5 h-2.5" />Récurrent</Badge>
                                        : <Badge variant="default">Ponctuel</Badge>}
                                      {expense.isRecurring && expense.paymentDay && (
                                        <span className="text-[10px] text-white/30">le {expense.paymentDay} du mois</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-gray-400 text-sm">
                                    {expense.payDate
                                      ? new Date(expense.payDate).toLocaleDateString('fr-FR')
                                      : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="py-3 pr-2 text-right text-white font-medium text-sm">{formatCurrency(expense.amount)}</td>
                                  <td className="py-3 pr-2 text-right text-gray-500 text-sm">{tva > 0 ? `${tva}%` : '—'}</td>
                                  <td className="py-3 pr-4 text-right text-sm">
                                    {ht !== null
                                      ? <span className="text-[#D4AF37] font-medium">{formatCurrency(ht)}</span>
                                      : <span className="text-gray-600">—</span>}
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => openEditExpense(expense)}
                                        className="text-gray-500 hover:text-blue-400 transition-colors p-1">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteExpense(expense.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#2e2e2e]">
                              <td colSpan={4} className="py-3 text-gray-400 text-sm font-medium">Total</td>
                              <td className="py-3 pr-2 text-right text-[#D4AF37] font-bold">{formatCurrency(totalExpenses)}</td>
                              <td></td>
                              <td className="py-3 pr-4 text-right">
                                {hasTvaExpenses && (
                                  <span className="text-[#D4AF37]/70 font-semibold text-sm">{formatCurrency(totalExpensesHT)}</span>
                                )}
                              </td>
                              <td></td>
                            </tr>
                            {hasTvaExpenses && (
                              <tr>
                                <td colSpan={4} className="pt-1 pb-2 text-gray-500 text-xs">dont TVA</td>
                                <td colSpan={3} className="pt-1 pb-2 text-right text-gray-500 text-xs pr-4">
                                  {formatCurrency(totalExpenses - totalExpensesHT)}
                                </td>
                                <td></td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {expenseByCategory.length > 0 && (
                <Card>
                  <h3 className="text-white font-semibold mb-4">Par catégorie</h3>
                  <div className="space-y-3">
                    {expenseByCategory.sort((a, b) => b.amount - a.amount).map((item) => {
                      const cat = EXPENSE_CATEGORIES.find((c) => c.value === item.category)
                      const pct = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0
                      return (
                        <div key={item.category}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color }} />
                              <span className="text-gray-300 text-sm">{getCategoryLabel(item.category)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
                              <span className="text-white font-medium text-sm">{formatCurrency(item.amount)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1b1b1b] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: cat?.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════════════ ONGLET SOUS-LOCATION ═══════════════════ */}
      {mainTab === 'sous-location' && (
        <>
          {loadingSousLoc ? <LoadingPage /> : sousLocProps.length === 0 ? (
            <EmptyState icon={Home} title="Aucun logement en sous-location"
              description="Ajoutez un logement avec le type de gestion Sous-location." />
          ) : (
            <>
              {/* Property selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-400 text-sm">Logement :</span>
                {sousLocProps.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPropId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedPropId === p.id ? 'bg-[#D4AF37] text-black' : 'bg-[#242424] border border-[#2e2e2e] text-gray-400 hover:text-white'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>

              {selectedProp && (
                <>
                  {/* Property info */}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{selectedProp.name}</p>
                      <p className="text-gray-400 text-xs">{selectedProp.city} · {selectedProp.owner.name}</p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Sous-location
                    </span>
                  </div>

                  {/* Summary cards */}
                  {sortedExpenses.length > 0 && (() => {
                    const totLoyer = sortedExpenses.reduce((s, e) => s + e.loyer, 0)
                    const totElec  = sortedExpenses.reduce((s, e) => s + e.electricite, 0)
                    const totWifi  = sortedExpenses.reduce((s, e) => s + e.wifi, 0)
                    const totAutres = sortedExpenses.reduce((s, e) => s + e.autresCharges, 0)
                    const totAll   = totLoyer + totElec + totWifi + totAutres
                    const avgMonth = totAll / sortedExpenses.length
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card padding="sm" className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Total charges</p>
                          <p className="text-red-400 font-bold text-xl">{formatCurrency(totAll)}</p>
                          <p className="text-gray-500 text-xs">{sortedExpenses.length} mois</p>
                        </Card>
                        <Card padding="sm" className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Moy. mensuelle</p>
                          <p className="text-amber-400 font-bold text-xl">{formatCurrency(avgMonth)}</p>
                        </Card>
                        <Card padding="sm" className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Loyer total</p>
                          <p className="text-white font-bold text-xl">{formatCurrency(totLoyer)}</p>
                        </Card>
                        <Card padding="sm" className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Charges (élec+wifi+autres)</p>
                          <p className="text-blue-400 font-bold text-xl">{formatCurrency(totElec + totWifi + totAutres)}</p>
                        </Card>
                      </div>
                    )
                  })()}

                  {/* Monthly table */}
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Détail mensuel — {selectedProp.name}</h3>
                      <span className="text-gray-400 text-sm">{sortedExpenses.length} mois</span>
                    </div>
                    {sortedExpenses.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">
                        Aucune donnée — saisir les charges dans Facturation → Sous-location
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                              <th className="text-left pb-3 pr-4">Mois</th>
                              <th className="text-right pb-3 pr-4">Loyer</th>
                              <th className="text-right pb-3 pr-4">Électricité</th>
                              <th className="text-right pb-3 pr-4">Wifi</th>
                              <th className="text-right pb-3 pr-4">Autres</th>
                              <th className="text-right pb-3 pr-4">Total</th>
                              <th className="text-right pb-3 pr-4">Séjours</th>
                              <th className="text-right pb-3 pr-4">Nuits</th>
                              <th className="pb-3 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2e2e2e]">
                            {sortedExpenses.map((e) => {
                              const total = e.loyer + e.electricite + e.wifi + e.autresCharges
                              return (
                                <tr key={e.id} className="group hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 pr-4 text-white font-medium capitalize">
                                    {getMonthName(e.month)} {e.year}
                                  </td>
                                  <td className="py-3 pr-4 text-right text-gray-300">{formatCurrency(e.loyer)}</td>
                                  <td className="py-3 pr-4 text-right text-gray-300">{formatCurrency(e.electricite)}</td>
                                  <td className="py-3 pr-4 text-right text-gray-300">{formatCurrency(e.wifi)}</td>
                                  <td className="py-3 pr-4 text-right text-gray-300">{formatCurrency(e.autresCharges)}</td>
                                  <td className="py-3 pr-4 text-right text-[#D4AF37] font-semibold">{formatCurrency(total)}</td>
                                  <td className="py-3 pr-4 text-right text-gray-400">{e.nbSejours || '—'}</td>
                                  <td className="py-3 pr-4 text-right text-gray-400">{e.nbNuits || '—'}</td>
                                  <td className="py-3">
                                    <button onClick={() => handleDeleteSubletExpense(e.id)}
                                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#2e2e2e] font-semibold">
                              <td className="py-3 pr-4 text-gray-400 text-xs uppercase tracking-wider">Total</td>
                              {(['loyer','electricite','wifi','autresCharges'] as const).map(field => (
                                <td key={field} className="py-3 pr-4 text-right text-gray-300">
                                  {formatCurrency(sortedExpenses.reduce((s, e) => s + e[field], 0))}
                                </td>
                              ))}
                              <td className="py-3 pr-4 text-right text-[#D4AF37] font-bold">
                                {formatCurrency(sortedExpenses.reduce((s, e) => s + e.loyer + e.electricite + e.wifi + e.autresCharges, 0))}
                              </td>
                              <td className="py-3 pr-4 text-right text-gray-400">
                                {sortedExpenses.reduce((s, e) => s + (e.nbSejours || 0), 0) || '—'}
                              </td>
                              <td className="py-3 text-right text-gray-400">
                                {sortedExpenses.reduce((s, e) => s + (e.nbNuits || 0), 0) || '—'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════════════ ONGLET AVANCES ═══════════════════ */}
      {mainTab === 'avances' && (
        <>
          {loadingAdvances ? <div className="text-gray-500 text-sm text-center py-10">Chargement…</div> : (
            <>
              {/* Summary */}
              {advances.length > 0 && (() => {
                const enAttente  = advances.filter(a => a.status === 'en_attente')
                const rembourse  = advances.filter(a => a.status === 'rembourse')
                const totalDu    = enAttente.reduce((s, a) => s + a.amount, 0)
                const totalRemb  = rembourse.reduce((s, a) => s + a.amount, 0)
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card padding="sm" className="text-center">
                      <p className="text-gray-400 text-xs mb-1">Total avancé</p>
                      <p className="text-white font-bold text-xl">{formatCurrency(totalDu + totalRemb)}</p>
                      <p className="text-gray-500 text-xs">{advances.length} avance(s)</p>
                    </Card>
                    <Card padding="sm" className="text-center">
                      <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />En attente</p>
                      <p className="text-red-400 font-bold text-xl">{formatCurrency(totalDu)}</p>
                      <p className="text-gray-500 text-xs">{enAttente.length} avance(s)</p>
                    </Card>
                    <Card padding="sm" className="text-center">
                      <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1"><Check className="w-3 h-3" />Remboursé</p>
                      <p className="text-emerald-400 font-bold text-xl">{formatCurrency(totalRemb)}</p>
                      <p className="text-gray-500 text-xs">{rembourse.length} avance(s)</p>
                    </Card>
                  </div>
                )
              })()}

              {/* Table */}
              {advances.length === 0 ? (
                <EmptyState icon={TrendingDown} title="Aucune avance enregistrée"
                  description="Notez ici tout ce que vous avancez pour les propriétaires lors de l'onboarding."
                  actionLabel="Ajouter une avance" onAction={() => setIsAdvanceModalOpen(true)} />
              ) : (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Suivi des avances</h3>
                    <span className="text-gray-400 text-sm">{advances.length} entrée(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                          <th className="text-left pb-3 pr-4">Date</th>
                          <th className="text-left pb-3 pr-4">Description</th>
                          <th className="text-left pb-3 pr-4">Propriétaire</th>
                          <th className="text-left pb-3 pr-4">Logement</th>
                          <th className="text-right pb-3 pr-4">Montant</th>
                          <th className="text-center pb-3 pr-4">Statut</th>
                          <th className="pb-3 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2e2e2e]">
                        {advances.map((a) => (
                          <tr key={a.id} className={`group transition-colors hover:bg-white/[0.02] ${a.status === 'rembourse' ? 'opacity-50' : ''}`}>
                            <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                              {new Date(a.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3 pr-4">
                              <p className="text-white font-medium">{a.description}</p>
                              {a.notes && <p className="text-gray-500 text-xs mt-0.5">{a.notes}</p>}
                            </td>
                            <td className="py-3 pr-4 text-gray-300">{a.owner?.name ?? '—'}</td>
                            <td className="py-3 pr-4 text-gray-300 max-w-[140px] truncate">{a.property?.name ?? '—'}</td>
                            <td className="py-3 pr-4 text-right text-white font-semibold">{formatCurrency(a.amount)}</td>
                            <td className="py-3 pr-4 text-center">
                              <button onClick={() => handleToggleAdvanceStatus(a)}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                  a.status === 'en_attente'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}>
                                {a.status === 'en_attente' ? 'En attente' : 'Remboursé'}
                              </button>
                            </td>
                            <td className="py-3">
                              <button onClick={() => handleDeleteAdvance(a.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#2e2e2e]">
                          <td colSpan={4} className="py-3 text-gray-400 text-xs font-medium">Total en attente</td>
                          <td className="py-3 text-right text-red-400 font-bold">
                            {formatCurrency(advances.filter(a => a.status === 'en_attente').reduce((s, a) => s + a.amount, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* New Report Modal */}
      <Modal isOpen={isNewReportModalOpen} onClose={() => setIsNewReportModalOpen(false)} title="Ouvrir un nouveau mois">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Crée un rapport pour le mois choisi. Les dépenses récurrentes du mois précédent seront copiées automatiquement.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Mois</label>
              <select
                value={newReportForm.month}
                onChange={e => setNewReportForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40">
                {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Année</label>
              <input
                type="number" min="2024" max="2030"
                value={newReportForm.year}
                onChange={e => setNewReportForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
              />
            </div>
          </div>
          {newReportError && <p className="text-red-400 text-sm">{newReportError}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsNewReportModalOpen(false)}>Annuler</Button>
            <Button isLoading={newReportSaving} onClick={handleCreateReport}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Add Advance Modal */}
      <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title="Ajouter une avance">
        <div className="space-y-4">
          <Input label="Description *" value={advanceForm.description}
            onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
            placeholder="Ex: Achat boîte à clés, mobilier, frais de photos…" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant (€) *" type="number" min="0" step="0.01" value={advanceForm.amount}
              onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} placeholder="150" />
            <Input label="Date" type="date" value={advanceForm.date}
              onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })} />
          </div>
          <Select label="Propriétaire (optionnel)" value={advanceForm.ownerId}
            onChange={(e) => setAdvanceForm({ ...advanceForm, ownerId: e.target.value })}>
            <option value="">— Sélectionner un propriétaire —</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
          <Select label="Logement (optionnel)" value={advanceForm.propertyId}
            onChange={(e) => setAdvanceForm({ ...advanceForm, propertyId: e.target.value })}>
            <option value="">— Sélectionner un logement —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Notes (optionnel)" value={advanceForm.notes}
            onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })} placeholder="Détails supplémentaires…" />
          {advanceError && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{advanceError}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsAdvanceModalOpen(false)}>Annuler</Button>
            <Button isLoading={advanceSaving} onClick={handleAddAdvance}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Add SubletExpense Modal */}
      <Modal isOpen={isSubletModalOpen} onClose={() => setIsSubletModalOpen(false)} title="Ajouter une dépense — Sous-location">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mois" value={String(subletForm.month)} onChange={(e) => setSubletForm({ ...subletForm, month: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </Select>
            <Input label="Année" type="number" value={subletForm.year} onChange={(e) => setSubletForm({ ...subletForm, year: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Loyer (€)" type="number" min="0" step="0.01" value={subletForm.loyer}
              onChange={(e) => setSubletForm({ ...subletForm, loyer: e.target.value })} placeholder="0" />
            <Input label="Électricité (€)" type="number" min="0" step="0.01" value={subletForm.electricite}
              onChange={(e) => setSubletForm({ ...subletForm, electricite: e.target.value })} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Wifi (€)" type="number" min="0" step="0.01" value={subletForm.wifi}
              onChange={(e) => setSubletForm({ ...subletForm, wifi: e.target.value })} placeholder="0" />
            <Input label="Autres charges (€)" type="number" min="0" step="0.01" value={subletForm.autresCharges}
              onChange={(e) => setSubletForm({ ...subletForm, autresCharges: e.target.value })} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Séjours" type="number" min="0" value={subletForm.nbSejours}
              onChange={(e) => setSubletForm({ ...subletForm, nbSejours: e.target.value })} placeholder="0" />
            <Input label="Nuits" type="number" min="0" value={subletForm.nbNuits}
              onChange={(e) => setSubletForm({ ...subletForm, nbNuits: e.target.value })} placeholder="0" />
          </div>
          <Input label="Notes (optionnel)" value={subletForm.notes}
            onChange={(e) => setSubletForm({ ...subletForm, notes: e.target.value })} placeholder="Remarques..." />
          {subletError && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{subletError}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsSubletModalOpen(false)}>Annuler</Button>
            <Button isLoading={subletSaving} onClick={handleAddSubletExpense}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Expense Modal (conciergerie) */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null) }}
        title={editingExpense ? 'Modifier la dépense' : 'Ajouter une dépense'}>
        <div className="space-y-4">
          {!editingExpense && (
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Mois concerné</label>
              <select
                value={targetReportId ?? ''}
                onChange={e => setTargetReportId(Number(e.target.value))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40">
                {reports.map(r => (
                  <option key={r.id} value={r.id}>
                    {getMonthName(r.month)} {r.year}{r.id === selectedReportId ? ' (affiché)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Select label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </Select>
          <Input label="Description (optionnel)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Abonnement Lodgify" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Montant TTC (€)" type="number" min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="150" />
            </div>
            <div>
              <Input label="TVA (%)" type="number" min="0" max="100" step="0.1" value={form.tva}
                onChange={(e) => setForm({ ...form, tva: e.target.value })} placeholder="20" />
              {form.tva && parseFloat(form.tva) > 0 && form.amount && (
                <p className="text-xs text-[#D4AF37] mt-1">
                  HT : {formatCurrency(parseFloat(form.amount) / (1 + parseFloat(form.tva) / 100))}
                </p>
              )}
            </div>
          </div>
          <Input label="Date de paiement" type="date" value={form.payDate}
            onChange={(e) => setForm({ ...form, payDate: e.target.value })} />
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#1b1b1b] border border-[#2e2e2e] hover:border-[#D4AF37]/30 transition-colors">
            <input type="checkbox" checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="w-4 h-4 rounded" />
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2"><Repeat className="w-3.5 h-3.5 text-blue-400" />Dépense récurrente</p>
              <p className="text-gray-500 text-xs">Se prélève chaque mois automatiquement</p>
            </div>
          </label>
          {form.isRecurring && (
            <Input label="Jour de prélèvement (1–31)" type="number" min="1" max="31" value={form.paymentDay}
              onChange={(e) => setForm({ ...form, paymentDay: e.target.value })}
              placeholder="Ex: 1 (= prélevé le 1er du mois)" />
          )}
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => { setIsModalOpen(false); setEditingExpense(null) }}>Annuler</Button>
            <Button isLoading={saving} onClick={handleAddExpense}>{editingExpense ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════ ONGLET VUE GLOBALE ═══════════════════ */}
      {mainTab === 'global' && (() => {
        // Agréger par mois
        const byMonth = new Map<string, { month: number; year: number; caBrut: number; total: number; recurring: number; oneTime: number }>()
        for (const e of allExpenses) {
          if (!e.month || !e.year) continue
          const key = `${e.year}-${String(e.month).padStart(2,'0')}`
          if (!byMonth.has(key)) byMonth.set(key, { month: e.month, year: e.year, caBrut: e.caBrut ?? 0, total: 0, recurring: 0, oneTime: 0 })
          const m = byMonth.get(key)!
          m.total += e.amount
          if (e.isRecurring) m.recurring += e.amount; else m.oneTime += e.amount
        }
        const months = Array.from(byMonth.values()).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)

        // Récurrentes : prendre les plus récentes occurrences groupées par description+catégorie
        const latestMonth = months[0]
        const latestRecurring = latestMonth
          ? allExpenses.filter(e => e.isRecurring && e.month === latestMonth.month && e.year === latestMonth.year)
          : allExpenses.filter(e => e.isRecurring)
        const monthlyRecurringTotal = latestRecurring.reduce((s, e) => s + e.amount, 0)

        // Calendrier prélèvements ce mois (récurrentes avec paymentDay)
        const withDay = latestRecurring.filter(e => e.paymentDay).sort((a, b) => (a.paymentDay ?? 0) - (b.paymentDay ?? 0))
        const withoutDay = latestRecurring.filter(e => !e.paymentDay)

        // Répartition par catégorie (tous mois)
        const byCat = new Map<string, number>()
        for (const e of allExpenses) {
          byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount)
        }
        const catList = Array.from(byCat.entries()).map(([cat, amt]) => ({ cat, amt })).sort((a,b) => b.amt - a.amt)
        const totalAllTime = allExpenses.reduce((s,e) => s + e.amount, 0)

        const avgMonthly = months.length > 0 ? months.reduce((s, m) => s + m.total, 0) / months.length : 0

        const ordinal = (n: number) => n === 1 ? '1er' : `${n}`

        return (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card padding="sm" className="text-center">
                <p className="text-gray-400 text-xs mb-1">Total historique</p>
                <p className="text-red-400 font-bold text-xl">{formatCurrency(totalAllTime)}</p>
                <p className="text-gray-500 text-xs">{allExpenses.length} dépense(s)</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-gray-400 text-xs mb-1">Moy. mensuelle</p>
                <p className="text-amber-400 font-bold text-xl">{formatCurrency(avgMonthly)}</p>
                <p className="text-gray-500 text-xs">sur {months.length} mois</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-gray-400 text-xs mb-1">Récurrentes / mois</p>
                <p className="text-blue-400 font-bold text-xl">{formatCurrency(monthlyRecurringTotal)}</p>
                <p className="text-gray-500 text-xs">{latestRecurring.length} poste(s) fixes</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-gray-400 text-xs mb-1">Charge annuelle est.</p>
                <p className="text-purple-400 font-bold text-xl">{formatCurrency(monthlyRecurringTotal * 12)}</p>
                <p className="text-gray-500 text-xs">récurrentes × 12</p>
              </Card>
            </div>

            {/* Tableau multi-mois CA vs Dépenses vs Bénéfice */}
            {months.length > 0 && (
              <Card>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
                  Évolution mensuelle — CA, Dépenses &amp; Bénéfice
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-[#2e2e2e]">
                        <th className="text-left pb-3 pr-4">Mois</th>
                        <th className="text-right pb-3 pr-4">CA brut</th>
                        <th className="text-right pb-3 pr-4">Dépenses</th>
                        <th className="text-right pb-3 pr-4">Récurrentes</th>
                        <th className="text-right pb-3 pr-4">Ponctuelles</th>
                        <th className="text-right pb-3 pr-4">Bénéfice brut</th>
                        <th className="text-right pb-3">% dép./CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2e2e2e]">
                      {months.map(m => {
                        const benef = m.caBrut - m.total
                        const pct = m.caBrut > 0 ? (m.total / m.caBrut) * 100 : 0
                        return (
                          <tr key={`${m.year}-${m.month}`} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3 pr-4">
                              <button
                                onClick={() => { setMainTab('conciergerie'); handleSelectReport(reports.find(r => r.month === m.month && r.year === m.year)?.id ?? 0) }}
                                className="text-white font-medium hover:text-[#D4AF37] transition-colors"
                              >
                                {getMonthName(m.month)} {m.year}
                              </button>
                            </td>
                            <td className="py-3 pr-4 text-right text-green-400 font-medium">{m.caBrut > 0 ? formatCurrency(m.caBrut) : <span className="text-white/20">—</span>}</td>
                            <td className="py-3 pr-4 text-right text-red-400 font-medium">{formatCurrency(m.total)}</td>
                            <td className="py-3 pr-4 text-right text-blue-300/70">{formatCurrency(m.recurring)}</td>
                            <td className="py-3 pr-4 text-right text-gray-400">{formatCurrency(m.oneTime)}</td>
                            <td className={`py-3 pr-4 text-right font-semibold ${benef >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {m.caBrut > 0 ? formatCurrency(benef) : <span className="text-white/20">—</span>}
                            </td>
                            <td className="py-3 text-right">
                              {m.caBrut > 0 ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct > 40 ? 'bg-red-500/15 text-red-400' : pct > 25 ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              ) : <span className="text-white/20">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Calendrier des prélèvements */}
              <Card>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-400" />
                  Calendrier des prélèvements
                  {latestMonth && <span className="text-gray-500 font-normal text-sm">— {getMonthName(latestMonth.month)} {latestMonth.year}</span>}
                </h3>
                {latestRecurring.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">Aucune charge récurrente enregistrée</p>
                ) : (
                  <div className="space-y-2">
                    {withDay.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-400 font-bold text-xs">{ordinal(e.paymentDay!)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{e.description || getCategoryLabel(e.category)}</p>
                          <p className="text-gray-500 text-xs">{getCategoryLabel(e.category)}</p>
                        </div>
                        <span className="text-red-400 font-semibold text-sm">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                    {withoutDay.length > 0 && (
                      <>
                        {withDay.length > 0 && <p className="text-xs text-white/20 pt-1">Sans date de prélèvement</p>}
                        {withoutDay.map(e => (
                          <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] opacity-60">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                              <AlertCircle className="w-4 h-4 text-white/30" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white/60 text-sm truncate">{e.description || getCategoryLabel(e.category)}</p>
                              <p className="text-gray-600 text-xs">Jour non renseigné</p>
                            </div>
                            <span className="text-gray-400 font-semibold text-sm">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.06] mt-1">
                      <span className="text-gray-400 text-sm font-medium">Total mensuel fixe</span>
                      <span className="text-[#D4AF37] font-bold">{formatCurrency(monthlyRecurringTotal)}</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Répartition par catégorie (tous mois) */}
              <Card>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  Répartition par catégorie (historique)
                </h3>
                {catList.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {catList.map(({ cat, amt }) => {
                      const pct = totalAllTime > 0 ? (amt / totalAllTime) * 100 : 0
                      const color = EXPENSE_CATEGORIES.find(c => c.value === cat)?.color ?? '#6B7280'
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-gray-300 text-sm">{getCategoryLabel(cat)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 text-xs">{pct.toFixed(1)}%</span>
                              <span className="text-white font-semibold text-sm w-20 text-right">{formatCurrency(amt)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                      <span className="text-gray-400 text-sm">Total toutes catégories</span>
                      <span className="text-white font-bold">{formatCurrency(totalAllTime)}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Impact sur bénéfice — analyse */}
            {months.length > 0 && (() => {
              const withCA = months.filter(m => m.caBrut > 0)
              if (withCA.length === 0) return null
              const avgBenef = withCA.reduce((s, m) => s + (m.caBrut - m.total), 0) / withCA.length
              const avgPct = withCA.reduce((s, m) => s + (m.total / m.caBrut) * 100, 0) / withCA.length
              const best = [...withCA].sort((a, b) => (b.caBrut - b.total) - (a.caBrut - a.total))[0]
              const worst = [...withCA].sort((a, b) => (a.caBrut - a.total) - (b.caBrut - b.total))[0]
              return (
                <Card>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
                    Impact sur le bénéfice
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                      <p className="text-xs text-emerald-400/60 mb-1">Bénéfice moy./mois</p>
                      <p className="text-emerald-400 font-bold text-lg">{formatCurrency(avgBenef)}</p>
                      <p className="text-xs text-white/20 mt-0.5">après dépenses</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-center">
                      <p className="text-xs text-red-400/60 mb-1">Dépenses moy./CA</p>
                      <p className="text-red-400 font-bold text-lg">{avgPct.toFixed(1)}%</p>
                      <p className="text-xs text-white/20 mt-0.5">du CA consommé</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                      <p className="text-xs text-white/40 mb-1">Meilleur mois</p>
                      <p className="text-white font-bold text-lg">{formatCurrency(best.caBrut - best.total)}</p>
                      <p className="text-xs text-white/20 mt-0.5">{getMonthName(best.month)} {best.year}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                      <p className="text-xs text-white/40 mb-1">Mois le + chargé</p>
                      <p className="text-amber-400 font-bold text-lg">{formatCurrency(worst.total)}</p>
                      <p className="text-xs text-white/20 mt-0.5">{getMonthName(worst.month)} {worst.year}</p>
                    </div>
                  </div>
                </Card>
              )
            })()}
          </div>
        )
      })()}
    </div>
  )
}

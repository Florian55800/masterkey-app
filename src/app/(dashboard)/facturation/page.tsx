'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Printer,
  Trophy, TrendingUp, Home, X, Check, AlertCircle, Euro,
  Building2, Zap, Wifi, MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Owner { id: number; name: string }

interface PropertyRevenue {
  id: number
  propertyId: number
  month: number
  year: number
  platform: string
  platformAmount: number
  cleaningFees: number
  commissionRate: number
  notes: string | null
}

interface SubletExpense {
  id: number
  propertyId: number
  month: number
  year: number
  loyer: number
  electricite: number
  wifi: number
  autresCharges: number
  notes: string | null
}

interface Property {
  id: number
  name: string
  address: string
  city: string
  type: string
  typeGestion: string
  commissionRate: number
  status: string
  owner: Owner
  revenues: PropertyRevenue[]
  subletExpenses: SubletExpense[]
}

type ActiveTab = 'conciergerie' | 'sous-location' | 'classement'

const PLATFORMS = ['airbnb', 'booking', 'direct', 'autre']
const PLATFORM_COLORS: Record<string, string> = {
  airbnb: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  booking: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  direct: 'bg-green-500/10 text-green-400 border-green-500/20',
  autre: 'bg-white/5 text-white/40 border-white/10',
}
const PLATFORM_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking', direct: 'Direct', autre: 'Autre',
}
const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ─── Computed helpers ─────────────────────────────────────────────────────────

function calcRevenue(r: PropertyRevenue) {
  const base = r.platformAmount - r.cleaningFees
  const partMK = base * (r.commissionRate / 100)
  const partProprio = base - partMK
  return { base, partMK, partProprio }
}

function propertyTotals(revenues: PropertyRevenue[]) {
  return revenues.reduce(
    (acc, r) => {
      const c = calcRevenue(r)
      return {
        platformAmount: acc.platformAmount + r.platformAmount,
        cleaningFees: acc.cleaningFees + r.cleaningFees,
        base: acc.base + c.base,
        partMK: acc.partMK + c.partMK,
        partProprio: acc.partProprio + c.partProprio,
      }
    },
    { platformAmount: 0, cleaningFees: 0, base: 0, partMK: 0, partProprio: 0 }
  )
}

// ─── Revenue Row Modal ────────────────────────────────────────────────────────

function RevenueModal({
  isOpen,
  onClose,
  onSave,
  initial,
  property,
  month,
  year,
  existingPlatforms,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<PropertyRevenue>) => Promise<void>
  initial: Partial<PropertyRevenue> | null
  property: Property
  month: number
  year: number
  existingPlatforms: string[]
}) {
  const [form, setForm] = useState({
    platform: initial?.platform ?? 'airbnb',
    platformAmount: String(initial?.platformAmount ?? ''),
    cleaningFees: String(initial?.cleaningFees ?? ''),
    commissionRate: String(initial?.commissionRate ?? property.commissionRate),
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        platform: initial?.platform ?? (existingPlatforms.includes('airbnb') ? 'booking' : 'airbnb'),
        platformAmount: String(initial?.platformAmount ?? ''),
        cleaningFees: String(initial?.cleaningFees ?? ''),
        commissionRate: String(initial?.commissionRate ?? property.commissionRate),
        notes: initial?.notes ?? '',
      })
    }
  }, [isOpen, initial, property.commissionRate, existingPlatforms])

  const f = (v: string) => parseFloat(v) || 0
  const base = f(form.platformAmount) - f(form.cleaningFees)
  const partMK = base * (f(form.commissionRate) / 100)
  const partProprio = base - partMK

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      ...( initial?.id ? { id: initial.id } : {} ),
      platform: form.platform,
      platformAmount: f(form.platformAmount),
      cleaningFees: f(form.cleaningFees),
      commissionRate: f(form.commissionRate),
      notes: form.notes || null,
      month,
      year,
      propertyId: property.id,
    })
    setSaving(false)
    onClose()
  }

  const availablePlatforms = initial?.id
    ? PLATFORMS
    : PLATFORMS.filter(p => !existingPlatforms.includes(p))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${initial?.id ? 'Modifier' : 'Ajouter'} — ${property.name}`}>
      <div className="space-y-4">
        {/* Platform selector */}
        {!initial?.id && (
          <div>
            <label className="text-xs text-white/40 font-medium block mb-2">Plateforme</label>
            <div className="flex gap-2 flex-wrap">
              {availablePlatforms.map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, platform: p }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    form.platform === p
                      ? PLATFORM_COLORS[p]
                      : 'bg-transparent border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Montant plateforme (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.platformAmount}
              onChange={e => setForm(f => ({ ...f, platformAmount: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Frais ménage (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.cleaningFees}
              onChange={e => setForm(f => ({ ...f, cleaningFees: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Commission (%)</label>
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.commissionRate}
              onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: facturer 60€ supp."
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
        </div>

        {/* Live preview */}
        {f(form.platformAmount) > 0 && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Base comm.</p>
              <p className="text-white font-semibold text-sm">{formatCurrency(base)}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Part MasterKey</p>
              <p className="text-[#D4AF37] font-bold text-sm">{formatCurrency(partMK)}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Part propriétaire</p>
              <p className="text-green-400 font-semibold text-sm">{formatCurrency(partProprio)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button isLoading={saving} onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Sublet Expense Modal ─────────────────────────────────────────────────────

function SubletModal({
  isOpen, onClose, onSave, initial, property, month, year,
}: {
  isOpen: boolean; onClose: () => void
  onSave: (data: Partial<SubletExpense>) => Promise<void>
  initial: Partial<SubletExpense> | null
  property: Property; month: number; year: number
}) {
  const [form, setForm] = useState({
    loyer: String(initial?.loyer ?? ''),
    electricite: String(initial?.electricite ?? ''),
    wifi: String(initial?.wifi ?? ''),
    autresCharges: String(initial?.autresCharges ?? ''),
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm({
      loyer: String(initial?.loyer ?? ''),
      electricite: String(initial?.electricite ?? ''),
      wifi: String(initial?.wifi ?? ''),
      autresCharges: String(initial?.autresCharges ?? ''),
      notes: initial?.notes ?? '',
    })
  }, [isOpen, initial])

  const f = (v: string) => parseFloat(v) || 0
  const total = f(form.loyer) + f(form.electricite) + f(form.wifi) + f(form.autresCharges)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      propertyId: property.id, month, year,
      loyer: f(form.loyer), electricite: f(form.electricite),
      wifi: f(form.wifi), autresCharges: f(form.autresCharges),
      notes: form.notes || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Charges — ${property.name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'loyer', label: 'Loyer (€)', icon: Home },
            { key: 'electricite', label: 'Électricité (€)', icon: Zap },
            { key: 'wifi', label: 'Wi-Fi (€)', icon: Wifi },
            { key: 'autresCharges', label: 'Autres charges (€)', icon: MoreHorizontal },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-white/40 block mb-1.5">{label}</label>
              <input
                type="number" min="0" step="0.01"
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1.5">Notes</label>
          <input type="text" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
          />
        </div>
        {total > 0 && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-white/30 text-[10px] mb-0.5">Total charges</p>
            <p className="text-red-400 font-bold text-lg">{formatCurrency(total)}</p>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button isLoading={saving} onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Print Modal ──────────────────────────────────────────────────────────────

function PrintModal({
  isOpen, onClose, property, revenues, month, year,
}: {
  isOpen: boolean; onClose: () => void
  property: Property; revenues: PropertyRevenue[]; month: number; year: number
}) {
  const totals = propertyTotals(revenues)
  const handlePrint = () => window.print()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rapport — ${property.name}`}>
      {/* Print content */}
      <div id="print-area" className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">{property.name}</h2>
            <p className="text-white/40 text-sm">{property.address}, {property.city}</p>
            <p className="text-white/40 text-sm mt-0.5">Propriétaire : <span className="text-white/70">{property.owner.name}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[#D4AF37] font-semibold">{MONTHS_FR[month]} {year}</p>
            <p className="text-white/30 text-xs mt-0.5">Commission : {property.commissionRate}%</p>
          </div>
        </div>

        {/* Revenue table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Plateforme', 'Montant', 'Ménage', 'Com.%', 'Base comm.', 'Part MK', 'Part proprio', 'Notes'].map(h => (
                  <th key={h} className="text-left text-white/30 text-[11px] font-medium py-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revenues.map(r => {
                const { base, partMK, partProprio } = calcRevenue(r)
                return (
                  <tr key={r.id} className="border-b border-white/[0.03]">
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${PLATFORM_COLORS[r.platform]}`}>
                        {PLATFORM_LABELS[r.platform]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-white font-medium">{formatCurrency(r.platformAmount)}</td>
                    <td className="py-2.5 pr-3 text-white/60">{formatCurrency(r.cleaningFees)}</td>
                    <td className="py-2.5 pr-3 text-white/60">{r.commissionRate}%</td>
                    <td className="py-2.5 pr-3 text-white/80">{formatCurrency(base)}</td>
                    <td className="py-2.5 pr-3 text-[#D4AF37] font-semibold">{formatCurrency(partMK)}</td>
                    <td className="py-2.5 pr-3 text-green-400 font-semibold">{formatCurrency(partProprio)}</td>
                    <td className="py-2.5 text-white/30 text-xs italic">{r.notes ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals summary */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-[#141414] rounded-xl p-3 text-center">
            <p className="text-white/30 text-[10px] mb-1">Total facturé</p>
            <p className="text-white font-bold">{formatCurrency(totals.platformAmount)}</p>
          </div>
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-3 text-center">
            <p className="text-[#D4AF37]/60 text-[10px] mb-1">Part MasterKey</p>
            <p className="text-[#D4AF37] font-bold">{formatCurrency(totals.partMK)}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-green-400/60 text-[10px] mb-1">Part propriétaire</p>
            <p className="text-green-400 font-bold">{formatCurrency(totals.partProprio)}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Hidden print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; background: white; color: black; }
          #print-area h2 { color: #1a1a1a; font-size: 20px; }
          #print-area p { color: #555; }
          #print-area table { width: 100%; border-collapse: collapse; }
          #print-area th, #print-area td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; color: #333; }
          #print-area th { background: #f5f5f5; font-weight: 600; }
          .no-print { display: none !important; }
        }
      `}</style>
    </Modal>
  )
}

// ─── Property Revenue Card ────────────────────────────────────────────────────

function PropertyRevenueCard({
  property, month, year, onReload,
}: {
  property: Property; month: number; year: number; onReload: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<Partial<PropertyRevenue> | null>(null)
  const [printOpen, setPrintOpen] = useState(false)

  const revenues = property.revenues
  const totals = propertyTotals(revenues)
  const usedPlatforms = revenues.map(r => r.platform)

  const handleSaveRevenue = async (data: Partial<PropertyRevenue>) => {
    if (data.id) {
      await fetch(`/api/facturation/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/facturation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    onReload()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette ligne ?')) return
    await fetch(`/api/facturation/${id}`, { method: 'DELETE' })
    onReload()
  }

  const openAdd = () => { setEditingRevenue(null); setModalOpen(true) }
  const openEdit = (r: PropertyRevenue) => { setEditingRevenue(r); setModalOpen(true) }

  return (
    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-white font-semibold">{property.name}</p>
            <p className="text-white/30 text-xs">{property.owner.name} · {property.commissionRate}% commission</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {revenues.length > 0 && (
            <button
              onClick={() => setPrintOpen(true)}
              className="p-2 rounded-xl text-white/20 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
              title="Rapport propriétaire"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          {usedPlatforms.length < PLATFORMS.length && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          )}
          {revenues.length > 0 && (
            <div className="text-right">
              <p className="text-[#D4AF37] font-bold text-lg leading-none">{formatCurrency(totals.partMK)}</p>
              <p className="text-white/30 text-[10px]">Part MK</p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue rows */}
      {revenues.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Plateforme', 'Montant', 'Ménage', 'Com.%', 'Base comm.', 'Part MK', 'Part proprio', 'Notes', ''].map((h, i) => (
                    <th key={i} className="text-left text-white/25 text-[10px] font-medium px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenues.map(r => {
                  const { base, partMK, partProprio } = calcRevenue(r)
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${PLATFORM_COLORS[r.platform]}`}>
                          {PLATFORM_LABELS[r.platform]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{formatCurrency(r.platformAmount)}</td>
                      <td className="px-4 py-3 text-white/50">{formatCurrency(r.cleaningFees)}</td>
                      <td className="px-4 py-3 text-white/50">{r.commissionRate}%</td>
                      <td className="px-4 py-3 text-white/70">{formatCurrency(base)}</td>
                      <td className="px-4 py-3 text-[#D4AF37] font-semibold">{formatCurrency(partMK)}</td>
                      <td className="px-4 py-3 text-green-400 font-semibold">{formatCurrency(partProprio)}</td>
                      <td className="px-4 py-3 text-white/30 text-xs italic max-w-[140px] truncate">{r.notes ?? ''}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-white/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                  <td colSpan={4} className="px-4 py-3 text-white/30 text-xs font-medium">TOTAL</td>
                  <td className="px-4 py-3 text-white/70 font-semibold">{formatCurrency(totals.base)}</td>
                  <td className="px-4 py-3 text-[#D4AF37] font-bold">{formatCurrency(totals.partMK)}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{formatCurrency(totals.partProprio)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/[0.04]">
            {revenues.map(r => {
              const { base, partMK, partProprio } = calcRevenue(r)
              return (
                <div key={r.id} className="px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${PLATFORM_COLORS[r.platform]}`}>
                      {PLATFORM_LABELS[r.platform]}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-white/30 hover:text-[#D4AF37]"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-white/30 text-[10px]">Montant</p><p className="text-white font-medium text-sm">{formatCurrency(r.platformAmount)}</p></div>
                    <div><p className="text-white/30 text-[10px]">Part MK</p><p className="text-[#D4AF37] font-bold text-sm">{formatCurrency(partMK)}</p></div>
                    <div><p className="text-white/30 text-[10px]">Part proprio</p><p className="text-green-400 font-semibold text-sm">{formatCurrency(partProprio)}</p></div>
                  </div>
                  {r.notes && <p className="text-white/30 text-xs italic">📝 {r.notes}</p>}
                </div>
              )
            })}
            <div className="px-4 py-3 flex justify-between bg-white/[0.02]">
              <span className="text-white/30 text-xs font-medium">TOTAL</span>
              <span className="text-[#D4AF37] font-bold text-sm">{formatCurrency(totals.partMK)} MK · {formatCurrency(totals.partProprio)} proprio</span>
            </div>
          </div>
        </>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="text-white/20 text-sm mb-3">Aucun résultat ce mois</p>
          <button onClick={openAdd} className="text-[#D4AF37] text-sm hover:underline flex items-center gap-1.5 mx-auto">
            <Plus className="w-4 h-4" /> Saisir les résultats
          </button>
        </div>
      )}

      {/* Revenue modal */}
      <RevenueModal
        isOpen={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSaveRevenue} initial={editingRevenue}
        property={property} month={month} year={year}
        existingPlatforms={editingRevenue?.id ? usedPlatforms.filter(p => p !== editingRevenue.platform) : usedPlatforms}
      />

      {/* Print modal */}
      {revenues.length > 0 && (
        <PrintModal
          isOpen={printOpen} onClose={() => setPrintOpen(false)}
          property={property} revenues={revenues} month={month} year={year}
        />
      )}
    </div>
  )
}

// ─── Sublet Property Card ─────────────────────────────────────────────────────

function SubletPropertyCard({
  property, month, year, onReload,
}: {
  property: Property; month: number; year: number; onReload: () => void
}) {
  const [revenueModalOpen, setRevenueModalOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<Partial<PropertyRevenue> | null>(null)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  const revenues = property.revenues
  const expense = property.subletExpenses[0] ?? null
  const totalRevenue = revenues.reduce((s, r) => s + r.platformAmount - r.cleaningFees, 0)
  const totalCharges = expense ? expense.loyer + expense.electricite + expense.wifi + expense.autresCharges : 0
  const netProfit = totalRevenue - totalCharges
  const usedPlatforms = revenues.map(r => r.platform)

  const handleSaveRevenue = async (data: Partial<PropertyRevenue>) => {
    if (data.id) {
      await fetch(`/api/facturation/${data.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/facturation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    onReload()
  }

  const handleDeleteRevenue = async (id: number) => {
    if (!confirm('Supprimer ?')) return
    await fetch(`/api/facturation/${id}`, { method: 'DELETE' })
    onReload()
  }

  const handleSaveExpense = async (data: Partial<SubletExpense>) => {
    if (data.id) {
      await fetch(`/api/facturation/sous-location/${data.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/facturation/sous-location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    onReload()
  }

  return (
    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold">{property.name}</p>
            <p className="text-white/30 text-xs">{property.owner.name} · Sous-location</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-bold text-lg leading-none ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-white/30 text-[10px]">Résultat net</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Revenue section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Revenus plateformes</p>
            {usedPlatforms.length < PLATFORMS.length && (
              <button onClick={() => { setEditingRevenue(null); setRevenueModalOpen(true) }}
                className="text-[#D4AF37] text-xs flex items-center gap-1 hover:opacity-80">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            )}
          </div>
          {revenues.length > 0 ? (
            <div className="space-y-2">
              {revenues.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-[#141414] rounded-xl px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${PLATFORM_COLORS[r.platform]}`}>
                    {PLATFORM_LABELS[r.platform]}
                  </span>
                  <span className="text-white font-medium text-sm flex-1">{formatCurrency(r.platformAmount)}</span>
                  {r.cleaningFees > 0 && <span className="text-white/30 text-xs">- {formatCurrency(r.cleaningFees)} ménage</span>}
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingRevenue(r); setRevenueModalOpen(true) }} className="p-1 rounded-lg text-white/20 hover:text-white/60"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteRevenue(r.id)} className="p-1 rounded-lg text-white/20 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between px-3 pt-1">
                <span className="text-white/30 text-xs">Total net</span>
                <span className="text-green-400 font-semibold text-sm">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          ) : (
            <p className="text-white/20 text-sm text-center py-3">Aucun revenu saisi</p>
          )}
        </div>

        {/* Charges section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Charges</p>
            <button onClick={() => setExpenseModalOpen(true)}
              className="text-white/40 text-xs flex items-center gap-1 hover:text-white/70">
              <Edit2 className="w-3 h-3" /> {expense ? 'Modifier' : 'Saisir'}
            </button>
          </div>
          {expense ? (
            <div className="bg-[#141414] rounded-xl p-3 space-y-2">
              {[
                { label: 'Loyer', value: expense.loyer, icon: '🏠' },
                { label: 'Électricité', value: expense.electricite, icon: '⚡' },
                { label: 'Wi-Fi', value: expense.wifi, icon: '📶' },
                { label: 'Autres', value: expense.autresCharges, icon: '📦' },
              ].filter(i => i.value > 0).map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-white/40 text-xs">{item.icon} {item.label}</span>
                  <span className="text-red-400 text-sm font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-white/[0.06] pt-2 mt-2">
                <span className="text-white/50 text-xs font-medium">Total charges</span>
                <span className="text-red-400 font-bold text-sm">{formatCurrency(totalCharges)}</span>
              </div>
              {expense.notes && <p className="text-white/30 text-xs italic">{expense.notes}</p>}
            </div>
          ) : (
            <p className="text-white/20 text-sm text-center py-3">Aucune charge saisie</p>
          )}
        </div>

        {/* Net result */}
        {(revenues.length > 0 || expense) && (
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
            netProfit >= 0
              ? 'bg-green-500/5 border-green-500/15'
              : 'bg-red-500/5 border-red-500/15'
          }`}>
            <span className="text-white/50 text-sm font-medium">Résultat net</span>
            <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
            </span>
          </div>
        )}
      </div>

      <RevenueModal
        isOpen={revenueModalOpen} onClose={() => setRevenueModalOpen(false)}
        onSave={handleSaveRevenue} initial={editingRevenue}
        property={property} month={month} year={year}
        existingPlatforms={editingRevenue?.id ? usedPlatforms.filter(p => p !== editingRevenue.platform) : usedPlatforms}
      />
      <SubletModal
        isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense} initial={expense}
        property={property} month={month} year={year}
      />
    </div>
  )
}

// ─── Classement ───────────────────────────────────────────────────────────────

function ClassementTab({ properties, month, year }: { properties: Property[]; month: number; year: number }) {
  const ranked = properties
    .map(p => {
      const totals = propertyTotals(p.revenues)
      return { property: p, partMK: totals.partMK, partProprio: totals.partProprio, platformAmount: totals.platformAmount }
    })
    .filter(r => r.partMK > 0)
    .sort((a, b) => b.partMK - a.partMK)

  const maxMK = ranked[0]?.partMK ?? 1

  if (ranked.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-12 h-12 text-white/10 mx-auto mb-3" />
        <p className="text-white/30 text-sm">Aucun résultat saisi pour {MONTHS_FR[month]} {year}</p>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-5 h-5 text-[#D4AF37]" />
        <h2 className="text-white font-semibold">Classement — {MONTHS_FR[month]} {year}</h2>
        <span className="text-white/30 text-sm ml-auto">{ranked.length} logements</span>
      </div>

      {ranked.map(({ property, partMK, partProprio, platformAmount }, i) => (
        <div
          key={property.id}
          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
            i === 0 ? 'border-[#D4AF37]/20 bg-[#D4AF37]/5' : 'border-white/[0.04] bg-[#181818]'
          }`}
        >
          <span className="text-xl flex-shrink-0">{medals[i] ?? `#${i + 1}`}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{property.name}</p>
            <p className="text-white/30 text-xs">{property.owner.name} · {property.city}</p>
            {/* Bar */}
            <div className="h-1.5 bg-[#1b1b1b] rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-[#D4AF37]' : 'bg-white/20'}`}
                style={{ width: `${(partMK / maxMK) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`font-bold text-lg ${i === 0 ? 'text-[#D4AF37]' : 'text-white'}`}>{formatCurrency(partMK)}</p>
            <p className="text-white/30 text-[10px]">Part MasterKey</p>
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-green-400 font-semibold text-sm">{formatCurrency(partProprio)}</p>
            <p className="text-white/30 text-[10px]">Part proprio</p>
          </div>
        </div>
      ))}

      {/* Grand total */}
      <div className="flex items-center justify-between bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-2xl px-5 py-4 mt-4">
        <span className="text-white/60 font-medium">TOTAL BRUT</span>
        <span className="text-[#D4AF37] font-bold text-2xl">{formatCurrency(ranked.reduce((s, r) => s + r.partMK, 0))}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacturationPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState<ActiveTab>('conciergerie')
  const [conciergerieProps, setConciergerieProps] = useState<Property[]>([])
  const [sousLocationProps, setSousLocationProps] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/facturation?month=${month}&year=${year}`),
        fetch(`/api/facturation/sous-location?month=${month}&year=${year}`),
      ])
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()])
      setConciergerieProps(Array.isArray(cData) ? cData : [])
      setSousLocationProps(Array.isArray(sData) ? sData : [])
    } catch {
      setConciergerieProps([])
      setSousLocationProps([])
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalBrut = conciergerieProps.reduce((s, p) => s + propertyTotals(p.revenues).partMK, 0)

  const TABS: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'conciergerie', label: 'Conciergerie', count: conciergerieProps.length },
    { key: 'sous-location', label: 'Sous-location', count: sousLocationProps.length },
    { key: 'classement', label: 'Classement' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturation</h1>
          <p className="text-white/40 mt-1">Résultats par logement et génération de rapports propriétaires</p>
        </div>
        {totalBrut > 0 && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl px-4 py-2.5 text-center">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Total brut {MONTHS_FR[month]}</p>
            <p className="text-[#D4AF37] font-bold text-xl">{formatCurrency(totalBrut)}</p>
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-xl bg-[#242424] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-white font-semibold text-lg">{MONTHS_FR[month]} {year}</span>
        </div>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-xl bg-[#242424] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'text-[#D4AF37] border-[#D4AF37]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-white/30'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingPage />
      ) : (
        <>
          {tab === 'conciergerie' && (
            <div className="space-y-4">
              {conciergerieProps.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en conciergerie</p>
                </div>
              ) : (
                conciergerieProps.map(p => (
                  <PropertyRevenueCard key={p.id} property={p} month={month} year={year} onReload={load} />
                ))
              )}
              {conciergerieProps.length > 0 && totalBrut > 0 && (
                <div className="flex items-center justify-between bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-2xl px-6 py-4">
                  <span className="text-white/50 font-medium">TOTAL BRUT MENSUEL</span>
                  <span className="text-[#D4AF37] font-bold text-2xl">{formatCurrency(totalBrut)}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'sous-location' && (
            <div className="space-y-4">
              {sousLocationProps.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en sous-location</p>
                </div>
              ) : (
                sousLocationProps.map(p => (
                  <SubletPropertyCard key={p.id} property={p} month={month} year={year} onReload={load} />
                ))
              )}
            </div>
          )}

          {tab === 'classement' && (
            <ClassementTab properties={conciergerieProps} month={month} year={year} />
          )}
        </>
      )}
    </div>
  )
}

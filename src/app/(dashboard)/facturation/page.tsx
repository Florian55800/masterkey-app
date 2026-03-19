'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Printer,
  Trophy, TrendingUp, Home, X, Check, AlertCircle, Euro,
  Building2, Zap, Wifi, MoreHorizontal, Download
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

// ─── Inline Platform Row ──────────────────────────────────────────────────────
// Always-visible row per platform — no modal. Airbnb and Booking are shown
// directly on the card with their own independent inputs.

function PlatformRow({
  property, platform, existing, month, year, onReload,
}: {
  property: Property; platform: string
  existing: PropertyRevenue | null
  month: number; year: number; onReload: () => void
}) {
  const [amount,     setAmount]     = useState(existing ? String(existing.platformAmount)  : '')
  const [cleaning,   setCleaning]   = useState(existing ? String(existing.cleaningFees)    : '')
  const [commission, setCommission] = useState(
    existing ? String(existing.commissionRate) : String(property.commissionRate)
  )
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from server data only when not editing
  useEffect(() => {
    if (!dirty) {
      setAmount(existing    ? String(existing.platformAmount)  : '')
      setCleaning(existing  ? String(existing.cleaningFees)    : '')
      setCommission(existing ? String(existing.commissionRate) : String(property.commissionRate))
    }
  }, [existing, property.commissionRate, dirty])

  const f = (v: string) => parseFloat(v) || 0
  const base        = f(amount) - f(cleaning)
  const partMK      = base * (f(commission) / 100)
  const partProprio = base - partMK
  const hasAmount   = f(amount) > 0

  const mark = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      propertyId: property.id, month, year, platform,
      platformAmount: f(amount), cleaningFees: f(cleaning), commissionRate: f(commission),
    }
    if (existing?.id) {
      await fetch(`/api/facturation/${existing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/facturation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setDirty(false)
    setSaving(false)
    onReload()
  }

  const handleDelete = async () => {
    if (!existing?.id || !confirm(`Supprimer la ligne ${PLATFORM_LABELS[platform]} ?`)) return
    await fetch(`/api/facturation/${existing.id}`, { method: 'DELETE' })
    setAmount(''); setCleaning(''); setDirty(false)
    onReload()
  }

  return (
    <div className={`border-b border-white/[0.04] last:border-0 transition-opacity ${hasAmount || dirty ? '' : 'opacity-50'}`}>
      {/* Mobile */}
      <div className="md:hidden px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex-shrink-0 ${PLATFORM_COLORS[platform]}`}>
            {PLATFORM_LABELS[platform]}
          </span>
          {hasAmount && !dirty && (
            <span className="text-[#D4AF37] font-bold text-sm ml-auto">{formatCurrency(partMK)} MK</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Montant €</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={mark(setAmount)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Ménage €</label>
            <input type="number" min="0" step="0.01" value={cleaning} onChange={mark(setCleaning)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
        </div>
        {hasAmount && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-white/25 text-[9px]">Base</p><p className="text-white/70 text-xs font-medium">{formatCurrency(base)}</p></div>
            <div><p className="text-white/25 text-[9px]">Part MK</p><p className="text-[#D4AF37] text-xs font-bold">{formatCurrency(partMK)}</p></div>
            <div><p className="text-white/25 text-[9px]">Proprio</p><p className="text-green-400 text-xs font-semibold">{formatCurrency(partProprio)}</p></div>
          </div>
        )}
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="w-full py-1.5 rounded-lg text-xs font-medium bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/25 transition-all disabled:opacity-40">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center group">
        <div className="w-[110px] px-4 py-3 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${PLATFORM_COLORS[platform]}`}>
            {PLATFORM_LABELS[platform]}
          </span>
        </div>
        <div className="flex-1 px-2 py-2">
          <input type="number" min="0" step="0.01" value={amount} onChange={mark(setAmount)}
            placeholder="0.00"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white text-sm outline-none transition-colors placeholder:text-white/15" />
        </div>
        <div className="flex-1 px-2 py-2">
          <input type="number" min="0" step="0.01" value={cleaning} onChange={mark(setCleaning)}
            placeholder="0.00"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white/60 text-sm outline-none transition-colors placeholder:text-white/15" />
        </div>
        <div className="w-[70px] px-2 py-2 flex-shrink-0">
          <input type="number" min="0" max="100" step="0.5" value={commission} onChange={mark(setCommission)}
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white/50 text-sm outline-none transition-colors text-center" />
        </div>
        <div className="w-[90px] px-4 py-3 text-white/60 text-sm text-right flex-shrink-0">
          {hasAmount ? formatCurrency(base) : <span className="text-white/15">—</span>}
        </div>
        <div className="w-[90px] px-4 py-3 text-[#D4AF37] font-semibold text-sm text-right flex-shrink-0">
          {hasAmount ? formatCurrency(partMK) : <span className="text-white/15">—</span>}
        </div>
        <div className="w-[100px] px-4 py-3 text-green-400 font-semibold text-sm text-right flex-shrink-0">
          {hasAmount ? formatCurrency(partProprio) : <span className="text-white/15">—</span>}
        </div>
        <div className="w-[90px] px-3 py-3 flex items-center justify-end gap-1 flex-shrink-0">
          {dirty ? (
            <button onClick={handleSave} disabled={saving}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/25 transition-all disabled:opacity-40 whitespace-nowrap">
              {saving ? '...' : 'Sauver'}
            </button>
          ) : (
            existing?.id && (
              <button onClick={handleDelete}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Extra Platform Modal (Direct / Autre) ────────────────────────────────────

function ExtraPlatformModal({
  isOpen, onClose, property, month, year, existingPlatforms, onReload,
}: {
  isOpen: boolean; onClose: () => void
  property: Property; month: number; year: number
  existingPlatforms: string[]; onReload: () => void
}) {
  const available = PLATFORMS.filter(p => !['airbnb', 'booking'].includes(p) && !existingPlatforms.includes(p))
  const [platform,   setPlatform]   = useState(available[0] ?? 'direct')
  const [amount,     setAmount]     = useState('')
  const [cleaning,   setCleaning]   = useState('')
  const [commission, setCommission] = useState(String(property.commissionRate))
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPlatform(available[0] ?? 'direct')
      setAmount(''); setCleaning('')
      setCommission(String(property.commissionRate))
      setNotes('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const f   = (v: string) => parseFloat(v) || 0
  const base        = f(amount) - f(cleaning)
  const partMK      = base * (f(commission) / 100)
  const partProprio = base - partMK

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/facturation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: property.id, month, year, platform,
        platformAmount: f(amount), cleaningFees: f(cleaning),
        commissionRate: f(commission), notes: notes || null,
      }),
    })
    setSaving(false); onClose(); onReload()
  }

  if (available.length === 0) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ajouter plateforme — ${property.name}`}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 font-medium block mb-2">Plateforme</label>
          <div className="flex gap-2">
            {available.map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  platform === p ? PLATFORM_COLORS[p] : 'border-white/10 text-white/30 hover:border-white/20'
                }`}>
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['Montant plateforme (€)', amount,     setAmount,     'number'],
            ['Frais ménage (€)',       cleaning,   setCleaning,   'number'],
            ['Commission (%)',         commission, setCommission, 'number'],
            ['Notes',                 notes,      setNotes,      'text'],
          ] as [string, string, (v: string) => void, string][]).map(([label, val, set, type]) => (
            <div key={label}>
              <label className="text-xs text-white/40 block mb-1.5">{label}</label>
              <input type={type} min="0" step="0.01" value={val}
                onChange={e => set(e.target.value)}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
          ))}
        </div>
        {f(amount) > 0 && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-white/30 text-[10px] mb-0.5">Base</p><p className="text-white font-semibold text-sm">{formatCurrency(base)}</p></div>
            <div><p className="text-white/30 text-[10px] mb-0.5">Part MK</p><p className="text-[#D4AF37] font-bold text-sm">{formatCurrency(partMK)}</p></div>
            <div><p className="text-white/30 text-[10px] mb-0.5">Part proprio</p><p className="text-green-400 font-semibold text-sm">{formatCurrency(partProprio)}</p></div>
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
  const [extraOpen, setExtraOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const revenues     = property.revenues
  const totals       = propertyTotals(revenues)
  const usedPlatforms = revenues.map(r => r.platform)
  const hasExtra     = PLATFORMS.filter(p => !['airbnb', 'booking'].includes(p) && !usedPlatforms.includes(p)).length > 0

  const getFor = (platform: string) => revenues.find(r => r.platform === platform) ?? null

  return (
    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-white font-semibold">{property.name}</p>
            <p className="text-white/30 text-xs">{property.owner.name} · {property.commissionRate}% comm.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totals.partMK > 0 && (
            <button onClick={() => setPrintOpen(true)}
              className="p-2 rounded-xl text-white/20 hover:text-blue-400 hover:bg-blue-400/10 transition-all" title="Rapport propriétaire">
              <Printer className="w-4 h-4" />
            </button>
          )}
          {hasExtra && (
            <button onClick={() => setExtraOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all">
              <Plus className="w-3.5 h-3.5" /> Direct / Autre
            </button>
          )}
          {totals.partMK > 0 && (
            <div className="text-right">
              <p className="text-[#D4AF37] font-bold text-lg leading-none">{formatCurrency(totals.partMK)}</p>
              <p className="text-white/30 text-[10px]">Part MK</p>
            </div>
          )}
        </div>
      </div>

      {/* Column headers — desktop only */}
      <div className="hidden md:flex items-center border-b border-white/[0.04] bg-white/[0.01]">
        <div className="w-[110px] px-4 py-2 text-white/25 text-[10px] font-medium flex-shrink-0">Plateforme</div>
        <div className="flex-1 px-3 py-2 text-white/25 text-[10px] font-medium">Montant (€)</div>
        <div className="flex-1 px-3 py-2 text-white/25 text-[10px] font-medium">Ménage (€)</div>
        <div className="w-[70px] px-3 py-2 text-white/25 text-[10px] font-medium text-center flex-shrink-0">Com.%</div>
        <div className="w-[90px] px-4 py-2 text-white/25 text-[10px] font-medium text-right flex-shrink-0">Base</div>
        <div className="w-[90px] px-4 py-2 text-white/25 text-[10px] font-medium text-right flex-shrink-0">Part MK</div>
        <div className="w-[100px] px-4 py-2 text-white/25 text-[10px] font-medium text-right flex-shrink-0">Part proprio</div>
        <div className="w-[90px] flex-shrink-0" />
      </div>

      {/* Airbnb row (always shown) */}
      <PlatformRow property={property} platform="airbnb"
        existing={getFor('airbnb')} month={month} year={year} onReload={onReload} />

      {/* Booking row (always shown) */}
      <PlatformRow property={property} platform="booking"
        existing={getFor('booking')} month={month} year={year} onReload={onReload} />

      {/* Direct / Autre rows if they exist */}
      {revenues.filter(r => !['airbnb', 'booking'].includes(r.platform)).map(r => (
        <PlatformRow key={r.id} property={property} platform={r.platform}
          existing={r} month={month} year={year} onReload={onReload} />
      ))}

      {/* Totals footer */}
      {totals.platformAmount > 0 && (
        <>
          <div className="hidden md:flex items-center border-t border-white/[0.08] bg-white/[0.02]">
            <div className="w-[110px] px-4 py-3 text-white/30 text-xs font-semibold flex-shrink-0">TOTAL</div>
            <div className="flex-1 px-3 py-3 text-white font-semibold text-sm">{formatCurrency(totals.platformAmount)}</div>
            <div className="flex-1 px-3 py-3 text-white/50 text-sm">{formatCurrency(totals.cleaningFees)}</div>
            <div className="w-[70px] flex-shrink-0" />
            <div className="w-[90px] px-4 py-3 text-white/70 font-semibold text-sm text-right flex-shrink-0">{formatCurrency(totals.base)}</div>
            <div className="w-[90px] px-4 py-3 text-[#D4AF37] font-bold text-sm text-right flex-shrink-0">{formatCurrency(totals.partMK)}</div>
            <div className="w-[100px] px-4 py-3 text-green-400 font-bold text-sm text-right flex-shrink-0">{formatCurrency(totals.partProprio)}</div>
            <div className="w-[90px] flex-shrink-0" />
          </div>
          <div className="md:hidden px-4 py-3 flex justify-between bg-white/[0.02] border-t border-white/[0.04]">
            <span className="text-white/30 text-xs font-medium">TOTAL</span>
            <span className="text-[#D4AF37] font-bold text-sm">{formatCurrency(totals.partMK)} MK · {formatCurrency(totals.partProprio)} proprio</span>
          </div>
        </>
      )}

      <ExtraPlatformModal
        isOpen={extraOpen} onClose={() => setExtraOpen(false)}
        property={property} month={month} year={year}
        existingPlatforms={usedPlatforms} onReload={onReload}
      />
      {totals.partMK > 0 && (
        <PrintModal isOpen={printOpen} onClose={() => setPrintOpen(false)}
          property={property} revenues={revenues} month={month} year={year} />
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
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  const revenues     = property.revenues
  const expense      = property.subletExpenses[0] ?? null
  const totalRevenue = revenues.reduce((s, r) => s + r.platformAmount, 0)
  const totalCharges = expense ? expense.loyer + expense.electricite + expense.wifi + expense.autresCharges : 0
  const netProfit    = totalRevenue - totalCharges

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
            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
          </p>
          <p className="text-white/30 text-[10px]">Résultat net</p>
        </div>
      </div>

      {/* Revenus section — inline Airbnb + Booking rows */}
      <div className="border-b border-white/[0.04]">
        <div className="px-5 pt-3 pb-1">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Revenus plateformes</p>
        </div>
        <PlatformRow property={property} platform="airbnb"
          existing={revenues.find(r => r.platform === 'airbnb') ?? null}
          month={month} year={year} onReload={onReload} />
        <PlatformRow property={property} platform="booking"
          existing={revenues.find(r => r.platform === 'booking') ?? null}
          month={month} year={year} onReload={onReload} />
        {revenues.filter(r => !['airbnb', 'booking'].includes(r.platform)).map(r => (
          <PlatformRow key={r.id} property={property} platform={r.platform}
            existing={r} month={month} year={year} onReload={onReload} />
        ))}
        {totalRevenue > 0 && (
          <div className="flex justify-between px-5 py-2.5 bg-white/[0.01]">
            <span className="text-white/30 text-xs font-medium">Total revenus</span>
            <span className="text-white font-semibold text-sm">{formatCurrency(totalRevenue)}</span>
          </div>
        )}
      </div>

      {/* Charges section */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Charges mensuelles</p>
          <button onClick={() => setExpenseModalOpen(true)}
            className="text-white/40 text-xs flex items-center gap-1 hover:text-white/70 transition-colors">
            <Edit2 className="w-3 h-3" /> {expense ? 'Modifier' : 'Saisir'}
          </button>
        </div>
        {expense ? (
          <div className="bg-[#141414] rounded-xl p-3 space-y-2">
            {([
              ['🏠 Loyer',       expense.loyer],
              ['⚡ Électricité', expense.electricite],
              ['📶 Wi-Fi',       expense.wifi],
              ['📦 Autres',      expense.autresCharges],
            ] as [string, number][]).filter(([, v]) => v > 0).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-white/40 text-xs">{label}</span>
                <span className="text-red-400 text-sm font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-white/[0.06] pt-2">
              <span className="text-white/50 text-xs font-medium">Total charges</span>
              <span className="text-red-400 font-bold text-sm">{formatCurrency(totalCharges)}</span>
            </div>
          </div>
        ) : (
          <button onClick={() => setExpenseModalOpen(true)}
            className="w-full py-3 rounded-xl border border-dashed border-white/[0.08] text-white/20 text-sm hover:border-white/20 hover:text-white/40 transition-all">
            + Saisir les charges
          </button>
        )}

        {(totalRevenue > 0 || expense) && (
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
            netProfit >= 0 ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'
          }`}>
            <span className="text-white/50 text-sm font-medium">Résultat net</span>
            <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
            </span>
          </div>
        )}
      </div>

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
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

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

  const handleSeed = async () => {
    if (!confirm('Importer les données historiques (Août 2025 → Fév 2026) ? Les entrées existantes ne seront pas écrasées.')) return
    setSeeding(true)
    setSeedMsg(null)
    try {
      const res = await fetch('/api/facturation/seed', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSeedMsg(`✓ ${data.message}`)
        load()
      } else {
        setSeedMsg(`Erreur : ${data.error}`)
      }
    } catch {
      setSeedMsg('Erreur réseau')
    } finally {
      setSeeding(false)
    }
  }

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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/10 transition-all disabled:opacity-40"
            title="Importer les données historiques Aug 2025 → Fév 2026"
          >
            <Download className="w-3.5 h-3.5" />
            {seeding ? 'Import...' : 'Données historiques'}
          </button>
          {totalBrut > 0 && (
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Total brut {MONTHS_FR[month]}</p>
              <p className="text-[#D4AF37] font-bold text-xl">{formatCurrency(totalBrut)}</p>
            </div>
          )}
        </div>
      </div>
      {seedMsg && (
        <div className={`text-xs px-4 py-2 rounded-xl border ${seedMsg.startsWith('✓') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {seedMsg}
        </div>
      )}

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

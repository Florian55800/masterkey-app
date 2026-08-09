'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Printer,
  Trophy, TrendingUp, Home, X, Check, AlertCircle, Euro,
  Building2, Zap, Wifi, MoreHorizontal, Download, EyeOff, Eye, MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import RapportsInline from '../rapports/page'

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
  nbSejours: number
  nbNuits: number
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
  assurance: number
  nbSejours: number
  nbNuits: number
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

type ActiveTab = 'conciergerie' | 'sous-location' | 'menage' | 'classement' | 'rapports'

interface CleaningMargin {
  id: number
  propertyId: number
  month: number
  year: number
  receivedPlatform: number
  receivedOwner: number
  paidCleaner: number
  notes: string | null
}

interface CleaningMarginProp {
  id: number
  name: string
  address: string
  city: string
  typeGestion: string
  status: string
  owner: Owner
  cleaningMargin: CleaningMargin | null
}

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
  const [nuits, setNuits] = useState(existing ? String(existing.nbNuits || '') : '')
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from server data only when not editing
  useEffect(() => {
    if (!dirty) {
      setAmount(existing    ? String(existing.platformAmount)  : '')
      setCleaning(existing  ? String(existing.cleaningFees)    : '')
      setCommission(existing ? String(existing.commissionRate) : String(property.commissionRate))
      setNuits(existing ? String(existing.nbNuits || '') : '')
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
      nbNuits: parseInt(nuits) || 0,
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
        <div>
          <label className="text-[10px] text-white/30 block mb-1">Nuits</label>
          <input type="number" min="0" step="1" value={nuits} onChange={mark(setNuits)}
            placeholder="0"
            className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
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
          <input type="number" min="0" step="1" value={nuits} onChange={mark(setNuits)}
            placeholder="0"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white/40 text-sm outline-none transition-colors text-center placeholder:text-white/15" />
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

// ─── Sublet Platform Row (sans commission) ───────────────────────────────────
// Version simplifiée pour la sous-location : montant + ménage uniquement.

function SubletPlatformRow({
  property, platform, existing, month, year, onReload,
}: {
  property: Property; platform: string
  existing: PropertyRevenue | null
  month: number; year: number; onReload: () => void
}) {
  const [amount,   setAmount]   = useState(existing ? String(existing.platformAmount) : '')
  const [cleaning, setCleaning] = useState(existing ? String(existing.cleaningFees)   : '')
  const [nuits,    setNuits]    = useState(existing ? String(existing.nbNuits || '') : '')
  const [dirty,    setDirty]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!dirty) {
      setAmount(existing   ? String(existing.platformAmount) : '')
      setCleaning(existing ? String(existing.cleaningFees)   : '')
      setNuits(existing    ? String(existing.nbNuits || '')  : '')
    }
  }, [existing, dirty])

  const f         = (v: string) => parseFloat(v) || 0
  const net       = f(amount) - f(cleaning)
  const hasAmount = f(amount) > 0

  const mark = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      propertyId: property.id, month, year, platform,
      platformAmount: f(amount), cleaningFees: f(cleaning), commissionRate: 0,
      nbNuits: parseInt(nuits) || 0,
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
    setDirty(false); setSaving(false); onReload()
  }

  const handleDelete = async () => {
    if (!existing?.id || !confirm(`Supprimer la ligne ${PLATFORM_LABELS[platform]} ?`)) return
    await fetch(`/api/facturation/${existing.id}`, { method: 'DELETE' })
    setAmount(''); setCleaning(''); setDirty(false); onReload()
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
            <span className="text-green-400 font-bold text-sm ml-auto">net {formatCurrency(net)}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Montant plateforme (€)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={mark(setAmount)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Frais ménage (€)</label>
            <input type="number" min="0" step="0.01" value={cleaning} onChange={mark(setCleaning)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Nuits</label>
            <input type="number" min="0" step="1" value={nuits} onChange={mark(setNuits)}
              placeholder="0"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
        </div>
        {hasAmount && (
          <div className="flex items-center gap-3 text-center">
            <div className="flex-1">
              <p className="text-white/25 text-[9px]">Brut</p>
              <p className="text-white/60 text-xs font-medium">{formatCurrency(f(amount))}</p>
            </div>
            <div className="text-white/20 text-xs">−</div>
            <div className="flex-1">
              <p className="text-white/25 text-[9px]">Ménage</p>
              <p className="text-red-400/70 text-xs font-medium">{formatCurrency(f(cleaning))}</p>
            </div>
            <div className="text-white/20 text-xs">=</div>
            <div className="flex-1">
              <p className="text-white/25 text-[9px]">Net</p>
              <p className="text-green-400 text-xs font-bold">{formatCurrency(net)}</p>
            </div>
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
        <div className="w-[120px] px-4 py-3 flex-shrink-0">
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
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-red-400/30 px-1 py-1 text-red-400/70 text-sm outline-none transition-colors placeholder:text-white/15" />
        </div>
        <div className="w-[60px] px-2 py-2 flex-shrink-0">
          <input type="number" min="0" step="1" value={nuits} onChange={mark(setNuits)}
            placeholder="0"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white/40 text-sm outline-none transition-colors text-center placeholder:text-white/15" />
        </div>
        <div className="w-[110px] px-4 py-3 text-green-400 font-semibold text-sm text-right flex-shrink-0">
          {hasAmount ? formatCurrency(net) : <span className="text-white/15">—</span>}
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
    assurance: String(initial?.assurance ?? ''),
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm({
      loyer: String(initial?.loyer ?? ''),
      electricite: String(initial?.electricite ?? ''),
      wifi: String(initial?.wifi ?? ''),
      autresCharges: String(initial?.autresCharges ?? ''),
      assurance: String(initial?.assurance ?? ''),
      notes: initial?.notes ?? '',
    })
  }, [isOpen, initial])

  const f = (v: string) => parseFloat(v) || 0
  const total = f(form.loyer) + f(form.electricite) + f(form.wifi) + f(form.autresCharges) + f(form.assurance)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      propertyId: property.id, month, year,
      loyer: f(form.loyer), electricite: f(form.electricite),
      wifi: f(form.wifi), autresCharges: f(form.autresCharges),
      assurance: f(form.assurance),
      nbSejours: 0, nbNuits: 0,
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
            { key: 'loyer', label: 'Loyer (€)' },
            { key: 'electricite', label: 'Électricité (€)' },
            { key: 'wifi', label: 'Wi-Fi (€)' },
            { key: 'assurance', label: 'Assurance (€)' },
            { key: 'autresCharges', label: 'Autres charges (€)' },
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

// ─── PDF Generation ───────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/ /g, ' ')
    .replace(/ /g, ' ')
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/mk-logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

async function downloadPDF(property: Property, revenues: PropertyRevenue[], month: number, year: number) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoB64 = await loadLogoBase64()
  const totals = propertyTotals(revenues)
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const W = 210, mg = 14, cW = W - mg * 2
  let y = 0

  const text  = (t: string, x: number, yy: number, opts?: { align?: 'left'|'right'|'center'; maxWidth?: number }) => doc.text(t, x, yy, opts)
  const font  = (style: 'normal'|'bold', size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const color = (r: number, g: number, b: number) => doc.setTextColor(r, g, b)
  const fill  = (r: number, g: number, b: number) => doc.setFillColor(r, g, b)
  const stroke = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b)
  const trunc = (s: string, maxW: number): string => {
    if (doc.getTextWidth(s) <= maxW) return s
    let t = s
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }

  // Barre noire haut
  fill(12,12,12); doc.rect(0,0,W,2.5,'F')

  // Header
  y = 14
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', mg, 4, 18, 9)
    font('bold', 14); color(12,12,12)
    text('MasterKey Conciergerie', mg + 21, y)
    font('normal', 7.5); color(155,155,155)
    text('Gestion Locative', mg + 21, y + 5)
  } else {
    font('bold', 17); color(12,12,12)
    text('MasterKey Conciergerie', mg, y)
    font('normal', 7.5); color(155,155,155)
    text('Gestion Locative', mg, y + 5)
  }
  font('bold', 11); color(12,12,12)
  text(`Relevé — ${MONTHS_FR[month]} ${year}`, W-mg, y, { align:'right' })
  font('normal', 7.5); color(155,155,155)
  text(`Édité le ${today}`, W-mg, y+5, { align:'right' })

  y += 9; stroke(190,190,190); doc.setLineWidth(0.3); doc.line(mg,y,W-mg,y); y += 6

  // Bloc propriété — retour à la ligne automatique si texte trop long
  const propLabels = ['LOGEMENT', 'ADRESSE', 'PROPRIÉTAIRE', 'COMMISSION']
  const propVals = [
    property.name,
    `${property.address}, ${property.city}`,
    property.owner.name,
    `${property.commissionRate} %`,
  ]
  const fw = cW / 4
  font('normal', 8)
  const propLineGroups = propVals.map(v => (doc.splitTextToSize(v, fw - 8) as string[]).slice(0, 2))
  const maxPropLines = Math.max(...propLineGroups.map(g => g.length))
  const blockH = maxPropLines === 1 ? 22 : 28
  fill(248,248,248); stroke(220,220,220); doc.setLineWidth(0.2)
  doc.roundedRect(mg, y, cW, blockH, 2, 2, 'FD')
  fill(12,12,12); doc.rect(mg, y, 2.5, blockH, 'F')
  propLabels.forEach((lbl, i) => {
    const x = mg + 4.5 + i * fw
    font('bold', 6); color(175,175,175); text(lbl, x, y + 6)
    font('normal', 8); color(15,15,15)
    propLineGroups[i].forEach((line, li) => text(line, x, y + 12.5 + li * 5.5))
  })
  y += blockH + 5

  // Taux d'occupation
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalNuits = revenues.reduce((s, r) => s + (r.nbNuits ?? 0), 0)
  if (totalNuits > 0) {
    const tauxOcc = daysInMonth > 0 ? Math.round((totalNuits / daysInMonth) * 100) : 0
    fill(236,236,236); stroke(210,210,210); doc.setLineWidth(0.15)
    doc.roundedRect(mg, y, cW, 12, 2, 2, 'FD')
    font('bold', 8); color(15,15,15)
    text(`Taux d'occupation : ${tauxOcc} %  (${totalNuits} nuits / ${daysInMonth} jours)`, mg+4, y+8)
    y += 17
  }

  // Tableau — colonnes mieux proportionnées (total = 182 mm)
  // Plateforme|Montant|Ménage|Com%|Base|Part MK|Part proprio
  const cols = ['Plateforme', 'Montant brut', 'Ménage', 'Com.%', 'Base', 'Part MasterKey', 'Part propriétaire']
  const colWidths = [24, 27, 23, 12, 20, 36, 40]
  const lH = 4.5   // hauteur d'une ligne de texte
  const rowPad = 3  // padding vertical total
  const minRowH = lH + rowPad * 2

  // En-tête tableau
  fill(12,12,12); doc.rect(mg, y, cW, minRowH + 1, 'F')
  font('bold', 6.5); color(255,255,255)
  let cx = mg + 2
  cols.forEach((c, i) => {
    // L'en-tête peut aussi se couper en 2 lignes si besoin
    font('bold', 6.5)
    const hLines = doc.splitTextToSize(c, colWidths[i] - 2) as string[]
    const hY = y + (minRowH + 1) / 2 - (hLines.length - 1) * lH / 2
    hLines.forEach((line, li) => text(line, cx + (i>0 ? colWidths[i]-1 : 0), hY + li * lH, { align: i>0 ? 'right' : 'left' }))
    cx += colWidths[i]
  })
  y += minRowH + 1

  // Lignes données — hauteur dynamique selon contenu
  revenues.forEach((r, ri) => {
    const { base, partMK, partProprio } = calcRevenue(r)
    const isAirbnb  = r.platform === 'airbnb'
    const isBooking = r.platform === 'booking'

    const allCells = [
      PLATFORM_LABELS[r.platform] ?? r.platform,
      fmt(r.platformAmount),
      r.cleaningFees > 0 ? fmt(r.cleaningFees) : '—',
      `${r.commissionRate}%`,
      fmt(base),
      fmt(partMK),
      fmt(partProprio),
    ]
    // Mesure le nb de lignes pour chaque cellule avec la bonne police
    const cellGroups = allCells.map((cell, ci) => {
      font(ci===0 ? 'bold' : 'normal', 7)
      return (doc.splitTextToSize(cell, colWidths[ci] - 2) as string[]).slice(0, 3)
    })
    const maxLines = Math.max(...cellGroups.map(g => g.length))
    const thisRowH = maxLines * lH + rowPad * 2

    const bg: [number,number,number] = isAirbnb ? [255,150,170] : isBooking ? [80,165,255] : ri%2===0 ? [255,255,255] : [248,248,248]
    fill(...bg); stroke(210,210,210); doc.setLineWidth(0.12)
    doc.rect(mg, y, cW, thisRowH, 'FD')

    cx = mg + 2
    const baseY = y + rowPad + lH * 0.75
    cellGroups.forEach((lines, ci) => {
      font(ci===0 ? 'bold' : 'normal', 7)
      if (ci === 0) color(isAirbnb ? 120 : isBooking ? 0 : 20, isAirbnb ? 0 : isBooking ? 20 : 20, isAirbnb ? 30 : isBooking ? 130 : 20)
      else if (ci === 5) color(0, 25, 140)
      else if (ci === 6) color(10, 100, 40)
      else if (ci === 2 || ci === 3) color(90, 90, 90)
      else color(20, 20, 20)
      lines.forEach((line, li) =>
        text(line, cx + (ci>0 ? colWidths[ci]-1 : 0), baseY + li * lH, { align: ci>0 ? 'right' : 'left' })
      )
      cx += colWidths[ci]
    })
    y += thisRowH
  })

  // Ligne TOTAL
  const totalRowH = minRowH + 1
  fill(228,228,228); stroke(210,210,210); doc.setLineWidth(0.12)
  doc.rect(mg, y, cW, totalRowH, 'FD')
  cx = mg + 2
  const totalCells = ['TOTAL', fmt(totals.platformAmount), fmt(totals.cleaningFees), '', fmt(totals.base), fmt(totals.partMK), fmt(totals.partProprio)]
  totalCells.forEach((cell, ci) => {
    font('bold', 7)
    if (ci === 5) color(0, 25, 140)
    else if (ci === 6) color(10, 100, 40)
    else color(20, 20, 20)
    text(cell, cx + (ci>0 ? colWidths[ci]-1 : 0), y + totalRowH/2 + lH/2, { align: ci>0 ? 'right' : 'left' })
    cx += colWidths[ci]
  })
  y += totalRowH + 6

  // Cartes synthèse — noir et blanc
  const cards: { lbl: string; val: string; bg: [number,number,number]; fg: [number,number,number] }[] = [
    { lbl:'Total facturé',    val:fmt(totals.platformAmount), bg:[242,242,242], fg:[20,20,20] },
    { lbl:'Frais ménage',     val:fmt(totals.cleaningFees),   bg:[242,242,242], fg:[20,20,20] },
    { lbl:'Base commission',  val:fmt(totals.base),           bg:[242,242,242], fg:[20,20,20] },
    { lbl:'Part MasterKey',   val:fmt(totals.partMK),         bg:[220,230,255], fg:[0,25,140] },
    { lbl:'Part propriétaire',val:fmt(totals.partProprio),    bg:[220,245,228], fg:[10,100,40] },
  ]
  const cCardW = cW / cards.length - 2
  cards.forEach((c, i) => {
    const x = mg + i * (cCardW + 2)
    fill(...c.bg); stroke(210,210,210); doc.setLineWidth(0.15)
    doc.roundedRect(x, y, cCardW, 17, 2, 2, 'FD')
    font('normal', 6); color(140,140,140)
    text(c.lbl.toUpperCase(), x+cCardW/2, y+6, { align:'center' })
    font('bold', 8.5); color(...c.fg)
    text(trunc(c.val, cCardW - 3), x+cCardW/2, y+13, { align:'center' })
  })
  y += 22

  // Footer
  stroke(205,205,205); doc.setLineWidth(0.15); doc.line(mg,y,W-mg,y); y += 4
  font('normal', 7); color(165,165,165)
  text('MasterKey Conciergerie — Gestion Locative', mg, y)
  text(`Document confidentiel · ${today}`, W-mg, y, { align:'right' })

  fill(12,12,12); doc.rect(0,294.5,W,2.5,'F')

  doc.save(`MasterKey_${property.name.replace(/\s+/g,'_')}_${MONTHS_FR[month]}_${year}.pdf`)
}


// ─── Sous-location PDF ────────────────────────────────────────────────────────

async function downloadSubletPDF(property: Property, revenues: PropertyRevenue[], expense: SubletExpense | null, month: number, year: number) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoB64 = await loadLogoBase64()
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const W = 210, mg = 14, cW = W - mg * 2
  let y = 0

  const txt   = (t: string, x: number, yy: number, opts?: { align?: 'left'|'right'|'center'; maxWidth?: number }) => doc.text(t, x, yy, opts)
  const font  = (style: 'normal'|'bold', size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const color = (r: number, g: number, b: number) => doc.setTextColor(r, g, b)
  const fill  = (r: number, g: number, b: number) => doc.setFillColor(r, g, b)
  const stroke = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b)
  const trunc = (s: string, maxW: number): string => {
    if (doc.getTextWidth(s) <= maxW) return s
    let t = s
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }

  // Barre noire haut
  fill(12,12,12); doc.rect(0,0,W,2.5,'F')

  // Header
  y = 14
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', mg, 4, 18, 9)
    font('bold', 14); color(12,12,12)
    txt('MasterKey Conciergerie', mg + 21, y)
    font('normal', 7.5); color(155,155,155)
    txt('Gestion Locative', mg + 21, y + 5)
  } else {
    font('bold', 17); color(12,12,12)
    txt('MasterKey Conciergerie', mg, y)
    font('normal', 7.5); color(155,155,155)
    txt('Gestion Locative', mg, y + 5)
  }
  font('bold', 11); color(12,12,12)
  txt(`Bilan Sous-location — ${MONTHS_FR[month]} ${year}`, W-mg, y, { align:'right' })
  font('normal', 7.5); color(155,155,155)
  txt(`Édité le ${today}`, W-mg, y+5, { align:'right' })

  y += 9; stroke(190,190,190); doc.setLineWidth(0.3); doc.line(mg,y,W-mg,y); y += 6

  // Bloc propriété — retour à la ligne automatique
  const propLabels = ['LOGEMENT', 'ADRESSE', 'PROPRIÉTAIRE', 'TYPE']
  const propVals = [
    property.name,
    `${property.address}, ${property.city}`,
    property.owner.name,
    'Sous-location',
  ]
  const fw = cW / 4
  font('normal', 8)
  const propLineGroups = propVals.map(v => (doc.splitTextToSize(v, fw - 8) as string[]).slice(0, 2))
  const maxPropLines = Math.max(...propLineGroups.map(g => g.length))
  const blockH = maxPropLines === 1 ? 22 : 28
  fill(248,248,248); stroke(220,220,220); doc.setLineWidth(0.2)
  doc.roundedRect(mg, y, cW, blockH, 2, 2, 'FD')
  fill(12,12,12); doc.rect(mg, y, 2.5, blockH, 'F')
  propLabels.forEach((lbl, i) => {
    const x = mg + 4.5 + i * fw
    font('bold', 6); color(175,175,175); txt(lbl, x, y + 6)
    font('normal', 8); color(15,15,15)
    propLineGroups[i].forEach((line, li) => txt(line, x, y + 12.5 + li * 5.5))
  })
  y += blockH + 5

  // Taux d'occupation
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalNuits  = revenues.reduce((s, r) => s + (r.nbNuits ?? 0), 0)
  if (totalNuits > 0) {
    const tauxOcc = Math.round((totalNuits / daysInMonth) * 100)
    fill(236,236,236); stroke(210,210,210); doc.setLineWidth(0.15)
    doc.roundedRect(mg, y, cW, 12, 2, 2, 'FD')
    font('bold', 8); color(15,15,15)
    txt(`Taux d'occupation : ${tauxOcc} %  (${totalNuits} nuits / ${daysInMonth} jours)`, mg+4, y+8)
    y += 17
  }

  // Tableau revenus — colonnes élargies (total = 182mm)
  const rCols = ['Plateforme', 'Nuits', 'Montant brut', 'Frais ménage', 'Net plateforme']
  const rColW = [28, 14, 40, 40, 60]
  const lH = 4.5
  const rowPad = 3
  const minRowH = lH + rowPad * 2

  // En-tête
  fill(12,12,12); doc.rect(mg, y, cW, minRowH + 1, 'F')
  font('bold', 6.5); color(255,255,255)
  let cx = mg + 2
  rCols.forEach((c, i) => {
    const hLines = doc.splitTextToSize(c, rColW[i] - 2) as string[]
    const hY = y + (minRowH + 1) / 2 - (hLines.length - 1) * lH / 2
    hLines.forEach((line, li) => txt(line, cx + (i>0 ? rColW[i]-1 : 0), hY + li * lH, { align: i>0 ? 'right' : 'left' }))
    cx += rColW[i]
  })
  y += minRowH + 1

  const totalGross    = revenues.reduce((s, r) => s + r.platformAmount, 0)
  const totalCleaning = revenues.reduce((s, r) => s + r.cleaningFees, 0)
  const totalRevNet   = totalGross - totalCleaning

  // Lignes données — hauteur dynamique
  revenues.forEach((r, ri) => {
    const net = r.platformAmount - r.cleaningFees
    const isAirbnb  = r.platform === 'airbnb'
    const isBooking = r.platform === 'booking'

    const rCells = [
      PLATFORM_LABELS[r.platform] ?? r.platform,
      r.nbNuits > 0 ? String(r.nbNuits) : '—',
      r.platformAmount > 0 ? fmt(r.platformAmount) : '—',
      r.cleaningFees > 0 ? `- ${fmt(r.cleaningFees)}` : '—',
      fmt(net),
    ]
    const rCellGroups = rCells.map((cell, ci) => {
      font(ci===0 ? 'bold' : 'normal', 7)
      return (doc.splitTextToSize(cell, rColW[ci] - 2) as string[]).slice(0, 3)
    })
    const maxLines = Math.max(...rCellGroups.map(g => g.length))
    const thisRowH = maxLines * lH + rowPad * 2

    const bg: [number,number,number] = isAirbnb ? [255,150,170] : isBooking ? [80,165,255] : ri%2===0 ? [255,255,255] : [248,248,248]
    fill(...bg); stroke(210,210,210); doc.setLineWidth(0.12)
    doc.rect(mg, y, cW, thisRowH, 'FD')
    cx = mg + 2
    const baseY = y + rowPad + lH * 0.75
    rCellGroups.forEach((lines, ci) => {
      font(ci===0 ? 'bold' : 'normal', 7)
      if (ci === 0) color(isAirbnb ? 120 : isBooking ? 0 : 20, isAirbnb ? 0 : isBooking ? 20 : 20, isAirbnb ? 30 : isBooking ? 130 : 20)
      else if (ci === 1) color(80, 80, 80)
      else if (ci === 3) color(r.cleaningFees > 0 ? 170 : 130, r.cleaningFees > 0 ? 35 : 130, r.cleaningFees > 0 ? 35 : 130)
      else if (ci === 4) { font('bold', 7); color(10, 100, 40) }
      else color(20, 20, 20)
      lines.forEach((line, li) =>
        txt(line, cx + (ci>0 ? rColW[ci]-1 : 0), baseY + li * lH, { align: ci>0 ? 'right' : 'left' })
      )
      cx += rColW[ci]
    })
    y += thisRowH
  })

  // Ligne total revenus
  const totalRowH = minRowH + 1
  fill(228,228,228); stroke(210,210,210); doc.setLineWidth(0.12); doc.rect(mg, y, cW, totalRowH, 'FD')
  const tBaseY = y + totalRowH / 2 + lH / 2
  cx = mg + 2; font('bold', 7); color(20,20,20)
  txt('TOTAL REVENUS', cx, tBaseY); cx += rColW[0] + rColW[1]
  txt(fmt(totalGross), cx + rColW[2]-1, tBaseY, { align:'right' }); cx += rColW[2]
  color(170,35,35); txt(`- ${fmt(totalCleaning)}`, cx + rColW[3]-1, tBaseY, { align:'right' }); cx += rColW[3]
  color(10,100,40); txt(fmt(totalRevNet), cx + rColW[4]-1, tBaseY, { align:'right' })
  y += totalRowH + 5

  if (expense) {
    // Section charges
    fill(12,12,12); doc.rect(mg, y, cW, 7, 'F')
    font('bold', 7); color(255,255,255); txt('CHARGES MENSUELLES', mg+2, y+5)
    y += 7

    const chargeItems = [
      ['Loyer',          expense.loyer],
      ['Électricité',    expense.electricite],
      ['Wi-Fi',          expense.wifi],
      ['Assurance',      expense.assurance ?? 0],
      ['Autres charges', expense.autresCharges],
    ].filter(([, v]) => (v as number) > 0) as [string, number][]

    const totalCharges = chargeItems.reduce((s, [, v]) => s + v, 0)

    chargeItems.forEach(([label, value], ri) => {
      fill(ri%2===0 ? 255 : 250, ri%2===0 ? 255 : 250, ri%2===0 ? 255 : 250)
      stroke(210,210,210); doc.setLineWidth(0.12); doc.rect(mg, y, cW, minRowH, 'FD')
      font('normal', 7); color(20,20,20); txt(label, mg+2, y + minRowH/2 + lH/2)
      color(170,35,35); font('bold', 7); txt(`- ${fmt(value)}`, W-mg-2, y + minRowH/2 + lH/2, { align:'right' })
      y += minRowH
    })

    fill(228,228,228); stroke(210,210,210); doc.setLineWidth(0.12); doc.rect(mg, y, cW, minRowH, 'FD')
    font('bold', 7); color(20,20,20); txt('TOTAL CHARGES', mg+2, y + minRowH/2 + lH/2)
    color(170,35,35); txt(`- ${fmt(totalCharges)}`, W-mg-2, y + minRowH/2 + lH/2, { align:'right' })
    y += minRowH + 5

    // Résultat net
    const netProfit  = totalRevNet - totalCharges
    const isPositive = netProfit >= 0
    fill(isPositive ? 220 : 254, isPositive ? 245 : 228, isPositive ? 228 : 228)
    stroke(isPositive ? 170 : 220, isPositive ? 220 : 150, isPositive ? 190 : 150)
    doc.setLineWidth(0.25); doc.roundedRect(mg, y, cW, 14, 2, 2, 'FD')
    font('bold', 10); color(isPositive ? 10 : 170, isPositive ? 100 : 30, isPositive ? 40 : 30)
    txt(`RÉSULTAT NET : ${isPositive ? '+' : ''}${fmt(netProfit)}`, W/2, y+9, { align:'center' })
    y += 19

    // Cartes synthèse
    const totalChargesAll = expense.loyer + expense.electricite + expense.wifi + (expense.assurance ?? 0) + expense.autresCharges
    const net2 = totalRevNet - totalChargesAll
    const slCards: { lbl: string; val: string; bg: [number,number,number]; fg: [number,number,number] }[] = [
      { lbl:'Revenus bruts',   val:fmt(totalGross),     bg:[242,242,242], fg:[20,20,20] },
      { lbl:'Revenus nets',    val:fmt(totalRevNet),    bg:[220,245,228], fg:[10,100,40] },
      { lbl:'Charges totales', val:fmt(totalChargesAll),bg:[255,228,228], fg:[170,30,30] },
      { lbl:'Résultat net',    val:`${net2>=0?'+':''}${fmt(net2)}`, bg:net2>=0?[220,245,228]:[255,228,228], fg:net2>=0?[10,100,40]:[170,30,30] },
    ]
    const cCardW = cW / slCards.length - 2
    slCards.forEach((c, i) => {
      const x = mg + i * (cCardW + 2)
      fill(...c.bg); stroke(210,210,210); doc.setLineWidth(0.15)
      doc.roundedRect(x, y, cCardW, 17, 2, 2, 'FD')
      font('normal', 6); color(140,140,140)
      txt(c.lbl.toUpperCase(), x+cCardW/2, y+6, { align:'center' })
      font('bold', 8.5); color(...c.fg)
      txt(trunc(c.val, cCardW - 3), x+cCardW/2, y+13, { align:'center' })
    })
    y += 22
  }

  // Footer
  stroke(205,205,205); doc.setLineWidth(0.15); doc.line(mg,y,W-mg,y); y += 4
  font('normal', 7); color(165,165,165)
  txt('MasterKey Conciergerie — Gestion Locative', mg, y)
  txt(`Document confidentiel · ${today}`, W-mg, y, { align:'right' })

  fill(12,12,12); doc.rect(0,294.5,W,2.5,'F')

  doc.save(`MasterKey_SousLoc_${property.name.replace(/\s+/g,'_')}_${MONTHS_FR[month]}_${year}.pdf`)
}

function SubletPrintModal({
  isOpen, onClose, property, revenues, expense, month, year,
}: {
  isOpen: boolean; onClose: () => void
  property: Property; revenues: PropertyRevenue[]
  expense: SubletExpense | null; month: number; year: number
}) {
  const [generating, setGenerating] = useState(false)
  const totalGross    = revenues.reduce((s, r) => s + r.platformAmount, 0)
  const totalCleaning = revenues.reduce((s, r) => s + r.cleaningFees, 0)
  const totalRevNet   = totalGross - totalCleaning
  const totalCharges  = expense ? expense.loyer + expense.electricite + expense.wifi + (expense.assurance ?? 0) + expense.autresCharges : 0
  const netProfit     = totalRevNet - totalCharges

  const handleDownload = async () => {
    setGenerating(true)
    await downloadSubletPDF(property, revenues, expense, month, year)
    setGenerating(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rapport — ${property.name}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between bg-[#141414] rounded-xl p-4">
          <div>
            <p className="text-white font-semibold">{property.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{property.address}, {property.city}</p>
            <p className="text-white/40 text-xs">Propriétaire : <span className="text-white/60">{property.owner.name}</span></p>
          </div>
          <div className="text-right">
            <p className="text-blue-400 font-semibold text-sm">{MONTHS_FR[month]} {year}</p>
            <p className="text-white/30 text-xs mt-0.5">Sous-location</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#141414] rounded-xl p-3 text-center">
            <p className="text-white/30 text-[10px] mb-1">Revenus bruts</p>
            <p className="text-white font-bold">{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-red-400/60 text-[10px] mb-1">Charges totales</p>
            <p className="text-red-400 font-bold">{formatCurrency(totalCharges)}</p>
          </div>
          <div className={`${netProfit >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'} rounded-xl p-3 text-center`}>
            <p className={`${netProfit >= 0 ? 'text-green-400/60' : 'text-red-400/60'} text-[10px] mb-1`}>Résultat net</p>
            <p className={`${netProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-bold`}>{netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          <Button onClick={handleDownload} isLoading={generating}>
            <Download className="w-4 h-4 mr-1.5" />
            {generating ? 'Génération…' : 'Télécharger le PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Conciergerie Print Modal ─────────────────────────────────────────────────

function PrintModal({
  isOpen, onClose, property, revenues, month, year,
}: {
  isOpen: boolean; onClose: () => void
  property: Property; revenues: PropertyRevenue[]; month: number; year: number
}) {
  const totals = propertyTotals(revenues)
  const [generating, setGenerating] = useState(false)

  const handleDownload = async () => {
    setGenerating(true)
    await downloadPDF(property, revenues, month, year)
    setGenerating(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rapport — ${property.name}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between bg-[#141414] rounded-xl p-4">
          <div>
            <p className="text-white font-semibold">{property.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{property.address}, {property.city}</p>
            <p className="text-white/40 text-xs">Propriétaire : <span className="text-white/60">{property.owner.name}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[#D4AF37] font-semibold text-sm">{MONTHS_FR[month]} {year}</p>
            <p className="text-white/30 text-xs mt-0.5">Commission : {property.commissionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
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

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          <Button onClick={handleDownload} isLoading={generating}>
            <Download className="w-4 h-4 mr-1.5" />
            {generating ? 'Génération…' : 'Télécharger le PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Property Revenue Card ────────────────────────────────────────────────────

function PropertyRevenueCard({
  property, month, year, onReload, onHide,
}: {
  property: Property; month: number; year: number; onReload: () => void; onHide: () => void
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
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold">{property.name}</p>
              {property.status !== 'active' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Inactif</span>
              )}
            </div>
            <p className="text-white/30 text-xs">{property.owner.name} · {property.commissionRate}% comm.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onHide} title="Masquer ce logement ce mois-ci"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/30 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:text-white/60 transition-all">
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setPrintOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 transition-all">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
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
        <div className="w-[70px] px-3 py-2 text-white/25 text-[10px] font-medium text-center flex-shrink-0">Nuits</div>
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
  property, month, year, onReload, onHide,
}: {
  property: Property; month: number; year: number; onReload: () => void; onHide: () => void
}) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const revenues        = property.revenues
  const expense         = property.subletExpenses[0] ?? null
  const totalGross      = revenues.reduce((s, r) => s + r.platformAmount, 0)
  const totalCleaning   = revenues.reduce((s, r) => s + r.cleaningFees, 0)
  const totalRevenueNet = totalGross - totalCleaning
  const totalCharges    = expense ? expense.loyer + expense.electricite + expense.wifi + expense.autresCharges + (expense.assurance ?? 0) : 0
  const netProfit       = totalRevenueNet - totalCharges

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
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold">{property.name}</p>
              {property.status !== 'active' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Inactif</span>
              )}
            </div>
            <p className="text-white/30 text-xs">{property.owner.name} · Sous-location</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onHide} title="Masquer ce logement ce mois-ci"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/30 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:text-white/60 transition-all">
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setPrintOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <div className="text-right">
            <p className={`font-bold text-lg leading-none ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
            </p>
            <p className="text-white/30 text-[10px]">Résultat net</p>
          </div>
        </div>
      </div>

      {/* Revenus section — inline Airbnb + Booking rows (sans commission) */}
      <div className="border-b border-white/[0.04]">
        {/* En-têtes colonnes desktop */}
        <div className="hidden md:flex items-center border-b border-white/[0.04] bg-white/[0.01]">
          <div className="w-[120px] px-4 py-2 text-white/25 text-[10px] font-medium flex-shrink-0">Plateforme</div>
          <div className="flex-1 px-3 py-2 text-white/25 text-[10px] font-medium">Montant brut (€)</div>
          <div className="flex-1 px-3 py-2 text-white/25 text-[10px] font-medium">Frais ménage (€)</div>
          <div className="w-[60px] px-3 py-2 text-white/25 text-[10px] font-medium text-center flex-shrink-0">Nuits</div>
          <div className="w-[110px] px-4 py-2 text-white/25 text-[10px] font-medium text-right flex-shrink-0">Net</div>
          <div className="w-[90px] flex-shrink-0" />
        </div>
        <SubletPlatformRow property={property} platform="airbnb"
          existing={revenues.find(r => r.platform === 'airbnb') ?? null}
          month={month} year={year} onReload={onReload} />
        <SubletPlatformRow property={property} platform="booking"
          existing={revenues.find(r => r.platform === 'booking') ?? null}
          month={month} year={year} onReload={onReload} />
        {revenues.filter(r => !['airbnb', 'booking'].includes(r.platform)).map(r => (
          <SubletPlatformRow key={r.id} property={property} platform={r.platform}
            existing={r} month={month} year={year} onReload={onReload} />
        ))}
        {totalGross > 0 && (
          <div className="hidden md:flex items-center border-t border-white/[0.08] bg-white/[0.02]">
            <div className="w-[120px] px-4 py-3 text-white/30 text-xs font-semibold flex-shrink-0">TOTAL</div>
            <div className="flex-1 px-3 py-3 text-white/60 text-sm">{formatCurrency(totalGross)}</div>
            <div className="flex-1 px-3 py-3 text-red-400/70 text-sm">− {formatCurrency(totalCleaning)}</div>
            <div className="w-[110px] px-4 py-3 text-green-400 font-bold text-sm text-right flex-shrink-0">{formatCurrency(totalRevenueNet)}</div>
            <div className="w-[90px] flex-shrink-0" />
          </div>
        )}
        {totalGross > 0 && (
          <div className="md:hidden flex justify-between px-5 py-2.5 bg-white/[0.01] border-t border-white/[0.04]">
            <span className="text-white/30 text-xs font-medium">Net revenus</span>
            <span className="text-green-400 font-semibold text-sm">{formatCurrency(totalRevenueNet)}</span>
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
              ['🏠 Loyer',        expense.loyer],
              ['⚡ Électricité',  expense.electricite],
              ['📶 Wi-Fi',        expense.wifi],
              ['🛡 Assurance',    expense.assurance ?? 0],
              ['📦 Autres',       expense.autresCharges],
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

        {(totalGross > 0 || expense) && (
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
      <SubletPrintModal
        isOpen={printOpen} onClose={() => setPrintOpen(false)}
        property={property} revenues={revenues} expense={expense}
        month={month} year={year}
      />
    </div>
  )
}

// ─── Cleaning Margin Row ──────────────────────────────────────────────────────

function CleaningMarginRow({
  prop, month, year, onReload,
}: {
  prop: CleaningMarginProp; month: number; year: number; onReload: () => void
}) {
  const existing = prop.cleaningMargin
  const [platform, setPlatform] = useState(existing != null ? String(existing.receivedPlatform) : '')
  const [owner,    setOwner]    = useState(existing != null ? String(existing.receivedOwner)    : '')
  const [cleaner,  setCleaner]  = useState(existing != null ? String(existing.paidCleaner)      : '')
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!dirty) {
      setPlatform(existing != null ? String(existing.receivedPlatform) : '')
      setOwner(existing    != null ? String(existing.receivedOwner)    : '')
      setCleaner(existing  != null ? String(existing.paidCleaner)      : '')
    }
  }, [existing, dirty])

  const f = (v: string) => parseFloat(v) || 0
  const margin = f(platform) + f(owner) - f(cleaner)
  const hasData = f(platform) > 0 || f(owner) > 0 || f(cleaner) > 0

  const mark = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { propertyId: prop.id, month, year, receivedPlatform: f(platform), receivedOwner: f(owner), paidCleaner: f(cleaner) }
      const res = existing?.id
        ? await fetch(`/api/facturation/menage/${existing.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/facturation/menage', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDirty(false)
      onReload()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className={`bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden transition-opacity ${hasData || dirty ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
        <div>
          <p className="text-white font-semibold text-sm">{prop.name}</p>
          <p className="text-white/30 text-xs">{prop.owner.name} · {prop.city}</p>
        </div>
        {hasData && !dirty && (
          <div className={`text-right ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <p className="font-bold text-lg leading-none">{margin >= 0 ? '+' : ''}{formatCurrency(margin)}</p>
            <p className="text-[10px] opacity-60">Marge ménage</p>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        {/* Mobile layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Reçu plateforme (€)</label>
            <input type="number" min="0" step="0.01" value={platform} onChange={mark(setPlatform)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Reçu propriétaire (€)</label>
            <input type="number" min="0" step="0.01" value={owner} onChange={mark(setOwner)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Payé femme de ménage (€)</label>
            <input type="number" min="0" step="0.01" value={cleaner} onChange={mark(setCleaner)}
              placeholder="0.00"
              className="w-full bg-[#141414] border border-white/[0.06] rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
        </div>
        {(hasData || dirty) && (
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 text-sm ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="text-white/30 text-xs">Marge =</span>
              <span className="text-white/40 text-xs">{formatCurrency(f(platform))} + {formatCurrency(f(owner))}</span>
              <span className="text-white/25 text-xs">−</span>
              <span className="text-white/40 text-xs">{formatCurrency(f(cleaner))}</span>
              <span className="text-white/25 text-xs">=</span>
              <span className="font-bold">{margin >= 0 ? '+' : ''}{formatCurrency(margin)}</span>
            </div>
            {dirty && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                {saving ? '...' : <><Check className="w-3.5 h-3.5" /> Enregistrer</>}
              </button>
            )}
          </div>
        )}
      </div>
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
  const [cleaningMarginProps, setCleaningMarginProps] = useState<CleaningMarginProp[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [hiddenProps, setHiddenProps] = useState<Set<string>>(new Set())

  const hideKey = (propertyId: number) => `${propertyId}-${month}-${year}`
  const hideProperty = (propertyId: number) => {
    setHiddenProps(prev => { const next = new Set(prev); next.add(hideKey(propertyId)); return next })
  }
  const showProperty = (propertyId: number) => {
    setHiddenProps(prev => { const next = new Set(prev); next.delete(hideKey(propertyId)); return next })
  }

  const load = useCallback(async () => {
    try {
      const [cRes, sRes, mRes] = await Promise.all([
        fetch(`/api/facturation?month=${month}&year=${year}`),
        fetch(`/api/facturation/sous-location?month=${month}&year=${year}`),
        fetch(`/api/facturation/menage?month=${month}&year=${year}`),
      ])
      const [cData, sData, mData] = await Promise.all([cRes.json(), sRes.json(), mRes.json()])
      setConciergerieProps(Array.isArray(cData) ? cData : [])
      setSousLocationProps(Array.isArray(sData) ? sData : [])
      setCleaningMarginProps(Array.isArray(mData) ? mData : [])
    } catch {
      setConciergerieProps([])
      setSousLocationProps([])
      setCleaningMarginProps([])
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

  const visibleConciergerie = conciergerieProps.filter(p => !hiddenProps.has(hideKey(p.id)))
  const hiddenConciergerie  = conciergerieProps.filter(p => hiddenProps.has(hideKey(p.id)))
  const visibleSousLoc      = sousLocationProps.filter(p => !hiddenProps.has(hideKey(p.id)))
  const hiddenSousLoc       = sousLocationProps.filter(p => hiddenProps.has(hideKey(p.id)))

  const totalBrutConcierge = visibleConciergerie.reduce((s, p) => s + propertyTotals(p.revenues).partMK, 0)
  const totalBrutSousLoc = visibleSousLoc.reduce((s, p) => {
    const gross = p.revenues.reduce((sum, r) => sum + r.platformAmount, 0)
    const cleaning = p.revenues.reduce((sum, r) => sum + r.cleaningFees, 0)
    const exp = p.subletExpenses[0] ?? null
    const charges = exp ? exp.loyer + exp.electricite + exp.wifi + exp.autresCharges + (exp.assurance ?? 0) : 0
    return s + (gross - cleaning - charges)
  }, 0)

  const conciergerieByCity = Array.from(
    visibleConciergerie.reduce((map, p) => {
      const city = (p.city || 'Autre').trim()
      return map.set(city, [...(map.get(city) ?? []), p])
    }, new Map<string, Property[]>())
  ).sort(([a], [b]) => a.localeCompare(b, 'fr'))

  const sousLocByCity = Array.from(
    visibleSousLoc.reduce((map, p) => {
      const city = (p.city || 'Autre').trim()
      return map.set(city, [...(map.get(city) ?? []), p])
    }, new Map<string, Property[]>())
  ).sort(([a], [b]) => a.localeCompare(b, 'fr'))
  const totalMenage = cleaningMarginProps.reduce((s, p) => {
    const m = p.cleaningMargin
    if (!m) return s
    return s + (m.receivedPlatform + m.receivedOwner - m.paidCleaner)
  }, 0)
  const totalBrutGlobal = totalBrutConcierge + totalBrutSousLoc + totalMenage

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
    { key: 'conciergerie', label: 'Conciergerie', count: visibleConciergerie.length },
    { key: 'sous-location', label: 'Sous-location', count: visibleSousLoc.length },
    { key: 'menage', label: 'Ménage' },
    { key: 'classement', label: 'Classement' },
    { key: 'rapports', label: 'Rapports' },
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
          {(totalBrutConcierge > 0 || totalBrutSousLoc !== 0 || totalMenage !== 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {totalBrutConcierge > 0 && (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl px-3 py-2 text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Conciergerie</p>
                  <p className="text-[#D4AF37] font-bold text-lg">{formatCurrency(totalBrutConcierge)}</p>
                </div>
              )}
              {totalBrutSousLoc !== 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-3 py-2 text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Sous-location</p>
                  <p className="text-blue-400 font-bold text-lg">{formatCurrency(totalBrutSousLoc)}</p>
                </div>
              )}
              {totalMenage !== 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2 text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Ménage</p>
                  <p className="text-emerald-400 font-bold text-lg">{formatCurrency(totalMenage)}</p>
                </div>
              )}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Total {MONTHS_FR[month]}</p>
                <p className="text-white font-bold text-lg">{formatCurrency(totalBrutGlobal)}</p>
              </div>
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
              {/* Bannière logements masqués — très visible */}
              {hiddenConciergerie.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      {hiddenConciergerie.length} logement{hiddenConciergerie.length > 1 ? 's' : ''} masqué{hiddenConciergerie.length > 1 ? 's' : ''} ce mois-ci
                    </p>
                    <button
                      onClick={() => hiddenConciergerie.forEach(p => showProperty(p.id))}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                      Tout afficher
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hiddenConciergerie.map(p => (
                      <button key={p.id} onClick={() => showProperty(p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                        <Eye className="w-3 h-3" /> {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleConciergerie.length === 0 && hiddenConciergerie.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en conciergerie</p>
                </div>
              ) : (
                conciergerieByCity.map(([city, cityProps]) => {
                  const cityTotal = cityProps.reduce((s, p) => s + propertyTotals(p.revenues).partMK, 0)
                  return (
                    <div key={city} className="space-y-3">
                      <div className="flex items-center justify-between px-1 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-white/25" />
                          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{city}</span>
                        </div>
                        {cityTotal > 0 && (
                          <span className="text-[#D4AF37]/60 text-xs font-semibold">{formatCurrency(cityTotal)}</span>
                        )}
                      </div>
                      {cityProps.map(p => (
                        <PropertyRevenueCard key={p.id} property={p} month={month} year={year} onReload={load} onHide={() => hideProperty(p.id)} />
                      ))}
                    </div>
                  )
                })
              )}

              {visibleConciergerie.length > 0 && totalBrutConcierge > 0 && (
                <div className="flex items-center justify-between bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-2xl px-6 py-4">
                  <span className="text-white/50 font-medium">TOTAL BRUT MENSUEL — CONCIERGERIE</span>
                  <span className="text-[#D4AF37] font-bold text-2xl">{formatCurrency(totalBrutConcierge)}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'sous-location' && (
            <div className="space-y-4">
              {hiddenSousLoc.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      {hiddenSousLoc.length} logement{hiddenSousLoc.length > 1 ? 's' : ''} masqué{hiddenSousLoc.length > 1 ? 's' : ''} ce mois-ci
                    </p>
                    <button
                      onClick={() => hiddenSousLoc.forEach(p => showProperty(p.id))}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                      Tout afficher
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hiddenSousLoc.map(p => (
                      <button key={p.id} onClick={() => showProperty(p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                        <Eye className="w-3 h-3" /> {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleSousLoc.length === 0 && hiddenSousLoc.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en sous-location</p>
                </div>
              ) : (
                sousLocByCity.map(([city, cityProps]) => {
                  const cityNet = cityProps.reduce((s, p) => {
                    const gross = p.revenues.reduce((sum, r) => sum + r.platformAmount, 0)
                    const cleaning = p.revenues.reduce((sum, r) => sum + r.cleaningFees, 0)
                    const exp = p.subletExpenses[0] ?? null
                    const charges = exp ? exp.loyer + exp.electricite + exp.wifi + exp.autresCharges + (exp.assurance ?? 0) : 0
                    return s + (gross - cleaning - charges)
                  }, 0)
                  return (
                    <div key={city} className="space-y-3">
                      <div className="flex items-center justify-between px-1 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-white/25" />
                          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{city}</span>
                        </div>
                        {cityNet !== 0 && (
                          <span className={`text-xs font-semibold ${cityNet >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                            {cityNet >= 0 ? '+' : ''}{formatCurrency(cityNet)}
                          </span>
                        )}
                      </div>
                      {cityProps.map(p => (
                        <SubletPropertyCard key={p.id} property={p} month={month} year={year} onReload={load} onHide={() => hideProperty(p.id)} />
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'menage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold">Frais de ménage — {MONTHS_FR[month]} {year}</h2>
                  <p className="text-white/30 text-xs mt-0.5">Saisissez ce que vous avez perçu et payé pour calculer votre marge</p>
                </div>
                {totalMenage !== 0 && (
                  <div className={`rounded-2xl px-4 py-2 text-center border ${totalMenage >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Marge totale</p>
                    <p className={`font-bold text-xl ${totalMenage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totalMenage >= 0 ? '+' : ''}{formatCurrency(totalMenage)}
                    </p>
                  </div>
                )}
              </div>
              {cleaningMarginProps.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Euro className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement actif</p>
                </div>
              ) : (
                cleaningMarginProps.map(p => (
                  <CleaningMarginRow key={p.id} prop={p} month={month} year={year} onReload={load} />
                ))
              )}
            </div>
          )}

          {tab === 'classement' && (
            <ClassementTab properties={visibleConciergerie} month={month} year={year} />
          )}

          {tab === 'rapports' && <RapportsInline />}
        </>
      )}
    </div>
  )
}

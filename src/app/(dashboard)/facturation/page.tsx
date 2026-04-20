'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Printer,
  Trophy, TrendingUp, Home, X, Check, AlertCircle, Euro,
  Building2, Zap, Wifi, MoreHorizontal, Download, EyeOff, Eye
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

type ActiveTab = 'conciergerie' | 'sous-location' | 'classement' | 'rapports'

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
  const [sejours, setSejours] = useState(existing ? String(existing.nbSejours || '') : '')
  const [nuits,   setNuits]   = useState(existing ? String(existing.nbNuits    || '') : '')
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from server data only when not editing
  useEffect(() => {
    if (!dirty) {
      setAmount(existing    ? String(existing.platformAmount)  : '')
      setCleaning(existing  ? String(existing.cleaningFees)    : '')
      setCommission(existing ? String(existing.commissionRate) : String(property.commissionRate))
      setSejours(existing ? String(existing.nbSejours || '') : '')
      setNuits(existing   ? String(existing.nbNuits    || '') : '')
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
      nbSejours: parseInt(sejours) || 0, nbNuits: parseInt(nuits) || 0,
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/30 block mb-1">Séjours</label>
            <input type="number" min="0" step="1" value={sejours} onChange={mark(setSejours)}
              placeholder="0"
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
          <input type="number" min="0" step="1" value={sejours} onChange={mark(setSejours)}
            placeholder="0"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#D4AF37]/50 px-1 py-1 text-white/40 text-sm outline-none transition-colors text-center placeholder:text-white/15" />
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
  const [dirty,    setDirty]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!dirty) {
      setAmount(existing   ? String(existing.platformAmount) : '')
      setCleaning(existing ? String(existing.cleaningFees)   : '')
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
        <div className="grid grid-cols-2 gap-2">
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
    nbSejours: String(initial?.nbSejours ?? ''),
    nbNuits: String(initial?.nbNuits ?? ''),
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm({
      loyer: String(initial?.loyer ?? ''),
      electricite: String(initial?.electricite ?? ''),
      wifi: String(initial?.wifi ?? ''),
      autresCharges: String(initial?.autresCharges ?? ''),
      nbSejours: String(initial?.nbSejours ?? ''),
      nbNuits: String(initial?.nbNuits ?? ''),
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
      nbSejours: parseInt(form.nbSejours) || 0,
      nbNuits: parseInt(form.nbNuits) || 0,
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Séjours</label>
            <input
              type="number" min="0" step="1"
              value={form.nbSejours}
              onChange={e => setForm(f => ({ ...f, nbSejours: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Nuits</label>
            <input
              type="number" min="0" step="1"
              value={form.nbNuits}
              onChange={e => setForm(f => ({ ...f, nbNuits: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
            />
          </div>
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
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

async function downloadPDF(property: Property, revenues: PropertyRevenue[], month: number, year: number) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const totals = propertyTotals(revenues)
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const W = 210, mg = 14, cW = W - mg * 2
  let y = 0

  const text  = (t: string, x: number, yy: number, opts?: { align?: 'left'|'right'|'center', maxWidth?: number }) => doc.text(t, x, yy, opts)
  const font  = (style: 'normal'|'bold', size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const color = (r: number, g: number, b: number) => doc.setTextColor(r, g, b)
  const fill  = (r: number, g: number, b: number) => doc.setFillColor(r, g, b)
  const stroke= (r: number, g: number, b: number) => doc.setDrawColor(r, g, b)

  // bande or haut
  fill(212,175,55); doc.rect(0,0,W,1.5,'F')

  // header
  y = 11
  font('bold', 20); color(26,26,26); text('Master', mg, y)
  color(212,175,55); text('Key', mg + doc.getTextWidth('Master'), y)
  font('normal', 8); color(160,160,160); text('Conciergerie & Gestion Locative', mg, y+5)
  font('bold', 12); color(212,175,55); text(`Relevé — ${MONTHS_FR[month]} ${year}`, W-mg, y, { align:'right' })
  font('normal', 8); color(160,160,160); text(`Édité le ${today}`, W-mg, y+5, { align:'right' })

  y += 9; stroke(212,175,55); doc.setLineWidth(0.4); doc.line(mg,y,W-mg,y); y += 6

  // bloc propriété
  fill(249,249,249); stroke(230,230,230); doc.setLineWidth(0.25)
  doc.roundedRect(mg, y, cW, 20, 2, 2, 'FD')
  fill(212,175,55); doc.rect(mg, y, 2, 20, 'F')
  const propFields = [
    ['LOGEMENT', property.name],
    ['ADRESSE', `${property.address}, ${property.city}`],
    ['PROPRIÉTAIRE', property.owner.name],
    ['COMMISSION', `${property.commissionRate} %`],
  ]
  const fw = cW / propFields.length
  propFields.forEach(([lbl, val], i) => {
    const x = mg + 3 + i * fw
    font('bold', 7); color(180,180,180); text(lbl, x, y+7)
    font('bold', 9); color(26,26,26); text(val, x, y+14, { maxWidth: fw-4 })
  })
  y += 25

  // ── Taux d'occupation global ──────────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalNuits = revenues.reduce((s, r) => s + (r.nbNuits ?? 0), 0)
  const tauxOcc = daysInMonth > 0 ? Math.round((totalNuits / daysInMonth) * 100) : 0
  font('normal', 9); color(80,80,80)
  text(`Taux d'occupation : ${tauxOcc} %`, mg, y + 6)
  y += 14

  // tableau header
  const cols = ['Plateforme','Montant brut','Frais ménage','Com. %','Base calcul','Part MasterKey','Part propriétaire']
  const colWidths = [28, 26, 26, 17, 26, 29, 30]
  const rowH = 8

  fill(26,26,26); doc.rect(mg, y, cW, rowH, 'F')
  font('bold', 7.5); color(255,255,255)
  let cx = mg + 2
  cols.forEach((c, i) => { text(c, cx + (i>0 ? colWidths[i]-1 : 0), y+5.5, { align: i>0 ? 'right' : 'left' }); cx += colWidths[i] })
  y += rowH

  // lignes données
  const allRows = [
    ...revenues.map(r => {
      const { base, partMK, partProprio } = calcRevenue(r)
      return { cells: [PLATFORM_LABELS[r.platform]??r.platform, fmt(r.platformAmount), r.cleaningFees>0?fmt(r.cleaningFees):'—', `${r.commissionRate}%`, fmt(base), fmt(partMK), fmt(partProprio)], isTotal: false }
    }),
    { cells: ['TOTAL', fmt(totals.platformAmount), fmt(totals.cleaningFees), '', fmt(totals.base), fmt(totals.partMK), fmt(totals.partProprio)], isTotal: true },
  ]
  allRows.forEach((row, ri) => {
    const bg = row.isTotal ? [240,240,240] : ri%2===0 ? [255,255,255] : [250,250,250]
    fill(bg[0],bg[1],bg[2]); stroke(230,230,230); doc.setLineWidth(0.15)
    doc.rect(mg, y, cW, rowH, 'FD')
    cx = mg + 2
    row.cells.forEach((cell, ci) => {
      font(row.isTotal||ci===0?'bold':'normal', 8.5)
      if (ci===5) color(146,112,10)
      else if (ci===6) color(22,101,52)
      else if (ci>=2&&ci<=3) color(130,130,130)
      else color(26,26,26)
      text(cell, cx+(ci>0?colWidths[ci]-1:0), y+5.5, { align:ci>0?'right':'left' })
      cx += colWidths[ci]
    })
    y += rowH
  })
  y += 6

  // cartes synthèse
  const cards = [
    { lbl:'Total facturé',    val:fmt(totals.platformAmount), bg:[245,245,245], fg:[26,26,26] },
    { lbl:'Frais ménage',     val:fmt(totals.cleaningFees),   bg:[245,245,245], fg:[26,26,26] },
    { lbl:'Base commission',  val:fmt(totals.base),           bg:[245,245,245], fg:[26,26,26] },
    { lbl:'Part MasterKey',   val:fmt(totals.partMK),         bg:[255,251,235], fg:[146,112,10] },
    { lbl:'Part propriétaire',val:fmt(totals.partProprio),    bg:[240,253,244], fg:[22,101,52] },
  ] as { lbl:string; val:string; bg:[number,number,number]; fg:[number,number,number] }[]
  const cCardW = cW/cards.length - 2
  cards.forEach((c,i) => {
    const x = mg + i*(cCardW+2)
    fill(...c.bg); stroke(220,220,220); doc.setLineWidth(0.2)
    doc.roundedRect(x, y, cCardW, 17, 2, 2, 'FD')
    font('normal',7); color(150,150,150); text(c.lbl.toUpperCase(), x+cCardW/2, y+6, {align:'center'})
    font('bold',10); color(...c.fg); text(c.val, x+cCardW/2, y+13, {align:'center'})
  })
  y += 22

  // footer
  stroke(220,220,220); doc.setLineWidth(0.2); doc.line(mg,y,W-mg,y); y+=4
  font('normal',7.5); color(180,180,180)
  text('MasterKey — Conciergerie & Gestion Locative', mg, y)
  text(`Document confidentiel · ${today}`, W-mg, y, {align:'right'})

  // bande or bas
  fill(212,175,55); doc.rect(0,294.5,W,1.5,'F')

  doc.save(`MasterKey_${property.name.replace(/\s+/g,'_')}_${MONTHS_FR[month]}_${year}.pdf`)
}


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
        <div className="w-[70px] px-3 py-2 text-white/25 text-[10px] font-medium text-center flex-shrink-0">Séjours</div>
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

  const revenues        = property.revenues
  const expense         = property.subletExpenses[0] ?? null
  const totalGross      = revenues.reduce((s, r) => s + r.platformAmount, 0)
  const totalCleaning   = revenues.reduce((s, r) => s + r.cleaningFees, 0)
  const totalRevenueNet = totalGross - totalCleaning
  const totalCharges    = expense ? expense.loyer + expense.electricite + expense.wifi + expense.autresCharges : 0
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
  const [hiddenProps, setHiddenProps] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set<string>(JSON.parse(localStorage.getItem('facturation-hidden') ?? '[]')) } catch { return new Set<string>() }
  })

  const hideKey = (propertyId: number) => `${propertyId}-${month}-${year}`
  const hideProperty = (propertyId: number) => {
    setHiddenProps(prev => {
      const next = new Set(prev)
      next.add(hideKey(propertyId))
      localStorage.setItem('facturation-hidden', JSON.stringify(Array.from(next)))
      return next
    })
  }
  const showProperty = (propertyId: number) => {
    setHiddenProps(prev => {
      const next = new Set(prev)
      next.delete(hideKey(propertyId))
      localStorage.setItem('facturation-hidden', JSON.stringify(Array.from(next)))
      return next
    })
  }

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

  const visibleConciergerie = conciergerieProps.filter(p => !hiddenProps.has(hideKey(p.id)))
  const hiddenConciergerie  = conciergerieProps.filter(p => hiddenProps.has(hideKey(p.id)))
  const visibleSousLoc      = sousLocationProps.filter(p => !hiddenProps.has(hideKey(p.id)))
  const hiddenSousLoc       = sousLocationProps.filter(p => hiddenProps.has(hideKey(p.id)))

  const totalBrutConcierge = visibleConciergerie.reduce((s, p) => s + propertyTotals(p.revenues).partMK, 0)
  const totalBrutSousLoc = visibleSousLoc.reduce((s, p) => {
    const gross = p.revenues.reduce((sum, r) => sum + r.platformAmount, 0)
    const cleaning = p.revenues.reduce((sum, r) => sum + r.cleaningFees, 0)
    const exp = p.subletExpenses[0] ?? null
    const charges = exp ? exp.loyer + exp.electricite + exp.wifi + exp.autresCharges : 0
    return s + (gross - cleaning - charges)
  }, 0)
  const totalBrutGlobal = totalBrutConcierge + totalBrutSousLoc

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
          {(totalBrutConcierge > 0 || totalBrutSousLoc !== 0) && (
            <div className="flex items-center gap-2">
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
              {totalBrutConcierge > 0 && totalBrutSousLoc !== 0 && (
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Total {MONTHS_FR[month]}</p>
                  <p className="text-white font-bold text-lg">{formatCurrency(totalBrutGlobal)}</p>
                </div>
              )}
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
              {visibleConciergerie.length === 0 && hiddenConciergerie.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en conciergerie</p>
                </div>
              ) : (
                visibleConciergerie.map(p => (
                  <PropertyRevenueCard key={p.id} property={p} month={month} year={year} onReload={load} onHide={() => hideProperty(p.id)} />
                ))
              )}
              {hiddenConciergerie.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hiddenConciergerie.map(p => (
                    <button key={p.id} onClick={() => showProperty(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/30 bg-white/[0.03] border border-white/[0.06] hover:text-white/60 hover:border-white/10 transition-all">
                      <Eye className="w-3 h-3" /> {p.name}
                    </button>
                  ))}
                </div>
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
              {visibleSousLoc.length === 0 && hiddenSousLoc.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Aucun logement en sous-location</p>
                </div>
              ) : (
                visibleSousLoc.map(p => (
                  <SubletPropertyCard key={p.id} property={p} month={month} year={year} onReload={load} onHide={() => hideProperty(p.id)} />
                ))
              )}
              {hiddenSousLoc.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hiddenSousLoc.map(p => (
                    <button key={p.id} onClick={() => showProperty(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/30 bg-white/[0.03] border border-white/[0.06] hover:text-white/60 hover:border-white/10 transition-all">
                      <Eye className="w-3 h-3" /> {p.name}
                    </button>
                  ))}
                </div>
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

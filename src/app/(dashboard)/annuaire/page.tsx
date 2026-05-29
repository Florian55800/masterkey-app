'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, Phone, Mail, MapPin, Trash2, Pencil,
  BookUser, MessageCircle, X, Check, Star,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

// ─── Catégories disponibles ───────────────────────────────────────────────────

const ALL_CATEGORIES = [
  { id: 'menage',        label: 'Ménage',          color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { id: 'entretien',     label: 'Entretien',        color: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  { id: 'plomberie',     label: 'Plomberie',        color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  { id: 'electricite',   label: 'Électricité',      color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  { id: 'peinture',      label: 'Peinture',         color: 'bg-pink-500/15 text-pink-400 border-pink-500/25' },
  { id: 'decoration',    label: 'Décoration',       color: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  { id: 'photographie',  label: 'Photographie',     color: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  { id: 'jardinage',     label: 'Jardinage',        color: 'bg-green-500/15 text-green-400 border-green-500/25' },
  { id: 'serrurerie',    label: 'Serrurerie',       color: 'bg-gray-400/15 text-gray-300 border-gray-400/25' },
  { id: 'menuiserie',    label: 'Menuiserie',       color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  { id: 'transport',     label: 'Transport',        color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
  { id: 'autre',         label: 'Autre',            color: 'bg-white/10 text-white/50 border-white/15' },
]

const SOURCE_OPTIONS = ['Email', 'WhatsApp', 'Appel', 'Réseaux sociaux', 'Bouche à oreille', 'Autre']

function getCatStyle(id: string) {
  return ALL_CATEGORIES.find(c => c.id === id)?.color ?? 'bg-white/10 text-white/50 border-white/15'
}
function getCatLabel(id: string) {
  return ALL_CATEGORIES.find(c => c.id === id)?.label ?? id
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prestataire {
  id: number
  name: string
  phone: string | null
  email: string | null
  city: string | null
  categories: string
  services: string | null
  source: string | null
  notes: string | null
  isWhatsapp: boolean | number
  createdAt: string
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  city: '',
  categories: [] as string[],
  services: '',
  source: '',
  notes: '',
  isWhatsapp: false,
}

// ─── Composant avatar ─────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm'
  return (
    <div className={`${sz} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}>
      {initials}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnuairePage() {
  const [list, setList] = useState<Prestataire[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Prestataire | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // ── Chargement ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/prestataires')
      const data = await res.json()
      setList(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtres ────────────────────────────────────────────────────────────────

  const filtered = list.filter(p => {
    const cats: string[] = (() => { try { return JSON.parse(p.categories) } catch { return [] } })()
    const matchCat = filterCat === 'tous' || cats.includes(filterCat)
    const q = search.toLowerCase()
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || (p.city ?? '').toLowerCase().includes(q)
      || (p.services ?? '').toLowerCase().includes(q)
      || cats.some(c => getCatLabel(c).toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  function openEdit(p: Prestataire) {
    setEditTarget(p)
    setForm({
      name: p.name,
      phone: p.phone ?? '',
      email: p.email ?? '',
      city: p.city ?? '',
      categories: (() => { try { return JSON.parse(p.categories) } catch { return [] } })(),
      services: p.services ?? '',
      source: p.source ?? '',
      notes: p.notes ?? '',
      isWhatsapp: Boolean(p.isWhatsapp),
    })
    setModalOpen(true)
  }

  function toggleFormCat(id: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter(c => c !== id)
        : [...f.categories, id],
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = {
        ...form,
        categories: JSON.stringify(form.categories),
      }
      if (editTarget) {
        await fetch(`/api/prestataires/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/prestataires', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      await load()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce prestataire ?')) return
    await fetch(`/api/prestataires/${id}`, { method: 'DELETE' })
    setList(prev => prev.filter(p => p.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // ── Compteurs par catégorie ────────────────────────────────────────────────

  const countByCat = (catId: string) =>
    list.filter(p => {
      try { return JSON.parse(p.categories).includes(catId) } catch { return false }
    }).length

  const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50 transition-colors'

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookUser className="w-5 h-5 text-[#D4AF37]" />
            Annuaire prestataires
          </h1>
          <p className="text-white/30 text-sm mt-0.5">
            {list.length} contact{list.length > 1 ? 's' : ''} · Ménage, maintenance, décoration…
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:bg-[#c9a227] transition-all shadow-lg shadow-[#D4AF37]/20"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* ── Recherche ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, ville, service…"
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/40"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Filtres catégories ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat('tous')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            filterCat === 'tous'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'
              : 'bg-white/[0.03] text-white/40 border-white/[0.07] hover:text-white/60'
          }`}
        >
          Tous ({list.length})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const count = countByCat(cat.id)
          if (count === 0) return null
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCat(filterCat === cat.id ? 'tous' : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                filterCat === cat.id
                  ? cat.color
                  : 'bg-white/[0.03] text-white/40 border-white/[0.07] hover:text-white/60'
              }`}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Liste ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <BookUser className="w-12 h-12 text-gray-700" />
          <p className="text-gray-500 text-sm">
            {search || filterCat !== 'tous' ? 'Aucun prestataire trouvé' : 'Aucun prestataire encore — ajoute ton premier contact'}
          </p>
          {!search && filterCat === 'tous' && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-sm font-medium hover:bg-[#D4AF37]/20 transition-all">
              <Plus className="w-4 h-4" /> Ajouter un prestataire
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const cats: string[] = (() => { try { return JSON.parse(p.categories) } catch { return [] } })()
            const expanded = expandedId === p.id
            const wa = Boolean(p.isWhatsapp)

            return (
              <div
                key={p.id}
                className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all"
              >
                {/* En-tête carte */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white font-semibold text-sm leading-tight">{p.name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(p) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(p.id) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Catégories */}
                      {cats.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {cats.map(c => (
                            <span key={c} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${getCatStyle(c)}`}>
                              {getCatLabel(c)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ville */}
                      {p.city && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="w-3 h-3 text-white/25 flex-shrink-0" />
                          <span className="text-white/40 text-xs">{p.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="flex gap-2 mt-3">
                    {p.phone && (
                      <a
                        href={wa ? `https://wa.me/${p.phone.replace(/\D/g, '')}` : `tel:${p.phone}`}
                        onClick={e => e.stopPropagation()}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                          wa
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {wa ? <MessageCircle className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        {p.phone}
                      </a>
                    )}
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/40 border border-white/[0.08] bg-white/[0.03] hover:text-white hover:bg-white/[0.07] transition-all"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Détails dépliés */}
                {expanded && (
                  <div className="border-t border-white/[0.05] px-4 py-3 space-y-3 bg-white/[0.01]">
                    {p.services && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-1">Services proposés</p>
                        <p className="text-white/60 text-sm leading-relaxed">{p.services}</p>
                      </div>
                    )}
                    {p.source && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-1">Comment reçu</p>
                        <p className="text-white/50 text-sm">{p.source}</p>
                      </div>
                    )}
                    {p.notes && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-1">Notes</p>
                        <p className="text-white/50 text-sm leading-relaxed">{p.notes}</p>
                      </div>
                    )}
                    {p.email && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-1">Email</p>
                        <a href={`mailto:${p.email}`} className="text-[#D4AF37]/70 hover:text-[#D4AF37] text-sm transition-colors">{p.email}</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ajout / édition ───────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Modifier le prestataire' : 'Ajouter un prestataire'}
      >
        <div className="space-y-4">

          {/* Nom */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Nom / Prénom *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Jean Dupont"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Catégories */}
          <div>
            <label className="text-xs text-white/40 mb-2 block">Catégories</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => {
                const selected = form.categories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleFormCat(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      selected ? cat.color : 'bg-white/[0.03] text-white/35 border-white/[0.07] hover:text-white/60'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Téléphone + WhatsApp */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Téléphone</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className={inputCls + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isWhatsapp: !f.isWhatsapp }))}
                className={`flex items-center gap-1.5 px-3 rounded-xl border text-xs font-medium transition-all flex-shrink-0 ${
                  form.isWhatsapp
                    ? 'bg-green-500/15 text-green-400 border-green-500/25'
                    : 'bg-white/[0.03] text-white/30 border-white/[0.07]'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contact@exemple.fr"
              className={inputCls}
            />
          </div>

          {/* Ville */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Nancy, Bar-le-Duc…"
              className={inputCls}
            />
          </div>

          {/* Services */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Services proposés</label>
            <textarea
              value={form.services}
              onChange={e => setForm(f => ({ ...f, services: e.target.value }))}
              placeholder="Ménage complet, repassage, gestion linge…"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Source */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Comment reçu</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, source: f.source === s ? '' : s }))}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                    form.source === s
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'
                      : 'bg-white/[0.03] text-white/35 border-white/[0.07] hover:text-white/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Disponibilités, tarifs estimés, qualité du travail…"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 text-sm transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:bg-[#c9a227] transition-all disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

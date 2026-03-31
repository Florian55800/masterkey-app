'use client'

import { useEffect, useState, useRef } from 'react'
import {
  BookOpen, Plus, Edit2, Copy, Check, X, ChevronRight,
  Wifi, Key, MapPin, UtensilsCrossed, Bike, Image,
  Eye, EyeOff, Trash2, Upload, Home,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: number
  name: string
  city: string
  status: string
}

interface Restaurant {
  name: string
  category: string
  description: string
  address?: string
}

interface Activity {
  name: string
  category: string
  description: string
}

interface CustomSection {
  title: string
  content: string
}

interface WelcomeGuide {
  id: number
  propertyId: number
  shareToken: string
  welcomeMessage: string | null
  wifiName: string | null
  wifiPassword: string | null
  keyCode: string | null
  checkIn: string | null
  checkOut: string | null
  houseRules: string[]
  restaurants: Restaurant[]
  activities: Activity[]
  customSections: CustomSection[]
  mediaUrls: string[]
  propertyName: string | null
  propertyCity: string | null
}

const RESTAURANT_CATEGORIES = ['Français', 'Brasserie', 'Italien', 'Pizza', 'Sushi', 'Burgers', 'Tapas', 'Bar/Café', 'Autre']
const ACTIVITY_CATEGORIES = ['Plage', 'Randonnée', 'Musée', 'Culture', 'Shopping', 'Sport', 'Nature', 'Soirée', 'Famille', 'Autre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

function inputStyle(extra?: string) {
  return `w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] ${extra ?? ''}`
}

function sectionHeading(label: string) {
  return (
    <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">{label}</p>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LivretsPage() {
  const [guides, setGuides] = useState<WelcomeGuide[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | ''>('')
  const [creating, setCreating] = useState(false)
  const [activeGuide, setActiveGuide] = useState<WelcomeGuide | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'acces' | 'lieux' | 'photos'>('general')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Draft state for edit panel
  const [draft, setDraft] = useState<Partial<WelcomeGuide>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [guidesRes, propsRes] = await Promise.all([
        fetch('/api/welcome-guides'),
        fetch('/api/properties'),
      ])
      const guidesData = await guidesRes.json()
      const propsData = await propsRes.json()
      setGuides(Array.isArray(guidesData) ? guidesData : [])
      setProperties(Array.isArray(propsData) ? propsData : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const existingPropertyIds = new Set(guides.map(g => g.propertyId))
  const availableProperties = properties.filter(p => !existingPropertyIds.has(p.id) && p.status === 'active')

  async function createGuide() {
    if (!selectedPropertyId) return
    setCreating(true)
    try {
      const res = await fetch('/api/welcome-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      })
      const guide = await res.json()
      setGuides(prev => [guide, ...prev])
      setShowCreateModal(false)
      setSelectedPropertyId('')
      openGuide(guide)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  function openGuide(guide: WelcomeGuide) {
    setActiveGuide(guide)
    setDraft({
      welcomeMessage: guide.welcomeMessage ?? '',
      wifiName: guide.wifiName ?? '',
      wifiPassword: guide.wifiPassword ?? '',
      keyCode: guide.keyCode ?? '',
      checkIn: guide.checkIn ?? '',
      checkOut: guide.checkOut ?? '',
      houseRules: [...(guide.houseRules || [])],
      restaurants: [...(guide.restaurants || [])],
      activities: [...(guide.activities || [])],
      customSections: [...(guide.customSections || [])],
      mediaUrls: [...(guide.mediaUrls || [])],
    })
    setActiveTab('general')
    setShowPassword(false)
  }

  async function saveGuide() {
    if (!activeGuide) return
    setSaving(true)
    try {
      await fetch(`/api/welcome-guides/${activeGuide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const updated = { ...activeGuide, ...draft } as WelcomeGuide
      setGuides(prev => prev.map(g => g.id === activeGuide.id ? updated : g))
      setActiveGuide(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!activeGuide) return
    const link = `${window.location.origin}/bienvenue/${activeGuide.shareToken}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyGuideLink(guide: WelcomeGuide) {
    const link = `${window.location.origin}/bienvenue/${guide.shareToken}`
    navigator.clipboard.writeText(link)
  }

  async function uploadPhoto(file: File) {
    if (!activeGuide) return
    setUploadingPhoto(true)
    setUploadError(null)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      const res = await fetch(`/api/welcome-guides/${activeGuide.id}`, { method: 'POST', body: fd })
      if (res.status === 413) { setUploadError('Fichier trop lourd pour le serveur (limite nginx)'); return }
      const data = await res.json()
      if (data.url) {
        const newUrls = [...(draft.mediaUrls ?? []), data.url]
        setDraft(prev => ({ ...prev, mediaUrls: newUrls }))
      } else {
        setUploadError(data.error ?? `Erreur ${res.status}`)
      }
    } catch (e) {
      setUploadError(`Erreur: ${String(e)}`)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function removePhoto(url: string) {
    if (!activeGuide) return
    try {
      await fetch(`/api/welcome-guides/${activeGuide.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setDraft(prev => ({ ...prev, mediaUrls: (prev.mediaUrls ?? []).filter(u => u !== url) }))
    } catch (e) {
      console.error(e)
    }
  }

  // ─── House Rules ────────────────────────────────────────────────────────────

  function addRule() {
    setDraft(prev => ({ ...prev, houseRules: [...(prev.houseRules ?? []), ''] }))
  }

  function updateRule(idx: number, val: string) {
    const updated = [...(draft.houseRules ?? [])]
    updated[idx] = val
    setDraft(prev => ({ ...prev, houseRules: updated }))
  }

  function removeRule(idx: number) {
    setDraft(prev => ({ ...prev, houseRules: (prev.houseRules ?? []).filter((_, i) => i !== idx) }))
  }

  // ─── Restaurants ────────────────────────────────────────────────────────────

  function addRestaurant() {
    setDraft(prev => ({
      ...prev,
      restaurants: [...(prev.restaurants ?? []), { name: '', category: 'Français', description: '', address: '' }],
    }))
  }

  function updateRestaurant(idx: number, field: keyof Restaurant, val: string) {
    const updated = [...(draft.restaurants ?? [])]
    updated[idx] = { ...updated[idx], [field]: val }
    setDraft(prev => ({ ...prev, restaurants: updated }))
  }

  function removeRestaurant(idx: number) {
    setDraft(prev => ({ ...prev, restaurants: (prev.restaurants ?? []).filter((_, i) => i !== idx) }))
  }

  // ─── Activities ─────────────────────────────────────────────────────────────

  function addActivity() {
    setDraft(prev => ({
      ...prev,
      activities: [...(prev.activities ?? []), { name: '', category: 'Plage', description: '' }],
    }))
  }

  function updateActivity(idx: number, field: keyof Activity, val: string) {
    const updated = [...(draft.activities ?? [])]
    updated[idx] = { ...updated[idx], [field]: val }
    setDraft(prev => ({ ...prev, activities: updated }))
  }

  function removeActivity(idx: number) {
    setDraft(prev => ({ ...prev, activities: (prev.activities ?? []).filter((_, i) => i !== idx) }))
  }

  // ─── Custom Sections ────────────────────────────────────────────────────────

  function addSection() {
    setDraft(prev => ({
      ...prev,
      customSections: [...(prev.customSections ?? []), { title: '', content: '' }],
    }))
  }

  function updateSection(idx: number, field: keyof CustomSection, val: string) {
    const updated = [...(draft.customSections ?? [])]
    updated[idx] = { ...updated[idx], [field]: val }
    setDraft(prev => ({ ...prev, customSections: updated }))
  }

  function removeSection(idx: number) {
    setDraft(prev => ({ ...prev, customSections: (prev.customSections ?? []).filter((_, i) => i !== idx) }))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const inputBase = `bg-white/5 border border-white/10 focus:border-[#D4AF37]/50`

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Livrets d&apos;accueil</h1>
              <p className="text-white/40 text-sm">{guides.length} livret{guides.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black transition-all hover:opacity-90"
            style={{ background: '#D4AF37' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau livret
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : guides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.15)' }}
            >
              <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Aucun livret d&apos;accueil</p>
              <p className="text-white/40 text-sm mt-1">Créez votre premier livret pour commencer</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
              style={{ background: '#D4AF37' }}
            >
              <Plus className="w-4 h-4" />
              Nouveau livret
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {guides.map(guide => (
              <div
                key={guide.id}
                className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: activeGuide?.id === guide.id
                    ? '1px solid rgba(212,175,55,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}
                  >
                    <Home className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{guide.propertyName ?? 'Logement'}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {guide.propertyCity ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyGuideLink(guide)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#D4AF37] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    title="Copier le lien"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openGuide(guide)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Edit2 className="w-3 h-3" />
                    Éditer
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Modal ──────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">Nouveau livret d&apos;accueil</h2>
              <button onClick={() => { setShowCreateModal(false); setSelectedPropertyId('') }} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-white/60 text-sm mb-2">Sélectionner un logement</label>
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value ? Number(e.target.value) : '')}
                className={`${inputStyle(inputBase)} appearance-none`}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <option value="">Choisir un logement...</option>
                {availableProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
              </select>
              {availableProperties.length === 0 && (
                <p className="text-white/30 text-xs mt-2">Tous les logements actifs ont déjà un livret.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setSelectedPropertyId('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Annuler
              </button>
              <button
                onClick={createGuide}
                disabled={!selectedPropertyId || creating}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: '#D4AF37' }}
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Panel ────────────────────────────────────────────────────────── */}
      {activeGuide && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setActiveGuide(null)}
          />

          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{
              width: '480px',
              maxWidth: '100vw',
              background: '#131313',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{activeGuide.propertyName}</p>
                <p className="text-white/40 text-xs">{activeGuide.propertyCity}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)',
                    border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(212,175,55,0.25)',
                    color: copied ? '#22c55e' : '#D4AF37',
                  }}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copié !' : 'Lien'}
                </button>
                <button
                  onClick={() => setActiveGuide(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-1 px-5 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              {(['general', 'acces', 'lieux', 'photos'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={{
                    background: activeTab === tab ? 'rgba(212,175,55,0.12)' : 'transparent',
                    border: activeTab === tab ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                    color: activeTab === tab ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {tab === 'general' ? 'Général' : tab === 'acces' ? 'Accès' : tab === 'lieux' ? 'Lieux' : 'Photos'}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* ── Général ── */}
              {activeTab === 'general' && (
                <>
                  {sectionHeading('Message de bienvenue')}
                  <textarea
                    value={draft.welcomeMessage ?? ''}
                    onChange={e => setDraft(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    placeholder="Bonjour et bienvenue dans notre logement..."
                    rows={4}
                    className={`${inputStyle(`${inputBase} resize-none`)} leading-relaxed`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />

                  {sectionHeading('Wifi')}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Nom du réseau</label>
                      <div className="relative">
                        <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                          type="text"
                          value={draft.wifiName ?? ''}
                          onChange={e => setDraft(prev => ({ ...prev, wifiName: e.target.value }))}
                          placeholder="MonWifi_5G"
                          className={`${inputStyle(`${inputBase} pl-9`)} `}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={draft.wifiPassword ?? ''}
                          onChange={e => setDraft(prev => ({ ...prev, wifiPassword: e.target.value }))}
                          placeholder="••••••••"
                          className={`${inputStyle(`${inputBase} pr-10`)} `}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {sectionHeading('Règles de la maison')}
                  <div className="space-y-2">
                    {(draft.houseRules ?? []).map((rule, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={rule}
                          onChange={e => updateRule(idx, e.target.value)}
                          placeholder={`Règle ${idx + 1}`}
                          className={`${inputStyle(`${inputBase} flex-1`)} `}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <button
                          onClick={() => removeRule(idx)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addRule}
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors mt-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une règle
                    </button>
                  </div>
                </>
              )}

              {/* ── Accès ── */}
              {activeTab === 'acces' && (
                <>
                  {sectionHeading('Horaires')}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Check-in</label>
                      <input
                        type="text"
                        value={draft.checkIn ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, checkIn: e.target.value }))}
                        placeholder="15h00"
                        className={inputStyle(`${inputBase}`)}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Check-out</label>
                      <input
                        type="text"
                        value={draft.checkOut ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, checkOut: e.target.value }))}
                        placeholder="11h00"
                        className={inputStyle(`${inputBase}`)}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>

                  {sectionHeading('Accès / Boîte à clés')}
                  <div>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        type="text"
                        value={draft.keyCode ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, keyCode: e.target.value }))}
                        placeholder="Code: 1234"
                        className={inputStyle(`${inputBase} pl-9`)}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>

                  {sectionHeading('Sections personnalisées')}
                  <div className="space-y-4">
                    {(draft.customSections ?? []).map((sec, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sec.title}
                            onChange={e => updateSection(idx, 'title', e.target.value)}
                            placeholder="Titre de la section"
                            className={inputStyle(`${inputBase} flex-1`)}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button
                            onClick={() => removeSection(idx)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          value={sec.content}
                          onChange={e => updateSection(idx, 'content', e.target.value)}
                          placeholder="Contenu de la section..."
                          rows={3}
                          className={inputStyle(`${inputBase} resize-none`)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={addSection}
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une section
                    </button>
                  </div>
                </>
              )}

              {/* ── Lieux ── */}
              {activeTab === 'lieux' && (
                <>
                  {sectionHeading('Restaurants & Bars')}
                  <div className="space-y-4">
                    {(draft.restaurants ?? []).map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={r.name}
                            onChange={e => updateRestaurant(idx, 'name', e.target.value)}
                            placeholder="Nom du restaurant"
                            className={inputStyle(`${inputBase} flex-1`)}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button
                            onClick={() => removeRestaurant(idx)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <select
                          value={r.category}
                          onChange={e => updateRestaurant(idx, 'category', e.target.value)}
                          className={`${inputStyle(`${inputBase}`)} appearance-none`}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {RESTAURANT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea
                          value={r.description}
                          onChange={e => updateRestaurant(idx, 'description', e.target.value)}
                          placeholder="Description..."
                          rows={2}
                          className={inputStyle(`${inputBase} resize-none`)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <input
                          type="text"
                          value={r.address ?? ''}
                          onChange={e => updateRestaurant(idx, 'address', e.target.value)}
                          placeholder="Adresse (optionnel)"
                          className={inputStyle(`${inputBase}`)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={addRestaurant}
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un restaurant
                    </button>
                  </div>

                  <div className="h-px my-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {sectionHeading('À faire autour')}
                  <div className="space-y-4">
                    {(draft.activities ?? []).map((a, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={a.name}
                            onChange={e => updateActivity(idx, 'name', e.target.value)}
                            placeholder="Nom de l'activité"
                            className={inputStyle(`${inputBase} flex-1`)}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button
                            onClick={() => removeActivity(idx)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <select
                          value={a.category}
                          onChange={e => updateActivity(idx, 'category', e.target.value)}
                          className={`${inputStyle(`${inputBase}`)} appearance-none`}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {ACTIVITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea
                          value={a.description}
                          onChange={e => updateActivity(idx, 'description', e.target.value)}
                          placeholder="Description..."
                          rows={2}
                          className={inputStyle(`${inputBase} resize-none`)}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={addActivity}
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une activité
                    </button>
                  </div>
                </>
              )}

              {/* ── Photos ── */}
              {activeTab === 'photos' && (
                <>
                  {sectionHeading('Galerie du logement')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) uploadPhoto(file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full flex flex-col items-center gap-2 py-8 rounded-xl text-sm text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
                    style={{ border: '2px dashed rgba(255,255,255,0.1)' }}
                  >
                    {uploadingPhoto ? (
                      <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                    <span>{uploadingPhoto ? 'Envoi en cours...' : 'Cliquez pour ajouter des photos / vidéos'}</span>
                    <span className="text-xs text-white/25">JPG, PNG, GIF, WebP, MP4 — max 50MB</span>
                  </button>
                  {uploadError && <p className="text-red-400 text-xs mt-2 text-center">{uploadError}</p>}

                  {(draft.mediaUrls ?? []).length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {(draft.mediaUrls ?? []).map((url, idx) => {
                        const isVideo = url.endsWith('.mp4')
                        return (
                          <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square">
                            {isVideo ? (
                              <video src={url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <button
                                onClick={() => removePhoto(url)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239,68,68,0.9)' }}
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Save button */}
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <button
                onClick={saveGuide}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: '#D4AF37' }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

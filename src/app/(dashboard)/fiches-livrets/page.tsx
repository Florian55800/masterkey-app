'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, ClipboardList, ExternalLink, Plus, RefreshCw, Copy, Check,
  Edit2, X, Trash2, Upload, Eye, EyeOff, Wifi, Key, LogOut, LogIn,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Property {
  id: number
  name: string
  city: string
  status: string
  photo: string | null
}

interface ChecklistItem {
  id: string
  label: string
  isDefault?: boolean
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

interface Sheet {
  id: number
  propertyId: number
  shareToken: string
  accessCode: string | null
  checkoutTime: string | null
  nextCheckinTime: string | null
  instructions: string | null
  checklist: ChecklistItem[]
  customSections: CustomSection[]
  mediaUrls: string[]
}

interface Guide {
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
}

const RESTAURANT_CATEGORIES = ['Français', 'Brasserie', 'Italien', 'Pizza', 'Sushi', 'Burgers', 'Tapas', 'Bar/Café', 'Autre']
const ACTIVITY_CATEGORIES = ['Plage', 'Randonnée', 'Musée', 'Culture', 'Shopping', 'Sport', 'Nature', 'Soirée', 'Famille', 'Autre']

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new window.Image()
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

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      }}
      title="Copier le lien"
      style={{
        width: '28px', height: '28px', borderRadius: '8px', border: 'none',
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
        color: copied ? '#22c55e' : 'rgba(255,255,255,0.4)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function FichesLivretsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [sheets, setSheets]         = useState<Sheet[]>([])
  const [guides, setGuides]         = useState<Guide[]>([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState<string | null>(null)
  const [filter, setFilter]         = useState<'all' | 'active'>('active')

  // Sheet edit panel
  const [editSheet, setEditSheet]   = useState<Sheet | null>(null)
  const [sheetDraft, setSheetDraft] = useState<{
    accessCode: string; checkoutTime: string; nextCheckinTime: string;
    instructions: string; checklist: ChecklistItem[]; customSections: CustomSection[]
  }>({ accessCode: '', checkoutTime: '', nextCheckinTime: '', instructions: '', checklist: [], customSections: [] })
  const [sheetTab, setSheetTab]     = useState<'infos' | 'consignes' | 'sections' | 'checklist'>('infos')
  const [savingSheet, setSavingSheet] = useState(false)
  const [uploadingSheetPhoto, setUploadingSheetPhoto] = useState(false)
  const sheetFileRef = useRef<HTMLInputElement>(null)

  // Guide edit panel
  const [editGuide, setEditGuide]   = useState<Guide | null>(null)
  const [guideDraft, setGuideDraft] = useState<Partial<Guide>>({})
  const [guideTab, setGuideTab]     = useState<'general' | 'acces' | 'lieux' | 'photos'>('general')
  const [savingGuide, setSavingGuide] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const [pRes, sRes, gRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/cleaning-sheets'),
        fetch('/api/welcome-guides'),
      ])
      const [props, sh, gu] = await Promise.all([pRes.json(), sRes.json(), gRes.json()])
      setProperties(Array.isArray(props) ? props : [])
      setSheets(Array.isArray(sh) ? sh : [])
      setGuides(Array.isArray(gu) ? gu : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function createSheet(propertyId: number) {
    setCreating(`fiche-${propertyId}`)
    await fetch('/api/cleaning-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) })
    await load()
    setCreating(null)
  }

  async function createGuide(propertyId: number) {
    setCreating(`livret-${propertyId}`)
    await fetch('/api/welcome-guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) })
    await load()
    setCreating(null)
  }

  // ─── Sheet editing ──────────────────────────────────────────────────────────

  function openSheetEdit(sheet: Sheet) {
    setEditSheet(sheet)
    setSheetDraft({
      accessCode: sheet.accessCode ?? '',
      checkoutTime: sheet.checkoutTime ?? '',
      nextCheckinTime: sheet.nextCheckinTime ?? '',
      instructions: sheet.instructions ?? '',
      checklist: [...(sheet.checklist ?? [])],
      customSections: [...(sheet.customSections ?? [])],
    })
    setSheetTab('infos')
    setEditGuide(null)
  }

  async function saveSheet() {
    if (!editSheet) return
    setSavingSheet(true)
    try {
      const res = await fetch(`/api/cleaning-sheets/${editSheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sheetDraft, mediaUrls: editSheet.mediaUrls }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSheets(prev => prev.map(s => s.id === editSheet.id ? { ...s, ...sheetDraft } : s))
      setEditSheet(prev => prev ? { ...prev, ...sheetDraft } : null)
    } catch (e) { console.error(e) }
    finally { setSavingSheet(false) }
  }

  async function uploadSheetPhoto(file: File) {
    if (!editSheet) return
    setUploadingSheetPhoto(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`/api/cleaning-sheets/${editSheet.id}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        const newUrls = [...editSheet.mediaUrls, data.url]
        setEditSheet(prev => prev ? { ...prev, mediaUrls: newUrls } : null)
        setSheets(prev => prev.map(s => s.id === editSheet.id ? { ...s, mediaUrls: newUrls } : s))
      }
    } catch (e) { console.error(e) }
    finally { setUploadingSheetPhoto(false) }
  }

  async function removeSheetPhoto(url: string) {
    if (!editSheet) return
    await fetch(`/api/cleaning-sheets/${editSheet.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    const newUrls = editSheet.mediaUrls.filter(u => u !== url)
    setEditSheet(prev => prev ? { ...prev, mediaUrls: newUrls } : null)
    setSheets(prev => prev.map(s => s.id === editSheet.id ? { ...s, mediaUrls: newUrls } : s))
  }

  function addChecklistItem() {
    setSheetDraft(p => ({ ...p, checklist: [...p.checklist, { id: `custom-${Date.now()}`, label: '', isDefault: false }] }))
  }
  function updateChecklistItem(idx: number, val: string) {
    const u = [...sheetDraft.checklist]; u[idx] = { ...u[idx], label: val }
    setSheetDraft(p => ({ ...p, checklist: u }))
  }
  function removeChecklistItem(idx: number) {
    setSheetDraft(p => ({ ...p, checklist: p.checklist.filter((_, i) => i !== idx) }))
  }

  function addSheetSection() {
    setSheetDraft(p => ({ ...p, customSections: [...p.customSections, { title: '', content: '' }] }))
  }
  function updateSheetSection(i: number, f: keyof CustomSection, v: string) {
    const u = [...sheetDraft.customSections]; u[i] = { ...u[i], [f]: v }
    setSheetDraft(p => ({ ...p, customSections: u }))
  }
  function removeSheetSection(i: number) {
    setSheetDraft(p => ({ ...p, customSections: p.customSections.filter((_, j) => j !== i) }))
  }

  // ─── Guide editing ──────────────────────────────────────────────────────────

  function openGuideEdit(guide: Guide) {
    setEditGuide(guide)
    setGuideDraft({
      welcomeMessage: guide.welcomeMessage ?? '',
      wifiName: guide.wifiName ?? '',
      wifiPassword: guide.wifiPassword ?? '',
      keyCode: guide.keyCode ?? '',
      checkIn: guide.checkIn ?? '',
      checkOut: guide.checkOut ?? '',
      houseRules: [...(guide.houseRules ?? [])],
      restaurants: [...(guide.restaurants ?? [])],
      activities: [...(guide.activities ?? [])],
      customSections: [...(guide.customSections ?? [])],
      mediaUrls: [...(guide.mediaUrls ?? [])],
    })
    setGuideTab('general')
    setShowPassword(false)
    setUploadError(null)
    setEditSheet(null)
  }

  async function saveGuide() {
    if (!editGuide) return
    setSavingGuide(true)
    try {
      const res = await fetch(`/api/welcome-guides/${editGuide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guideDraft),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setGuides(prev => prev.map(g => g.id === editGuide.id ? { ...g, ...guideDraft } as Guide : g))
      setEditGuide(null)
    } catch (e) { console.error(e) }
    finally { setSavingGuide(false) }
  }

  async function uploadGuidePhoto(file: File) {
    if (!editGuide) return
    setUploadingPhoto(true); setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', await compressImage(file))
      const res = await fetch(`/api/welcome-guides/${editGuide.id}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setGuideDraft(p => ({ ...p, mediaUrls: [...(p.mediaUrls ?? []), data.url] }))
      else setUploadError(data.error ?? `Erreur ${res.status}`)
    } catch (e) { setUploadError(String(e)) }
    finally { setUploadingPhoto(false) }
  }

  async function removeGuidePhoto(url: string) {
    if (!editGuide) return
    await fetch(`/api/welcome-guides/${editGuide.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    setGuideDraft(p => ({ ...p, mediaUrls: (p.mediaUrls ?? []).filter(u => u !== url) }))
  }

  const addRule    = () => setGuideDraft(p => ({ ...p, houseRules: [...(p.houseRules ?? []), ''] }))
  const updateRule = (i: number, v: string) => { const u = [...(guideDraft.houseRules ?? [])]; u[i] = v; setGuideDraft(p => ({ ...p, houseRules: u })) }
  const removeRule = (i: number) => setGuideDraft(p => ({ ...p, houseRules: (p.houseRules ?? []).filter((_, j) => j !== i) }))

  const addRestaurant    = () => setGuideDraft(p => ({ ...p, restaurants: [...(p.restaurants ?? []), { name: '', category: 'Français', description: '', address: '' }] }))
  const updateRestaurant = (i: number, f: keyof Restaurant, v: string) => { const u = [...(guideDraft.restaurants ?? [])]; u[i] = { ...u[i], [f]: v }; setGuideDraft(p => ({ ...p, restaurants: u })) }
  const removeRestaurant = (i: number) => setGuideDraft(p => ({ ...p, restaurants: (p.restaurants ?? []).filter((_, j) => j !== i) }))

  const addActivity    = () => setGuideDraft(p => ({ ...p, activities: [...(p.activities ?? []), { name: '', category: 'Plage', description: '' }] }))
  const updateActivity = (i: number, f: keyof Activity, v: string) => { const u = [...(guideDraft.activities ?? [])]; u[i] = { ...u[i], [f]: v }; setGuideDraft(p => ({ ...p, activities: u })) }
  const removeActivity = (i: number) => setGuideDraft(p => ({ ...p, activities: (p.activities ?? []).filter((_, j) => j !== i) }))

  const addSection    = () => setGuideDraft(p => ({ ...p, customSections: [...(p.customSections ?? []), { title: '', content: '' }] }))
  const updateSection = (i: number, f: keyof CustomSection, v: string) => { const u = [...(guideDraft.customSections ?? [])]; u[i] = { ...u[i], [f]: v }; setGuideDraft(p => ({ ...p, customSections: u })) }
  const removeSection = (i: number) => setGuideDraft(p => ({ ...p, customSections: (p.customSections ?? []).filter((_, j) => j !== i) }))

  // ─── Derived ────────────────────────────────────────────────────────────────

  const sheetMap = new Map(sheets.map(s => [s.propertyId, s]))
  const guideMap = new Map(guides.map(g => [g.propertyId, g]))
  const displayed = properties.filter(p => filter === 'all' || p.status === 'active')
  const baseUrl   = typeof window !== 'undefined' ? window.location.origin : ''

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]'
  const inputBg  = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-white/30">Chargement...</div>
    </div>
  )

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#0a0a0a' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Fiches & Livrets</h1>
              <p className="text-white/40 text-sm">Accès rapide par logement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['active', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={filter === f
                  ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {f === 'active' ? 'Actifs' : 'Tous'}
              </button>
            ))}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 mb-6 text-xs text-white/30">
          <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-amber-400" /> Fiche ménage</span>
          <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-sky-400" /> Livret voyageur</span>
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map(prop => {
            const sheet    = sheetMap.get(prop.id)
            const guide    = guideMap.get(prop.id)
            const sheetUrl = sheet ? `${baseUrl}/fiche/${sheet.shareToken}` : null
            const guideUrl = guide ? `${baseUrl}/bienvenue/${guide.shareToken}` : null
            const isActive = prop.status === 'active'

            return (
              <div key={prop.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Top */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {prop.photo
                    ? <img src={prop.photo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>🏠</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{prop.name}</p>
                    <p className="text-white/40 text-xs">{prop.city}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={isActive ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' } : { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Fiche ménage */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">Fiche ménage</p>
                    {sheet
                      ? <p className="text-white/25 text-xs truncate">/fiche/{sheet.shareToken.slice(0, 12)}…</p>
                      : <p className="text-white/25 text-xs">Non créée</p>}
                  </div>
                  {sheet ? (
                    <div className="flex items-center gap-1.5">
                      <CopyButton url={sheetUrl!} />
                      <button onClick={() => openSheetEdit(sheet)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: editSheet?.id === sheet.id ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <Edit2 className="w-3 h-3" /> Éditer
                      </button>
                      <a href={sheetUrl!} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                        style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)', textDecoration: 'none' }}>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <button onClick={() => createSheet(prop.id)} disabled={creating === `fiche-${prop.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {creating === `fiche-${prop.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Créer
                    </button>
                  )}
                </div>

                {/* Livret voyageur */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">Livret voyageur</p>
                    {guide
                      ? <p className="text-white/25 text-xs truncate">/bienvenue/{guide.shareToken.slice(0, 12)}…</p>
                      : <p className="text-white/25 text-xs">Non créé</p>}
                  </div>
                  {guide ? (
                    <div className="flex items-center gap-1.5">
                      <CopyButton url={guideUrl!} />
                      <button onClick={() => openGuideEdit(guide)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: editGuide?.id === guide.id ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                        <Edit2 className="w-3 h-3" /> Éditer
                      </button>
                      <a href={guideUrl!} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                        style={{ background: 'rgba(56,189,248,0.06)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)', textDecoration: 'none' }}>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <button onClick={() => createGuide(prop.id)} disabled={creating === `livret-${prop.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {creating === `livret-${prop.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Créer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-20 text-white/30">Aucun logement trouvé</div>
        )}
      </div>

      {/* ─── Fiche ménage — panneau d'édition ───────────────────────────────── */}
      {editSheet && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditSheet(null)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: '480px', maxWidth: '100vw', background: '#131313', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400" /> Fiche ménage
                </p>
                <p className="text-white/40 text-xs mt-0.5">{properties.find(p => p.id === editSheet.propertyId)?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`${baseUrl}/fiche/${editSheet.shareToken}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', textDecoration: 'none' }}>
                  <ExternalLink className="w-3 h-3" /> Aperçu
                </a>
                <button onClick={() => setEditSheet(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {([
                { key: 'infos', label: 'Infos' },
                { key: 'consignes', label: 'Consignes' },
                { key: 'sections', label: 'Sections' },
                { key: 'checklist', label: 'Checklist' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setSheetTab(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: sheetTab === key ? 'rgba(245,158,11,0.12)' : 'transparent',
                    border: sheetTab === key ? '1px solid rgba(245,158,11,0.25)' : '1px solid transparent',
                    color: sheetTab === key ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* ── Infos ── */}
              {sheetTab === 'infos' && (
                <>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Horaires</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-white/50 text-xs mb-1.5">
                        <LogOut className="w-3 h-3 text-red-400" /> Heure de départ voyageurs
                      </label>
                      <input type="text" value={sheetDraft.checkoutTime}
                        onChange={e => setSheetDraft(p => ({ ...p, checkoutTime: e.target.value }))}
                        placeholder="11h00" className={inputCls} style={inputBg} />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-white/50 text-xs mb-1.5">
                        <LogIn className="w-3 h-3 text-emerald-400" /> Heure d&apos;arrivée suivants
                      </label>
                      <input type="text" value={sheetDraft.nextCheckinTime}
                        onChange={e => setSheetDraft(p => ({ ...p, nextCheckinTime: e.target.value }))}
                        placeholder="15h00" className={inputCls} style={inputBg} />
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 mt-2">Code d&apos;accès / Boîte à clés</p>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input type="text" value={sheetDraft.accessCode}
                      onChange={e => setSheetDraft(p => ({ ...p, accessCode: e.target.value }))}
                      placeholder="Ex: 1234 ou tourner à gauche..." className={`${inputCls} pl-9`} style={inputBg} />
                  </div>

                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 mt-2">Photos de référence</p>
                  <input ref={sheetFileRef} type="file" accept="image/*,video/mp4" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadSheetPhoto(f); e.target.value = '' }} />
                  <button onClick={() => sheetFileRef.current?.click()} disabled={uploadingSheetPhoto}
                    className="w-full flex flex-col items-center gap-2 py-6 rounded-xl text-sm text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
                    style={{ border: '2px dashed rgba(255,255,255,0.1)' }}>
                    {uploadingSheetPhoto
                      ? <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      : <Upload className="w-6 h-6" />}
                    <span className="text-xs">{uploadingSheetPhoto ? 'Envoi...' : 'Ajouter des photos / vidéos'}</span>
                  </button>
                  {editSheet.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {editSheet.mediaUrls.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                          {url.endsWith('.mp4')
                            ? <video src={url} className="w-full h-full object-cover" muted />
                            : <img src={url} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <button onClick={() => removeSheetPhoto(url)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.9)' }}>
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Consignes ── */}
              {sheetTab === 'consignes' && (
                <>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Instructions générales</p>
                  <p className="text-white/30 text-xs mb-3">Visible sur la fiche, en accordéon. Tu peux utiliser des sauts de ligne.</p>
                  <textarea
                    value={sheetDraft.instructions}
                    onChange={e => setSheetDraft(p => ({ ...p, instructions: e.target.value }))}
                    placeholder="Ex: Faire attention à la porte d'entrée qui ferme mal. Les produits ménagers sont sous l'évier..."
                    rows={10}
                    className={`${inputCls} resize-none leading-relaxed`}
                    style={inputBg}
                  />
                </>
              )}

              {/* ── Sections personnalisées ── */}
              {sheetTab === 'sections' && (
                <>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Sections personnalisées</p>
                  <p className="text-white/30 text-xs mb-4">Ajoute autant de blocs que tu veux : pièce par pièce, produits à utiliser, etc.</p>
                  <div className="space-y-4">
                    {sheetDraft.customSections.map((sec, i) => (
                      <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex gap-2">
                          <input type="text" value={sec.title} onChange={e => updateSheetSection(i, 'title', e.target.value)}
                            placeholder="Ex: Cuisine, Chambre 1, Produits..." className={`${inputCls} flex-1`} style={inputBg} />
                          <button onClick={() => removeSheetSection(i)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea value={sec.content} onChange={e => updateSheetSection(i, 'content', e.target.value)}
                          placeholder="Instructions spécifiques..." rows={4} className={`${inputCls} resize-none`} style={inputBg} />
                      </div>
                    ))}
                    <button onClick={addSheetSection}
                      className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                      <Plus className="w-4 h-4" /> Ajouter une section
                    </button>
                  </div>
                </>
              )}

              {/* ── Checklist ── */}
              {sheetTab === 'checklist' && (
                <>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Checklist interactive</p>
                  <p className="text-white/30 text-xs mb-4">La femme de ménage peut cocher chaque tâche au fur et à mesure.</p>
                  <div className="space-y-2">
                    {sheetDraft.checklist.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded"
                          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <span className="text-amber-400 text-xs font-bold">{idx + 1}</span>
                        </div>
                        <input type="text" value={item.label} onChange={e => updateChecklistItem(idx, e.target.value)}
                          placeholder={`Tâche ${idx + 1}`} className={`${inputCls} flex-1`} style={inputBg} />
                        <button onClick={() => removeChecklistItem(idx)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addChecklistItem}
                      className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors mt-1">
                      <Plus className="w-4 h-4" /> Ajouter une tâche
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Save */}
            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={saveSheet} disabled={savingSheet}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: '#f59e0b' }}>
                {savingSheet ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Livret voyageur — panneau d'édition ────────────────────────────── */}
      {editGuide && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditGuide(null)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: '480px', maxWidth: '100vw', background: '#131313', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>

            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-400" /> Livret voyageur
                </p>
                <p className="text-white/40 text-xs mt-0.5">{properties.find(p => p.id === editGuide.propertyId)?.name}</p>
              </div>
              <button onClick={() => setEditGuide(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {(['general', 'acces', 'lieux', 'photos'] as const).map(tab => (
                <button key={tab} onClick={() => setGuideTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: guideTab === tab ? 'rgba(212,175,55,0.12)' : 'transparent',
                    border: guideTab === tab ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                    color: guideTab === tab ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                  }}>
                  {tab === 'general' ? 'Général' : tab === 'acces' ? 'Accès' : tab === 'lieux' ? 'Lieux' : 'Photos'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* ── Général ── */}
              {guideTab === 'general' && (
                <>
                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">Message de bienvenue</p>
                  <textarea
                    value={guideDraft.welcomeMessage ?? ''}
                    onChange={e => setGuideDraft(p => ({ ...p, welcomeMessage: e.target.value }))}
                    placeholder="Bonjour et bienvenue dans notre logement..."
                    rows={4}
                    className={`${inputCls} resize-none leading-relaxed`}
                    style={inputBg}
                  />

                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3 mt-2">Wifi</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Nom du réseau</label>
                      <div className="relative">
                        <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input type="text" value={guideDraft.wifiName ?? ''} onChange={e => setGuideDraft(p => ({ ...p, wifiName: e.target.value }))}
                          placeholder="MonWifi_5G" className={`${inputCls} pl-9`} style={inputBg} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Mot de passe</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={guideDraft.wifiPassword ?? ''}
                          onChange={e => setGuideDraft(p => ({ ...p, wifiPassword: e.target.value }))}
                          placeholder="••••••••" className={`${inputCls} pr-10`} style={inputBg} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3 mt-2">Règles de la maison</p>
                  <div className="space-y-2">
                    {(guideDraft.houseRules ?? []).map((rule, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={rule} onChange={e => updateRule(i, e.target.value)}
                          placeholder={`Règle ${i + 1}`} className={`${inputCls} flex-1`} style={inputBg} />
                        <button onClick={() => removeRule(i)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addRule} className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors mt-1">
                      <Plus className="w-4 h-4" /> Ajouter une règle
                    </button>
                  </div>
                </>
              )}

              {/* ── Accès ── */}
              {guideTab === 'acces' && (
                <>
                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">Horaires</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Check-in</label>
                      <input type="text" value={guideDraft.checkIn ?? ''} onChange={e => setGuideDraft(p => ({ ...p, checkIn: e.target.value }))}
                        placeholder="15h00" className={inputCls} style={inputBg} />
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1.5">Check-out</label>
                      <input type="text" value={guideDraft.checkOut ?? ''} onChange={e => setGuideDraft(p => ({ ...p, checkOut: e.target.value }))}
                        placeholder="11h00" className={inputCls} style={inputBg} />
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3 mt-2">Accès / Boîte à clés</p>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input type="text" value={guideDraft.keyCode ?? ''} onChange={e => setGuideDraft(p => ({ ...p, keyCode: e.target.value }))}
                      placeholder="Code: 1234" className={`${inputCls} pl-9`} style={inputBg} />
                  </div>

                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3 mt-2">Sections personnalisées</p>
                  <div className="space-y-4">
                    {(guideDraft.customSections ?? []).map((sec, i) => (
                      <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex gap-2">
                          <input type="text" value={sec.title} onChange={e => updateSection(i, 'title', e.target.value)}
                            placeholder="Titre de la section" className={`${inputCls} flex-1`} style={inputBg} />
                          <button onClick={() => removeSection(i)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea value={sec.content} onChange={e => updateSection(i, 'content', e.target.value)}
                          placeholder="Contenu..." rows={3} className={`${inputCls} resize-none`} style={inputBg} />
                      </div>
                    ))}
                    <button onClick={addSection} className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors">
                      <Plus className="w-4 h-4" /> Ajouter une section
                    </button>
                  </div>
                </>
              )}

              {/* ── Lieux ── */}
              {guideTab === 'lieux' && (
                <>
                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">Restaurants & Bars</p>
                  <div className="space-y-4">
                    {(guideDraft.restaurants ?? []).map((r, i) => (
                      <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex gap-2">
                          <input type="text" value={r.name} onChange={e => updateRestaurant(i, 'name', e.target.value)}
                            placeholder="Nom du restaurant" className={`${inputCls} flex-1`} style={inputBg} />
                          <button onClick={() => removeRestaurant(i)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <select value={r.category} onChange={e => updateRestaurant(i, 'category', e.target.value)}
                          className={`${inputCls} appearance-none`} style={inputBg}>
                          {RESTAURANT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea value={r.description} onChange={e => updateRestaurant(i, 'description', e.target.value)}
                          placeholder="Description..." rows={2} className={`${inputCls} resize-none`} style={inputBg} />
                        <input type="text" value={r.address ?? ''} onChange={e => updateRestaurant(i, 'address', e.target.value)}
                          placeholder="Adresse (optionnel)" className={inputCls} style={inputBg} />
                      </div>
                    ))}
                    <button onClick={addRestaurant} className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors">
                      <Plus className="w-4 h-4" /> Ajouter un restaurant
                    </button>
                  </div>

                  <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">À faire autour</p>
                  <div className="space-y-4">
                    {(guideDraft.activities ?? []).map((a, i) => (
                      <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex gap-2">
                          <input type="text" value={a.name} onChange={e => updateActivity(i, 'name', e.target.value)}
                            placeholder="Nom de l'activité" className={`${inputCls} flex-1`} style={inputBg} />
                          <button onClick={() => removeActivity(i)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <select value={a.category} onChange={e => updateActivity(i, 'category', e.target.value)}
                          className={`${inputCls} appearance-none`} style={inputBg}>
                          {ACTIVITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea value={a.description} onChange={e => updateActivity(i, 'description', e.target.value)}
                          placeholder="Description..." rows={2} className={`${inputCls} resize-none`} style={inputBg} />
                      </div>
                    ))}
                    <button onClick={addActivity} className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors">
                      <Plus className="w-4 h-4" /> Ajouter une activité
                    </button>
                  </div>
                </>
              )}

              {/* ── Photos ── */}
              {guideTab === 'photos' && (
                <>
                  <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">Galerie du logement</p>
                  <input ref={fileInputRef} type="file" accept="image/*,video/mp4" className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) uploadGuidePhoto(file); e.target.value = '' }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                    className="w-full flex flex-col items-center gap-2 py-8 rounded-xl text-sm text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
                    style={{ border: '2px dashed rgba(255,255,255,0.1)' }}>
                    {uploadingPhoto
                      ? <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                      : <Upload className="w-8 h-8" />}
                    <span>{uploadingPhoto ? 'Envoi en cours...' : 'Cliquer pour ajouter des photos / vidéos'}</span>
                    <span className="text-xs text-white/25">JPG, PNG, GIF, WebP, MP4 — max 50MB</span>
                  </button>
                  {uploadError && <p className="text-red-400 text-xs mt-2 text-center">{uploadError}</p>}
                  {(guideDraft.mediaUrls ?? []).length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {(guideDraft.mediaUrls ?? []).map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                          {url.endsWith('.mp4')
                            ? <video src={url} className="w-full h-full object-cover" muted />
                            : <img src={url} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <button onClick={() => removeGuidePhoto(url)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.9)' }}>
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={saveGuide} disabled={savingGuide}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: '#D4AF37' }}>
                {savingGuide ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

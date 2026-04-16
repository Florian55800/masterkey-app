'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Building2, Star,
  FileText, Upload, Trash2, Download, Eye, Plus, Save, Check,
  Wifi, Key, Shield, Euro, Home, ClipboardList, FolderOpen,
  RefreshCw, ExternalLink, AlertCircle, Edit2, X,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: number; name: string; city: string; type: string
  status: string; typeGestion: string; commissionRate: number
}

interface Owner {
  id: number; name: string; phone: string | null; email: string | null
  notes: string | null; photo: string | null; source: string | null
  lastContact: string | null; relanceDate: string | null
  properties: Property[]
}

interface Onboarding {
  nomPrenom: string | null; adresseDomicile: string | null; telephone: string | null
  villeLogement: string | null; adresseLogement: string | null; typeBien: string | null
  arriveeAutonome: string | null; codeBoiteACles: string | null; surface: string | null
  nbChambres: string | null; nbSallesBain: string | null; etage: string | null
  accessible: string | null; equipements: string | null; wifiNom: string | null
  wifiMdp: string | null; consignesPoubelles: string | null; reglementInterieur: string | null
  instructionsAppareils: string | null; styleDecoration: string | null; themeParticularite: string | null
  dejaEnLocation: string | null; lienAnnonce: string | null; disponibiliteMois: string | null
  occupe: string | null; detecteurFumee: string | null; emplacementElectrique: string | null
  extincteur: string | null; piscine: string | null; prixMoyenNuit: string | null
  tauxOccupation: string | null; revenusMenuels: string | null; fraisMensuels: string | null
  maximiserRevenus: string | null
}

interface OwnerDoc {
  id: number; name: string; url: string; mimeType: string | null
  size: number | null; category: string; createdAt: string
}

const EMPTY_ONBOARDING: Onboarding = {
  nomPrenom: '', adresseDomicile: '', telephone: '', villeLogement: '', adresseLogement: '',
  typeBien: '', arriveeAutonome: '', codeBoiteACles: '', surface: '', nbChambres: '',
  nbSallesBain: '', etage: '', accessible: '', equipements: '', wifiNom: '', wifiMdp: '',
  consignesPoubelles: '', reglementInterieur: '', instructionsAppareils: '', styleDecoration: '',
  themeParticularite: '', dejaEnLocation: '', lienAnnonce: '', disponibiliteMois: '', occupe: '',
  detecteurFumee: '', emplacementElectrique: '', extincteur: '', piscine: '', prixMoyenNuit: '',
  tauxOccupation: '', revenusMenuels: '', fraisMensuels: '', maximiserRevenus: '',
}

const DOC_CATEGORIES = [
  { value: 'identite', label: 'Pièce d\'identité', color: 'text-blue-400' },
  { value: 'rib', label: 'RIB', color: 'text-green-400' },
  { value: 'contrat', label: 'Contrat', color: 'text-[#D4AF37]' },
  { value: 'assurance', label: 'Assurance', color: 'text-purple-400' },
  { value: 'autre', label: 'Autre', color: 'text-white/40' },
]

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { cell += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(cell.trim()); cell = '' }
      else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
      else if (ch === '\r') { /* skip */ }
      else { cell += ch }
    }
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows
}

function mapCSVRowToOnboarding(row: string[]): Partial<Onboarding> {
  const g = (i: number) => row[i]?.trim() || null
  // WiFi field (col 16) might be "Nom - MDP" or "Nom / MDP : password"
  const wifiRaw = g(16) ?? ''
  let wifiNom: string | null = wifiRaw || null
  let wifiMdp: string | null = null
  const wifiSep = wifiRaw.match(/^(.+?)\s*[\/\-]\s*(?:MDP\s*:\s*)?(.+)$/i)
  if (wifiSep) { wifiNom = wifiSep[1].trim() || null; wifiMdp = wifiSep[2].trim() || null }

  return {
    nomPrenom:             g(1),
    adresseDomicile:       g(3),
    telephone:             g(4),
    villeLogement:         g(5),
    adresseLogement:       g(6),
    typeBien:              g(7),
    arriveeAutonome:       g(8),
    codeBoiteACles:        g(9),
    surface:               g(10),
    nbChambres:            g(11),
    nbSallesBain:          g(12),
    etage:                 g(13),
    accessible:            g(14),
    equipements:           g(15),
    wifiNom,
    wifiMdp,
    consignesPoubelles:    g(17),
    reglementInterieur:    g(18),
    instructionsAppareils: g(19),
    styleDecoration:       g(20),
    themeParticularite:    g(21),
    dejaEnLocation:        g(22),
    lienAnnonce:           g(23),
    disponibiliteMois:     g(24),
    occupe:                g(25),
    detecteurFumee:        g(26),
    emplacementElectrique: g(27),
    extincteur:            g(28),
    piscine:               g(29),
    prixMoyenNuit:         g(30),
    tauxOccupation:        g(31),
    revenusMenuels:        g(32),
    fraisMensuels:         g(33),
    maximiserRevenus:      g(34),
  }
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportPDF(owner: Owner, ob: Onboarding) {
  const lines: string[] = []
  const add = (label: string, val: string | null | undefined) => {
    if (val) lines.push(`${label} : ${val}`)
  }
  lines.push('═══════════════════════════════════════')
  lines.push(`FICHE PROPRIÉTAIRE — ${owner.name.toUpperCase()}`)
  lines.push('MasterKey Conciergerie')
  lines.push(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('═══════════════════════════════════════')
  lines.push('')
  lines.push('▌ CONTACT')
  add('Nom', owner.name); add('Email', owner.email); add('Téléphone', owner.phone)
  add('Adresse domicile', ob.adresseDomicile || owner.notes)
  lines.push('')
  lines.push('▌ LOGEMENT')
  add('Ville', ob.villeLogement); add('Adresse', ob.adresseLogement)
  add('Type', ob.typeBien); add('Surface', ob.surface ? ob.surface + ' m²' : null)
  add('Chambres', ob.nbChambres); add('Salles de bain', ob.nbSallesBain)
  add('Étage', ob.etage); add('Accessible PMR', ob.accessible)
  add('Arrivée autonome', ob.arriveeAutonome); add('Code boîte à clés', ob.codeBoiteACles)
  lines.push('')
  lines.push('▌ ÉQUIPEMENTS')
  add('Équipements', ob.equipements)
  add('WiFi (nom)', ob.wifiNom); add('WiFi (MDP)', ob.wifiMdp)
  add('Style décoration', ob.styleDecoration); add('Thème / particularité', ob.themeParticularite)
  lines.push('')
  lines.push('▌ RÈGLES & PRATIQUE')
  add('Règlement intérieur', ob.reglementInterieur)
  add('Consignes poubelles', ob.consignesPoubelles)
  add('Instructions appareils', ob.instructionsAppareils)
  lines.push('')
  lines.push('▌ SÉCURITÉ')
  add('Détecteur fumée', ob.detecteurFumee); add('Extincteur', ob.extincteur)
  add('Emplacement disjoncteur/compteur', ob.emplacementElectrique)
  add('Piscine', ob.piscine)
  lines.push('')
  lines.push('▌ PLATEFORME')
  add('Déjà en location', ob.dejaEnLocation); add('Lien annonce', ob.lienAnnonce)
  add('Disponibilité/mois', ob.disponibiliteMois); add('Occupé certaines périodes', ob.occupe)
  lines.push('')
  lines.push('▌ FINANCIER')
  add('Prix moyen/nuit', ob.prixMoyenNuit ? ob.prixMoyenNuit + ' €' : null)
  add('Taux d\'occupation', ob.tauxOccupation)
  add('Revenus mensuels', ob.revenusMenuels ? ob.revenusMenuels + ' €' : null)
  add('Frais mensuels', ob.fraisMensuels ? ob.fraisMensuels + ' €' : null)
  add('Maximiser revenus', ob.maximiserRevenus)
  lines.push('')
  if (owner.properties.length > 0) {
    lines.push('▌ LOGEMENTS GÉRÉS')
    owner.properties.forEach(p => {
      lines.push(`  • ${p.name} (${p.city}) — ${p.typeGestion === 'conciergerie' ? `Commission ${p.commissionRate}%` : 'Sous-location'} — ${p.status === 'active' ? 'Actif' : 'Inactif'}`)
    })
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fiche-${owner.name.toLowerCase().replace(/\s+/g, '-')}.txt`
  a.click()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(mimeType: string | null) {
  if (!mimeType) return '📄'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📄'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function getCategoryColor(cat: string) {
  return DOC_CATEGORIES.find(c => c.value === cat)?.color ?? 'text-white/40'
}

function getCategoryLabel(cat: string) {
  return DOC_CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, multiline = false, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; placeholder?: string
}) {
  const cls = `w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#D4AF37]/50 transition-colors`
  return (
    <div>
      <label className="block text-xs text-white/40 font-medium mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pt-2">
      <Icon className="w-4 h-4 text-[#D4AF37]" />
      <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">{title}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'fiche' | 'onboarding' | 'documents'>('fiche')

  // Onboarding state
  const [ob, setOb] = useState<Onboarding>(EMPTY_ONBOARDING)
  const [obLoading, setObLoading] = useState(false)
  const [obSaving, setObSaving] = useState(false)
  const [obSaved, setObSaved] = useState(false)
  const [csvRows, setCsvRows] = useState<{ row: string[]; name: string }[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  // Documents state
  const [docs, setDocs] = useState<OwnerDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('autre')
  const [uploadName, setUploadName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Load owner ─────────────────────────────────────────────────────────────
  const loadOwner = useCallback(async () => {
    try {
      const res = await fetch(`/api/owners/${id}`)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setOwner(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadOwner() }, [loadOwner])

  // ── Load onboarding when tab active ───────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'onboarding') return
    setObLoading(true)
    fetch(`/api/owners/${id}/onboarding`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          const filled: Onboarding = { ...EMPTY_ONBOARDING }
          Object.keys(EMPTY_ONBOARDING).forEach(k => {
            (filled as any)[k] = data[k] ?? ''
          })
          setOb(filled)
        }
      })
      .catch(() => {})
      .finally(() => setObLoading(false))
  }, [activeTab, id])

  // ── Load docs when tab active ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'documents') return
    setDocsLoading(true)
    fetch(`/api/owners/${id}/documents`)
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setDocsLoading(false))
  }, [activeTab, id])

  // ── Onboarding save ────────────────────────────────────────────────────────
  const saveOnboarding = async () => {
    setObSaving(true)
    try {
      await fetch(`/api/owners/${id}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ob),
      })
      setObSaved(true)
      setTimeout(() => setObSaved(false), 2500)
    } finally {
      setObSaving(false)
    }
  }

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      // Skip header row (row 0), collect data rows
      const dataRows = rows.slice(1).filter(r => r.length > 5 && r[1])
      setCsvRows(dataRows.map(r => ({ row: r, name: r[1]?.trim() ?? '' })))
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const importCSVRow = async (row: string[]) => {
    setCsvImporting(true)
    try {
      const mapped = mapCSVRowToOnboarding(row)
      const merged: Onboarding = { ...EMPTY_ONBOARDING }
      Object.keys(EMPTY_ONBOARDING).forEach(k => {
        (merged as any)[k] = (mapped as any)[k] ?? (ob as any)[k] ?? ''
      })
      setOb(merged)
      await fetch(`/api/owners/${id}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      })
      setCsvRows([])
      setObSaved(true)
      setTimeout(() => setObSaved(false), 2500)
    } finally {
      setCsvImporting(false)
    }
  }

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', uploadCategory)
      fd.append('name', uploadName || file.name)
      const res = await fetch(`/api/owners/${id}/documents`, { method: 'POST', body: fd })
      if (res.ok) {
        const doc = await res.json()
        setDocs(prev => [doc, ...prev])
        setUploadName('')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deleteDoc = async (docId: number) => {
    setDeletingDocId(docId)
    try {
      await fetch(`/api/owners/${id}/documents/${docId}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } finally {
      setDeletingDocId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingPage />
  if (!owner) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <AlertCircle className="w-12 h-12 text-white/20" />
      <p className="text-white/40">Propriétaire introuvable</p>
      <Button variant="ghost" onClick={() => router.back()}>Retour</Button>
    </div>
  )

  const activeProps = owner.properties.filter(p => p.status === 'active')
  const f = (k: keyof Onboarding) => (ob[k] as string) ?? ''
  const set = (k: keyof Onboarding) => (v: string) => setOb(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Clients</span>
        </button>
        <div className="flex items-center gap-2">
          {activeTab === 'onboarding' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportPDF(owner, ob)}
            >
              <Download className="w-3.5 h-3.5" />
              Exporter PDF
            </Button>
          )}
        </div>
      </div>

      {/* ── Owner card ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-4 p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold text-[#D4AF37]"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          {owner.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{owner.name}</h1>
          {owner.source && <p className="text-white/30 text-sm mt-0.5">{owner.source}</p>}
          <div className="flex flex-wrap gap-3 mt-2">
            {owner.phone && (
              <a href={`tel:${owner.phone}`} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" /> {owner.phone}
              </a>
            )}
            {owner.email && (
              <a href={`mailto:${owner.email}`} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors truncate">
                <Mail className="w-3.5 h-3.5" /> {owner.email}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-center px-3 py-2 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
            <p className="text-[#D4AF37] font-bold text-lg">{activeProps.length}</p>
            <p className="text-white/30 text-xs">logement{activeProps.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {([
          { key: 'fiche' as const, label: 'Fiche', icon: User },
          { key: 'onboarding' as const, label: 'Onboarding', icon: ClipboardList },
          { key: 'documents' as const, label: 'Documents', icon: FolderOpen },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === key
                ? 'text-[#D4AF37] border-[#D4AF37]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: FICHE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fiche' && (
        <div className="space-y-4">
          {/* Properties */}
          {owner.properties.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-white font-semibold text-sm">Logements gérés</h2>
              {owner.properties.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Building2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-white/30 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={p.status === 'active' ? 'success' : 'danger'}>
                      {p.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                    {p.typeGestion === 'conciergerie' ? (
                      <span className="text-xs text-white/30">{p.commissionRate}%</span>
                    ) : (
                      <span className="text-xs text-blue-400">Sous-loc.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/25">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun logement associé</p>
            </div>
          )}

          {/* Notes */}
          {owner.notes && (
            <Card>
              <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Notes</h2>
              <p className="text-white/70 text-sm whitespace-pre-line">{owner.notes}</p>
            </Card>
          )}

          {/* Last contact */}
          {owner.lastContact && (
            <div className="text-center text-white/25 text-xs">
              Dernier contact : {format(new Date(owner.lastContact), 'd MMMM yyyy', { locale: fr })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ONBOARDING
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {/* Actions bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => csvRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Upload className="w-4 h-4" />
              Importer CSV formulaire
            </button>
            <input ref={csvRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSVFile} />

            <button
              onClick={saveOnboarding}
              disabled={obSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ml-auto"
              style={obSaved
                ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                : { background: '#D4AF37', color: '#000' }
              }
            >
              {obSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {obSaving ? 'Enregistrement...' : obSaved ? 'Enregistré !' : 'Enregistrer'}
            </button>
          </div>

          {/* CSV rows preview */}
          {csvRows.length > 0 && (
            <div
              className="p-4 rounded-2xl space-y-2"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#D4AF37] text-sm font-semibold">
                  {csvRows.length} réponse(s) trouvée(s) — sélectionner la ligne à importer
                </p>
                <button onClick={() => setCsvRows([])} className="text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {csvRows.map(({ row, name }, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{name || '(sans nom)'}</p>
                    <p className="text-white/30 text-xs">{row[6] || row[5] || ''} · {row[7] || ''}</p>
                  </div>
                  <button
                    onClick={() => importCSVRow(row)}
                    disabled={csvImporting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-40"
                    style={{ background: '#D4AF37' }}
                  >
                    {csvImporting ? '...' : 'Importer'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {obLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">

              {/* Identité propriétaire */}
              <div>
                <SectionHeader icon={User} title="Identité propriétaire" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom et prénom" value={f('nomPrenom')} onChange={set('nomPrenom')} placeholder={owner.name} />
                  <Field label="Téléphone" value={f('telephone')} onChange={set('telephone')} placeholder={owner.phone ?? ''} />
                  <Field label="Adresse domicile" value={f('adresseDomicile')} onChange={set('adresseDomicile')} />
                </div>
              </div>

              {/* Logement */}
              <div>
                <SectionHeader icon={Home} title="Logement" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Ville / région" value={f('villeLogement')} onChange={set('villeLogement')} />
                  <Field label="Adresse complète" value={f('adresseLogement')} onChange={set('adresseLogement')} />
                  <Field label="Type de bien" value={f('typeBien')} onChange={set('typeBien')} placeholder="Studio, T2, T3…" />
                  <Field label="Surface (m²)" value={f('surface')} onChange={set('surface')} placeholder="45" />
                  <Field label="Nombre de chambres" value={f('nbChambres')} onChange={set('nbChambres')} />
                  <Field label="Salles de bain / WC" value={f('nbSallesBain')} onChange={set('nbSallesBain')} />
                  <Field label="Étage" value={f('etage')} onChange={set('etage')} />
                  <Field label="Accessible PMR" value={f('accessible')} onChange={set('accessible')} placeholder="Oui / Non" />
                  <Field label="Arrivée autonome" value={f('arriveeAutonome')} onChange={set('arriveeAutonome')} placeholder="Oui / Non" />
                  <Field label="Code boîte à clés" value={f('codeBoiteACles')} onChange={set('codeBoiteACles')} />
                </div>
                <div className="mt-4">
                  <Field label="Équipements" value={f('equipements')} onChange={set('equipements')} multiline placeholder="Wifi, cuisine équipée, lave-linge…" />
                </div>
              </div>

              {/* Accès & pratique */}
              <div>
                <SectionHeader icon={Wifi} title="Accès & pratique" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom du WiFi" value={f('wifiNom')} onChange={set('wifiNom')} />
                  <Field label="Mot de passe WiFi" value={f('wifiMdp')} onChange={set('wifiMdp')} />
                  <Field label="Style de décoration" value={f('styleDecoration')} onChange={set('styleDecoration')} placeholder="Moderne, cosy, scandinave…" />
                  <Field label="Thème / particularité" value={f('themeParticularite')} onChange={set('themeParticularite')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-4">
                  <Field label="Règlement intérieur" value={f('reglementInterieur')} onChange={set('reglementInterieur')} multiline placeholder="Animaux, tabac, bruit, fêtes…" />
                  <Field label="Consignes poubelles" value={f('consignesPoubelles')} onChange={set('consignesPoubelles')} multiline />
                  <Field label="Instructions appareils" value={f('instructionsAppareils')} onChange={set('instructionsAppareils')} multiline />
                </div>
              </div>

              {/* Sécurité */}
              <div>
                <SectionHeader icon={Shield} title="Sécurité" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Détecteur de fumée" value={f('detecteurFumee')} onChange={set('detecteurFumee')} placeholder="Oui / Non" />
                  <Field label="Extincteur / trousse secours" value={f('extincteur')} onChange={set('extincteur')} placeholder="Oui / Non" />
                  <Field label="Piscine" value={f('piscine')} onChange={set('piscine')} placeholder="Oui / Non" />
                  <Field label="Emplacement disjoncteur / compteur / chauffe-eau" value={f('emplacementElectrique')} onChange={set('emplacementElectrique')} />
                </div>
              </div>

              {/* Plateformes */}
              <div>
                <SectionHeader icon={ExternalLink} title="Plateformes" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Déjà en location sur plateforme" value={f('dejaEnLocation')} onChange={set('dejaEnLocation')} placeholder="Airbnb, Booking…" />
                  <Field label="Lien de l'annonce" value={f('lienAnnonce')} onChange={set('lienAnnonce')} />
                  <Field label="Disponibilité (jours/mois)" value={f('disponibiliteMois')} onChange={set('disponibiliteMois')} placeholder="31, tous les jours…" />
                  <Field label="Périodes d'occupation personnelle" value={f('occupe')} onChange={set('occupe')} />
                </div>
              </div>

              {/* Financier */}
              <div>
                <SectionHeader icon={Euro} title="Financier" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Prix moyen par nuit (€)" value={f('prixMoyenNuit')} onChange={set('prixMoyenNuit')} placeholder="60" />
                  <Field label="Taux d'occupation moyen" value={f('tauxOccupation')} onChange={set('tauxOccupation')} placeholder="75%" />
                  <Field label="Revenus mensuels (€)" value={f('revenusMenuels')} onChange={set('revenusMenuels')} />
                  <Field label="Frais mensuels fixes (€)" value={f('fraisMensuels')} onChange={set('fraisMensuels')} placeholder="Loyer, charges, assurance…" />
                </div>
                <div className="mt-4">
                  <Field label="Souhaite maximiser les revenus ?" value={f('maximiserRevenus')} onChange={set('maximiserRevenus')} placeholder="Oui / Non / À voir" />
                </div>
              </div>

              {/* Sticky save button at bottom */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={saveOnboarding}
                  disabled={obSaving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={obSaved
                    ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                    : { background: '#D4AF37', color: '#000' }
                  }
                >
                  {obSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {obSaving ? 'Enregistrement...' : obSaved ? 'Enregistré !' : 'Enregistrer'}
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DOCUMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'documents' && (
        <div className="space-y-5">
          {/* Upload zone */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-white font-semibold text-sm">Ajouter un document</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Catégorie</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#D4AF37]/50 appearance-none"
                >
                  {DOC_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Nom (optionnel)</label>
                <input
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="RIB M. Dupont..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-50"
                  style={{ background: '#D4AF37' }}
                >
                  {uploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Envoi...' : 'Choisir un fichier'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <p className="text-white/20 text-xs">PDF, images (PNG, JPG), Word, Excel — max 20 Mo</p>
          </div>

          {/* Documents list */}
          {docsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/25">
              <FolderOpen className="w-12 h-12 opacity-30" />
              <p className="text-sm">Aucun document · Importez le RIB, la carte d&apos;identité, le contrat…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {DOC_CATEGORIES.map(cat => {
                const catDocs = docs.filter(d => d.category === cat.value)
                if (catDocs.length === 0) return null
                return (
                  <div key={cat.value}>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-2 mt-4 ${cat.color}`}>{cat.label}</p>
                    {catDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1 group transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <span className="text-xl flex-shrink-0">{fileIcon(doc.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-white/25 text-xs">
                            {formatSize(doc.size)}
                            {doc.size ? ' · ' : ''}
                            {format(new Date(doc.createdAt), 'd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                            title="Ouvrir"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={doc.url}
                            download={doc.name}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                            title="Télécharger"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => deleteDoc(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 transition-colors disabled:opacity-30"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

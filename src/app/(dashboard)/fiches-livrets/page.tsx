'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ClipboardList, ExternalLink, Plus, RefreshCw, Copy, Check } from 'lucide-react'

interface Property {
  id: number
  name: string
  city: string
  status: string
  photo: string | null
}

interface Sheet {
  propertyId: number
  shareToken: string
}

interface Guide {
  propertyId: number
  shareToken: string
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

export default function FichesLivretsPage() {
  const [properties, setProperties]   = useState<Property[]>([])
  const [sheets, setSheets]           = useState<Sheet[]>([])
  const [guides, setGuides]           = useState<Guide[]>([])
  const [loading, setLoading]         = useState(true)
  const [creating, setCreating]       = useState<string | null>(null) // 'fiche-{id}' | 'livret-{id}'
  const [filter, setFilter]           = useState<'all' | 'active'>('active')

  async function load() {
    const [pRes, sRes, gRes] = await Promise.all([
      fetch('/api/properties'),
      fetch('/api/cleaning-sheets'),
      fetch('/api/welcome-guides'),
    ])
    const [props, sh, gu] = await Promise.all([pRes.json(), sRes.json(), gRes.json()])
    setProperties(Array.isArray(props) ? props : [])
    setSheets(Array.isArray(sh) ? sh : [])
    setGuides(Array.isArray(gu) ? gu : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createSheet(propertyId: number) {
    setCreating(`fiche-${propertyId}`)
    await fetch('/api/cleaning-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    })
    await load()
    setCreating(null)
  }

  async function createGuide(propertyId: number) {
    setCreating(`livret-${propertyId}`)
    await fetch('/api/welcome-guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    })
    await load()
    setCreating(null)
  }

  const sheetMap  = new Map(sheets.map(s => [s.propertyId, s.shareToken]))
  const guideMap  = new Map(guides.map(g => [g.propertyId, g.shareToken]))
  const displayed = properties.filter(p => filter === 'all' || p.status === 'active')
  const baseUrl   = typeof window !== 'undefined' ? window.location.origin : ''

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
          <span className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" /> Fiche ménage
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Livret voyageur
          </span>
        </div>

        {/* Grille logements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map(prop => {
            const sheetToken = sheetMap.get(prop.id)
            const guideToken = guideMap.get(prop.id)
            const sheetUrl   = sheetToken ? `${baseUrl}/fiche/${sheetToken}` : null
            const guideUrl   = guideToken ? `${baseUrl}/bienvenue/${guideToken}` : null
            const isActive   = prop.status === 'active'

            return (
              <div key={prop.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Top — nom logement */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {prop.photo ? (
                    <img src={prop.photo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>
                      🏠
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{prop.name}</p>
                    <p className="text-white/40 text-xs">{prop.city}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={isActive
                      ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                      : { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
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
                    {sheetUrl
                      ? <p className="text-white/25 text-xs truncate">/fiche/{sheetToken?.slice(0, 12)}…</p>
                      : <p className="text-white/25 text-xs">Non créée</p>}
                  </div>
                  {sheetUrl ? (
                    <div className="flex items-center gap-1.5">
                      <CopyButton url={sheetUrl} />
                      <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', textDecoration: 'none' }}>
                        Ouvrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={() => createSheet(prop.id)}
                      disabled={creating === `fiche-${prop.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {creating === `fiche-${prop.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Plus className="w-3 h-3" />}
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
                    {guideUrl
                      ? <p className="text-white/25 text-xs truncate">/bienvenue/{guideToken?.slice(0, 12)}…</p>
                      : <p className="text-white/25 text-xs">Non créé</p>}
                  </div>
                  {guideUrl ? (
                    <div className="flex items-center gap-1.5">
                      <CopyButton url={guideUrl} />
                      <a href={guideUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', textDecoration: 'none' }}>
                        Ouvrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={() => createGuide(prop.id)}
                      disabled={creating === `livret-${prop.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {creating === `livret-${prop.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Plus className="w-3 h-3" />}
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
    </div>
  )
}

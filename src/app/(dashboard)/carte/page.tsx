'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Ruler, BarChart2, Navigation, RefreshCw, ExternalLink } from 'lucide-react'

interface Property {
  id: number
  name: string
  address: string
  city: string
  status: string
  commissionRate: number
  latitude: number | null
  longitude: number | null
  owner?: { name: string }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function gmapsUrl(props: Property[]): string {
  const pts = props.filter(p => p.latitude && p.longitude)
  if (pts.length < 2) return ''
  const origin = encodeURIComponent(`${pts[0].address}, ${pts[0].city}`)
  const dest   = encodeURIComponent(`${pts[pts.length - 1].address}, ${pts[pts.length - 1].city}`)
  const wps    = pts.slice(1, -1).map(p => encodeURIComponent(`${p.address}, ${p.city}`)).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${wps ? `&waypoints=${wps}` : ''}&travelmode=driving`
}

export default function CartePage() {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef  = useRef<Map<number, any>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef        = useRef<any>(null)

  const [properties, setProperties]       = useState<Property[]>([])
  const [loading, setLoading]             = useState(true)
  const [geocoding, setGeocoding]         = useState<number[]>([])
  const [activeTab, setActiveTab]         = useState<'stats' | 'distance' | 'route'>('stats')
  const [distanceMode, setDistanceMode]   = useState(false)
  const [selected, setSelected]           = useState<Property[]>([])
  const distanceModeRef = useRef(false)

  // Garde la ref en sync
  useEffect(() => { distanceModeRef.current = distanceMode }, [distanceMode])

  // ── Initialise Leaflet une seule fois ────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    // CSS Leaflet
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(L => {
      LRef.current = L

      // Fix icônes cassées dans Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapDivRef.current!, { zoomControl: true }).setView([46.5, 2.5], 6)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Charge les propriétés ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then(data => { setProperties(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── Pose les marqueurs quand L + data sont prêts ─────────────────────────
  useEffect(() => {
    if (!LRef.current || !mapRef.current) return
    const L   = LRef.current
    const map = mapRef.current

    // Supprimer anciens marqueurs
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current.clear()

    const withCoords = properties.filter(p => p.latitude && p.longitude)

    withCoords.forEach(prop => {
      const icon = L.divIcon({
        html: `<div style="
          width:26px;height:26px;border-radius:50%;
          background:${prop.status === 'active' ? '#22c55e' : '#6b7280'};
          border:3px solid ${prop.status === 'active' ? '#86efac' : '#9ca3af'};
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
          cursor:pointer;
        "></div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([prop.latitude!, prop.longitude!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:170px;font-family:sans-serif;padding:2px">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px">${prop.name}</p>
            ${prop.owner ? `<p style="font-size:12px;color:#555;margin:0 0 2px">👤 ${prop.owner.name}</p>` : ''}
            <p style="font-size:12px;color:#777;margin:0 0 6px">📍 ${prop.address}, ${prop.city}</p>
            <span style="
              display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;
              background:${prop.status === 'active' ? '#dcfce7' : '#f3f4f6'};
              color:${prop.status === 'active' ? '#16a34a' : '#6b7280'};
            ">${prop.status === 'active' ? 'Actif' : 'Inactif'}</span>
          </div>
        `)

      marker.on('click', () => {
        if (!distanceModeRef.current) return
        setSelected(prev => {
          if (prev.find(p => p.id === prop.id)) return prev
          return prev.length >= 2 ? [prev[1], prop] : [...prev, prop]
        })
      })

      markersRef.current.set(prop.id, marker)
    })

    // Centrage automatique
    if (withCoords.length > 0) {
      const lats = withCoords.map(p => p.latitude!)
      const lons = withCoords.map(p => p.longitude!)
      map.fitBounds([
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ], { padding: [40, 40] })
    }
  }, [properties])

  // ── Trace ligne de distance ──────────────────────────────────────────────
  useEffect(() => {
    if (!LRef.current || !mapRef.current) return
    const L = LRef.current
    const map = mapRef.current

    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null }

    if (selected.length === 2 && selected[0].latitude && selected[1].latitude) {
      polylineRef.current = L.polyline(
        [[selected[0].latitude, selected[0].longitude!], [selected[1].latitude, selected[1].longitude!]],
        { color: '#818cf8', weight: 2, dashArray: '8 6' }
      ).addTo(map)

      // Met en évidence les marqueurs sélectionnés
      selected.forEach(prop => {
        const m = markersRef.current.get(prop.id)
        if (!m) return
        const icon = L.divIcon({
          html: `<div style="
            width:30px;height:30px;border-radius:50%;
            background:#818cf8;border:3px solid #c7d2fe;
            box-shadow:0 0 12px rgba(129,140,248,0.6);cursor:pointer;
          "></div>`,
          className: '', iconSize: [30, 30], iconAnchor: [15, 15],
        })
        m.setIcon(icon)
      })
    }
  }, [selected])

  // ── Géocodage auto ───────────────────────────────────────────────────────
  const geocodeNext = useCallback(async (props: Property[]) => {
    for (const prop of props.filter(p => !p.latitude || !p.longitude)) {
      setGeocoding(g => [...g, prop.id])
      await new Promise(r => setTimeout(r, 1100))
      try {
        const r = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: prop.id, address: prop.address, city: prop.city }),
        })
        if (r.ok) {
          const { latitude, longitude } = await r.json()
          setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, latitude, longitude } : p))
        }
      } catch { /* ignore */ }
      setGeocoding(g => g.filter(id => id !== prop.id))
    }
  }, [])

  useEffect(() => {
    if (!loading && properties.length > 0) geocodeNext(properties)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const withCoords = properties.filter(p => p.latitude && p.longitude)
  const dist = selected.length === 2 && selected[0].latitude && selected[1].latitude
    ? haversineKm(selected[0].latitude!, selected[0].longitude!, selected[1].latitude!, selected[1].longitude!)
    : null

  const byCityMap: Record<string, number> = {}
  properties.forEach(p => { byCityMap[p.city] = (byCityMap[p.city] ?? 0) + 1 })
  const byCity = Object.entries(byCityMap).sort((a, b) => b[1] - a[1])

  const panelStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
  const tabBtn = (tab: typeof activeTab, label: string, Icon: React.ElementType) => (
    <button onClick={() => setActiveTab(tab)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={activeTab === tab
        ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }
        : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}>
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  )

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Carte des logements</h1>
            <p className="text-white/30 text-xs mt-0.5">{withCoords.length}/{properties.length} géocodés{geocoding.length > 0 ? ' · géocodage en cours...' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setDistanceMode(d => !d); setSelected([]) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={distanceMode
            ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Ruler className="w-3.5 h-3.5" />
          {distanceMode ? 'Arrêter mesure' : 'Mesurer distance'}
        </button>
      </div>

      {/* Corps */}
      <div className="flex flex-1 min-h-0">
        {/* Carte */}
        <div className="flex-1 relative">
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

          {distanceMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(99,102,241,0.92)', backdropFilter: 'blur(8px)', color: 'white', whiteSpace: 'nowrap' }}>
              {selected.length === 0 && 'Clique sur un 1er logement'}
              {selected.length === 1 && `"${selected[0].name}" — clique sur un 2ème`}
              {selected.length === 2 && dist !== null && `📏 ${dist.toFixed(2)} km à vol d'oiseau`}
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-[999]"
              style={{ background: 'rgba(10,10,10,0.7)' }}>
              <p className="text-white/50">Chargement...</p>
            </div>
          )}

          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            <span className="flex items-center gap-1.5 text-white/60">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Actif
            </span>
            <span className="flex items-center gap-1.5 text-white/60">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Inactif
            </span>
            {geocoding.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Géocodage
              </span>
            )}
          </div>
        </div>

        {/* Panel */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 space-y-3"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1">
            {tabBtn('stats', 'Stats', BarChart2)}
            {tabBtn('distance', 'Distance', Ruler)}
            {tabBtn('route', 'Itinéraire', Navigation)}
          </div>

          {activeTab === 'stats' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total', value: properties.length, color: '#D4AF37' },
                  { label: 'Actifs', value: properties.filter(p => p.status === 'active').length, color: '#22c55e' },
                  { label: 'Inactifs', value: properties.filter(p => p.status !== 'active').length, color: '#6b7280' },
                  { label: 'Sur la carte', value: withCoords.length, color: '#818cf8' },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-xl text-center" style={panelStyle}>
                    <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-white/40 text-xs">{k.label}</p>
                  </div>
                ))}
              </div>

              <div style={panelStyle} className="p-3">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Par ville</p>
                {byCity.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-2 py-1">
                    <span className="text-white/70 text-sm flex-1 truncate">{city}</span>
                    <div className="w-14 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${(count / properties.length) * 100}%` }} />
                    </div>
                    <span className="text-white/40 text-xs w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>

              {withCoords.length >= 2 && (() => {
                let minD = Infinity, maxD = 0, minA = '', minB = '', maxA = '', maxB = ''
                let total = 0, cnt = 0
                for (let i = 0; i < withCoords.length; i++) {
                  for (let j = i + 1; j < withCoords.length; j++) {
                    const d = haversineKm(withCoords[i].latitude!, withCoords[i].longitude!, withCoords[j].latitude!, withCoords[j].longitude!)
                    total += d; cnt++
                    if (d < minD) { minD = d; minA = withCoords[i].name; minB = withCoords[j].name }
                    if (d > maxD) { maxD = d; maxA = withCoords[i].name; maxB = withCoords[j].name }
                  }
                }
                return (
                  <div style={panelStyle} className="p-3 space-y-2.5">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Distances</p>
                    <div>
                      <p className="text-green-400 text-xs">Plus proches — {minD.toFixed(1)} km</p>
                      <p className="text-white/40 text-xs mt-0.5">{minA} ↔ {minB}</p>
                    </div>
                    <div>
                      <p className="text-amber-400 text-xs">Plus éloignés — {maxD.toFixed(1)} km</p>
                      <p className="text-white/40 text-xs mt-0.5">{maxA} ↔ {maxB}</p>
                    </div>
                    <p className="text-white/30 text-xs">Moyenne : {(total / cnt).toFixed(1)} km</p>
                  </div>
                )
              })()}
            </>
          )}

          {activeTab === 'distance' && (
            <div className="space-y-3">
              <p className="text-white/40 text-sm">Active le mode distance puis clique sur 2 logements.</p>
              {dist !== null && (
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-3xl font-bold text-indigo-400">{dist.toFixed(2)} km</p>
                  <p className="text-white/30 text-xs mt-1">à vol d'oiseau</p>
                  <div className="mt-3 pt-3 text-xs text-white/50 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p>{selected[0].name}</p>
                    <p className="text-white/20">↕</p>
                    <p>{selected[1].name}</p>
                  </div>
                </div>
              )}
              {withCoords.length >= 2 && (
                <div style={panelStyle} className="p-3">
                  <p className="text-white/40 text-xs mb-2">Toutes les distances</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {withCoords.flatMap((a, i) => withCoords.slice(i + 1).map(b => ({
                      a, b, d: haversineKm(a.latitude!, a.longitude!, b.latitude!, b.longitude!)
                    }))).sort((x, y) => x.d - y.d).map(({ a, b, d }) => (
                      <div key={`${a.id}-${b.id}`} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-white/40 truncate flex-1">{a.name} ↔ {b.name}</span>
                        <span className="text-white/70 ml-2 flex-shrink-0">{d.toFixed(1)} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'route' && (
            <div className="space-y-3">
              {withCoords.length < 2
                ? <p className="text-white/40 text-sm">Il faut au moins 2 logements géocodés sur la carte.</p>
                : (
                  <>
                    <div style={panelStyle} className="p-3 space-y-1.5">
                      {withCoords.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                            style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>{i + 1}</span>
                          <span className="text-white/60 truncate">{p.name}</span>
                          <span className="text-white/25 truncate">{p.city}</span>
                        </div>
                      ))}
                    </div>
                    <a href={gmapsUrl(withCoords)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                      <Navigation className="w-4 h-4" />
                      Ouvrir dans Google Maps
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              {properties.filter(p => !p.latitude).length > 0 && (
                <div style={panelStyle} className="p-3">
                  <p className="text-white/30 text-xs mb-1">Pas encore sur la carte :</p>
                  {properties.filter(p => !p.latitude).map(p => (
                    <p key={p.id} className="text-white/20 text-xs">{p.name}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

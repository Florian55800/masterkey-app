'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Ruler, BarChart2, Navigation, X, RefreshCw, ExternalLink } from 'lucide-react'

// Leaflet ne fonctionne pas côté serveur — import dynamique obligatoire
const MapContainer    = dynamic(() => import('react-leaflet').then(m => m.MapContainer),    { ssr: false })
const TileLayer       = dynamic(() => import('react-leaflet').then(m => m.TileLayer),       { ssr: false })
const Marker          = dynamic(() => import('react-leaflet').then(m => m.Marker),          { ssr: false })
const Popup           = dynamic(() => import('react-leaflet').then(m => m.Popup),           { ssr: false })
const Polyline        = dynamic(() => import('react-leaflet').then(m => m.Polyline),        { ssr: false })

interface Property {
  id: number
  name: string
  address: string
  city: string
  status: string
  typeGestion: string
  commissionRate: number
  latitude: number | null
  longitude: number | null
  owner?: { name: string }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function gmapsRouteUrl(props: Property[]): string {
  const withCoords = props.filter(p => p.latitude && p.longitude)
  if (withCoords.length === 0) return ''
  if (withCoords.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${withCoords[0].latitude},${withCoords[0].longitude}`
  }
  const origin = encodeURIComponent(`${withCoords[0].address}, ${withCoords[0].city}`)
  const dest   = encodeURIComponent(`${withCoords[withCoords.length - 1].address}, ${withCoords[withCoords.length - 1].city}`)
  const waypoints = withCoords.slice(1, -1).map(p => encodeURIComponent(`${p.address}, ${p.city}`)).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`
}

export default function CartePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState<number[]>([])
  const [distanceMode, setDistanceMode] = useState(false)
  const [distancePair, setDistancePair] = useState<[Property, Property] | null>(null)
  const [distanceSelection, setDistanceSelection] = useState<Property[]>([])
  const [activeTab, setActiveTab] = useState<'stats' | 'distance' | 'route'>('stats')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const leafletLoaded = useRef(false)

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then(data => {
        setProperties(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  // Géocode les propriétés sans coordonnées (1 à la fois pour respecter le rate limit Nominatim)
  const geocodeNext = useCallback(async (props: Property[]) => {
    const toGeocode = props.filter(p => !p.latitude || !p.longitude)
    if (toGeocode.length === 0) return

    for (const prop of toGeocode) {
      setGeocoding(g => [...g, prop.id])
      await new Promise(r => setTimeout(r, 1100)) // respect Nominatim 1 req/s
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
    if (properties.length > 0 && !loading) {
      geocodeNext(properties)
    }
  }, [loading, geocodeNext]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = properties.filter(p =>
    filterStatus === 'all' ? true : filterStatus === 'active' ? p.status === 'active' : p.status !== 'active'
  )
  const withCoords = filtered.filter(p => p.latitude && p.longitude)

  // Stats
  const byCityMap: Record<string, number> = {}
  filtered.forEach(p => { byCityMap[p.city] = (byCityMap[p.city] ?? 0) + 1 })
  const byCity = Object.entries(byCityMap).sort((a, b) => b[1] - a[1])
  const activeCount = properties.filter(p => p.status === 'active').length
  const inactiveCount = properties.filter(p => p.status !== 'active').length

  // Centre de la carte
  const center: [number, number] = withCoords.length > 0
    ? [
        withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length,
        withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length,
      ]
    : [48.8566, 2.3522]

  function handleMarkerClick(prop: Property) {
    if (!distanceMode) return
    setDistanceSelection(prev => {
      if (prev.find(p => p.id === prop.id)) return prev
      if (prev.length >= 2) return [prev[1], prop]
      const next = [...prev, prop]
      if (next.length === 2) setDistancePair([next[0], next[1]])
      return next
    })
  }

  const dist = distancePair && distancePair[0].latitude && distancePair[1].latitude
    ? haversineKm(distancePair[0].latitude!, distancePair[0].longitude!, distancePair[1].latitude!, distancePair[1].longitude!)
    : null

  const panelStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
  }

  const tabBtn = (tab: typeof activeTab, label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setActiveTab(tab)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={activeTab === tab
        ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }
        : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Carte des logements</h1>
            <p className="text-white/30 text-xs mt-0.5">{withCoords.length} / {properties.length} géocodés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtre statut */}
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filterStatus === s
                ? { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
          {/* Mode distance */}
          <button
            onClick={() => { setDistanceMode(d => !d); setDistanceSelection([]); setDistancePair(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={distanceMode
              ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Ruler className="w-3.5 h-3.5" />
            {distanceMode ? 'Quitter distance' : 'Mesurer distance'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Carte */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/30">
              Chargement des logements...
            </div>
          ) : (
            <MapWithLeaflet
              center={center}
              withCoords={withCoords}
              geocoding={geocoding}
              distanceMode={distanceMode}
              distanceSelection={distanceSelection}
              distancePair={distancePair}
              onMarkerClick={handleMarkerClick}
            />
          )}

          {/* Instructions mode distance */}
          {distanceMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)', color: 'white' }}>
              {distanceSelection.length === 0 && 'Clique sur un 1er logement'}
              {distanceSelection.length === 1 && `"${distanceSelection[0].name}" sélectionné — clique sur un 2e`}
              {distanceSelection.length === 2 && dist !== null && `Distance : ${dist.toFixed(2)} km à vol d'oiseau`}
            </div>
          )}

          {/* Légende */}
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.6)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} /> Actif
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#6b7280' }} /> Inactif
            </span>
            {geocoding.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Géocodage...
              </span>
            )}
          </div>
        </div>

        {/* Panel latéral */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-4 space-y-4"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Tabs */}
          <div className="flex gap-1">
            {tabBtn('stats', 'Stats', BarChart2)}
            {tabBtn('distance', 'Distance', Ruler)}
            {tabBtn('route', 'Itinéraire', Navigation)}
          </div>

          {activeTab === 'stats' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total', value: properties.length, color: '#D4AF37' },
                  { label: 'Actifs', value: activeCount, color: '#22c55e' },
                  { label: 'Inactifs', value: inactiveCount, color: '#6b7280' },
                  { label: 'Géocodés', value: withCoords.length, color: '#818cf8' },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-xl text-center" style={panelStyle}>
                    <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-white/40 text-xs mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Par ville */}
              <div style={panelStyle} className="p-4">
                <p className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wider">Par ville</p>
                <div className="space-y-2">
                  {byCity.map(([city, count]) => (
                    <div key={city} className="flex items-center gap-2">
                      <span className="text-white/70 text-sm flex-1 truncate">{city}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{
                            background: '#D4AF37',
                            width: `${(count / properties.length) * 100}%`,
                          }} />
                        </div>
                        <span className="text-white/50 text-xs w-4 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distances max/min entre logements géocodés */}
              {withCoords.length >= 2 && (() => {
                let minD = Infinity, maxD = 0
                let minPair: [Property, Property] | null = null
                let maxPair: [Property, Property] | null = null
                for (let i = 0; i < withCoords.length; i++) {
                  for (let j = i + 1; j < withCoords.length; j++) {
                    const d = haversineKm(withCoords[i].latitude!, withCoords[i].longitude!, withCoords[j].latitude!, withCoords[j].longitude!)
                    if (d < minD) { minD = d; minPair = [withCoords[i], withCoords[j]] }
                    if (d > maxD) { maxD = d; maxPair = [withCoords[i], withCoords[j]] }
                  }
                }
                return (
                  <div style={panelStyle} className="p-4 space-y-3">
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Distances extrêmes</p>
                    {minPair && (
                      <div>
                        <p className="text-green-400 text-xs mb-1">Plus proches — {minD.toFixed(2)} km</p>
                        <p className="text-white/60 text-xs">{minPair[0].name} ↔ {minPair[1].name}</p>
                      </div>
                    )}
                    {maxPair && (
                      <div>
                        <p className="text-amber-400 text-xs mb-1">Plus éloignés — {maxD.toFixed(2)} km</p>
                        <p className="text-white/60 text-xs">{maxPair[0].name} ↔ {maxPair[1].name}</p>
                      </div>
                    )}
                    <p className="text-white/25 text-xs">Distance moyenne : {
                      (() => {
                        let total = 0, count = 0
                        for (let i = 0; i < withCoords.length; i++) for (let j = i + 1; j < withCoords.length; j++) {
                          total += haversineKm(withCoords[i].latitude!, withCoords[i].longitude!, withCoords[j].latitude!, withCoords[j].longitude!)
                          count++
                        }
                        return (total / count).toFixed(2)
                      })()
                    } km</p>
                  </div>
                )
              })()}
            </>
          )}

          {activeTab === 'distance' && (
            <div className="space-y-4">
              <p className="text-white/40 text-sm">Active le mode distance et clique sur 2 logements pour mesurer la distance à vol d'oiseau.</p>

              <button
                onClick={() => { setDistanceMode(d => !d); setDistanceSelection([]); setDistancePair(null) }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={distanceMode
                  ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Ruler className="w-4 h-4" />
                {distanceMode ? 'Désactiver' : 'Activer le mode distance'}
              </button>

              {distancePair && dist !== null && (
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-3xl font-bold text-indigo-400">{dist.toFixed(2)} km</p>
                  <p className="text-white/40 text-xs mt-1">à vol d'oiseau</p>
                  <div className="mt-3 pt-3 text-xs text-white/50 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p>{distancePair[0].name}</p>
                    <p className="text-white/25">↕</p>
                    <p>{distancePair[1].name}</p>
                  </div>
                </div>
              )}

              {withCoords.length >= 2 && (
                <div style={panelStyle} className="p-3">
                  <p className="text-white/40 text-xs mb-2">Toutes les distances</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {withCoords.flatMap((a, i) => withCoords.slice(i + 1).map(b => ({
                      a, b, d: haversineKm(a.latitude!, a.longitude!, b.latitude!, b.longitude!)
                    }))).sort((x, y) => x.d - y.d).map(({ a, b, d }) => (
                      <div key={`${a.id}-${b.id}`} className="flex items-center justify-between text-xs py-1"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className="text-white/50 truncate flex-1">{a.name} ↔ {b.name}</span>
                        <span className="text-white/70 ml-2 flex-shrink-0">{d.toFixed(2)} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'route' && (
            <div className="space-y-4">
              <p className="text-white/40 text-sm">Génère un itinéraire Google Maps passant par tous tes logements actifs géocodés.</p>

              {withCoords.length < 2 && (
                <p className="text-amber-400/70 text-sm">Il faut au moins 2 logements géocodés.</p>
              )}

              {withCoords.length >= 2 && (
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

                  <a
                    href={gmapsRouteUrl(withCoords)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <Navigation className="w-4 h-4" />
                    Ouvrir dans Google Maps
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}

              <div style={panelStyle} className="p-3">
                <p className="text-white/40 text-xs mb-2">Logements non géocodés</p>
                {properties.filter(p => !p.latitude || !p.longitude).length === 0
                  ? <p className="text-green-400 text-xs">Tous les logements sont géocodés ✓</p>
                  : properties.filter(p => !p.latitude || !p.longitude).map(p => (
                    <div key={p.id} className="text-white/30 text-xs py-0.5">{p.name} — {p.address}, {p.city}</div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant carte isolé pour éviter les problèmes SSR avec Leaflet
function MapWithLeaflet({
  center, withCoords, geocoding, distanceMode, distanceSelection, distancePair, onMarkerClick
}: {
  center: [number, number]
  withCoords: Property[]
  geocoding: number[]
  distanceMode: boolean
  distanceSelection: Property[]
  distancePair: [Property, Property] | null
  onMarkerClick: (p: Property) => void
}) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null)

  useEffect(() => {
    import('leaflet').then(leaflet => {
      // Fix icônes Leaflet cassées dans Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setL(leaflet)
    })
    // Import CSS Leaflet
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }, [])

  if (!L) return (
    <div className="w-full h-full flex items-center justify-center text-white/30">
      Chargement de la carte...
    </div>
  )

  const makeIcon = (active: boolean, selected: boolean) => L.divIcon({
    html: `<div style="
      width:28px; height:28px; border-radius:50%;
      background:${selected ? '#818cf8' : active ? '#22c55e' : '#6b7280'};
      border:3px solid ${selected ? '#c7d2fe' : active ? '#86efac' : '#9ca3af'};
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex; align-items:center; justify-content:center;
    "></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  const polylineCoords: [number, number][] = distancePair
    ? [[distancePair[0].latitude!, distancePair[0].longitude!], [distancePair[1].latitude!, distancePair[1].longitude!]]
    : []

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {withCoords.map(prop => {
        const isSelected = distanceSelection.some(p => p.id === prop.id)
        const icon = makeIcon(prop.status === 'active', isSelected)
        return (
          <Marker
            key={prop.id}
            position={[prop.latitude!, prop.longitude!]}
            icon={icon}
            eventHandlers={{ click: () => onMarkerClick(prop) }}
          >
            {!distanceMode && (
              <Popup>
                <div style={{ minWidth: '180px', fontFamily: 'sans-serif' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: '#111' }}>{prop.name}</p>
                  {prop.owner && <p style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>👤 {prop.owner.name}</p>}
                  <p style={{ fontSize: '12px', color: '#777', marginBottom: '2px' }}>📍 {prop.address}, {prop.city}</p>
                  <p style={{ fontSize: '12px', color: '#777', marginBottom: '6px' }}>Commission : {prop.commissionRate}%</p>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                    background: prop.status === 'active' ? '#dcfce7' : '#f3f4f6',
                    color:      prop.status === 'active' ? '#16a34a' : '#6b7280',
                  }}>
                    {prop.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                  {geocoding.includes(prop.id) && <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>Géocodage en cours...</p>}
                </div>
              </Popup>
            )}
          </Marker>
        )
      })}
      {polylineCoords.length === 2 && (
        <Polyline positions={polylineCoords} pathOptions={{ color: '#818cf8', weight: 2, dashArray: '8,8' }} />
      )}
    </MapContainer>
  )
}

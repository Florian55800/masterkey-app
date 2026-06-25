'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  propertyAddress: string | null
  propertyCity: string | null
  propertyPhoto: string | null
}

// ─── Emoji maps ───────────────────────────────────────────────────────────────

const RESTAURANT_EMOJI: Record<string, string> = {
  'Français': '🥐',
  'Brasserie': '🍺',
  'Italien': '🍝',
  'Pizza': '🍕',
  'Sushi': '🍣',
  'Burgers': '🍔',
  'Tapas': '🥘',
  'Bar/Café': '☕',
  'Autre': '🍴',
}

const ACTIVITY_EMOJI: Record<string, string> = {
  'Plage': '🏖️',
  'Randonnée': '🥾',
  'Musée': '🏛️',
  'Culture': '🎭',
  'Shopping': '🛍️',
  'Sport': '⚽',
  'Nature': '🌿',
  'Soirée': '🌙',
  'Famille': '👨‍👩‍👧',
  'Autre': '✨',
}

// ─── WiFi Copy Button (interactive) ──────────────────────────────────────────

function WifiCard({ wifiName, wifiPassword }: { wifiName: string; wifiPassword: string }) {
  const [showPass, setShowPass] = useState(false)
  const [copiedName, setCopiedName] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'rgba(212,175,55,0.06)',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: '20px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'rgba(212,175,55,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          📶
        </div>
        <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '16px' }}>WiFi</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '2px' }}>Réseau</div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>{wifiName}</div>
          </div>
          <button
            onClick={() => copy(wifiName, setCopiedName)}
            style={{
              background: copiedName ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
              border: copiedName ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '6px 12px',
              color: copiedName ? '#22c55e' : 'rgba(255,255,255,0.6)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {copiedName ? '✓ Copié' : 'Copier'}
          </button>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '2px' }}>Mot de passe</div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '15px', letterSpacing: showPass ? 'normal' : '4px' }}>
              {showPass ? wifiPassword : '••••••••'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '6px 12px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showPass ? 'Cacher' : 'Voir'}
            </button>
            <button
              onClick={() => copy(wifiPassword, setCopiedPass)}
              style={{
                background: copiedPass ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                border: copiedPass ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '6px 12px',
                color: copiedPass ? '#22c55e' : 'rgba(255,255,255,0.6)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copiedPass ? '✓' : 'Copier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BienvenuePage() {
  const params = useParams()
  const token = params?.token as string
  const [guide, setGuide] = useState<WelcomeGuide | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/welcome-guides/${token}`)
      .then(r => r.json())
      .then(data => { setGuide(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(212,175,55,0.3)',
          borderTopColor: '#D4AF37',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!guide || (guide as any).error) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px', padding: '24px',
      }}>
        <div style={{ fontSize: '48px' }}>🏠</div>
        <p style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>Livret introuvable</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center' }}>
          Ce lien n&apos;est plus valide ou a été supprimé.
        </p>
      </div>
    )
  }

  const hasWifi = !!(guide.wifiName || guide.wifiPassword)
  const hasAccess = !!(guide.keyCode || guide.checkIn || guide.checkOut)
  const hasRules = guide.houseRules.length > 0
  const hasRestaurants = guide.restaurants.length > 0
  const hasActivities = guide.activities.length > 0
  const hasMedia = guide.mediaUrls.length > 0
  const hasSections = guide.customSections.length > 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .section-animate {
          animation: fadeUp 0.5s ease forwards;
        }
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .scroll-row {
          display: flex;
          overflow-x: auto;
          gap: 16px;
          padding-bottom: 8px;
          scrollbar-width: none;
        }
        .scroll-row::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) {
          .scroll-row {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            overflow-x: visible;
          }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: '100vh',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background photo */}
        {guide.propertyPhoto ? (
          <img
            src={guide.propertyPhoto}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0,
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #1a1008 0%, #0f0f0f 100%)',
            zIndex: 0,
          }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to top, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.5) 50%, rgba(15,15,15,0.3) 100%)',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 2,
          textAlign: 'center', padding: '0 24px',
          animation: 'fadeUp 0.8s ease forwards',
        }}>
          <p style={{
            color: '#D4AF37', fontSize: '14px', fontStyle: 'italic',
            fontWeight: 500, letterSpacing: '2px', marginBottom: '12px',
            textTransform: 'uppercase',
          }}>
            Bienvenue
          </p>
          <h1 style={{
            color: 'white', fontSize: 'clamp(28px, 6vw, 52px)',
            fontWeight: 800, lineHeight: 1.15, marginBottom: '8px',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}>
            {guide.propertyName ?? 'Votre logement'}
          </h1>
          {guide.propertyCity && (
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '18px', marginBottom: '24px' }}>
              📍 {guide.propertyCity}
            </p>
          )}

          {/* Check-in / Check-out badges */}
          {(guide.checkIn || guide.checkOut) && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {guide.checkIn && (
                <div style={{
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: '100px',
                  padding: '8px 18px',
                  color: '#D4AF37', fontSize: '14px', fontWeight: 600,
                }}>
                  🔑 Check-in {guide.checkIn}
                </div>
              )}
              {guide.checkOut && (
                <div style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '100px',
                  padding: '8px 18px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600,
                }}>
                  👋 Check-out {guide.checkOut}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2, animation: 'bounce 2s ease infinite',
        }}>
          <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)' }}>↓</div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0f0f0f', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px' }}>

          {/* Welcome message */}
          {guide.welcomeMessage && (
            <div className="section-animate" style={{ padding: '40px 0 0' }}>
              <div style={{
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: '20px',
                padding: '24px',
              }}>
                <MarkdownBlock content={guide.welcomeMessage} />
              </div>
            </div>
          )}

          {/* WiFi */}
          {hasWifi && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <WifiCard wifiName={guide.wifiName ?? ''} wifiPassword={guide.wifiPassword ?? ''} />
            </div>
          )}

          {/* Access */}
          {hasAccess && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="🔑" title="Accès" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {guide.checkIn && (
                  <InfoCard emoji="🏠" label="Check-in" value={guide.checkIn} />
                )}
                {guide.checkOut && (
                  <InfoCard emoji="👋" label="Check-out" value={guide.checkOut} />
                )}
                {guide.keyCode && (
                  <InfoCard emoji="🔐" label="Code d'accès" value={guide.keyCode} />
                )}
              </div>
            </div>
          )}

          {/* House rules */}
          {hasRules && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="📋" title="Règles de la maison" />
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                overflow: 'hidden',
              }}>
                {guide.houseRules.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '14px 20px',
                      borderBottom: idx < guide.houseRules.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    <span style={{ color: '#D4AF37', fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.5 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restaurants */}
          {hasRestaurants && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="🍽️" title="Restaurants & Bars" />
              <div className="scroll-row">
                {guide.restaurants.map((r, idx) => (
                  <div
                    key={idx}
                    className="card-hover"
                    style={{
                      minWidth: '200px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                      {RESTAURANT_EMOJI[r.category] ?? '🍴'}
                    </div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{r.name}</p>
                    <p style={{
                      color: '#D4AF37', fontSize: '11px', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                    }}>{r.category}</p>
                    {r.description && (
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.5, marginBottom: '8px' }}>
                        {r.description}
                      </p>
                    )}
                    {r.address && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                        📍 {r.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          {hasActivities && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="🎯" title="À faire autour" />
              <div className="scroll-row">
                {guide.activities.map((a, idx) => (
                  <div
                    key={idx}
                    className="card-hover"
                    style={{
                      minWidth: '180px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                      {ACTIVITY_EMOJI[a.category] ?? '✨'}
                    </div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{a.name}</p>
                    <p style={{
                      color: '#D4AF37', fontSize: '11px', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                    }}>{a.category}</p>
                    {a.description && (
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.5 }}>
                        {a.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom sections */}
          {hasSections && guide.customSections.map((sec, idx) => (
            <div key={idx} className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="📝" title={sec.title} />
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                padding: '20px',
              }}>
                <MarkdownBlock content={sec.content} />
              </div>
            </div>
          ))}

          {/* Gallery */}
          {hasMedia && (
            <div className="section-animate" style={{ paddingTop: '40px' }}>
              <SectionTitle emoji="📸" title="Galerie" />
              <div style={{
                columns: '2',
                columnGap: '12px',
              }}>
                {guide.mediaUrls.map((url, idx) => {
                  const isVideo = url.endsWith('.mp4')
                  return (
                    <div
                      key={idx}
                      style={{ marginBottom: '12px', breakInside: 'avoid', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden' }}
                      onClick={() => !isVideo && setLightboxUrl(url)}
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          controls
                          style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                        />
                      ) : (
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', display: 'block', borderRadius: '12px', transition: 'transform 0.2s ease' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ paddingTop: '60px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '100px',
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.15)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{guide.propertyName ?? 'Votre logement'}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize: '14px' }}>Séjour magique ✨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightboxUrl}
            alt=""
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              borderRadius: '16px',
              boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
            }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  // **bold**, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'white', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line → skip
    if (!trimmed) { i++; continue }

    // Divider ---
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      nodes.push(
        <div key={i} style={{ margin: '20px 0', height: '1px', background: 'rgba(212,175,55,0.2)' }} />
      )
      i++; continue
    }

    // Heading #
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      const sizes = ['22px', '18px', '15px']
      nodes.push(
        <div key={i} style={{ marginTop: level === 1 ? '28px' : '20px', marginBottom: '10px' }}>
          <span style={{
            color: level === 1 ? '#D4AF37' : 'white',
            fontSize: sizes[level - 1],
            fontWeight: 700,
            borderBottom: level === 1 ? '1px solid rgba(212,175,55,0.3)' : 'none',
            paddingBottom: level === 1 ? '6px' : '0',
            display: 'inline-block',
          }}>
            {renderInline(hMatch[2])}
          </span>
        </div>
      )
      i++; continue
    }

    // Table — collect all | lines
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim()); i++
      }
      // Filter out separator rows |---|---|
      const dataRows = tableLines.filter(l => !/^\|[\s\-:|]+\|/.test(l))
      if (dataRows.length > 0) {
        const parseRow = (row: string) => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        const [headerRow, ...bodyRows] = dataRows
        const headers = parseRow(headerRow)
        nodes.push(
          <div key={i} style={{
            overflowX: 'auto', margin: '12px 0',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              {headers[0] && (
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,0.08)' }}>
                    {headers.map((h, ci) => (
                      <th key={ci} style={{
                        padding: '10px 14px', textAlign: 'left',
                        color: '#D4AF37', fontWeight: 600, fontSize: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '10px 14px', color: 'rgba(255,255,255,0.7)',
                        verticalAlign: 'top',
                      }}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // List item - or *
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, '')); i++
      }
      nodes.push(
        <div key={i} style={{ margin: '8px 0', paddingLeft: '4px' }}>
          {items.map((item, ii) => (
            <div key={ii} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '4px 0',
            }}>
              <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: '2px', fontSize: '12px' }}>✦</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.6 }}>
                {renderInline(item)}
              </span>
            </div>
          ))}
        </div>
      )
      continue
    }

    // Regular paragraph
    nodes.push(
      <p key={i} style={{
        color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.7, margin: '6px 0',
      }}>
        {renderInline(trimmed)}
      </p>
    )
    i++
  }

  return <div style={{ padding: '4px 0' }}>{nodes}</div>
}

// ─── Sub components ───────────────────────────────────────────────────────────

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <span style={{ fontSize: '22px' }}>{emoji}</span>
      <h2 style={{
        color: 'white', fontSize: '20px', fontWeight: 700,
        borderBottom: '2px solid rgba(212,175,55,0.3)',
        paddingBottom: '2px',
      }}>
        {title}
      </h2>
    </div>
  )
}

function InfoCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="card-hover" style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emoji}</div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </p>
      <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{value}</p>
    </div>
  )
}

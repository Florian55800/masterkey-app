'use client'

import { useState } from 'react'
import { Download, FileJson, FileText, CheckCircle, AlertCircle, Shield, Database } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface ExportItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  fetch: () => Promise<void>
}

type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function dateStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ParametresPage() {
  const [statuses, setStatuses] = useState<Record<string, ExportStatus>>({})

  const setStatus = (id: string, status: ExportStatus) =>
    setStatuses((s) => ({ ...s, [id]: status }))

  const exportLeads = async () => {
    setStatus('leads', 'loading')
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      const rows = data.map((l: Record<string, unknown>) => ({
        Nom: l.nom,
        Email: l.email ?? '',
        Téléphone: l.telephone ?? '',
        'Adresse du bien': l.adresseBien ?? '',
        Ville: l.ville ?? '',
        'Type de bien': l.typeBien ?? '',
        'Nb chambres': l.nbChambres ?? '',
        'Surface (m²)': l.surface ?? '',
        'Lien annonce': l.lienAnnonce ?? '',
        Statut: l.statut,
        Commentaires: l.commentaires ?? '',
        'Date contact': l.dateContact ? new Date(l.dateContact as string).toLocaleDateString('fr-FR') : '',
        'Date relance': l.relanceDate ? new Date(l.relanceDate as string).toLocaleDateString('fr-FR') : '',
        'Note relance': l.relanceNote ?? '',
      }))
      downloadFile(toCSV(rows), `leads_${dateStr()}.csv`, 'text/csv;charset=utf-8')
      setStatus('leads', 'done')
    } catch { setStatus('leads', 'error') }
  }

  const exportClients = async () => {
    setStatus('clients', 'loading')
    try {
      const res = await fetch('/api/owners')
      const data = await res.json()
      const rows = data.map((o: Record<string, unknown>) => ({
        Nom: o.name,
        Téléphone: o.phone ?? '',
        Email: o.email ?? '',
        Source: o.source ?? '',
        'Nb logements actifs': (o.properties as Array<{status: string}>)?.filter((p) => p.status === 'active').length ?? 0,
        Notes: o.notes ?? '',
        'Dernier contact': o.lastContact ? new Date(o.lastContact as string).toLocaleDateString('fr-FR') : '',
        'Date relance': o.relanceDate ? new Date(o.relanceDate as string).toLocaleDateString('fr-FR') : '',
        'Note relance': o.relanceNote ?? '',
      }))
      downloadFile(toCSV(rows), `clients_${dateStr()}.csv`, 'text/csv;charset=utf-8')
      setStatus('clients', 'done')
    } catch { setStatus('clients', 'error') }
  }

  const exportLogements = async () => {
    setStatus('logements', 'loading')
    try {
      const res = await fetch('/api/properties')
      const data = await res.json()
      const rows = data.map((p: Record<string, unknown>) => ({
        Nom: p.name,
        Adresse: p.address,
        Ville: p.city,
        Type: p.type,
        Gestion: p.typeGestion ?? 'conciergerie',
        Propriétaire: (p.owner as {name: string})?.name ?? '',
        'Commission (%)': p.commissionRate,
        Statut: p.status === 'active' ? 'Actif' : 'Inactif',
        'Date signature': p.dateSigned ? new Date(p.dateSigned as string).toLocaleDateString('fr-FR') : '',
        'Date perte': p.dateLost ? new Date(p.dateLost as string).toLocaleDateString('fr-FR') : '',
      }))
      downloadFile(toCSV(rows), `logements_${dateStr()}.csv`, 'text/csv;charset=utf-8')
      setStatus('logements', 'done')
    } catch { setStatus('logements', 'error') }
  }

  const exportRapports = async () => {
    setStatus('rapports', 'loading')
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()
      const rows = data.map((r: Record<string, unknown>) => ({
        Mois: r.month,
        Année: r.year,
        'CA Brut (€)': r.caBrut,
        'Dépenses (€)': r.commissions,
        'Bénéfice net (€)': r.netProfit,
        'Logements actifs': r.activeProperties,
        'Nouvelles signatures': r.newSignatures,
        'Logements perdus': r.lostProperties,
        Notes: r.notes ?? '',
      }))
      downloadFile(toCSV(rows), `rapports_${dateStr()}.csv`, 'text/csv;charset=utf-8')
      setStatus('rapports', 'done')
    } catch { setStatus('rapports', 'error') }
  }

  const exportAll = async () => {
    setStatus('backup', 'loading')
    try {
      const [leads, clients, logements, rapports] = await Promise.all([
        fetch('/api/leads').then((r) => r.json()),
        fetch('/api/owners').then((r) => r.json()),
        fetch('/api/properties').then((r) => r.json()),
        fetch('/api/reports').then((r) => r.json()),
      ])
      const backup = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: { leads, clients, logements, rapports },
      }
      downloadFile(JSON.stringify(backup, null, 2), `masterkey_backup_${dateStr()}.json`, 'application/json')
      setStatus('backup', 'done')
    } catch { setStatus('backup', 'error') }
  }

  const exports: ExportItem[] = [
    {
      id: 'leads',
      label: 'Leads',
      description: 'Tous vos prospects — nom, contact, statut, relances',
      icon: <FileText className="w-5 h-5" />,
      color: '#3B82F6',
      fetch: exportLeads,
    },
    {
      id: 'clients',
      label: 'Clients',
      description: 'Tous vos clients/propriétaires et leurs infos de contact',
      icon: <FileText className="w-5 h-5" />,
      color: '#D4AF37',
      fetch: exportClients,
    },
    {
      id: 'logements',
      label: 'Logements',
      description: 'Tous vos logements actifs et inactifs avec commissions',
      icon: <FileText className="w-5 h-5" />,
      color: '#22c55e',
      fetch: exportLogements,
    },
    {
      id: 'rapports',
      label: 'Rapports mensuels',
      description: 'Historique complet du CA, dépenses et bénéfices',
      icon: <FileText className="w-5 h-5" />,
      color: '#f59e0b',
      fetch: exportRapports,
    },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 mt-1">Sauvegarde et export de vos données</p>
      </div>

      {/* Security info */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Shield className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Protection de vos données</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Vos données sont stockées sur <span className="text-white font-medium">Turso</span> (cloud sécurisé, répliqué).
              L'application sur <span className="text-white font-medium">Railway</span> peut être hors ligne sans que vous perdiez quoi que ce soit.
              Pour une sécurité maximale, exportez vos données régulièrement et conservez-les localement.
            </p>
          </div>
        </div>
      </Card>

      {/* Individual CSV exports */}
      <div>
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          Export par section <span className="text-gray-500 font-normal text-sm">— fichiers CSV (ouvrable dans Excel)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exports.map((item) => {
            const status = statuses[item.id] ?? 'idle'
            return (
              <button
                key={item.id}
                onClick={item.fetch}
                disabled={status === 'loading'}
                className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all group disabled:opacity-60"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: status === 'done'
                    ? '1px solid rgba(34,197,94,0.3)'
                    : status === 'error'
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => { if (status !== 'loading') (e.currentTarget as HTMLElement).style.borderColor = `${item.color}40` }}
                onMouseLeave={e => { if (status !== 'done' && status !== 'error') (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: `${item.color}18`, color: item.color }}>
                  {status === 'done' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                   status === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                   item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{item.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {status === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  ) : status === 'done' ? (
                    <span className="text-green-400 text-xs font-medium">Téléchargé</span>
                  ) : status === 'error' ? (
                    <span className="text-red-400 text-xs font-medium">Erreur</span>
                  ) : (
                    <Download className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Full backup */}
      <div>
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          Sauvegarde complète <span className="text-gray-500 font-normal text-sm">— fichier JSON (toutes les données)</span>
        </h2>
        <button
          onClick={exportAll}
          disabled={statuses['backup'] === 'loading'}
          className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all group disabled:opacity-60"
          style={{
            background: statuses['backup'] === 'done'
              ? 'rgba(34,197,94,0.05)'
              : 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)',
            border: statuses['backup'] === 'done'
              ? '1px solid rgba(34,197,94,0.3)'
              : statuses['backup'] === 'error'
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(212,175,55,0.2)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.2)' }}>
            {statuses['backup'] === 'done' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : statuses['backup'] === 'error' ? (
              <AlertCircle className="w-6 h-6 text-red-400" />
            ) : (
              <FileJson className="w-6 h-6 text-[#D4AF37]" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Exporter toutes les données</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Leads + Clients + Logements + Rapports — fichier <code className="text-[#D4AF37] text-xs">masterkey_backup_YYYY-MM-DD.json</code>
            </p>
          </div>
          <div className="flex-shrink-0 mr-1">
            {statuses['backup'] === 'loading' ? (
              <div className="w-5 h-5 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            ) : statuses['backup'] === 'done' ? (
              <span className="text-green-400 text-sm font-medium">Téléchargé ✓</span>
            ) : statuses['backup'] === 'error' ? (
              <span className="text-red-400 text-sm font-medium">Erreur</span>
            ) : (
              <Download className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            )}
          </div>
        </button>
        <p className="text-gray-600 text-xs mt-2 ml-1">
          Conseil : effectuez cette sauvegarde une fois par semaine et conservez le fichier sur votre ordinateur ou Google Drive.
        </p>
      </div>
    </div>
  )
}

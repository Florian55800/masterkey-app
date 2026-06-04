'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Clock, X, ChevronDown } from 'lucide-react'

const CONTRACT_TYPES = ['bail', 'prestataire', 'partenariat', 'assurance', 'abonnement', 'autre']

interface Contract {
  id: number
  name: string
  contrepartie: string | null
  type: string
  dateSigne: string | null
  dateExpiration: string | null
  dureePreavis: number | null
  statut: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function StatusBadge({ contract }: { contract: Contract }) {
  if (contract.statut === 'resilie') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(107,114,128,0.15)', color: '#6b7280' }}>
        Résilié
      </span>
    )
  }
  if (contract.statut === 'expire' || (contract.dateExpiration && daysUntil(contract.dateExpiration)! < 0)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
        <X className="w-3 h-3" /> Expiré
      </span>
    )
  }
  const days = daysUntil(contract.dateExpiration)
  const preavis = contract.dureePreavis ?? 30
  if (days !== null && days <= preavis) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
        <Clock className="w-3 h-3" /> Expire dans {days}j
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
      <CheckCircle className="w-3 h-3" /> Actif
    </span>
  )
}

const emptyForm = {
  name: '',
  contrepartie: '',
  type: 'autre',
  dateSigne: '',
  dateExpiration: '',
  dureePreavis: '',
  statut: 'actif',
  notes: '',
}

export default function AdministratifPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/contracts')
      if (!r.ok) throw new Error('Erreur serveur')
      const data = await r.json()
      setContracts(data)
    } catch {
      setError('Impossible de charger les contrats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  function openEdit(c: Contract) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      contrepartie: c.contrepartie ?? '',
      type: c.type,
      dateSigne: c.dateSigne ? c.dateSigne.substring(0, 10) : '',
      dateExpiration: c.dateExpiration ? c.dateExpiration.substring(0, 10) : '',
      dureePreavis: c.dureePreavis != null ? String(c.dureePreavis) : '',
      statut: c.statut,
      notes: c.notes ?? '',
    })
    setError('')
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom du contrat est requis'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        contrepartie: form.contrepartie.trim() || null,
        type: form.type,
        dateSigne: form.dateSigne || null,
        dateExpiration: form.dateExpiration || null,
        dureePreavis: form.dureePreavis ? Number(form.dureePreavis) : null,
        statut: form.statut,
        notes: form.notes.trim() || null,
      }
      const url = editingId ? `/api/contracts/${editingId}` : '/api/contracts'
      const method = editingId ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error(await r.text())
      setIsModalOpen(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await load()
    } catch {
      setError('Erreur lors de la suppression')
    }
  }

  // Alertes : contrats qui arrivent à expiration bientôt
  const alertContracts = contracts.filter(c => {
    if (c.statut === 'resilie') return false
    const days = daysUntil(c.dateExpiration)
    if (days === null) return false
    const preavis = c.dureePreavis ?? 30
    return days >= 0 && days <= preavis
  })
  const expiredContracts = contracts.filter(c => {
    if (c.statut === 'resilie' || c.statut === 'expire') return false
    const days = daysUntil(c.dateExpiration)
    return days !== null && days < 0
  })

  const panelStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#0a0a0a' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <FileText className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Administratif</h1>
              <p className="text-white/40 text-sm">Contrats signés et suivi des échéances</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
          >
            <Plus className="w-4 h-4" />
            Ajouter un contrat
          </button>
        </div>

        {/* Alertes */}
        {(alertContracts.length > 0 || expiredContracts.length > 0) && (
          <div className="space-y-3 mb-6">
            {expiredContracts.map(c => (
              <div key={c.id} className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium text-sm">{c.name} — Contrat expiré</p>
                  <p className="text-red-400/70 text-xs">Expiré le {fmtDate(c.dateExpiration)}{c.contrepartie ? ` · ${c.contrepartie}` : ''}</p>
                </div>
              </div>
            ))}
            {alertContracts.map(c => {
              const days = daysUntil(c.dateExpiration)!
              return (
                <div key={c.id} className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium text-sm">{c.name} — À renouveler</p>
                    <p className="text-amber-400/70 text-xs">Expire dans {days} jour{days > 1 ? 's' : ''} ({fmtDate(c.dateExpiration)}){c.contrepartie ? ` · ${c.contrepartie}` : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center py-20 text-white/30">Chargement...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20" style={panelStyle}>
            <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Aucun contrat enregistré</p>
            <p className="text-white/20 text-sm mt-1">Ajoutez vos contrats pour suivre les échéances</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.id} className="p-4 rounded-xl flex items-start gap-4" style={panelStyle}>
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <FileText className="w-4 h-4 text-[#D4AF37]/60" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{c.name}</span>
                    <StatusBadge contract={c} />
                    <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                      {c.type}
                    </span>
                  </div>
                  {c.contrepartie && (
                    <p className="text-white/50 text-xs mt-0.5">{c.contrepartie}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                    {c.dateSigne && <span>Signé le {fmtDate(c.dateSigne)}</span>}
                    {c.dateExpiration && (
                      <span>Expire le {fmtDate(c.dateExpiration)}</span>
                    )}
                    {!c.dateExpiration && <span>Pas de date d'expiration</span>}
                    {c.dureePreavis && <span>Préavis {c.dureePreavis}j</span>}
                  </div>
                  {c.notes && (
                    <p className="text-white/30 text-xs mt-1.5 italic">{c.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirm === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-red-400 transition-colors"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg text-xs text-white/40 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajout/Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">{editingId ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
              <button onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Nom du contrat *</label>
                <input
                  style={inputStyle}
                  placeholder="Ex: Bail logement rue de la Paix"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Contrepartie + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Contrepartie</label>
                  <input
                    style={inputStyle}
                    placeholder="Ex: M. Dupont"
                    value={form.contrepartie}
                    onChange={e => setForm(f => ({ ...f, contrepartie: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Type</label>
                  <div className="relative">
                    <select
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    >
                      {CONTRACT_TYPES.map(t => (
                        <option key={t} value={t} style={{ background: '#1a1a1a' }}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Date de signature</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    value={form.dateSigne}
                    onChange={e => setForm(f => ({ ...f, dateSigne: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Date d'expiration</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    value={form.dateExpiration}
                    onChange={e => setForm(f => ({ ...f, dateExpiration: e.target.value }))}
                  />
                </div>
              </div>

              {/* Préavis + Statut */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Préavis d'alerte (jours)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    placeholder="30"
                    value={form.dureePreavis}
                    onChange={e => setForm(f => ({ ...f, dureePreavis: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1.5">Statut</label>
                  <div className="relative">
                    <select
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}
                      value={form.statut}
                      onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                    >
                      <option value="actif" style={{ background: '#1a1a1a' }}>Actif</option>
                      <option value="expire" style={{ background: '#1a1a1a' }}>Expiré</option>
                      <option value="resilie" style={{ background: '#1a1a1a' }}>Résilié</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Notes</label>
                <textarea
                  style={{ ...inputStyle, resize: 'none', height: '72px' }}
                  placeholder="Informations complémentaires..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: saving ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.2)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    color: '#D4AF37',
                  }}
                >
                  {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

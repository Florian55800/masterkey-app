'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, ClipboardList, RotateCcw, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task { id: string; label: string; warning?: boolean }
interface Phase {
  id: string
  number: string
  title: string
  timing: string
  color: string       // Tailwind color token
  tasks: Task[]
}
interface Session {
  id: string
  name: string        // prospect / adresse
  createdAt: string
  checks: Record<string, boolean>
}

// ─── Checklists ───────────────────────────────────────────────────────────────

const PHASES_CONCIERGERIE: Phase[] = [
  {
    id: 'c1', number: '01', title: 'Validation & Premier contact', timing: 'J0 — Immédiatement après le OUI',
    color: 'red',
    tasks: [
      { id: 'c1_1', label: 'Féliciter chaleureusement le propriétaire et confirmer le démarrage' },
      { id: 'c1_2', label: 'Envoyer le formulaire d\'onboarding (SMS + email) pour collecter nom, adresse, RIB, assurance, disponibilités' },
      { id: 'c1_3', label: 'Planifier la visite du logement (J1–J3)' },
      { id: 'c1_4', label: 'Ajouter le prospect dans l\'outil de gestion (leads → statut "En passe de signer")' },
    ],
  },
  {
    id: 'c2', number: '02', title: 'Visite du logement', timing: 'J1 à J3',
    color: 'orange',
    tasks: [
      { id: 'c2_1', label: 'Préparer & imprimer la liste des équipements (vérifier chaque pièce)' },
      { id: 'c2_2', label: 'État des lieux d\'entrée contradictoire — photos + formulaire signé des deux parties' },
      { id: 'c2_3', label: 'Récupération des clés (minimum 2 doubles : boîte à clés + secours)' },
      { id: 'c2_4', label: 'Vérification sécurité : détecteur de fumée fonctionnel, extincteur présent (obligations légales LCD)' },
      { id: 'c2_5', label: 'Vérifier la connexion internet (débit suffisant pour les voyageurs)' },
      { id: 'c2_6', label: 'Identifier les travaux / achats manquants (literie, équipements de cuisine, déco…)' },
      { id: 'c2_7', label: 'Relever l\'adresse exacte + accès (code portail, interphone, digicode…)' },
    ],
  },
  {
    id: 'c3', number: '03', title: 'Administratif & Contrat', timing: 'J1 à J5',
    color: 'yellow',
    tasks: [
      { id: 'c3_1', label: 'Récupérer les documents du propriétaire : RIB, pièce d\'identité, attestation d\'assurance habitation' },
      { id: 'c3_2', label: 'Vérifier que le règlement de copropriété autorise la location courte durée' },
      { id: 'c3_3', label: 'Vérifier les obligations locales (déclaration en mairie, numéro d\'enregistrement si ville réglementée)' },
      { id: 'c3_4', label: 'Créer & envoyer le contrat de conciergerie (généré depuis le formulaire d\'onboarding)' },
      { id: 'c3_5', label: 'Confirmer la réception et la signature du contrat', warning: true },
      { id: 'c3_6', label: 'Créer le groupe WhatsApp : propriétaire + membres de l\'équipe concernés' },
      { id: 'c3_7', label: 'Créer la fiche logement dans l\'application MasterKey' },
    ],
  },
  {
    id: 'c4', number: '04', title: 'Mise en place opérationnelle', timing: 'J5 à J10',
    color: 'green',
    tasks: [
      { id: 'c4_1', label: 'Installer la boîte à clés — poser, programmer le code, tester l\'ouverture' },
      { id: 'c4_2', label: 'Premier ménage complet de mise en état (logement impeccable avant photos)' },
      { id: 'c4_3', label: 'Mise en place du kit voyageur : draps, serviettes, produits d\'accueil, café/thé' },
      { id: 'c4_4', label: 'Prise de photos professionnelles — toutes pièces, mise en scène, lumière naturelle si possible' },
      { id: 'c4_5', label: 'Valider les photos avec le propriétaire avant de créer l\'annonce', warning: true },
      { id: 'c4_6', label: 'Rédiger le livret d\'accueil voyageurs (WiFi, check-in/out, règles, bons plans locaux)' },
    ],
  },
  {
    id: 'c5', number: '05', title: 'Création des annonces', timing: 'J7 à J14 — Après contrat signé + photos validées',
    color: 'blue',
    tasks: [
      { id: 'c5_1', label: 'Créer la fiche logement sur Lodgify (titre accrocheur, description complète, capacité, équipements, règles)' },
      { id: 'c5_2', label: 'Définir la tarification de base (prix/nuit, prix week-end, séjour minimum, caution)' },
      { id: 'c5_3', label: 'Activer la tarification dynamique — connecter PriceLabs ou Wheelhouse' },
      { id: 'c5_4', label: 'Mapping Airbnb & Booking.com via le channel manager Lodgify' },
      { id: 'c5_5', label: 'Ajouter les majorations : frais de ménage, caution, week-ends & événements locaux' },
      { id: 'c5_6', label: 'Mettre en place les messages automatiques (confirmation, rappel check-in, bienvenue, départ)' },
      { id: 'c5_7', label: 'Valider l\'annonce avec le propriétaire avant mise en ligne (envoyer le lien preview)', warning: true },
    ],
  },
  {
    id: 'c6', number: '06', title: 'Équipe ménage', timing: 'J10 à J14',
    color: 'purple',
    tasks: [
      { id: 'c6_1', label: 'Créer la fiche logement pour la femme de ménage (plan, checklist, produits, observations particulières)' },
      { id: 'c6_2', label: 'Affecter une prestataire de ménage dans l\'app MasterKey (Personnel → logement)' },
      { id: 'c6_3', label: 'Assigner le logement sur Turno / Lodgify et vérifier ses disponibilités' },
      { id: 'c6_4', label: 'Faire une visite de briefing avec la prestataire avant la première réservation' },
    ],
  },
  {
    id: 'c7', number: '07', title: 'Lancement', timing: 'J14 — Go live !',
    color: 'emerald',
    tasks: [
      { id: 'c7_1', label: 'Ajouter le propriétaire sur Lodgify (accès utilisateur pour suivi des réservations)' },
      { id: 'c7_2', label: 'Ouvrir le planning et activer la visibilité sur Airbnb et Booking.com' },
      { id: 'c7_3', label: 'Vérifier que la synchronisation des calendriers fonctionne correctement' },
      { id: 'c7_4', label: 'Confirmer la mise en ligne au propriétaire (WhatsApp + lien de l\'annonce) ✅' },
      { id: 'c7_5', label: 'Mettre le lead en statut "Signé" dans l\'application MasterKey' },
      { id: 'c7_6', label: 'Planifier le premier rapport mensuel (J+30)' },
    ],
  },
]

const PHASES_SOUS_LOCATION: Phase[] = [
  {
    id: 's1', number: '01', title: 'Validation & Due Diligence', timing: 'J0 — Avant tout engagement',
    color: 'red',
    tasks: [
      { id: 's1_1', label: 'Vérifier que le bail du propriétaire autorise explicitement la sous-location (clause spécifique)', warning: true },
      { id: 's1_2', label: 'Vérifier la réglementation de la ville (déclaration en mairie, plafond 120j/an, numéro d\'enregistrement…)' },
      { id: 's1_3', label: 'Calculer la rentabilité prévisionnelle : revenus Airbnb estimés vs loyer mensuel + charges' },
      { id: 's1_4', label: 'Valider la rentabilité avant d\'aller plus loin (seuil minimum MK)' },
      { id: 's1_5', label: 'Envoyer le formulaire d\'information initiale au propriétaire' },
      { id: 's1_6', label: 'Planifier la visite du logement (J1–J3)' },
    ],
  },
  {
    id: 's2', number: '02', title: 'Visite & Inventaire', timing: 'J1 à J3',
    color: 'orange',
    tasks: [
      { id: 's2_1', label: 'État des lieux d\'entrée contradictoire complet — photos HD + formulaire signé' },
      { id: 's2_2', label: 'Inventaire exhaustif du mobilier et des équipements (avec photos)' },
      { id: 's2_3', label: 'Évaluer les achats nécessaires : mobilier manquant, literie, électroménager, déco' },
      { id: 's2_4', label: 'Vérifier la connexion internet (fibre recommandée — sinon engager démarche)' },
      { id: 's2_5', label: 'Vérification sécurité : détecteur de fumée, extincteur, DPE à jour' },
      { id: 's2_6', label: 'Relever les abonnements en cours (EDF, internet, eau) et leur titulaire' },
      { id: 's2_7', label: 'Récupération des clés (minimum 2 doubles + code accès)' },
    ],
  },
  {
    id: 's3', number: '03', title: 'Administratif & Contractuel', timing: 'J1 à J7',
    color: 'yellow',
    tasks: [
      { id: 's3_1', label: 'Rédiger & envoyer le contrat de sous-location (bail commercial ou contrat spécifique MK)' },
      { id: 's3_2', label: 'Confirmer la signature du contrat avant toute avance de frais', warning: true },
      { id: 's3_3', label: 'Récupérer le RIB du propriétaire pour les virements mensuels du loyer' },
      { id: 's3_4', label: 'Souscrire une assurance sous-location adaptée (ex. Luko, April, Abritel)' },
      { id: 's3_5', label: 'Effectuer la déclaration en mairie si ville réglementée' },
      { id: 's3_6', label: 'Mettre en place le virement automatique mensuel du loyer (date fixe)' },
      { id: 's3_7', label: 'Créer le groupe WhatsApp : propriétaire + équipe MasterKey' },
      { id: 's3_8', label: 'Créer la fiche logement dans l\'application MasterKey (type : Sous-location)' },
    ],
  },
  {
    id: 's4', number: '04', title: 'Installation & Équipement', timing: 'J5 à J14',
    color: 'green',
    tasks: [
      { id: 's4_1', label: 'Acheter et installer le mobilier manquant (lit, canapé, table, rangements…) selon liste standard MK' },
      { id: 's4_2', label: 'Installer la literie complète (matelas, oreillers, couettes qualité hôtellerie)' },
      { id: 's4_3', label: 'Équiper la cuisine (vaisselle, ustensiles, café/thé, cafetière)' },
      { id: 's4_4', label: 'Installer la boîte à clés ou serrure connectée — tester l\'ouverture' },
      { id: 's4_5', label: 'Ouvrir ou transférer l\'abonnement internet (fibre si possible)' },
      { id: 's4_6', label: 'Vérifier l\'abonnement électricité — au nom de MK ou du propriétaire selon accord' },
      { id: 's4_7', label: 'Premier ménage complet de mise en état (logement impeccable avant photos)' },
      { id: 's4_8', label: 'Mise en place du kit voyageur : draps, serviettes, produits d\'accueil' },
      { id: 's4_9', label: 'Prise de photos professionnelles — toutes pièces, mise en scène soignée' },
      { id: 's4_10', label: 'Valider les photos avec le propriétaire', warning: true },
      { id: 's4_11', label: 'Rédiger le livret d\'accueil voyageurs (WiFi, check-in/out, règles, bons plans)' },
    ],
  },
  {
    id: 's5', number: '05', title: 'Création des annonces', timing: 'J14 à J21 — Après contrat signé + photos validées',
    color: 'blue',
    tasks: [
      { id: 's5_1', label: 'Créer la fiche sur Lodgify (titre, description, capacité, équipements, règles maison)' },
      { id: 's5_2', label: 'Définir la tarification de base (prix/nuit, week-end, séjour minimum, caution)' },
      { id: 's5_3', label: 'Activer la tarification dynamique — connecter PriceLabs ou Wheelhouse' },
      { id: 's5_4', label: 'Mapping Airbnb & Booking.com via le channel manager Lodgify' },
      { id: 's5_5', label: 'Ajouter frais de ménage, caution, majorations week-ends & événements' },
      { id: 's5_6', label: 'Mettre en place les messages automatiques voyageurs' },
      { id: 's5_7', label: 'Valider l\'annonce avant mise en ligne (envoyer le lien preview au propriétaire)', warning: true },
    ],
  },
  {
    id: 's6', number: '06', title: 'Équipe ménage', timing: 'J14 à J21',
    color: 'purple',
    tasks: [
      { id: 's6_1', label: 'Créer la fiche logement pour la prestataire (plan, checklist, produits, observations)' },
      { id: 's6_2', label: 'Affecter une femme de ménage dans l\'app MasterKey (Personnel → logement)' },
      { id: 's6_3', label: 'Assigner le logement sur Turno / Lodgify et vérifier les disponibilités' },
      { id: 's6_4', label: 'Briefing sur place avec la prestataire avant la première réservation' },
    ],
  },
  {
    id: 's7', number: '07', title: 'Lancement', timing: 'J21 — Go live !',
    color: 'emerald',
    tasks: [
      { id: 's7_1', label: 'Ajouter le propriétaire sur Lodgify (accès suivi des réservations)' },
      { id: 's7_2', label: 'Ouvrir le planning et activer la visibilité Airbnb & Booking.com' },
      { id: 's7_3', label: 'Vérifier la synchronisation des calendriers' },
      { id: 's7_4', label: 'Confirmer le premier virement du loyer au propriétaire' },
      { id: 's7_5', label: 'Envoyer le message de confirmation de mise en ligne (WhatsApp + lien annonce) ✅' },
      { id: 's7_6', label: 'Mettre le lead en statut "Signé" dans l\'app MasterKey' },
      { id: 's7_7', label: 'Planifier le premier bilan mensuel (J+30) : revenus, taux occupation, satisfaction' },
    ],
  },
]

const PHASE_COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-300' },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400',  badge: 'bg-orange-500/20 text-orange-300' },
  yellow:  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  text: 'text-yellow-400',  badge: 'bg-yellow-500/20 text-yellow-300' },
  green:   { bg: 'bg-green-500/10',   border: 'border-green-500/20',   text: 'text-green-400',   badge: 'bg-green-500/20 text-green-300' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-300' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
}

const STORAGE_KEY = 'mk_onboarding_v2'

function loadSessions(): Record<string, Session[]> {
  if (typeof window === 'undefined') return { conciergerie: [], souslocation: [] }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveSessions(data: Record<string, Session[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PhaseBlock({ phase, checks, onToggle }: {
  phase: Phase
  checks: Record<string, boolean>
  onToggle: (taskId: string) => void
}) {
  const [open, setOpen] = useState(true)
  const colors = PHASE_COLOR_MAP[phase.color]
  const done = phase.tasks.filter(t => checks[t.id]).length
  const total = phase.tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = done === total

  return (
    <div className={`rounded-2xl border ${allDone ? 'border-emerald-500/30 bg-emerald-500/5' : `${colors.border} bg-white/[0.02]`} overflow-hidden transition-all`}>
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${allDone ? 'bg-emerald-500/20 text-emerald-300' : colors.badge}`}>
          Phase {phase.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${allDone ? 'text-emerald-400' : 'text-white'}`}>{phase.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{phase.timing}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {allDone
            ? <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5" />Terminé</span>
            : <span className="text-xs text-gray-400">{done}/{total}</span>
          }
          {/* mini progress bar */}
          <div className="w-16 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : colors.text.replace('text-', 'bg-')}`}
              style={{ width: `${pct}%` }} />
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Tasks */}
      {open && (
        <div className="px-5 pb-4 space-y-2 border-t border-white/[0.04]">
          {phase.tasks.map((task) => {
            const checked = !!checks[task.id]
            return (
              <label key={task.id} className="flex items-start gap-3 py-2 cursor-pointer group">
                <div
                  onClick={() => onToggle(task.id)}
                  className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                    checked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-white/20 group-hover:border-white/40'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={`text-sm leading-relaxed transition-colors ${
                  checked ? 'line-through text-gray-500' : task.warning ? 'text-amber-300' : 'text-gray-300'
                }`}>
                  {task.warning && !checked && <span className="text-amber-400 font-semibold mr-1">⚠️</span>}
                  {task.label}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SessionChecklist({ phases, session, onUpdate }: {
  phases: Phase[]
  session: Session
  onUpdate: (checks: Record<string, boolean>) => void
}) {
  const allTasks = phases.flatMap(p => p.tasks)
  const totalDone = allTasks.filter(t => session.checks[t.id]).length
  const totalTasks = allTasks.length
  const globalPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  const handleToggle = (taskId: string) => {
    onUpdate({ ...session.checks, [taskId]: !session.checks[taskId] })
  }

  const handleReset = () => {
    if (confirm('Réinitialiser toutes les cases pour ce dossier ?'))
      onUpdate({})
  }

  return (
    <div className="space-y-4">
      {/* Global progress */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white font-semibold">{session.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">Créé le {new Date(session.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${globalPct === 100 ? 'text-emerald-400' : 'text-[#D4AF37]'}`}>{globalPct}%</p>
            <p className="text-gray-500 text-xs">{totalDone}/{totalTasks} tâches</p>
          </div>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${globalPct === 100 ? 'bg-emerald-500' : 'bg-[#D4AF37]'}`}
            style={{ width: `${globalPct}%` }}
          />
        </div>
        {globalPct === 100 && (
          <p className="text-emerald-400 text-sm font-semibold mt-2 text-center">🎉 Onboarding terminé — le logement est en ligne !</p>
        )}
      </Card>

      {/* Phases */}
      {phases.map(phase => (
        <PhaseBlock key={phase.id} phase={phase} checks={session.checks} onToggle={handleToggle} />
      ))}

      {/* Reset */}
      <button onClick={handleReset} className="flex items-center gap-2 text-gray-600 hover:text-gray-400 text-xs transition-colors mt-2">
        <RotateCcw className="w-3.5 h-3.5" />Réinitialiser ce dossier
      </button>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [tab, setTab] = useState<'conciergerie' | 'souslocation'>('conciergerie')
  const [allSessions, setAllSessions] = useState<Record<string, Session[]>>({ conciergerie: [], souslocation: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const phases = tab === 'conciergerie' ? PHASES_CONCIERGERIE : PHASES_SOUS_LOCATION
  const sessions = allSessions[tab] ?? []
  const selected = sessions.find(s => s.id === selectedId) ?? sessions[0] ?? null

  useEffect(() => {
    const data = loadSessions()
    setAllSessions({ conciergerie: data.conciergerie ?? [], souslocation: data.souslocation ?? [] })
  }, [])

  // When switching tabs, reset selection
  useEffect(() => { setSelectedId(null) }, [tab])

  const persist = useCallback((next: Record<string, Session[]>) => {
    setAllSessions(next)
    saveSessions(next)
  }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    const session: Session = {
      id: Date.now().toString(),
      name: newName.trim(),
      createdAt: new Date().toISOString(),
      checks: {},
    }
    const next = { ...allSessions, [tab]: [session, ...(allSessions[tab] ?? [])] }
    persist(next)
    setSelectedId(session.id)
    setNewName('')
    setNewModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce dossier d\'onboarding ?')) return
    const next = { ...allSessions, [tab]: (allSessions[tab] ?? []).filter(s => s.id !== id) }
    persist(next)
    if (selected?.id === id) setSelectedId(null)
  }

  const handleUpdate = (checks: Record<string, boolean>) => {
    const next = {
      ...allSessions,
      [tab]: (allSessions[tab] ?? []).map(s => s.id === selected?.id ? { ...s, checks } : s),
    }
    persist(next)
  }

  const activeSession = selected ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding</h1>
          <p className="text-gray-400 mt-1">Checklist de A à Z pour chaque nouveau logement</p>
        </div>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="w-4 h-4" />Nouveau dossier
        </Button>
      </div>

      {/* Type tabs */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-1 w-fit">
        {([['conciergerie', 'Conciergerie'], ['souslocation', 'Sous-location']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Session list */}
        <div className="xl:col-span-1 space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-wider px-1 mb-3">Dossiers ({sessions.length})</p>
          {sessions.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/[0.08]">
              <ClipboardList className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucun dossier</p>
              <button onClick={() => setNewModalOpen(true)} className="text-[#D4AF37] text-xs mt-2 hover:underline">
                Créer le premier →
              </button>
            </div>
          ) : (
            sessions.map(session => {
              const allTasks = phases.flatMap(p => p.tasks)
              const done = allTasks.filter(t => session.checks[t.id]).length
              const pct = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0
              const isSelected = (activeSession?.id === session.id)
              return (
                <div key={session.id}
                  onClick={() => setSelectedId(session.id)}
                  className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>{session.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{pct}% — {done}/{allTasks.length}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(session.id) }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-[#D4AF37]'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Checklist */}
        <div className="xl:col-span-3">
          {activeSession ? (
            <SessionChecklist phases={phases} session={activeSession} onUpdate={handleUpdate} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-white/[0.08] text-center">
              <ClipboardList className="w-10 h-10 text-gray-600 mb-4" />
              <p className="text-gray-400 text-sm mb-1">Sélectionnez un dossier ou créez-en un nouveau</p>
              <p className="text-gray-600 text-xs">{phases.reduce((s, p) => s + p.tasks.length, 0)} tâches réparties en {phases.length} phases</p>
              <Button onClick={() => setNewModalOpen(true)} className="mt-4">
                <Plus className="w-4 h-4" />Nouveau dossier
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New session modal */}
      <Modal isOpen={newModalOpen} onClose={() => setNewModalOpen(false)} title="Nouveau dossier d'onboarding">
        <div className="space-y-4">
          <Input
            label={`Nom du prospect ou adresse du logement`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={tab === 'conciergerie' ? 'Ex : M. Dupont — 12 rue de Nancy' : 'Ex : Studio Ligny — M. Martin'}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setNewModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

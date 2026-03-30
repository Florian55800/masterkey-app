/**
 * seed-guide-larochelle.js
 * Crée un livret d'accueil complet pour le logement de La Rochelle.
 * Usage : docker exec masterkey-app node scripts/seed-guide-larochelle.js
 */

const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')

async function seed() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    console.error('[seed] Pas de TURSO_DATABASE_URL — arrêt.')
    process.exit(1)
  }

  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  const client = createClient({ url: httpUrl, authToken: process.env.TURSO_AUTH_TOKEN || '' })

  // ── 1. Trouver le logement La Rochelle ───────────────────────────────────
  const rsProps = await client.execute(
    `SELECT id, name, city FROM Property WHERE lower(city) LIKE '%rochelle%' LIMIT 1`
  )
  if (!rsProps.rows.length) {
    console.error('[seed] Aucun logement trouvé avec "rochelle" dans la ville.')
    client.close()
    process.exit(1)
  }
  const prop = { id: rsProps.rows[0][0], name: rsProps.rows[0][1], city: rsProps.rows[0][2] }
  console.log(`[seed] Logement trouvé : "${prop.name}" (id=${prop.id}, ville=${prop.city})`)

  // ── 2. Données du livret ─────────────────────────────────────────────────
  const houseRules = JSON.stringify([
    'Respectez le silence entre 22h et 8h',
    'Pas de fêtes ni d\'événements sans accord préalable',
    'Non-fumeur à l\'intérieur (balcon/extérieur autorisé)',
    'Les animaux de compagnie ne sont pas acceptés',
    'Merci de laisser le logement propre et rangé',
    'Triez vos déchets dans les poubelles prévues',
    'Éteignez les lumières et climatisation en partant',
    'Remettez les clés dans la boîte à clés à votre départ',
  ])

  const restaurants = JSON.stringify([
    {
      name: 'Christopher Coutanceau',
      category: 'Français',
      description: 'Restaurant doublement étoilé Michelin, spécialisé dans les produits de la mer. Une expérience gastronomique exceptionnelle avec vue sur l\'Atlantique.',
      address: 'Plage de la Concurrence, 17000 La Rochelle',
    },
    {
      name: 'Iséo',
      category: 'Autre',
      description: 'Bistrot créatif mêlant gastronomie française et influences asiatiques, avec d\'excellents poissons frais et une ambiance conviviale.',
      address: '4 Place de la Chaîne, 17000 La Rochelle',
    },
    {
      name: 'Le Panier de Crabes',
      category: 'Français',
      description: 'Spécialiste des fruits de mer avec huîtres, bulots et plateaux de la mer préparés selon la tradition charentaise.',
      address: '9 Place de la Fourche, 17000 La Rochelle',
    },
    {
      name: 'La Malette',
      category: 'Français',
      description: 'Restaurant intime très bien noté, reconnu pour ses plateaux de fruits de mer de qualité et sa belle sélection de vins.',
      address: 'Derrière le théâtre La Coursive, 17000 La Rochelle',
    },
    {
      name: 'Dijo',
      category: 'Français',
      description: 'Fine dining avec des plats français parfaitement exécutés — le canard rôti et les desserts sont particulièrement remarquables. Noté 4,9/5.',
      address: 'Centre-ville, La Rochelle',
    },
    {
      name: 'La Yole de Chris',
      category: 'Français',
      description: 'L\'adresse décontractée de Christopher Coutanceau, avec un comptoir de préparation de poissons et une terrasse face à l\'Atlantique.',
      address: 'Plage de la Concurrence, 17000 La Rochelle',
    },
    {
      name: 'Le Tout du Cru',
      category: 'Français',
      description: 'Restaurant de poissons et fruits de mer réputé pour la fraîcheur irréprochable de ses produits et la qualité de son service.',
      address: 'Centre-ville, La Rochelle',
    },
  ])

  const activities = JSON.stringify([
    {
      name: 'Le Vieux-Port',
      category: 'Culture',
      description: 'Le cœur de La Rochelle avec ses célèbres tours médiévales, ses façades colorées et ses restaurants sur le quai. Idéal le soir au coucher du soleil.',
    },
    {
      name: 'Tours médiévales (Tour Saint-Nicolas, Tour de la Chaîne, Tour de la Lanterne)',
      category: 'Culture',
      description: 'Trois tours du XIIe-XVe siècle offrant une vue panoramique sur le port et la ville. La Tour de la Lanterne est l\'un des plus vieux phares de l\'Atlantique.',
    },
    {
      name: 'Aquarium de La Rochelle',
      category: 'Famille',
      description: 'L\'un des plus beaux aquariums d\'Europe avec 3 millions de litres d\'eau et plus de 12 000 animaux marins. Incontournable en famille.',
    },
    {
      name: 'Île de Ré en bateau',
      category: 'Nature',
      description: 'Traversée en ferry depuis le Vieux-Port (1h). Louez un vélo sur l\'île pour découvrir ses marais salants, ses vignobles et ses plages préservées.',
    },
    {
      name: 'Musée du Nouveau Monde',
      category: 'Culture',
      description: 'Installé dans l\'hôtel Fleuriau, ce musée retrace l\'histoire du commerce colonial et les liens de La Rochelle avec les Amériques.',
    },
    {
      name: 'Le Quartier du Gabut',
      category: 'Culture',
      description: 'Charmant quartier avec ses maisons en bois de style scandinave, ses fresques murales, ses galeries d\'art et ses boutiques créatives.',
    },
    {
      name: 'Sports nautiques — Plage de la Concurrence',
      category: 'Sport',
      description: 'Kayak, paddle, windsurf, kitesurf, voile — tous les équipements à louer sur place avec moniteurs disponibles.',
    },
    {
      name: 'Balade dans le centre historique',
      category: 'Culture',
      description: 'Parcourez les galeries couvertes, la Grosse Horloge, la place des Petits-Bancs et les ruelles médiévales. La Rochelle est surnommée la "Ville Blanche".',
    },
  ])

  const customSections = JSON.stringify([
    {
      title: '🚲 Se déplacer à La Rochelle',
      content: 'La Rochelle est une ville très cyclable ! Les vélos "Yélo" sont disponibles en libre-service dans toute la ville (abonnement à la journée disponible). Le centre historique est entièrement piéton — laissez la voiture et profitez !',
    },
    {
      title: '🛒 Faire ses courses',
      content: 'Le marché central (Marché des Grands-Moulins) est ouvert tous les matins jusqu\'à 13h. Supermarché Monoprix en centre-ville et Leclerc à 10 min.',
    },
    {
      title: '🏥 Urgences & infos pratiques',
      content: 'CHU de La Rochelle : 05 46 45 50 50. Pharmacie de nuit : Pharmacie Saint-Nicolas. Taxi : 05 46 41 55 55.',
    },
  ])

  const now = new Date().toISOString()
  const shareToken = randomUUID().replace(/-/g, '')

  // ── 3. Insérer ou mettre à jour le livret ────────────────────────────────
  const rsExisting = await client.execute({
    sql: `SELECT id FROM WelcomeGuide WHERE propertyId = ?`,
    args: [prop.id],
  })

  if (rsExisting.rows.length) {
    const guideId = rsExisting.rows[0][0]
    await client.execute({
      sql: `UPDATE WelcomeGuide SET
        welcomeMessage = ?,
        checkIn = ?,
        checkOut = ?,
        houseRules = ?,
        restaurants = ?,
        activities = ?,
        customSections = ?,
        updatedAt = ?
        WHERE id = ?`,
      args: [
        `Bienvenue à La Rochelle ! 🌊\n\nNous espérons que votre séjour dans ce logement sera des plus agréables. La Rochelle est une ville magnifique — profitez du Vieux-Port, des îles, des fruits de mer et du soleil charentais ! N'hésitez pas à nous contacter si vous avez la moindre question.`,
        '15h00',
        '11h00',
        houseRules,
        restaurants,
        activities,
        customSections,
        now,
        guideId,
      ],
    })
    console.log(`[seed] Livret mis à jour (id=${guideId}) pour "${prop.name}"`)
  } else {
    await client.execute({
      sql: `INSERT INTO WelcomeGuide
        (propertyId, shareToken, welcomeMessage, checkIn, checkOut, houseRules, restaurants, activities, customSections, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        prop.id,
        shareToken,
        `Bienvenue à La Rochelle ! 🌊\n\nNous espérons que votre séjour dans ce logement sera des plus agréables. La Rochelle est une ville magnifique — profitez du Vieux-Port, des îles, des fruits de mer et du soleil charentais ! N'hésitez pas à nous contacter si vous avez la moindre question.`,
        '15h00',
        '11h00',
        houseRules,
        restaurants,
        activities,
        customSections,
        now,
        now,
      ],
    })
    console.log(`[seed] Livret créé pour "${prop.name}" — token: ${shareToken}`)
  }

  // ── 4. Récupérer le token final ──────────────────────────────────────────
  const rsFinal = await client.execute({
    sql: `SELECT shareToken FROM WelcomeGuide WHERE propertyId = ?`,
    args: [prop.id],
  })
  const token = rsFinal.rows[0][0]
  console.log(`\n✅ Livret prêt ! Lien voyageur :`)
  console.log(`   http://51.210.247.74:3000/bienvenue/${token}\n`)
  console.log(`ℹ️  Pensez à compléter dans l'admin : WiFi, code boîte à clés, photos.`)

  client.close()
}

seed().catch(e => { console.error(e); process.exit(1) })

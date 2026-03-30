/**
 * seed-guide-larochelle.js  (renommé mais gère toutes les villes)
 * Crée un livret d'accueil complet pour CHAQUE logement enregistré.
 * Usage : docker exec masterkey-app node scripts/seed-guide-larochelle.js
 */

const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')

// ─── Données par ville ────────────────────────────────────────────────────────

const CITY_DATA = {

  // ── NANCY ──────────────────────────────────────────────────────────────────
  nancy: {
    welcomeMessage: `Bienvenue à Nancy ! ✨\n\nNous espérons que votre séjour sera inoubliable dans cette magnifique ville. Nancy est la capitale de l'Art Nouveau et abrite la célèbre Place Stanislas, classée au Patrimoine mondial de l'UNESCO. N'hésitez pas à nous contacter si vous avez besoin de quoi que ce soit — bonne découverte !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'Brasserie L\'Excelsior', category: 'Brasserie', description: 'Brasserie Art Nouveau historique avec une belle vitrine de fruits de mer et une cuisine française traditionnelle. Décor classé, ambiance unique.', address: '50 rue Henri Poincaré, 54000 Nancy' },
      { name: 'Le V-Four', category: 'Français', description: 'Restaurant gastronomique avec une cuisine créative et raffinée, menus dégustation et accord mets-vins dans le cœur historique de Nancy.', address: '10 rue Saint-Michel, 54000 Nancy' },
      { name: 'La Gentilhommière', category: 'Français', description: 'Cuisine française classique avec des influences internationales, accompagnée d\'une belle sélection de vins de Bordeaux et Bourgogne.', address: 'Nancy centre' },
      { name: 'Le Bouche à Oreille', category: 'Brasserie', description: 'Bistrot très bien noté, cuisine traditionnelle française dans une ambiance chaleureuse à deux pas de la Place Stanislas.', address: 'Nancy centre' },
      { name: 'Chez Suzette', category: 'Brasserie', description: 'Café-bistrot servant les spécialités lorraines : quiche lorraine, mirabelle, bœuf braisé. Idéal pour découvrir la cuisine locale.', address: 'Nancy centre' },
      { name: 'L\'Ardoise', category: 'Français', description: 'Cuisine française contemporaine avec des produits de saison, ardoise qui change régulièrement selon le marché.', address: 'Nancy centre' },
    ],
    activities: [
      { name: 'Place Stanislas', category: 'Culture', description: 'L\'une des plus belles places d\'Europe, classée UNESCO. Fontaines baroques, grilles dorées signées Jean Lamour et Hôtel de Ville. Magique de jour comme de nuit.' },
      { name: 'Musée de l\'École de Nancy', category: 'Musée', description: 'Chef-d\'œuvre de l\'Art Nouveau dans la maison d\'Eugène Corbin. Verreries de Gallé, meubles de Majorelle — une plongée dans le mouvement qui a fait la réputation de Nancy.' },
      { name: 'Villa Majorelle', category: 'Musée', description: 'La maison de Louis Majorelle, figure majeure de l\'Art Nouveau, entièrement restaurée. Un bijou architectural à ne pas manquer.' },
      { name: 'Porte de la Craffe', category: 'Culture', description: 'Porte médiévale du XIVe siècle avec ses deux tours coniques, plus ancienne fortification de Nancy. Ancienne prison royale.' },
      { name: 'Jardin de la Pépinière', category: 'Nature', description: 'Grand parc en plein cœur de la ville avec paons, roseraie, et pavillons Art Nouveau. Le poumon vert de Nancy, parfait pour une balade.' },
      { name: 'Musée des Beaux-Arts', category: 'Musée', description: 'L\'un des plus anciens musées de France (1793), installé dans un pavillon de la Place Stanislas. Collections de Rubens, Delacroix, Monet et Modigliani.' },
    ],
    customSections: [
      { title: '🚌 Se déplacer à Nancy', content: 'Le tramway couvre tout le centre-ville. Les stations Vélostan (vélos en libre-service) sont disponibles partout. La Place Stanislas est à 10 min à pied de la gare.' },
      { title: '🛒 Faire ses courses', content: 'Marché central sous la Grande Halle (mar, jeu, sam matin). Monoprix et nombreuses boutiques en centre-ville. Spécialités à rapporter : bergamotes de Nancy, mirabelle, macarons de Nancy.' },
      { title: '🚗 Excursions depuis Nancy', content: 'Metz (55 km, 40 min) • Épinal (70 km) • Pont-à-Mousson (30 km, superbe abbaye) • Verdun (130 km, sites mémoriaux WWI).' },
    ],
  },

  // ── METZ ──────────────────────────────────────────────────────────────────
  metz: {
    welcomeMessage: `Bienvenue à Metz ! 🌟\n\nNous sommes ravis de vous accueillir dans cette ville d'art et d'histoire. Metz abrite la cathédrale aux vitraux de Chagall, le Centre Pompidou et l'une des plus belles vieilles villes de France. Profitez bien de votre séjour !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'Le Bistrot de G', category: 'Brasserie', description: 'Bistrot chic et tendance près de la cathédrale, cuisine française authentique avec un décor inspiré de l\'École de Nancy. Ouvert depuis 1989.', address: '9 rue du Faisan, 57000 Metz' },
      { name: 'Le P\'tit Frontalier', category: 'Français', description: 'Restaurant de saison avec produits locaux frais, spécialités lorraines comme la quiche et la potée. Ambiance conviviale et accueil chaleureux.', address: 'Metz centre' },
      { name: 'Villa Preziosa', category: 'Italien', description: 'Meilleur restaurant italien de Metz selon les avis (4,7/5). Pizzas authentiques et pâtes fraîches dans un cadre élégant.', address: 'Metz centre' },
      { name: 'Le Magasin aux Vivres', category: 'Français', description: 'Restaurant gastronomique étoilé Michelin dans un cadre historique, cuisine créative mettant en valeur les produits du terroir lorrain.', address: 'Arsenal, Metz' },
      { name: 'La Lanterne', category: 'Brasserie', description: 'Brasserie conviviale proposant des plats généreux et une belle sélection de bières locales en bord de Moselle.', address: 'Metz centre' },
      { name: 'Noisette', category: 'Français', description: 'Cuisine bistronomique inventive, ardoise qui évolue selon les saisons. Terrasse agréable l\'été.', address: 'Metz centre' },
    ],
    activities: [
      { name: 'Cathédrale Saint-Étienne', category: 'Culture', description: 'L\'une des plus hautes cathédrales gothiques d\'Europe (42 m) avec 6 500 m² de vitraux dont des œuvres de Chagall. Surnommée "La Lanterne du Bon Dieu".' },
      { name: 'Centre Pompidou-Metz', category: 'Musée', description: 'Musée d\'art contemporain au toit en forme de chapeau chinois signé Shigeru Ban. L\'une des plus grandes collections d\'art du XXe siècle hors Paris.' },
      { name: 'Temple Neuf', category: 'Culture', description: 'Église néo-romane (1901) sur l\'île du Petit-Saulcy, magnifique reflet dans la Moselle au coucher du soleil. Vue iconique de Metz.' },
      { name: 'Porte des Allemands', category: 'Culture', description: 'Dernier pont-château fort de France, chef-d\'œuvre de l\'architecture médiévale militaire. Vue spectaculaire sur la Seille.' },
      { name: 'Musée de la Cour d\'Or', category: 'Musée', description: 'Thermes romains, sanctuaire mithriaque, grenier gothique... Un voyage à travers 2 000 ans d\'histoire messine dans un cadre exceptionnel.' },
      { name: 'Place Saint-Louis', category: 'Culture', description: 'Place médiévale entourée d\'arcades du XIVe siècle, restaurants en terrasse et marché régulier. Le cœur animé du vieux Metz.' },
    ],
    customSections: [
      { title: '🚌 Se déplacer à Metz', content: 'Le centre historique est entièrement piéton. Bus et tramway couvrent la ville. Metz est à 55 min de Nancy et 1h15 de Luxembourg en train.' },
      { title: '🛒 Spécialités lorraines à rapporter', content: 'Quiche lorraine, mirabelle (eau-de-vie, confiture, bonbons), bergamotes, dragées, macarons. Marché couvert de Metz (rue Winston Churchill).' },
      { title: '🚗 Excursions depuis Metz', content: 'Luxembourg (60 km) • Nancy (55 km) • Verdun (80 km, sites mémoriaux WWI) • Moselle viticole et Thionville (30 km).' },
    ],
  },

  // ── BAR-LE-DUC ────────────────────────────────────────────────────────────
  'bar-le-duc': {
    welcomeMessage: `Bienvenue à Bar-le-Duc ! 🏛️\n\nNous sommes heureux de vous accueillir dans cette ville chargée d\'histoire, ancienne capitale des ducs de Bar. Vous découvrirez une ville authentique avec son centre historique préservé et sa fameuse confiture de groseilles. Belle découverte !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'Le Bistrot du Château', category: 'Français', description: 'Restaurant convivial au cœur de Bar-le-Duc, cuisine traditionnelle lorraine avec spécialités locales et produits du terroir.', address: 'Bar-le-Duc centre' },
      { name: 'La Côte d\'Or', category: 'Brasserie', description: 'Brasserie incontournable avec ses plats généreux, sa terrasse en été et sa belle sélection de vins de la région.', address: 'Bar-le-Duc centre' },
      { name: 'Le Ragueneau', category: 'Français', description: 'Restaurant traditionnel apprécié des locaux pour sa cuisine maison et son ambiance familiale.', address: 'Bar-le-Duc' },
      { name: 'La Bonne Franquette', category: 'Brasserie', description: 'Cuisine du terroir lorrain dans un cadre chaleureux, idéal pour découvrir les saveurs locales comme le fromage de Meuse et le porc.', address: 'Bar-le-Duc' },
      { name: 'Pizzeria San Marco', category: 'Pizza', description: 'Pizzeria populaire avec une grande variété de pizzas cuites au feu de bois, idéale pour un repas convivial.', address: 'Bar-le-Duc' },
    ],
    activities: [
      { name: 'Haute-Ville (Ville Haute)', category: 'Culture', description: 'Centre historique classé avec ses hôtels particuliers Renaissance du XVe-XVIe siècle. Une architecture remarquable conservée intacte. Balade incontournable.' },
      { name: 'Confiture de groseilles épépinées', category: 'Shopping', description: 'La confiture emblématique de Bar-le-Duc, épépinée à la plume d\'oie. À acheter chez les confiseurs locaux — une tradition depuis le XIVe siècle.' },
      { name: 'Musée Barrois', category: 'Musée', description: 'Musée d\'art et d\'archéologie dans le château des ducs de Bar. Collections de peintures, sculptures et objets retraçant l\'histoire de la région.' },
      { name: 'Verdun et ses champs de bataille (50 km)', category: 'Culture', description: 'L\'une des batailles les plus importantes de la WWI. Ossuaire de Douaumont, forts de Vaux et Douaumont, mémorial de Verdun. Journée mémorielle exceptionnelle.' },
      { name: 'Lac de Madine (40 km)', category: 'Nature', description: 'Grand lac artificiel de 1 100 ha avec plages aménagées, voile, kayak, location de vélos. Parfait pour une demi-journée de détente en nature.' },
      { name: 'Voie Sacrée (CD 1916)', category: 'Culture', description: 'Route historique de la 1ère Guerre Mondiale qui reliait Bar-le-Duc à Verdun pour ravitailler le front. Bornes kilométriques et monuments jalonnent le parcours.' },
    ],
    customSections: [
      { title: '🛒 Spécialités à ramener', content: 'La confiture de groseilles épépinées à la plume d\'oie est la spécialité unique de Bar-le-Duc (labelisée "Goût de France"). Disponible chez Dutriez et autres artisans du centre-ville.' },
      { title: '🚗 Excursions depuis Bar-le-Duc', content: 'Verdun (50 km) • Nancy (75 km) • Saint-Mihiel et son ossuaire (40 km) • Lac de Madine (40 km) • Ligny-en-Barrois (15 km).' },
    ],
  },

  // ── LIGNY-EN-BARROIS ──────────────────────────────────────────────────────
  'ligny-en-barrois': {
    welcomeMessage: `Bienvenue à Ligny-en-Barrois ! 🌿\n\nNous sommes ravis de vous accueillir dans ce charmant bourg de la Meuse, idéalement situé pour explorer la région Lorraine. Bar-le-Duc (15 km) et ses sites historiques sont à portée de main. Profitez du calme et de l\'authenticité de la région !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'L\'Auberge du Cheval Blanc', category: 'Français', description: 'Auberge traditionnelle lorraine avec cuisine du terroir, ambiance authentique et accueil chaleureux.', address: 'Ligny-en-Barrois' },
      { name: 'La Table du Lion d\'Or', category: 'Brasserie', description: 'Restaurant convivial proposant des plats généreux et une cuisine traditionnelle appréciée des locaux.', address: 'Ligny-en-Barrois' },
      { name: 'Pizzeria Les Oliviers', category: 'Pizza', description: 'Pizzeria familiale idéale pour un repas simple et savoureux en soirée.', address: 'Ligny-en-Barrois' },
      { name: 'Le Bistrot de Ligny', category: 'Brasserie', description: 'Brasserie de quartier pour déjeuner avec des plats du jour à base de produits locaux.', address: 'Ligny-en-Barrois' },
      { name: 'Restaurants de Bar-le-Duc (15 km)', category: 'Français', description: 'La ville voisine de Bar-le-Duc offre une plus large sélection de restaurants — à 15 min en voiture.', address: 'Bar-le-Duc' },
    ],
    activities: [
      { name: 'Bar-le-Duc — Haute-Ville (15 km)', category: 'Culture', description: 'La ville voisine avec son exceptionnel centre historique Renaissance, la confiture de groseilles et le Musée Barrois. À 15 min.' },
      { name: 'Verdun et ses mémoriaux (55 km)', category: 'Culture', description: 'Sites de la Grande Guerre — Ossuaire de Douaumont, Fort de Vaux, Mémorial de Verdun. Une journée de mémoire incontournable.' },
      { name: 'Lac de Madine (50 km)', category: 'Nature', description: 'Grand lac artificiel avec plages, activités nautiques, vélos, balnéothérapie. Idéal pour une journée de détente en pleine nature.' },
      { name: 'Saint-Mihiel et le saillant (45 km)', category: 'Culture', description: 'Ville sur la Meuse avec l\'ossuaire américain, la bibliothèque bénédictine et la sculpture de Ligier Richier.' },
      { name: 'Voie Sacrée historique', category: 'Culture', description: 'Parcourez la route qui ravitaillait Verdun pendant la Première Guerre Mondiale, jalonnée de bornes kilométriques.' },
      { name: 'Nancy (75 km)', category: 'Culture', description: 'La grande capitale de la Lorraine avec la Place Stanislas (UNESCO), les musées Art Nouveau et le centre historique. En voiture ou en train.' },
    ],
    customSections: [
      { title: '🚗 Transports', content: 'Ligny-en-Barrois est bien desservi depuis Bar-le-Duc (15 km). Voiture recommandée pour explorer la région. Gare de Bar-le-Duc (TGV Paris en 1h30).' },
      { title: '🛒 Commerces et ravitaillement', content: 'Commerces de proximité dans le centre de Ligny. Grand choix à Bar-le-Duc (15 km) avec supermarchés et marché.' },
    ],
  },

  // ── COMMERCY ─────────────────────────────────────────────────────────────
  commercy: {
    welcomeMessage: `Bienvenue à Commercy ! 🍪\n\nBienvenue dans la ville natale de la célèbre madeleine ! Commercy, au bord de la Meuse, est une ville pleine de charme avec son château de Stanislas et son histoire gourmande. Régalez-vous et profitez de la région !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'La Bonne Auberge', category: 'Français', description: 'Auberge traditionnelle proposant une cuisine lorraine généreuse avec des produits locaux. Idéal pour une soirée authentique.', address: 'Commercy centre' },
      { name: 'Le Château', category: 'Français', description: 'Restaurant dans un cadre historique, cuisine soignée et spécialités régionales dans une ambiance raffinée.', address: 'Commercy' },
      { name: 'La Terrasse', category: 'Brasserie', description: 'Brasserie conviviale avec terrasse en bord de Meuse, idéale pour déjeuner en admirant le paysage.', address: 'Commercy' },
      { name: 'Pizzeria de la Meuse', category: 'Pizza', description: 'Pizzeria familiale avec pizzas généreuses, pâtes et salades. Bonne option pour un dîner simple et savoureux.', address: 'Commercy' },
      { name: 'Restaurants de Saint-Mihiel (20 km)', category: 'Français', description: 'La ville voisine sur la Meuse avec quelques bons restaurants et une ambiance historique.', address: 'Saint-Mihiel' },
    ],
    activities: [
      { name: 'Château de Commercy (Palais Stanislas)', category: 'Culture', description: 'L\'ancienne résidence d\'été du duc Stanislas Leszczynski. Architecture classique du XVIIIe siècle, maintenant occupé par un régiment militaire — extérieur visible.' },
      { name: 'La Madeleine de Commercy', category: 'Shopping', description: 'La vraie madeleine de Commercy, née au XVIIIe siècle ! À acheter dans les boulangeries et pâtisseries locales. Plus moelleuse et dorée que partout ailleurs.' },
      { name: 'Verdun et les champs de bataille (45 km)', category: 'Culture', description: 'Sites mémoriaux de la Grande Guerre à 45 min. Ossuaire de Douaumont, forts, mémorial — une expérience historique profonde.' },
      { name: 'Balade sur la Meuse', category: 'Nature', description: 'La Meuse traverse la ville — sentiers de randonnée le long de la rivière, pêche, observation des oiseaux dans un cadre paisible.' },
      { name: 'Saint-Mihiel (20 km)', category: 'Culture', description: 'Ville historique sur la Meuse avec l\'ossuaire américain de la WWI, la bibliothèque bénédictine et la sculpture du Sépulcre de Ligier Richier.' },
      { name: 'Nancy (80 km)', category: 'Culture', description: 'Capital de la Lorraine avec la Place Stanislas (UNESCO), les musées Art Nouveau et le centre historique. En voiture en 1h.' },
    ],
    customSections: [
      { title: '🍪 La Madeleine de Commercy', content: 'Commercy est le berceau de la vraie madeleine française ! Achetez-les fraîches en boulangerie — elles se conservent 1 semaine. Les meilleures maisons : Père Stanislas et Jeanniot.' },
      { title: '🚗 Transports & excursions', content: 'Verdun (45 km) • Nancy (80 km) • Bar-le-Duc (40 km) • Saint-Mihiel (20 km). Voiture fortement recommandée. Gare de Commercy (connexion Bar-le-Duc).' },
    ],
  },

  // ── SAINT-DIZIER ──────────────────────────────────────────────────────────
  'saint-dizier': {
    welcomeMessage: `Bienvenue à Saint-Dizier ! 🦅\n\nNous sommes heureux de vous accueillir dans cette ville dynamique de Haute-Marne. Saint-Dizier est la porte d\'entrée du lac du Der, l\'un des plus grands lacs artificiels d\'Europe et un paradis pour la nature et les oiseaux migrateurs. Profitez !`,
    checkIn: '15h00',
    checkOut: '11h00',
    restaurants: [
      { name: 'Le Gambetta', category: 'Français', description: 'Restaurant traditionnel apprécié pour sa cuisine du terroir champenois, ses plats généreux et son service chaleureux.', address: 'Saint-Dizier centre' },
      { name: 'La Forge', category: 'Brasserie', description: 'Brasserie moderne avec une belle sélection de bières artisanales et des plats copieux. Clin d\'œil à l\'histoire métallurgique de la ville.', address: 'Saint-Dizier' },
      { name: 'L\'Auberge de la Forêt', category: 'Français', description: 'Cuisine familiale et généreuse dans un cadre verdoyant aux portes de la ville. Idéal après une journée au lac du Der.', address: 'Environs de Saint-Dizier' },
      { name: 'La Marguerite', category: 'Brasserie', description: 'Café-restaurant convivial en centre-ville, menu du jour à prix doux, terrasse appréciée en saison.', address: 'Saint-Dizier' },
      { name: 'Pizzeria Napoli', category: 'Pizza', description: 'Pizzeria animée avec une large carte, service rapide et pizzas généreuses. Très appréciée en famille.', address: 'Saint-Dizier' },
    ],
    activities: [
      { name: 'Lac du Der-Chantecoq (30 km)', category: 'Nature', description: 'L\'un des plus grands lacs artificiels d\'Europe (4 800 ha). Plages, voile, pêche, vélo autour du lac. Célèbre pour la migration des grues cendrées (oct-nov) : 60 000 oiseaux !' },
      { name: 'Observation des Grues cendrées au Der', category: 'Nature', description: 'Chaque automne (oct-nov), le lac du Der accueille jusqu\'à 60 000 grues cendrées en migration. Spectacle naturel unique en Europe, visible depuis les observatoires.' },
      { name: 'Village de Sainte-Marie-du-Lac-Nuisement', category: 'Culture', description: 'Village reconstitué à la lisière du lac du Der, avec son église et ses maisons à pans de bois typiques de la Champagne humide.' },
      { name: 'Musée municipal de Saint-Dizier', category: 'Musée', description: 'Collections archéologiques, beaux-arts et histoire locale retraçant le passé métallurgique et industriel de la région.' },
      { name: 'Voie verte du Der (vélo)', category: 'Sport', description: 'Piste cyclable aménagée de 80 km autour du lac du Der. Location de vélos disponible sur place pour explorer ce paysage champêtre unique.' },
      { name: 'Bar-le-Duc (40 km)', category: 'Culture', description: 'Ville historique avec sa Haute-Ville Renaissance et sa célèbre confiture de groseilles. À 40 min en voiture.' },
    ],
    customSections: [
      { title: '🦅 Lac du Der — Le must absolu', content: 'À seulement 30 min de Saint-Dizier, le lac du Der est un incontournable. En automne, la migration des grues cendrées est un spectacle unique au monde. En été, plages et sports nautiques. En vélo, le tour du lac (80 km) est magnifique.' },
      { title: '🚗 Transports & excursions', content: 'Lac du Der (30 km) • Bar-le-Duc (40 km) • Chaumont (60 km) • Troyes (100 km, capitale des outlets de mode). Voiture recommandée.' },
    ],
  },
}

function getCityData(city) {
  if (!city) return null
  const key = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (key.includes('nancy')) return CITY_DATA.nancy
  if (key.includes('metz')) return CITY_DATA.metz
  if (key.includes('bar') && key.includes('duc')) return CITY_DATA['bar-le-duc']
  if (key.includes('ligny')) return CITY_DATA['ligny-en-barrois']
  if (key.includes('commercy')) return CITY_DATA.commercy
  if (key.includes('saint') && key.includes('dizier') || key.includes('st') && key.includes('dizier')) return CITY_DATA['saint-dizier']
  return null
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function seed() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) { console.error('[seed] Pas de TURSO_DATABASE_URL'); process.exit(1) }

  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  const client = createClient({ url: httpUrl, authToken: process.env.TURSO_AUTH_TOKEN || '' })

  const rsProps = await client.execute(`SELECT id, name, city FROM Property ORDER BY id`)
  console.log(`\n[seed] ${rsProps.rows.length} logement(s) trouvé(s)\n`)

  const results = []

  for (const row of rsProps.rows) {
    const prop = { id: row[0], name: row[1], city: row[2] }
    const data = getCityData(prop.city)

    if (!data) {
      console.log(`⚠️  Pas de données pour la ville "${prop.city}" (logement: "${prop.name}") — ignoré`)
      continue
    }

    const now = new Date().toISOString()
    const shareToken = randomUUID().replace(/-/g, '')

    const rsExisting = await client.execute({ sql: `SELECT id, shareToken FROM WelcomeGuide WHERE propertyId = ?`, args: [prop.id] })

    if (rsExisting.rows.length) {
      const guideId = rsExisting.rows[0][0]
      const existingToken = rsExisting.rows[0][1]
      await client.execute({
        sql: `UPDATE WelcomeGuide SET welcomeMessage=?, checkIn=?, checkOut=?, houseRules=?, restaurants=?, activities=?, customSections=?, updatedAt=? WHERE id=?`,
        args: [
          data.welcomeMessage, data.checkIn, data.checkOut,
          JSON.stringify(data.houseRules || defaultRules()),
          JSON.stringify(data.restaurants),
          JSON.stringify(data.activities),
          JSON.stringify(data.customSections),
          now, guideId,
        ],
      })
      console.log(`✅ Mis à jour  : "${prop.name}" (${prop.city})`)
      results.push({ name: prop.name, city: prop.city, token: existingToken })
    } else {
      await client.execute({
        sql: `INSERT INTO WelcomeGuide (propertyId, shareToken, welcomeMessage, checkIn, checkOut, houseRules, restaurants, activities, customSections, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          prop.id, shareToken, data.welcomeMessage, data.checkIn, data.checkOut,
          JSON.stringify(data.houseRules || defaultRules()),
          JSON.stringify(data.restaurants),
          JSON.stringify(data.activities),
          JSON.stringify(data.customSections),
          now, now,
        ],
      })
      console.log(`✅ Créé        : "${prop.name}" (${prop.city})`)
      results.push({ name: prop.name, city: prop.city, token: shareToken })
    }
  }

  console.log('\n─────────────────────────────────────────────────')
  console.log('🔗 LIENS VOYAGEURS :')
  for (const r of results) {
    console.log(`\n   ${r.name} (${r.city})`)
    console.log(`   → http://51.210.247.74:3000/bienvenue/${r.token}`)
  }
  console.log('\nℹ️  Ajoutez WiFi, code boîte à clés et photos depuis /livrets dans l\'admin.\n')

  client.close()
}

function defaultRules() {
  return [
    'Respectez le silence entre 22h et 8h',
    'Pas de fêtes ni d\'événements sans accord préalable',
    'Non-fumeur à l\'intérieur',
    'Les animaux de compagnie ne sont pas acceptés',
    'Merci de laisser le logement propre et rangé',
    'Triez vos déchets dans les poubelles prévues',
    'Éteignez les lumières et appareils en partant',
    'Remettez les clés dans la boîte à clés à votre départ',
  ]
}

seed().catch(e => { console.error(e); process.exit(1) })

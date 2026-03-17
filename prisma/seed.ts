import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const SALT = process.env.JWT_SECRET || 'masterkey-dashboard-secret-2024-very-long-secret-key'

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + SALT).digest('hex')
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await prisma.teamGoal.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.monthlyReport.deleteMany()
  await prisma.satisfactionScore.deleteMany()
  await prisma.property.deleteMany()
  await prisma.owner.deleteMany()
  await prisma.user.deleteMany()
  await prisma.city.deleteMany()

  // Create Users
  const florianPin = hashPin('1234')
  const lucasPin = hashPin('5678')

  const florian = await prisma.user.create({
    data: {
      name: 'Florian',
      pin: florianPin,
      color: '#D4AF37',
    },
  })

  const lucas = await prisma.user.create({
    data: {
      name: 'Lucas',
      pin: lucasPin,
      color: '#3B82F6',
    },
  })

  console.log('✅ Users created')

  // Create Cities
  await prisma.city.createMany({
    data: [
      { name: 'Nancy', isActive: true },
      { name: 'Bar-le-Duc', isActive: false },
      { name: 'Verdun', isActive: false },
      { name: 'Metz', isActive: false },
      { name: 'Strasbourg', isActive: false },
    ],
  })

  console.log('✅ Cities created')

  // Create Owners
  const owner1 = await prisma.owner.create({
    data: {
      name: 'Jean-Pierre Martin',
      phone: '06 12 34 56 78',
      email: 'jp.martin@gmail.com',
      notes: 'Propriétaire très investi, souhaite maximiser ses revenus locatifs.',
      lastContact: new Date('2024-03-01'),
      relanceDate: new Date('2026-03-20'),
      relanceNote: 'Rappeler pour renouvellement contrat',
      source: 'Recommandation',
    },
  })

  const owner2 = await prisma.owner.create({
    data: {
      name: 'Sophie Durand',
      phone: '06 98 76 54 32',
      email: 'sophie.durand@outlook.fr',
      notes: 'Nouvellement propriétaire, besoin d\'accompagnement.',
      lastContact: new Date('2024-02-15'),
      relanceDate: new Date('2026-04-01'),
      relanceNote: 'Présenter nouveau package premium',
      source: 'Réseau social',
    },
  })

  const owner3 = await prisma.owner.create({
    data: {
      name: 'Michel Bernard',
      phone: '06 55 44 33 22',
      email: 'm.bernard@free.fr',
      notes: 'Propriétaire de longue date, très satisfait des services.',
      lastContact: new Date('2024-03-10'),
      relanceDate: new Date('2026-03-25'),
      relanceNote: 'Proposition bien supplémentaire',
      source: 'Bouche à oreille',
    },
  })

  console.log('✅ Owners created')

  // Create Satisfaction Scores
  await prisma.satisfactionScore.createMany({
    data: [
      { ownerId: owner1.id, score: 9, quarter: 1, year: 2024 },
      { ownerId: owner1.id, score: 10, quarter: 2, year: 2024 },
      { ownerId: owner2.id, score: 8, quarter: 1, year: 2024 },
      { ownerId: owner2.id, score: 9, quarter: 2, year: 2024 },
      { ownerId: owner3.id, score: 10, quarter: 1, year: 2024 },
      { ownerId: owner3.id, score: 10, quarter: 2, year: 2024 },
    ],
  })

  // Create Properties
  await prisma.property.createMany({
    data: [
      {
        name: 'Appartement Centre Ville Nancy',
        address: '12 rue de la Paix',
        city: 'Nancy',
        type: 'Appartement',
        ownerId: owner1.id,
        commissionRate: 20,
        dateSigned: new Date('2023-06-01'),
        status: 'active',
      },
      {
        name: 'Studio Stanislas',
        address: '5 place Stanislas',
        city: 'Nancy',
        type: 'Studio',
        ownerId: owner1.id,
        commissionRate: 20,
        dateSigned: new Date('2023-09-15'),
        status: 'active',
      },
      {
        name: 'Maison Durand',
        address: '23 rue des Fleurs',
        city: 'Nancy',
        type: 'Maison',
        ownerId: owner2.id,
        commissionRate: 18,
        dateSigned: new Date('2024-01-10'),
        status: 'active',
      },
      {
        name: 'Loft Industriel',
        address: '8 rue des Artisans',
        city: 'Nancy',
        type: 'Loft',
        ownerId: owner3.id,
        commissionRate: 22,
        dateSigned: new Date('2023-11-20'),
        status: 'active',
      },
      {
        name: 'Appartement T3 Vandœuvre',
        address: '45 avenue de la Libération',
        city: 'Nancy',
        type: 'Appartement',
        ownerId: owner3.id,
        commissionRate: 20,
        dateSigned: new Date('2024-02-05'),
        status: 'active',
      },
    ],
  })

  console.log('✅ Properties created')

  // Create Monthly Reports (last 6 months + some older)
  const reports = [
    {
      month: 9,
      year: 2025,
      caBrut: 8500,
      commissions: 1700,
      activeProperties: 3,
      totalNights: 85,
      newSignatures: 1,
      lostProperties: 0,
      netProfit: 1250,
      notes: 'Bonne rentrée de septembre, taux d\'occupation en hausse.',
      targetMargin: 15,
    },
    {
      month: 10,
      year: 2025,
      caBrut: 9200,
      commissions: 1840,
      activeProperties: 4,
      totalNights: 92,
      newSignatures: 1,
      lostProperties: 0,
      netProfit: 1420,
      notes: 'Excellente performance, nouvelles réservations long séjour.',
      targetMargin: 15,
    },
    {
      month: 11,
      year: 2025,
      caBrut: 7800,
      commissions: 1560,
      activeProperties: 4,
      totalNights: 78,
      newSignatures: 0,
      lostProperties: 0,
      netProfit: 1100,
      notes: 'Légère baisse liée aux vacances de Toussaint.',
      targetMargin: 15,
    },
    {
      month: 12,
      year: 2025,
      caBrut: 11500,
      commissions: 2300,
      activeProperties: 5,
      totalNights: 115,
      newSignatures: 1,
      lostProperties: 0,
      netProfit: 1850,
      notes: 'Très belle période de Noël, taux plein sur tous les biens.',
      targetMargin: 15,
    },
    {
      month: 1,
      year: 2026,
      caBrut: 7200,
      commissions: 1440,
      activeProperties: 5,
      totalNights: 72,
      newSignatures: 0,
      lostProperties: 0,
      netProfit: 980,
      notes: 'Janvier calme comme prévu, focus prospection.',
      targetMargin: 15,
    },
    {
      month: 2,
      year: 2026,
      caBrut: 8900,
      commissions: 1780,
      activeProperties: 5,
      totalNights: 89,
      newSignatures: 1,
      lostProperties: 0,
      netProfit: 1320,
      notes: 'Bons résultats février, vacances scolaires bénéfiques.',
      targetMargin: 15,
    },
    {
      month: 3,
      year: 2026,
      caBrut: 9800,
      commissions: 1960,
      activeProperties: 5,
      totalNights: 95,
      newSignatures: 1,
      lostProperties: 0,
      netProfit: 1520,
      notes: 'Mars très prometteur, nouvelles demandes en cours.',
      targetMargin: 15,
    },
  ]

  for (const reportData of reports) {
    const report = await prisma.monthlyReport.create({
      data: reportData,
    })

    // Add expenses for each report
    await prisma.expense.createMany({
      data: [
        {
          reportId: report.id,
          category: 'logiciel',
          description: 'Abonnement Airbnb Pro',
          amount: 49,
          isRecurring: true,
        },
        {
          reportId: report.id,
          category: 'marketing',
          description: 'Publicité Facebook/Instagram',
          amount: 150,
          isRecurring: false,
        },
        {
          reportId: report.id,
          category: 'entretien',
          description: 'Frais de ménage et entretien',
          amount: report.caBrut * 0.05,
          isRecurring: false,
        },
        {
          reportId: report.id,
          category: 'administratif',
          description: 'Frais administratifs divers',
          amount: 80,
          isRecurring: true,
        },
      ],
    })

    // Add team goals for each report
    await prisma.teamGoal.create({
      data: {
        userId: florian.id,
        reportId: report.id,
        propertiesSigned: Math.floor(Math.random() * 2),
        appointmentsMade: Math.floor(Math.random() * 5) + 2,
        personalGoal: 'Atteindre 2 nouvelles signatures ce mois-ci',
        goalStatus: Math.random() > 0.5 ? 'atteint' : 'en_cours',
      },
    })

    await prisma.teamGoal.create({
      data: {
        userId: lucas.id,
        reportId: report.id,
        propertiesSigned: Math.floor(Math.random() * 2),
        appointmentsMade: Math.floor(Math.random() * 4) + 1,
        personalGoal: 'Améliorer le taux de conversion des prospects',
        goalStatus: Math.random() > 0.5 ? 'atteint' : 'en_cours',
      },
    })
  }

  console.log('✅ Monthly reports, expenses, and team goals created')
  console.log('')
  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('👤 Users:')
  console.log('   Florian - PIN: 1234')
  console.log('   Lucas   - PIN: 5678')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

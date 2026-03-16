import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    const expenses = await prisma.expense.findMany({
      where: reportId ? { reportId: Number(reportId) } : undefined,
      include: { report: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, category, description, amount, isRecurring } = body

    const expense = await prisma.expense.create({
      data: {
        reportId: Number(reportId),
        category,
        description: description || null,
        amount: Number(amount),
        isRecurring: Boolean(isRecurring),
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Expense POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

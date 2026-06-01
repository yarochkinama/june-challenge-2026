import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const profiles = await prisma.userProfile.findMany({
      orderBy: { name: 'asc' },
      include: {
        tasks: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
          include: {
            completions: true,
          },
        },
        weightEntries: {
          orderBy: { date: 'asc' },
        },
      },
    })

    const data = profiles.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      prizeTitle: p.prizeTitle,
      prizeEmoji: p.prizeEmoji,
      colorScheme: p.colorScheme,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        type: t.type,
        targetCount: t.targetCount,
        weekNumber: t.weekNumber,
        thresholdValue: t.thresholdValue,
        order: t.order,
      })),
      completions: p.tasks.flatMap((t) =>
        t.completions.map((c) => ({
          id: c.id,
          taskId: c.taskId,
          date: c.date,
          completed: c.completed,
        }))
      ),
      weightEntries: p.weightEntries.map((w) => ({
        id: w.id,
        date: w.date,
        weight: w.weight,
      })),
    }))

    return NextResponse.json({ profiles: data })
  } catch (error) {
    console.error('GET /api/data error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

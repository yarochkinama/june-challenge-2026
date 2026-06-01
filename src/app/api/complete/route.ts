import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { taskId, date } = body as { taskId: string; date?: string }

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const key = date ?? 'none'

    const existing = await prisma.taskCompletion.findUnique({
      where: { taskId_date: { taskId, date: key } },
    })

    let completion
    if (existing) {
      completion = await prisma.taskCompletion.update({
        where: { id: existing.id },
        data: { completed: !existing.completed },
      })
    } else {
      completion = await prisma.taskCompletion.create({
        data: { taskId, date: key, completed: true },
      })
    }

    return NextResponse.json({ completion })
  } catch (error) {
    console.error('POST /api/complete error:', error)
    return NextResponse.json({ error: 'Failed to update completion' }, { status: 500 })
  }
}

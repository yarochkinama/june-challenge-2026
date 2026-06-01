import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    await prisma.taskCompletion.deleteMany()
    await prisma.weightEntry.deleteMany()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/reset error:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}

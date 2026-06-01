import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, date, weight } = body as { profileId: string; date: string; weight: number }

    if (!profileId || !date || weight == null) {
      return NextResponse.json({ error: 'profileId, date, and weight required' }, { status: 400 })
    }

    const entry = await prisma.weightEntry.upsert({
      where: { userProfileId_date: { userProfileId: profileId, date } },
      update: { weight },
      create: { userProfileId: profileId, date, weight },
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('POST /api/weight error:', error)
    return NextResponse.json({ error: 'Failed to save weight entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, date } = body as { profileId: string; date: string }

    await prisma.weightEntry.deleteMany({
      where: { userProfileId: profileId, date },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/weight error:', error)
    return NextResponse.json({ error: 'Failed to delete weight entry' }, { status: 500 })
  }
}

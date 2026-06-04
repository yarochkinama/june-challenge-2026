import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS })

  try {
    const state = await prisma.financeState.findUnique({ where: { id } })
    return NextResponse.json({ data: state?.data ?? null }, { headers: CORS })
  } catch (e) {
    console.error('GET /api/finances error:', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500, headers: CORS })
  }
}

export async function PUT(req: NextRequest) {
  const { id, data } = await req.json()
  if (!id || !data) return NextResponse.json({ error: 'id and data required' }, { status: 400, headers: CORS })

  try {
    await prisma.financeState.upsert({
      where: { id },
      update: { data },
      create: { id, data },
    })
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (e) {
    console.error('PUT /api/finances error:', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500, headers: CORS })
  }
}

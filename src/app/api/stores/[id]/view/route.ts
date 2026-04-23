import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await params
  const { source } = await request.json().catch(() => ({ source: 'direct' }))

  await prisma.storeView.create({
    data: { storeId: id, userId: session.userId, source: source ?? 'direct' },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

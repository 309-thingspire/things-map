import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId) return NextResponse.json({ ok: false })

    const session = await getSession()
    await prisma.pageVisit.create({
      data: { sessionId, userId: session?.userId ?? null },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

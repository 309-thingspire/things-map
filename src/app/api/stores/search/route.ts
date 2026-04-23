import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const limit = parseInt(searchParams.get('limit') ?? '5')

    if (!q) {
      return NextResponse.json({ data: { results: [] } })
    }

    const results = await prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        address: true,
        category: { select: { id: true, name: true, icon: true } },
      },
      take: limit,
    })

    return NextResponse.json({ data: { results } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20

    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}

    const [requests, total] = await Promise.all([
      prisma.storeRequest.findMany({
        where,
        include: { user: { select: { name: true, team: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storeRequest.count({ where }),
    ])

    return NextResponse.json({ data: { requests, total, page } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestType, payload, storeId } = body

    if (!requestType || !payload) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const req = await prisma.storeRequest.create({
      data: {
        userId: session.userId,
        storeId: storeId ?? null,
        requestType,
        payload,
      },
    })

    return NextResponse.json({ data: req }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

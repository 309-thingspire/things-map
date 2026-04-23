import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storeId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '10')
    const sort = searchParams.get('sort') ?? 'latest'

    const orderBy =
      sort === 'likes' ? { likes: 'desc' as const } : { createdAt: 'desc' as const }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { storeId, status: 'ACTIVE' },
        include: { user: { select: { name: true, team: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { storeId, status: 'ACTIVE' } }),
    ])

    return NextResponse.json({ data: { reviews, total, page } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { scoreTotal, scoreTaste, scorePrice, scoreService, scoreAmbiance, scoreCleanliness, content, visitedAt } = body

    if ([scoreTotal, scoreTaste, scorePrice, scoreService, scoreAmbiance, scoreCleanliness].some((s) => s == null)) {
      return NextResponse.json({ error: '모든 평점을 입력해주세요.' }, { status: 400 })
    }

    const existing = await prisma.review.findUnique({
      where: { storeId_userId: { storeId, userId: session.userId } },
    })
    if (existing) {
      return NextResponse.json({ error: '이미 리뷰를 작성했습니다.' }, { status: 409 })
    }

    const review = await prisma.review.create({
      data: {
        storeId,
        userId: session.userId,
        scoreTotal,
        scoreTaste,
        scorePrice,
        scoreService,
        scoreAmbiance,
        scoreCleanliness,
        content: content ?? null,
        visitedAt: visitedAt ? new Date(visitedAt) : null,
      },
    })

    // InternalRating 재집계
    await recalcRating(storeId)

    return NextResponse.json({ data: review }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

async function recalcRating(storeId: string) {
  const agg = await prisma.review.aggregate({
    where: { storeId, status: 'ACTIVE' },
    _avg: {
      scoreTotal: true,
      scoreTaste: true,
      scorePrice: true,
      scoreService: true,
      scoreAmbiance: true,
      scoreCleanliness: true,
    },
    _count: { id: true },
  })

  await prisma.internalRating.upsert({
    where: { storeId },
    update: {
      avgTotal: agg._avg.scoreTotal ?? 0,
      avgTaste: agg._avg.scoreTaste ?? 0,
      avgPrice: agg._avg.scorePrice ?? 0,
      avgService: agg._avg.scoreService ?? 0,
      avgAmbiance: agg._avg.scoreAmbiance ?? 0,
      avgCleanliness: agg._avg.scoreCleanliness ?? 0,
      reviewCount: agg._count.id,
    },
    create: {
      storeId,
      avgTotal: agg._avg.scoreTotal ?? 0,
      avgTaste: agg._avg.scoreTaste ?? 0,
      avgPrice: agg._avg.scorePrice ?? 0,
      avgService: agg._avg.scoreService ?? 0,
      avgAmbiance: agg._avg.scoreAmbiance ?? 0,
      avgCleanliness: agg._avg.scoreCleanliness ?? 0,
      reviewCount: agg._count.id,
    },
  })
}

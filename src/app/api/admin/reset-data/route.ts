import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type ResetType =
  | 'chatLogs'
  | 'reviews'
  | 'favorites'
  | 'requests'
  | 'storeViews'
  | 'pageVisits'
  | 'stagingCrawl'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { types } = (await request.json()) as { types: ResetType[] }
    if (!Array.isArray(types) || types.length === 0) {
      return NextResponse.json({ error: '삭제할 항목을 선택해주세요.' }, { status: 400 })
    }

    const result: Record<string, number> = {}

    if (types.includes('chatLogs')) {
      const r = await prisma.chatLog.deleteMany({})
      result.chatLogs = r.count
    }

    if (types.includes('reviews')) {
      const r = await prisma.review.deleteMany({})
      result.reviews = r.count
      // 집계 초기화
      await prisma.internalRating.updateMany({
        data: {
          avgTotal: 0, avgTaste: 0, avgPrice: 0,
          avgService: 0, avgAmbiance: 0, avgCleanliness: 0,
          reviewCount: 0,
        },
      })
    }

    if (types.includes('favorites')) {
      const r = await prisma.userFavorite.deleteMany({})
      result.favorites = r.count
      await prisma.store.updateMany({ data: { favoriteCount: 0 } })
    }

    if (types.includes('requests')) {
      const r = await prisma.storeRequest.deleteMany({})
      result.requests = r.count
    }

    if (types.includes('storeViews')) {
      const r = await prisma.storeView.deleteMany({})
      result.storeViews = r.count
    }

    if (types.includes('pageVisits')) {
      const r = await prisma.pageVisit.deleteMany({})
      result.pageVisits = r.count
    }

    if (types.includes('stagingCrawl')) {
      // StagingStore → CrawlJob 순서 (FK)
      const s = await prisma.stagingStore.deleteMany({})
      const c = await prisma.crawlJob.deleteMany({})
      result.stagingStores = s.count
      result.crawlJobs = c.count
    }

    return NextResponse.json({ data: { deleted: result } })
  } catch (err) {
    console.error('[reset-data]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

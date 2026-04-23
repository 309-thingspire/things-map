import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { searchKakao } from '@/lib/crawl/kakao'
import { searchNaver } from '@/lib/crawl/naver'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, keyword } = await request.json()

    if (!platform || !keyword) {
      return NextResponse.json({ error: '플랫폼과 키워드를 입력해주세요.' }, { status: 400 })
    }

    const job = await prisma.crawlJob.create({
      data: {
        platform,
        keyword,
        source: 'API',
        status: 'RUNNING',
        adminId: session.userId,
      },
    })

    let results: { name: string; address: string; lat?: number; lng?: number; phone?: string | null; category?: string | null; kakaoUrl?: string; naverUrl?: string; rawData: unknown }[] = []

    if (platform === 'KAKAO') {
      const kakaoResults = await searchKakao(keyword)
      results = kakaoResults.map((r) => ({ ...r, rawData: r.rawData }))
    } else if (platform === 'NAVER') {
      const naverResults = await searchNaver(keyword)
      results = naverResults.map((r) => ({ ...r, rawData: r.rawData }))
    }

    // StagingStore에 저장
    const stagingItems = await Promise.all(
      results.map((r) =>
        prisma.stagingStore.create({
          data: {
            crawlJobId: job.id,
            rawData: r.rawData as object,
            name: r.name,
            address: r.address,
            lat: r.lat ?? null,
            lng: r.lng ?? null,
            phone: r.phone ?? null,
          },
        })
      )
    )

    await prisma.crawlJob.update({
      where: { id: job.id },
      data: { status: 'DONE', resultCount: stagingItems.length },
    })

    return NextResponse.json({ data: { jobId: job.id, count: stagingItems.length } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

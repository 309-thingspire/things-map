import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { crawlByStoreName } from '@/lib/crawl/playwright'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: '로컬 환경에서만 사용 가능합니다.' }, { status: 403 })
    }

    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeName } = await request.json()
    if (!storeName) {
      return NextResponse.json({ error: '매장명을 입력해주세요.' }, { status: 400 })
    }

    const job = await prisma.crawlJob.create({
      data: {
        platform: 'PLAYWRIGHT',
        keyword: storeName,
        source: 'PLAYWRIGHT',
        status: 'RUNNING',
        adminId: session.userId,
      },
    })

    const result = await crawlByStoreName(storeName)

    if (!result) {
      await prisma.crawlJob.update({ where: { id: job.id }, data: { status: 'FAILED' } })
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    const staging = await prisma.stagingStore.create({
      data: {
        crawlJobId: job.id,
        rawData: result as object,
        name: result.name,
        address: result.address,
        phone: result.phone ?? null,
        businessHours: result.businessHours ?? null,
        themeTags: (result as { tags?: string[] }).tags ?? [],
        menus: result.menus as object,
      },
    })

    await prisma.crawlJob.update({
      where: { id: job.id },
      data: { status: 'DONE', resultCount: 1 },
    })

    return NextResponse.json({
      data: {
        stagingId: staging.id,
        preview: {
          name: result.name,
          address: result.address,
          phone: result.phone,
          businessHours: result.businessHours,
          category: result.category,
          menus: result.menus,
        },
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

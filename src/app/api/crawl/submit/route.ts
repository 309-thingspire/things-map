import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeAddress } from '@/lib/sanitizeAddress'
import { autoApproveStaging } from '@/lib/crawl/autoApprove'

// POST /api/crawl/submit
// 로컬 크롤링 결과를 서버로 업로드하여 stagingStore에 저장
// Authorization: Bearer <CRON_SECRET>

interface CrawlResult {
  name: string
  address: string
  phone: string | null
  businessHours: string | null
  category: string | null
  tags?: string[]
  lat: number | null
  lng: number | null
  kakaoUrl: string
  naverUrl?: string | null
  menus: { name: string; price: number | null }[]
}

interface SubmitBody {
  storeName: string
  result: CrawlResult
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { storeName, result } = body
  if (!storeName || !result?.name || !result?.address) {
    return NextResponse.json({ error: 'storeName, result.name, result.address 필수' }, { status: 400 })
  }

  const job = await prisma.crawlJob.create({
    data: {
      platform: 'PLAYWRIGHT',
      keyword: storeName,
      source: 'PLAYWRIGHT',
      status: 'DONE',
      resultCount: 1,
    },
  })

  const staging = await prisma.stagingStore.create({
    data: {
      crawlJobId: job.id,
      rawData: result as object,
      name: result.name,
      address: sanitizeAddress(result.address),
      phone: result.phone ?? null,
      businessHours: result.businessHours ?? null,
      lat: result.lat ?? null,
      lng: result.lng ?? null,
      themeTags: result.tags ?? [],
      menus: result.menus as object,
    },
  })

  const approveStatus = await autoApproveStaging(staging.id, storeName, {
    name: result.name,
    address: result.address,
    phone: result.phone,
    businessHours: result.businessHours,
    tags: result.tags,
    menus: result.menus,
  })

  return NextResponse.json({ data: { stagingId: staging.id, name: result.name, approveStatus } }, { status: 201 })
}

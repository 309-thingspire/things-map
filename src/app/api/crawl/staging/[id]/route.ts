import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { autoApproveStaging } from '@/lib/crawl/autoApprove'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.stagingStore.delete({ where: { id } })

    return NextResponse.json({ data: { message: '삭제되었습니다.' } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH — 자동승인 재시도
export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const staging = await prisma.stagingStore.findUnique({ where: { id } })
    if (!staging) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

    // 상태 초기화 후 재시도
    await prisma.stagingStore.update({ where: { id }, data: { status: 'PENDING' } })

    const raw = staging.rawData as {
      name?: string
      address?: string | null
      phone?: string | null
      businessHours?: string | null
      tags?: string[]
      menus?: { name: string; price: number | null }[]
    }

    const crawlJob = staging.crawlJobId
      ? await prisma.crawlJob.findUnique({ where: { id: staging.crawlJobId } })
      : null
    const keyword = crawlJob?.keyword ?? staging.name

    const status = await autoApproveStaging(id, keyword, {
      name: staging.name,
      address: raw.address ?? staging.address,
      phone: raw.phone ?? staging.phone ?? null,
      businessHours: raw.businessHours ?? staging.businessHours ?? null,
      tags: raw.tags ?? staging.themeTags ?? [],
      menus: (staging.menus as { name: string; price: number | null }[] | null) ?? raw.menus ?? [],
    })

    return NextResponse.json({ data: { status, keyword, crawledName: staging.name } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

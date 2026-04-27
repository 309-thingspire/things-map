import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { findDuplicateStore } from '@/lib/checkDuplicate'
import { autoApproveStaging } from '@/lib/crawl/autoApprove'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { categoryId, themeTags, menus } = body

    const staging = await prisma.stagingStore.findUnique({ where: { id } })
    if (!staging) {
      return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!staging.name || !staging.address || staging.lat == null || staging.lng == null) {
      return NextResponse.json({ error: '위치 정보가 누락되어 승인할 수 없습니다.' }, { status: 400 })
    }

    const duplicate = await findDuplicateStore(staging.name)
    if (duplicate) {
      return NextResponse.json(
        { error: `이미 등록된 매장입니다: ${duplicate.name} (${duplicate.address})`, duplicateId: duplicate.id },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.store.create({
        data: {
          name: staging.name,
          address: staging.address,
          lat: staging.lat,
          lng: staging.lng,
          phone: staging.phone ?? null,
          businessHours: staging.businessHours ?? null,
          categoryId: categoryId ?? staging.categoryId ?? null,
          themeTags: themeTags ?? staging.themeTags ?? [],
          menus: menus?.length
            ? {
                create: menus.map((m: { name: string; price?: number; isRepresentative?: boolean }) => ({
                  name: m.name,
                  price: m.price ?? null,
                  isRepresentative: m.isRepresentative ?? false,
                })),
              }
            : undefined,
        },
      }),
      prisma.stagingStore.update({ where: { id }, data: { status: 'APPROVED' } }),
    ])

    return NextResponse.json({ data: { message: '승인되었습니다.' } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PATCH — 다시시도 (자동승인 재시도)
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

    const raw = staging.rawData as { name?: string; phone?: string; businessHours?: string; tags?: string[]; menus?: { name: string; price: number | null }[] }
    const crawlJob = staging.crawlJobId ? await prisma.crawlJob.findUnique({ where: { id: staging.crawlJobId } }) : null
    const keyword = crawlJob?.keyword ?? staging.name

    const status = await autoApproveStaging(id, keyword, {
      name: staging.name,
      phone: raw.phone ?? staging.phone ?? null,
      businessHours: raw.businessHours ?? staging.businessHours ?? null,
      tags: raw.tags ?? staging.themeTags ?? [],
      menus: (staging.menus as { name: string; price: number | null }[] | null) ?? raw.menus ?? [],
    })

    return NextResponse.json({ data: { status } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.stagingStore.delete({ where: { id } })

    return NextResponse.json({ data: { message: '삭제되었습니다.' } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

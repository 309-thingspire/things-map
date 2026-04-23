import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.stagingStore.update({ where: { id }, data: { status: 'REJECTED' } })

    return NextResponse.json({ data: { message: '버렸습니다.' } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

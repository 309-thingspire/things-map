import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calcOfficeDistance } from '@/lib/office'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        menus: true,
        internalRating: true,
      },
    })

    if (!store) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ data: store })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { menus, ...storeData } = body

    // lat/lng가 변경되면 officeDistance 재계산
    if (storeData.lat != null && storeData.lng != null) {
      const { officeDistanceM, walkingMinutes } = calcOfficeDistance(parseFloat(storeData.lat), parseFloat(storeData.lng))
      storeData.officeDistanceM = officeDistanceM
      storeData.walkingMinutes = walkingMinutes
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...storeData,
        ...(menus !== undefined && {
          menus: {
            deleteMany: {},
            create: menus.map((m: { name: string; price?: number; isRepresentative?: boolean }) => ({
              name: m.name,
              price: m.price ?? null,
              isRepresentative: m.isRepresentative ?? false,
            })),
          },
        }),
      },
      include: { category: true, menus: true },
    })

    return NextResponse.json({ data: store })
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
    await prisma.store.delete({ where: { id } })

    return NextResponse.json({ data: { message: '삭제되었습니다.' } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

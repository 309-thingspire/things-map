import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status, adminNote } = await request.json()

    const storeReq = await prisma.storeRequest.update({
      where: { id },
      data: { status, adminNote: adminNote ?? null, reviewedAt: new Date() },
    })

    // 승인 시 Store 자동 생성
    if (status === 'APPROVED' && storeReq.requestType === 'NEW') {
      const payload = storeReq.payload as Record<string, unknown>
      await prisma.store.create({
        data: {
          name: payload.name as string,
          address: payload.address as string,
          lat: payload.lat as number,
          lng: payload.lng as number,
          phone: (payload.phone as string) ?? null,
          businessHours: (payload.businessHours as string) ?? null,
          categoryId: (payload.categoryId as string) ?? null,
          themeTags: (payload.themeTags as string[]) ?? [],
          menus: (payload.menus as { name: string; price?: number; isRepresentative?: boolean }[])?.length
            ? {
                create: (payload.menus as { name: string; price?: number; isRepresentative?: boolean }[]).map((m) => ({
                  name: m.name,
                  price: m.price ?? null,
                  isRepresentative: m.isRepresentative ?? false,
                })),
              }
            : undefined,
        },
      })
    }

    return NextResponse.json({ data: storeReq })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { searchNaver } from '@/lib/crawl/naver'
import { calcOfficeDistance } from '@/lib/office'
import { findDuplicateStore } from '@/lib/checkDuplicate'
import { sanitizeAddress } from '@/lib/sanitizeAddress'

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

    if (status === 'APPROVED' && storeReq.requestType === 'NEW') {
      const payload = storeReq.payload as Record<string, unknown>
      const storeName = payload.name as string

      // Naver API로 자동 수집
      let naverData: Awaited<ReturnType<typeof searchNaver>>[0] | null = null
      try {
        const query = payload.address
          ? `${storeName} ${payload.address}`
          : storeName
        const results = await searchNaver(query, 1, 3)
        // 이름이 가장 유사한 결과 선택
        naverData = results.find(r =>
          r.name.includes(storeName) || storeName.includes(r.name)
        ) ?? results[0] ?? null
      } catch {
        // Naver 실패 시 payload 데이터로 폴백
      }

      // 좌표가 없으면 등록 불가
      const lat = naverData?.lat ?? (payload.lat as number | undefined)
      const lng = naverData?.lng ?? (payload.lng as number | undefined)
      if (!lat || !lng) {
        return NextResponse.json({
          data: storeReq,
          warning: '자동 수집 실패: 좌표를 찾을 수 없어 매장이 등록되지 않았습니다. 수동으로 등록해주세요.',
        })
      }

      // 카테고리 이름 → ID 매핑
      let categoryId: string | null = null
      const categoryName = payload.categoryName as string | undefined
      if (categoryName) {
        const cat = await prisma.category.findFirst({
          where: { name: { contains: categoryName, mode: 'insensitive' } },
        })
        categoryId = cat?.id ?? null
      }

      const duplicate = await findDuplicateStore(naverData?.name ?? storeName)
      if (duplicate) {
        return NextResponse.json(
          { error: `이미 등록된 매장입니다: ${duplicate.name} (${duplicate.address})`, duplicateId: duplicate.id },
          { status: 409 }
        )
      }

      const { officeDistanceM, walkingMinutes } = calcOfficeDistance(lat, lng)

      const store = await prisma.store.create({
        data: {
          name: naverData?.name ?? storeName,
          address: sanitizeAddress(naverData?.address ?? (payload.address as string) ?? ''),
          lat,
          lng,
          phone: (payload.phone as string | undefined) ?? naverData?.phone ?? null,
          naverUrl: naverData?.naverUrl ?? null,
          categoryId,
          themeTags: (payload.themeTags as string[]) ?? [],
          officeDistanceM,
          walkingMinutes,
          menus: (payload.menus as { name: string }[])?.length
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

      return NextResponse.json({
        data: storeReq,
        store,
        autoCollected: !!naverData,
      })
    }

    return NextResponse.json({ data: storeReq })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

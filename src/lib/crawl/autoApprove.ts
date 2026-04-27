import { prisma } from '@/lib/prisma'

interface CrawlData {
  name: string
  phone?: string | null
  businessHours?: string | null
  tags?: string[]
  menus?: { name: string; price: number | null }[]
}

/** 크롤 결과를 기반으로 기존 매장을 찾아 자동 업데이트하고 staging 상태를 결정 */
export async function autoApproveStaging(
  stagingId: string,
  keyword: string,
  data: CrawlData,
): Promise<'APPROVED' | 'UNREGISTERED' | 'REJECTED'> {
  try {
    // 1. 정확한 이름 일치 (대소문자 무시)
    let store = await prisma.store.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' } },
    })

    // 2. 크롤 키워드로도 검색 (결과명과 키워드가 다를 수 있음)
    if (!store && keyword !== data.name) {
      store = await prisma.store.findFirst({
        where: { name: { equals: keyword.trim(), mode: 'insensitive' } },
      })
    }

    // 3. 부분 포함 검색 (매장명에 키워드가 포함되거나 그 반대)
    if (!store) {
      const norm = (s: string) => s.replace(/\s/g, '').toLowerCase()
      const nk = norm(keyword)
      const nd = norm(data.name)
      const all = await prisma.store.findMany({ select: { id: true, name: true } })
      const matched = all.find((s) => {
        const ns = norm(s.name)
        return ns.includes(nk) || nk.includes(ns) || ns.includes(nd) || nd.includes(ns)
      })
      if (matched) store = await prisma.store.findUnique({ where: { id: matched.id } })
    }

    if (!store) {
      await prisma.stagingStore.update({
        where: { id: stagingId },
        data: { status: 'UNREGISTERED' },
      })
      return 'UNREGISTERED'
    }

    // 매장 데이터 업데이트 (좌표는 변경하지 않음)
    await prisma.$transaction(async (tx) => {
      if (data.menus && data.menus.length > 0) {
        await tx.menu.deleteMany({ where: { storeId: store!.id } })
        await tx.menu.createMany({
          data: data.menus.map((m) => ({
            storeId: store!.id,
            name: m.name,
            price: m.price ?? null,
            isRepresentative: false,
          })),
        })
      }
      await tx.store.update({
        where: { id: store!.id },
        data: {
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.businessHours ? { businessHours: data.businessHours } : {}),
          ...(data.tags?.length ? { themeTags: data.tags } : {}),
          lastCrawledAt: new Date(),
        },
      })
      await tx.stagingStore.update({
        where: { id: stagingId },
        data: { status: 'APPROVED' },
      })
    })

    return 'APPROVED'
  } catch {
    await prisma.stagingStore.update({
      where: { id: stagingId },
      data: { status: 'REJECTED' },
    }).catch(() => {})
    return 'REJECTED'
  }
}

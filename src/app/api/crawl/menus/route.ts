import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { crawlByStoreName } from '@/lib/crawl/playwright'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { storeId } = await request.json().catch(() => ({}))

  const stores = storeId
    ? await prisma.store.findMany({ where: { id: storeId }, select: { id: true, name: true, phone: true, businessHours: true } })
    : await prisma.store.findMany({ select: { id: true, name: true, phone: true, businessHours: true } })

  const results: { name: string; status: 'success' | 'failed'; menuCount?: number }[] = []

  for (const store of stores) {
    try {
      const data = await crawlByStoreName(store.name)
      if (!data) {
        results.push({ name: store.name, status: 'failed' })
        continue
      }

      if (data.menus.length > 0) {
        await prisma.menu.deleteMany({ where: { storeId: store.id } })
        await prisma.menu.createMany({
          data: data.menus.map((m, i) => ({
            storeId: store.id,
            name: m.name,
            price: m.price ?? null,
            isRepresentative: i === 0,
          })),
        })
      }

      await prisma.store.update({
        where: { id: store.id },
        data: {
          businessHours: store.businessHours ?? data.businessHours ?? null,
          phone: store.phone ?? data.phone ?? null,
        },
      })

      results.push({ name: store.name, status: 'success', menuCount: data.menus.length })
    } catch {
      results.push({ name: store.name, status: 'failed' })
    }
  }

  const success = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length
  return NextResponse.json({ data: { success, failed, results } })
}

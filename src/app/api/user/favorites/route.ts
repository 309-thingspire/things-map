import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ data: { count: 0, storeIds: [] } })

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: session.userId },
    select: { storeId: true },
  })

  return NextResponse.json({
    data: { count: favorites.length, storeIds: favorites.map((f) => f.storeId) },
  })
}

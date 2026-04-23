import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: storeId } = await params

  try {
    await prisma.userFavorite.create({ data: { userId: session.userId, storeId } })
    await prisma.store.update({ where: { id: storeId }, data: { favoriteCount: { increment: 1 } } })
    return NextResponse.json({ data: { isFavorited: true } })
  } catch {
    // unique constraint violation = already favorited
    return NextResponse.json({ data: { isFavorited: true } })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: storeId } = await params

  const deleted = await prisma.userFavorite.deleteMany({
    where: { userId: session.userId, storeId },
  })

  if (deleted.count > 0) {
    await prisma.store.update({
      where: { id: storeId },
      data: { favoriteCount: { decrement: 1 } },
    })
  }

  return NextResponse.json({ data: { isFavorited: false } })
}

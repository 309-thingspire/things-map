import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'PENDING'
    const validStatuses = ['PENDING', 'APPROVED', 'UNREGISTERED', 'REJECTED']
    const statusFilter = status === 'ALL'
      ? undefined
      : validStatuses.includes(status) ? status as 'PENDING' | 'APPROVED' | 'UNREGISTERED' | 'REJECTED' : 'PENDING'

    const items = await prisma.stagingStore.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: { crawlJob: { select: { platform: true, keyword: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: { items } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

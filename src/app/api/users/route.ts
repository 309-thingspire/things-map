import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
function generateApprovalCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        team: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        approvalCode: true,
      },
    })

    return NextResponse.json({ data: { users } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, team, role } = await request.json()

    if (!name || !team) {
      return NextResponse.json({ error: '이름과 팀을 입력해주세요.' }, { status: 400 })
    }

    const approvalCode = generateApprovalCode()

    const user = await prisma.user.create({
      data: {
        name,
        team,
        approvalCode,
        role: role ?? 'USER',
      },
      select: {
        id: true,
        name: true,
        team: true,
        role: true,
        approvalCode: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, COOKIE_OPTIONS } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, approvalCode } = await request.json()

    if (!name || !approvalCode) {
      return NextResponse.json({ error: '이름과 승인코드를 입력해주세요.' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { name, approvalCode },
    })

    if (!user) {
      return NextResponse.json({ error: '이름 또는 승인코드가 올바르지 않습니다.' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }, { status: 403 })
    }

    await Promise.all([
      prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }),
      prisma.userLogin.create({ data: { userId: user.id } }),
    ])

    const token = await signToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      data: { id: user.id, name: user.name, team: user.team, role: user.role },
    })

    response.cookies.set('token', token, COOKIE_OPTIONS)

    return response
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

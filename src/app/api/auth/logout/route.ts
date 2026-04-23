import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ data: { message: '로그아웃 되었습니다.' } })
  response.cookies.set('token', '', { maxAge: 0, path: '/' })
  return response
}

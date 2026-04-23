import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  const isAdminPath = pathname.startsWith('/admin')
  const isProtectedPath =
    pathname.startsWith('/request') || pathname.match(/^\/stores\/[^/]+\/review/)

  if (!isAdminPath && !isProtectedPath) {
    return NextResponse.next()
  }

  if (!token) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)

  if (!payload) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdminPath && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/request/:path*', '/stores/:path*/review'],
}

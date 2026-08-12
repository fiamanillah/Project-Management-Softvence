import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Coarse route protection for all /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const hasDashboardSession = request.cookies.has('dashboard_session')
    const hasAccessToken = request.cookies.has('access_token')
    const hasRefreshToken = request.cookies.has('refresh_token')

    // If no session cookie is present on either dashboard or API domain, redirect to login
    if (!hasDashboardSession && !hasAccessToken && !hasRefreshToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

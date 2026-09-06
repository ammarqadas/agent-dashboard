import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'agent_session'
const CSRF_COOKIE = 'agent_csrf'

// Defense-in-depth gate for /dashboard routes (edge runtime). Performs
// format/expiry checks only — the proxy and upstream backend remain the
// authoritative security boundaries.
function isSessionCookieValid(value: string | undefined): boolean {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3 || parts.some((p) => !p)) return false
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4 !== 0) b64 += '='
    const payload = JSON.parse(atob(b64)) as { exp?: unknown } | null
    if (!payload || typeof payload !== 'object') return false
    const exp = payload.exp
    if (typeof exp === 'number' && exp > 0 && exp * 1000 <= Date.now()) return false
    return true
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE)?.value
  if (isSessionCookieValid(value)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  const res = NextResponse.redirect(url)
  res.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 })
  res.cookies.set({ name: CSRF_COOKIE, value: '', path: '/', maxAge: 0 })
  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, CSRF_COOKIE, IS_PROD, validateOrigin } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Logout always succeeds for the caller's own session (origin-checked).
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  const res = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  )
  res.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0, httpOnly: true, secure: IS_PROD, sameSite: 'strict' })
  res.cookies.set({ name: CSRF_COOKIE, value: '', path: '/', maxAge: 0, httpOnly: false, secure: IS_PROD, sameSite: 'strict' })
  return res
}

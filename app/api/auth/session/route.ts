import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, getTokenExpiresAtMs } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Format/expiry-level session check (JWT signature is verified by the
// upstream backend on every API call). Used by the UI to decide redirects.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value || ''
  const exp = token ? getTokenExpiresAtMs(token) : null
  const authenticated = !!exp && exp > Date.now()
  return NextResponse.json(
    { authenticated, expiresAt: authenticated ? exp : undefined },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}

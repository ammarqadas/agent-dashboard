import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  SESSION_TTL_SECONDS,
  IS_PROD,
  MAX_JSON_BYTES,
  MAX_UPLOAD_BYTES,
  getTokenExpiresAtMs,
  isSessionTokenUsable,
  randomToken,
  validateOrigin,
  validateCsrf,
  actionLimiter,
  loginEmailLimiter,
  loginIpLimiter,
  getClientIp,
  sanitizeSegments,
  matchPolicy,
  validateQuery,
  validateMultipart,
} from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 100

// ---------------------------------------------------------------------------
// Upstream configuration (fail closed)
// ---------------------------------------------------------------------------

const UPSTREAM = process.env.DADIH_API_URL?.trim().replace(/\/+$/, '')
const ALLOW_HTTP_UPSTREAM = process.env.DADIH_ALLOW_HTTP === 'true'
const UPSTREAM_TIMEOUT_MS = 30_000
const configuredPayoutTimeout = Number(process.env.PAYOUT_UPSTREAM_TIMEOUT_MS ?? 60_000)
const PAYOUT_UPSTREAM_TIMEOUT_MS =
  Number.isFinite(configuredPayoutTimeout) && configuredPayoutTimeout > UPSTREAM_TIMEOUT_MS
    ? configuredPayoutTimeout
    : 60_000
// Identity upload validates and re-encodes both images upstream.
const configuredIdentityUploadTimeout = Number(
  process.env.IDENTITY_UPLOAD_UPSTREAM_TIMEOUT_MS ?? 90_000
)
const IDENTITY_UPLOAD_UPSTREAM_TIMEOUT_MS =
  Number.isFinite(configuredIdentityUploadTimeout) && configuredIdentityUploadTimeout > UPSTREAM_TIMEOUT_MS
    ? configuredIdentityUploadTimeout
    : 90_000

let upstreamBlocked = true
if (!UPSTREAM) {
  console.error('CONFIG ERROR: DADIH_API_URL is not set. All proxy requests will fail.')
} else {
  try {
    const u = new URL(UPSTREAM)
    if (!['http:', 'https:'].includes(u.protocol)) {
      console.error('CONFIG ERROR: DADIH_API_URL must use HTTP or HTTPS. Requests are blocked.')
    } else if (IS_PROD && u.protocol !== 'https:' && !ALLOW_HTTP_UPSTREAM) {
      console.error(
        'CONFIG ERROR: DADIH_API_URL must use HTTPS in production unless DADIH_ALLOW_HTTP=true. Requests are blocked.'
      )
    } else {
      upstreamBlocked = false
    }
  } catch {
    console.error('CONFIG ERROR: DADIH_API_URL is not a valid URL. Requests are blocked.')
  }
}

// ---------------------------------------------------------------------------

function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  }
}

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...securityHeaders(), ...extra } })
}

type ProxyResponse = ReturnType<typeof NextResponse.json>

function clearSessionCookies(res: ProxyResponse) {
  res.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0, httpOnly: true, secure: IS_PROD, sameSite: 'strict' })
  res.cookies.set({ name: CSRF_COOKIE, value: '', path: '/', maxAge: 0, httpOnly: false, secure: IS_PROD, sameSite: 'strict' })
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path, 'GET')
}
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path, 'POST')
}
export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path, 'PATCH')
}
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path, 'PUT')
}
export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params.path, 'DELETE')
}

export async function OPTIONS() {
  // Same-origin only: no CORS headers are exposed.
  return new NextResponse(null, { status: 204, headers: securityHeaders() })
}

// ---------------------------------------------------------------------------

async function handleProxy(
  request: NextRequest,
  rawSegments: string[],
  method: string
) {
  if (upstreamBlocked) {
    return json({ success: false, message: 'Server configuration error.' }, 500)
  }

  // 1. Path validation + exact route/method policy
  const segments = sanitizeSegments(rawSegments)
  if (!segments || segments.length === 0) {
    return json({ success: false, message: 'Not found.' }, 404)
  }
  const policy = matchPolicy(segments)
  if (!policy) return json({ success: false, message: 'Not found.' }, 404)
  if (!policy.methods.includes(method)) {
    return json({ success: false, message: 'Method not allowed.' }, 405)
  }

  const unsafe = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  // 2. Origin validation (CSRF layer 1) for state-changing requests
  if (unsafe && !validateOrigin(request)) {
    return json({ success: false, message: 'Forbidden.' }, 403)
  }

  // 3. Authentication: browser credentials are ignored; the HttpOnly session
  //    cookie is the only accepted credential.
  let sessionToken: string | null = null
  if (policy.auth === 'agent') {
    sessionToken = request.cookies.get(SESSION_COOKIE)?.value || null
    if (!sessionToken || !isSessionTokenUsable(sessionToken)) {
      const hadSession = !!sessionToken
      const res = json({ success: false, message: 'Authentication required.' }, 401)
      if (hadSession) clearSessionCookies(res)
      return res
    }
    // 4. CSRF (layer 2): double-submit token for authenticated mutations
    if (unsafe && !validateCsrf(request)) {
      return json({ success: false, message: 'Forbidden.' }, 403)
    }
  }

  // 5. Query validation
  const requestUrl = new URL(request.url)
  if (!validateQuery(policy, requestUrl.searchParams)) {
    return json({ success: false, message: 'Invalid request parameters.' }, 400)
  }

  // 6. Body validation
  const contentType = (request.headers.get('content-type') || '').toLowerCase()
  const contentLength = Number(request.headers.get('content-length') || '0')
  let body: BodyInit | undefined
  let forwardContentType: string | undefined

  const wantsJson =
    (policy.body === 'json' || policy.body === 'either') &&
    method !== 'GET' &&
    method !== 'DELETE'
  const wantsMultipart = policy.body === 'either' && contentType.includes('multipart/form-data')

  if (policy.body === 'multipart' || wantsMultipart) {
    if (!contentType.includes('multipart/form-data')) {
      return json({ success: false, message: 'Unsupported media type.' }, 415)
    }
    if (contentLength > MAX_UPLOAD_BYTES) {
      return json({ success: false, message: 'Payload too large.' }, 413)
    }
    let fd: FormData
    try {
      fd = await request.formData()
    } catch {
      return json({ success: false, message: 'Invalid request body.' }, 400)
    }
    if (!(await validateMultipart(fd))) {
      return json({ success: false, message: 'Invalid or too large upload.' }, 400)
    }
    body = fd // fetch sets the multipart boundary automatically
  } else if (wantsJson) {
    if (contentType && !contentType.includes('application/json')) {
      return json({ success: false, message: 'Unsupported media type.' }, 415)
    }
    if (contentLength > MAX_JSON_BYTES) {
      return json({ success: false, message: 'Payload too large.' }, 413)
    }
    let parsed: unknown
    try {
      const text = await request.text()
      if (text.length > MAX_JSON_BYTES) {
        return json({ success: false, message: 'Payload too large.' }, 413)
      }
      parsed = JSON.parse(text || '{}')
    } catch {
      return json({ success: false, message: 'Invalid JSON body.' }, 400)
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ success: false, message: 'Invalid JSON body.' }, 400)
    }

    if (policy.isLogin) {
      // 7. Rate limiting for login (per IP and per IP+email)
      const payload = parsed as Record<string, unknown>
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
      const password = typeof payload.password === 'string' ? payload.password : ''
      if (!email || email.length > 254 || !password || password.length > 1024) {
        return json({ success: false, message: 'Invalid credentials format.' }, 400)
      }
      const ip = getClientIp(request)
      const ipLimit = loginIpLimiter.check(ip)
      if (!ipLimit.allowed) {
        return json(
          { success: false, message: 'Too many attempts. Please try again later.' },
          429,
          { 'Retry-After': String(ipLimit.retryAfterSec) }
        )
      }
      const emailLimit = loginEmailLimiter.check(`${ip}|${email}`)
      if (!emailLimit.allowed) {
        return json(
          { success: false, message: 'Too many attempts. Please try again later.' },
          429,
          { 'Retry-After': String(emailLimit.retryAfterSec) }
        )
      }
      body = JSON.stringify({ email, password })
    } else {
      body = JSON.stringify(parsed)
    }
    forwardContentType = 'application/json'
  }

  // 8. Rate limiting for sensitive (financial/state-changing) actions
  if (policy.sensitive) {
    const key = `${getClientIp(request)}|${(sessionToken || '').slice(0, 16)}`
    const limit = actionLimiter.check(key)
    if (!limit.allowed) {
      return json(
        { success: false, message: 'Too many actions. Please try again later.' },
        429,
        { 'Retry-After': String(limit.retryAfterSec) }
      )
    }
  }

  // 9. Build fixed-origin target URL (path/query cannot change the destination)
  const target = new URL(UPSTREAM as string)
  target.pathname = `${target.pathname.replace(/\/+$/, '')}/${segments
    .map(encodeURIComponent)
    .join('/')}`
  target.search = requestUrl.search

  const headers: Record<string, string> = {}
  // Authorization is injected server-side from the HttpOnly cookie only.
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`
  if (forwardContentType) headers['Content-Type'] = forwardContentType
  // Idempotency-Key: strictly validated and forwarded for state-changing
  // requests (required upstream for remittance payouts; never generated here).
  if (unsafe) {
    const idempotencyKey = (request.headers.get('idempotency-key') || '').trim()
    if (idempotencyKey) {
      if (/^[A-Za-z0-9._-]{8,128}$/.test(idempotencyKey)) {
        headers['Idempotency-Key'] = idempotencyKey
      } else {
        return json({ success: false, message: 'Invalid Idempotency-Key header.' }, 400)
      }
    }
  }

  let upstreamRes: Response
  const joinedPath = segments.join('/')
  const upstreamTimeoutMs =
    joinedPath === 'agent/action/execute-generic'
      ? PAYOUT_UPSTREAM_TIMEOUT_MS
      : joinedPath === 'agent/remittance/identity/upload'
        ? IDENTITY_UPLOAD_UPSTREAM_TIMEOUT_MS
        : UPSTREAM_TIMEOUT_MS
  try {
    upstreamRes = await fetch(target.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(upstreamTimeoutMs),
    })
  } catch (error) {
    console.error('Proxy upstream error:', error instanceof Error ? error.message : error)
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    const timeoutMessage =
      joinedPath === 'agent/action/execute-generic'
        ? 'Payout response timed out. Its final status is uncertain; retry with the same idempotency key.'
        : joinedPath === 'agent/remittance/identity/upload'
          ? 'Identity upload timed out. Please try again.'
          : 'Upstream request timed out.'
    return json(
      timedOut
        ? { success: false, code: 'UPSTREAM_TIMEOUT', message: timeoutMessage }
        : { success: false, code: 'UPSTREAM_UNAVAILABLE', message: 'Upstream service unavailable.' },
      504
    )
  }

  // 10. Login: create the HttpOnly session; never return the token to the browser
  if (policy.isLogin) {
    let data: any = null
    try {
      data = await upstreamRes.json()
    } catch {
      data = null
    }
    const token =
      data && typeof data === 'object' ? (data.token ?? data.data?.token) : null
    if (upstreamRes.ok && typeof token === 'string' && token.length > 0) {
      const expMs = getTokenExpiresAtMs(token)
      const maxAge = expMs
        ? Math.max(60, Math.min(SESSION_TTL_SECONDS, Math.floor((expMs - Date.now()) / 1000)))
        : SESSION_TTL_SECONDS
      const res = json(
        { success: true, message: data?.message, user: data?.user ?? data?.data?.user },
        200
      )
      res.cookies.set({ name: SESSION_COOKIE, value: token, httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/', maxAge })
      res.cookies.set({ name: CSRF_COOKIE, value: randomToken(), httpOnly: false, secure: IS_PROD, sameSite: 'strict', path: '/', maxAge })
      return res
    }
    const status = upstreamRes.status === 200 ? 401 : upstreamRes.status
    return json({ success: false, message: 'Invalid email or password.' }, status)
  }

  // 11. Normal pass-through (upstream headers/cookies are never forwarded).
  // Non-JSON error bodies are replaced with a generic message to avoid
  // leaking upstream internals (stack traces, hostnames, framework paths).
  const status = upstreamRes.status
  const upstreamType = upstreamRes.headers.get('content-type') || ''
  const isJsonType = upstreamType.includes('application/json')

  // Binary (image) responses stream through untouched — decoding them as text
  // would corrupt the bytes.
  if (status < 400 && upstreamType.startsWith('image/')) {
    const bytes = await upstreamRes.arrayBuffer()
    const imageRes = new NextResponse(bytes, {
      status,
      headers: { 'Content-Type': upstreamType, ...securityHeaders() },
    })
    return imageRes
  }

  let payload: unknown = null
  if (status !== 204 && status !== 304) {
    if (isJsonType) {
      try {
        payload = await upstreamRes.json()
      } catch {
        payload = null
      }
    } else if (status < 400) {
      try {
        payload = await upstreamRes.text()
      } catch {
        payload = ''
      }
    }
  }

  if (status >= 400 && !isJsonType) {
    return json({ success: false, message: 'Upstream request failed.' }, status === 401 || status === 403 ? status : 502)
  }

  let res: ProxyResponse
  if (payload !== null && typeof payload === 'object') {
    res = NextResponse.json(payload, { status })
    for (const [k, v] of Object.entries(securityHeaders())) res.headers.set(k, v)
  } else if (typeof payload === 'string') {
    res = new NextResponse(payload, { status })
    for (const [k, v] of Object.entries(securityHeaders())) res.headers.set(k, v)
  } else {
    res = new NextResponse(null, { status })
    for (const [k, v] of Object.entries(securityHeaders())) res.headers.set(k, v)
  }

  if (status === 401) clearSessionCookies(res)
  return res
}

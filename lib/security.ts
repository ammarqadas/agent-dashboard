import { randomBytes, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

// Server-only security core shared by the API proxy and auth routes.
// NOTE: not imported by middleware.ts (edge runtime) or client code.

export const SESSION_COOKIE = 'agent_session'
export const CSRF_COOKIE = 'agent_csrf'
export const CSRF_HEADER = 'x-csrf-token'
export const SESSION_TTL_SECONDS = 8 * 60 * 60

export const IS_PROD = process.env.NODE_ENV === 'production'

const numEnv = (value: string | undefined, fallback: number): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Configurable limits (env-overridable)
export const MAX_JSON_BYTES = numEnv(process.env.MAX_JSON_BYTES, 1024 * 1024)
// Upload ceiling: identity upload carries two images (front/back)
// at the backend's per-image limit (IDENTITY_UPLOAD_MAX_BYTES, default 10 MB).
export const MAX_UPLOAD_BYTES = numEnv(process.env.MAX_UPLOAD_BYTES, 30 * 1024 * 1024)
export const MAX_FILE_BYTES = numEnv(process.env.MAX_FILE_BYTES, 10 * 1024 * 1024)
export const UPLOAD_TEXT_FIELDS_MAX = 2048

const LOGIN_WINDOW_MS = numEnv(process.env.LOGIN_RATE_WINDOW_MS, 15 * 60 * 1000)
const ACTION_WINDOW_MS = numEnv(process.env.ACTION_RATE_WINDOW_MS, 60 * 1000)

// ---------------------------------------------------------------------------
// Rate limiting (best-effort, per-instance; the upstream backend must enforce
// authoritative limits in multi-instance deployments).
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number }

export class RateLimiter {
  private buckets = new Map<string, Bucket>()

  constructor(
    private max: number,
    private windowMs: number,
    private maxBuckets = 10_000
  ) {}

  check(key: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now()
    if (this.buckets.size >= this.maxBuckets) {
      this.buckets.forEach((b, k) => {
        if (b.resetAt <= now) this.buckets.delete(k)
      })
    }
    let bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(key, bucket)
    }
    bucket.count += 1
    return {
      allowed: bucket.count <= this.max,
      retryAfterSec:
        bucket.count > this.max
          ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
          : 0,
    }
  }
}

export const loginEmailLimiter = new RateLimiter(
  numEnv(process.env.LOGIN_RATE_MAX, 5),
  LOGIN_WINDOW_MS
)
export const loginIpLimiter = new RateLimiter(
  numEnv(process.env.LOGIN_IP_RATE_MAX, 10),
  LOGIN_WINDOW_MS
)
export const actionLimiter = new RateLimiter(
  numEnv(process.env.ACTION_RATE_MAX, 30),
  ACTION_WINDOW_MS
)

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// ---------------------------------------------------------------------------
// Session token (JWT) helpers — format/expiry checks only; signature and
// claims are verified by the upstream backend.
// ---------------------------------------------------------------------------

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((p) => !p)) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    const payload = JSON.parse(json)
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : null
  } catch {
    return null
  }
}

export function getTokenExpiresAtMs(token: string): number | null {
  const payload = parseJwtPayload(token)
  if (!payload) return null
  const exp = payload.exp
  return typeof exp === 'number' && exp > 0 ? exp * 1000 : null
}

export function isSessionTokenUsable(token: string): boolean {
  if (!parseJwtPayload(token)) return false
  const exp = getTokenExpiresAtMs(token)
  return exp === null || exp > Date.now()
}

// ---------------------------------------------------------------------------
// CSRF (double-submit cookie) + origin validation
// ---------------------------------------------------------------------------

export function randomToken(): string {
  return randomBytes(32).toString('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length === 0 || ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

const normalizeOrigin = (origin: string): string =>
  origin.trim().replace(/\/+$/, '').toLowerCase()

// APP_ORIGIN is required in production (fail closed); in development the
// request origin is accepted when APP_ORIGIN is not configured.
export function getAllowedOrigins(req: NextRequest): string[] | null {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/+$/, '').toLowerCase()
  if (configured) return [configured]
  if (IS_PROD) return null
  const url = new URL(req.url)
  return [`${url.protocol}//${url.host}`.toLowerCase()]
}

export function validateOrigin(req: NextRequest): boolean {
  const allowed = getAllowedOrigins(req)
  if (!allowed || allowed.length === 0) return false
  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite && !['same-origin', 'none'].includes(secFetchSite)) return false
  const origin = req.headers.get('origin')
  if (!origin) return true // non-browser client; auth/CSRF still enforced
  return allowed.includes(normalizeOrigin(origin))
}

export function validateCsrf(req: NextRequest): boolean {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value
  const header = req.headers.get(CSRF_HEADER)
  if (!cookie || !header) return false
  return safeEqual(cookie, header)
}

// ---------------------------------------------------------------------------
// Path sanitization + exact route/method policy
// ---------------------------------------------------------------------------

export function sanitizeSegments(rawSegments: string[]): string[] | null {
  const out: string[] = []
  for (const raw of rawSegments) {
    let seg: string
    try {
      seg = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (!seg || seg.length > 128) return null
    if (seg === '.' || seg === '..') return null
    if (seg.includes('/') || seg.includes('\\') || /[\0-\x1f\x7f%]/.test(seg)) {
      return null
    }
    out.push(seg)
  }
  return out
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export type RoutePolicy = {
  pattern: string[]
  methods: string[]
  auth: 'public' | 'agent'
  query?: string[]
  body?: 'json' | 'multipart' | 'either'
  sensitive?: boolean
  isLogin?: boolean
}

// Exact allowlist of upstream endpoints exposed through the proxy.
export const API_POLICY: RoutePolicy[] = [
  { pattern: ['agent', 'login'], methods: ['POST'], auth: 'public', body: 'json', isLogin: true },
  { pattern: ['agent', 'create-wallet'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'wallet-search'], methods: ['GET'], auth: 'agent', query: ['mobile'] },
  { pattern: ['agent', 'identities', ':id'], methods: ['GET'], auth: 'agent' },
  { pattern: ['agent', 'identities', ':id', 'document-image'], methods: ['GET'], auth: 'agent', query: ['slot', 'variant', 'version'] },
  { pattern: ['agent', 'deposit'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'action', 'execute-generic'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'bulk-remittance'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'remittance', 'search'], methods: ['POST'], auth: 'agent', body: 'json' },
  { pattern: ['agent', 'remittance', 'identity', 'upload'], methods: ['POST'], auth: 'agent', body: 'multipart', sensitive: true },
  { pattern: ['agent', 'remittance', 'identity', 'otp', 'send'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'remittance', 'identity', 'otp', 'verify'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['agent', 'remittance', 'identity', 'document-image'], methods: ['GET'], auth: 'agent', query: ['searchToken', 'slot', 'variant'] },
  { pattern: ['agent', 'transactions'], methods: ['GET'], auth: 'agent', query: ['page', 'limit', 'sort', 'currencyId', 'from', 'to', 'operation'] },
  { pattern: ['agent', 'dist-wallets'], methods: ['GET'], auth: 'agent' },
  { pattern: ['wallets', ':id'], methods: ['GET', 'PATCH'], auth: 'agent', query: ['depth'], body: 'json', sensitive: true },
  { pattern: ['wallets', ':id', 'transactions'], methods: ['GET'], auth: 'agent', query: ['page', 'limit'] },
  { pattern: ['action', 'execute-generic'], methods: ['POST'], auth: 'agent', body: 'json', sensitive: true },
  { pattern: ['cashout-codes', 'search'], methods: ['GET'], auth: 'agent', query: ['code'] },
  { pattern: ['cashout-codes', 'agent-list'], methods: ['GET'], auth: 'agent', query: ['status', 'page', 'limit'] },
  { pattern: ['presubmit', 'execute'], methods: ['POST'], auth: 'agent', body: 'json' },
  { pattern: ['accounts'], methods: ['GET'], auth: 'agent', query: ['owner'] },
  { pattern: ['accounts', ':id'], methods: ['GET'], auth: 'agent' },
  { pattern: ['currencies'], methods: ['GET'], auth: 'agent' },
  { pattern: ['wallet-cards', 'with-upload'], methods: ['POST'], auth: 'agent', body: 'multipart', sensitive: true },
]

export function matchPolicy(segments: string[]): RoutePolicy | null {
  for (const policy of API_POLICY) {
    if (policy.pattern.length !== segments.length) continue
    let ok = true
    for (let i = 0; i < policy.pattern.length; i++) {
      const p = policy.pattern[i]
      const s = segments[i]
      if (p === ':id') {
        if (!ID_PATTERN.test(s)) {
          ok = false
          break
        }
      } else if (p !== s) {
        ok = false
        break
      }
    }
    if (ok) return policy
  }
  return null
}

// ---------------------------------------------------------------------------
// Query validation
// ---------------------------------------------------------------------------

const NUMERIC_RANGES: Record<string, [number, number]> = {
  page: [1, 1_000_000],
  limit: [1, 200],
  depth: [0, 5],
}

export function validateQuery(
  policy: RoutePolicy,
  searchParams: URLSearchParams
): boolean {
  const allowed = policy.query || []
  const entries = Array.from(searchParams.entries())
  for (const [key, value] of entries) {
    if (!allowed.includes(key)) return false
    if (value.length > 128) return false
    if (/[\0-\x1f\x7f]/.test(value)) return false
    const range = NUMERIC_RANGES[key]
    if (range) {
      if (!/^\d+$/.test(value)) return false
      const n = Number(value)
      if (n < range[0] || n > range[1]) return false
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

const IMAGE_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) =>
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  'image/webp': (b) =>
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP',
}

// Image file fields: wallet identity cards (idImage*) and remittance
// identity upload (front/back only — no selfie).
export const IMAGE_FILE_FIELDS = new Set(['idImageFront', 'idImageBack', 'idImageSelfi', 'front', 'back'])

export async function validateImageFile(file: File): Promise<boolean> {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return false
  const checker = IMAGE_SIGNATURES[(file.type || '').toLowerCase()]
  if (!checker) return false
  const head = Buffer.from(await file.slice(0, 12).arrayBuffer())
  return checker(head)
}

export async function validateMultipart(fd: FormData): Promise<boolean> {
  let total = 0
  const entries = Array.from(fd.entries())
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      if (value.length > UPLOAD_TEXT_FIELDS_MAX) return false
      total += value.length
    } else {
      if (!IMAGE_FILE_FIELDS.has(key)) return false
      if (!(await validateImageFile(value))) return false
      total += value.size
    }
    if (total > MAX_UPLOAD_BYTES) return false
  }
  return true
}

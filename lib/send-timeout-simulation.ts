import { createHash } from 'node:crypto'

type Attempt = { readyAt: number; data: Record<string, unknown> }
const state = globalThis as typeof globalThis & { __sendTimeoutSimulation?: Map<string, Attempt> }

/** Called after proxy authentication/CSRF checks. Never forwards simulated sends. */
export function simulateSendTimeout(
  path: string,
  body: Record<string, any>,
  sessionToken: string,
  idempotencyKey: string,
  now = Date.now(),
): { status: number; body: Record<string, unknown> } | null {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_SIMULATE_SEND_TIMEOUT !== 'true') return null
  if (path === 'presubmit/execute' && body.configType === 'preSubmit') {
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) return null
    return { status: 200, body: { success: true, totalCommission: 400, totalAmount: amount + 400, searchToken: 'local-simulation-quote', simulated: true } }
  }
  const isSend = path === 'agent/action/execute-generic' && body.configType === 'send'
  const isVerify = path === 'agent/remittance/verify' && body.operation === 'send'
  if (!isSend && !isVerify) return null
  const key = isVerify ? String(body.idempotencyKey || '') : idempotencyKey
  if (!/^[A-Za-z0-9._-]{8,128}$/.test(key)) {
    return { status: 400, body: { success: false, message: 'Original Idempotency-Key required for simulation.' } }
  }
  const attempts = state.__sendTimeoutSimulation ??= new Map()
  attempts.forEach((attempt, id) => { if (now - attempt.readyAt > 24 * 3600000) attempts.delete(id) })
  const owner = createHash('sha256').update(sessionToken).digest('hex')
  const scopedKey = `${owner}:${key}`
  const txId = `SIM-${key.slice(0, 8)}`
  if (isSend) {
    if (!attempts.has(scopedKey)) {
      attempts.set(scopedKey, { readyAt: now + 8000, data: {
        txId, transactionId: txId, expressid: `SIM-${key.slice(-8)}`, status: 'completed',
        amount: Number(body.amount), currency: body.currency,
        commission: Number(body.commission || 400), totalAmount: Number(body.totalAmount || Number(body.amount) + 400),
        simulated: true, completedAt: new Date(now + 8000).toISOString(),
      } })
    }
    return { status: 504, body: { success: false, code: 'UPSTREAM_TIMEOUT', status: 'pending',
      txId, outcomeUnknown: true, simulated: true, message: 'محاكاة محلية: انتهت مهلة الإرسال. تحقق من العملية الأصلية.' } }
  }
  const attempt = attempts.get(scopedKey)
  if (!attempt) return { status: 404, body: { success: false, code: 'OPERATION_NOT_FOUND', status: 'unknown',
    simulated: true, message: 'المحاكاة غير موجودة في هذه الجلسة. قد يكون خادم التطوير أُعيد تشغيله.' } }
  if (now < attempt.readyAt) return { status: 200, body: { success: false, code: 'PAYMENT_IN_PROGRESS',
    status: 'pending', txId, retryAfterSeconds: 3, simulated: true } }
  return { status: 200, body: { success: true, status: 'completed', txId, data: attempt.data, simulated: true } }
}

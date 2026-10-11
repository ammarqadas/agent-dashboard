type Operation = 'send' | 'pay'
export const VERIFICATION_DELAY_MS = 10_000
export const MAX_AUTO_VERIFICATIONS = 2
export type PendingRemittance<T> = { key: string; snapshot: T; startedAt: number }

/** Tab-session attempt keys are separate for each signed-in agent. */
export function remittanceSessionKey(prefix: string, identity: string): string {
  let agentId = 'session'
  try { agentId = String(JSON.parse(sessionStorage.getItem('agentUser') || '{}').id || agentId) } catch {}
  return `${prefix}:${agentId}:${identity}`
}

function storageKey(operation: Operation) {
  const agent = JSON.parse(sessionStorage.getItem('agentUser') || '{}')
  return agent.id ? `pending-remittance:${agent.id}:${operation}` : null
}
export function savePendingRemittance<T>(operation: Operation, attempt: PendingRemittance<T>) {
  try { const key = storageKey(operation); if (key) sessionStorage.setItem(key, JSON.stringify(attempt)) } catch {}
}
export function loadPendingRemittance<T>(operation: Operation): PendingRemittance<T> | null {
  try {
    const key = storageKey(operation)
    const stored = key ? JSON.parse(sessionStorage.getItem(key) || 'null') : null
    return stored && typeof stored.key === 'string' && stored.snapshot && typeof stored.startedAt === 'number' ? stored : null
  } catch { return null }
}
export function clearPendingRemittance(operation: Operation) {
  try { const key = storageKey(operation); if (key) sessionStorage.removeItem(key) } catch {}
}
export function hasUncertainRemittanceOutcome(response: Record<string, any>) {
  if (response.code === 'PROVIDER_REJECTED' && response.status === 'failed') return false
  if (response.attemptDispatched === false) return false
  return response.outcomeUnknown || response.status === 'pending' || response.status === 'unknown' ||
    ['PAYMENT_IN_PROGRESS', 'UPSTREAM_TIMEOUT', 'CLIENT_TIMEOUT', 'UPSTREAM_UNAVAILABLE', 'NETWORK_ERROR'].includes(response.code) ||
    response.httpStatus >= 500 || /abort|timeout|request failed|fetch failed/i.test(response.message || '')
}

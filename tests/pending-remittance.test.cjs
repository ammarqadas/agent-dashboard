const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
// Compile just the dependency-free state helper; no extra test runner required.
const file = require.resolve('../lib/pending-remittance.ts')
const helper = new Module(file, module)
helper._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file)
const { savePendingRemittance, loadPendingRemittance, clearPendingRemittance, hasUncertainRemittanceOutcome } = helper.exports

test('unresolved attempts survive refresh/TTL and remain scoped to the agent', () => {
  const store = new Map([['agentUser', '{"id":113}']])
  global.sessionStorage = { getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) }
  const pending = { key: 'original-key', snapshot: { amount: 30000, reference: '31662873' }, startedAt: Date.now() - 48 * 3600000 }
  savePendingRemittance('pay', pending)
  assert.deepEqual(loadPendingRemittance('pay'), pending)
  sessionStorage.setItem('agentUser', '{"id":114}')
  assert.equal(loadPendingRemittance('pay'), null)
  sessionStorage.setItem('agentUser', '{"id":113}')
  clearPendingRemittance('pay')
  assert.equal(loadPendingRemittance('pay'), null)
})
test('transport errors retain uncertainty and definitive rejection is separate', () => {
  assert.equal(hasUncertainRemittanceOutcome({ code: 'NETWORK_ERROR' }), true)
  assert.equal(!!hasUncertainRemittanceOutcome({ status: 'pending' }), true)
  assert.equal(hasUncertainRemittanceOutcome({ httpStatus: 502 }), true)
  assert.equal(hasUncertainRemittanceOutcome({ status: 'failed', code: 'PROVIDER_REJECTED', httpStatus: 409 }), false)
})

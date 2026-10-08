const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const file = require.resolve('../lib/send-timeout-simulation.ts')
const helper = new Module(file, module)
helper.paths = module.paths
helper._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file)
const { simulateSendTimeout } = helper.exports

function enable(t, mode = 'development') {
  const nodeEnv = process.env.NODE_ENV
  const flag = process.env.DEV_SIMULATE_SEND_TIMEOUT
  process.env.NODE_ENV = mode
  process.env.DEV_SIMULATE_SEND_TIMEOUT = 'true'
  delete global.__sendTimeoutSimulation
  t.after(() => {
    if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv
    if (flag === undefined) delete process.env.DEV_SIMULATE_SEND_TIMEOUT; else process.env.DEV_SIMULATE_SEND_TIMEOUT = flag
    delete global.__sendTimeoutSimulation
  })
}
test('local send times out, verifies pending, then verifies successful without another send', (t) => {
  enable(t)
  const key = 'original-simulation-key'
  const send = simulateSendTimeout('agent/action/execute-generic', { configType: 'send', amount: 30000, currency: 'YER' }, 'session', key, 1000)
  assert.equal(send.status, 504)
  assert.equal(send.body.code, 'UPSTREAM_TIMEOUT')
  const verify = { operation: 'send', idempotencyKey: key }
  assert.equal(simulateSendTimeout('agent/remittance/verify', verify, 'session', '', 4000).body.status, 'pending')
  const completed = simulateSendTimeout('agent/remittance/verify', verify, 'session', '', 9001)
  assert.equal(completed.body.success, true)
  assert.equal(completed.body.data.amount, 30000)
  assert.equal(completed.body.data.simulated, true)
  assert.equal(completed.body.txId, send.body.txId)
  assert.equal(simulateSendTimeout('agent/remittance/verify', verify, 'another-session', '', 9001).status, 404)
})
test('mock commission is local and payout requests are not intercepted', (t) => {
  enable(t)
  assert.equal(simulateSendTimeout('presubmit/execute', { configType: 'preSubmit', amount: 10000 }, 'session', '').body.totalAmount, 10400)
  assert.equal(simulateSendTimeout('agent/action/execute-generic', { configType: 'pay' }, 'session', 'payout-key'), null)
})
test('simulation cannot intercept any production request', (t) => {
  enable(t, 'production')
  assert.equal(simulateSendTimeout('agent/action/execute-generic', { configType: 'send' }, 'session', 'original-key'), null)
})

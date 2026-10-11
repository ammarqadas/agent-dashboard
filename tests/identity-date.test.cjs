const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const file = require.resolve('../lib/identity-date.ts')
const helper = new Module(file, module)
helper._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file)
const { identityDateToInput } = helper.exports

test('Yemen midnight serialized as UTC preserves the intended birthday', () => {
  assert.equal(identityDateToInput('1985-06-13T21:00:00.000Z'), '14-06-1985')
  assert.equal(identityDateToInput('1985-06-14T00:00:00+03:00'), '14-06-1985')
})
test('expiry across year boundaries uses Yemen calendar date; date-only stays unchanged', () => {
  assert.equal(identityDateToInput('2027-12-31T21:00:00Z'), '01-01-2028')
  assert.equal(identityDateToInput('2028-06-15'), '15-06-2028')
  assert.equal(identityDateToInput(null), '')
  assert.equal(identityDateToInput('invalid'), '')
})

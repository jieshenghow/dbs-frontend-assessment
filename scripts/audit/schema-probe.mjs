import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

export async function probeActualSchema(root, output) {
  const {build} = await import('esbuild')
  const bundle = resolve(output, 'actual-transfer-schema.mjs')
  await build({entryPoints: [resolve(root, 'src/features/transfer/schema.ts')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', tsconfig: resolve(root, 'tsconfig.json')})
  const {createTransferSchema} = await import(pathToFileURL(bundle).href)
  const {formatMoney} = await import(pathToFileURL(resolve(output, 'actual-format.mjs')).href)
  const db = JSON.parse(await readFile(resolve(root, 'mock-api/db.json'), 'utf8'))
  const checking = db.accounts.find((account) => account.type === 'checking')
  const savings = db.accounts.find((account) => account.type === 'savings')
  const base = {recipientChoice: 'new', recipientName: 'Alex Lim', accountNumber: '12345678', bank: 'DBS', fromAccountId: checking.id, amount: '1.00', note: ''}
  const cases = [
    {field: 'recipientChoice', value: '', valid: false}, {field: 'recipientChoice', value: 'unknown', valid: false},
    {field: 'recipientChoice', value: db.payees[0].id, valid: true},
    ...['', 'A', 'n'.repeat(51)].map((value) => ({field: 'recipientName', value, valid: false})),
    ...['Al', 'n'.repeat(50)].map((value) => ({field: 'recipientName', value, valid: true})),
    ...['', '1234567', '123456789', 'abcdefgh', '1234567a'].map((value) => ({field: 'accountNumber', value, valid: false, message: 'Enter a valid 8-digit account number.'})),
    {field: 'accountNumber', value: '12345678', valid: true},
    {field: 'bank', value: '', valid: false}, {field: 'bank', value: 'DBS', valid: true},
    ...['', '0', '0.99', '1.001', '900719925474099.99', 'Infinity', 'NaN', '-1'].map((value) => ({field: 'amount', value, valid: false})),
    ...['1', '1.00', '1.01', checking.balance.toFixed(2)].map((value) => ({field: 'amount', value, valid: true})),
    {field: 'amount', value: (checking.balance + 0.01).toFixed(2), valid: false, message: `Amount can't be more than your available balance (${formatMoney(checking.balance)}).`},
    {field: 'amount', value: '5000.00', account: savings.id, valid: true},
    {field: 'amount', value: '5000.01', account: savings.id, valid: false, message: `This transfer exceeds your remaining daily limit (${formatMoney(5000)}).`},
    {field: 'amount', value: '1.00', remaining: 0.99, valid: false, message: `This transfer exceeds your remaining daily limit (${formatMoney(0.99)}).`},
    {field: 'note', value: '', valid: true}, {field: 'note', value: 'n'.repeat(50), valid: true}, {field: 'note', value: 'n'.repeat(51), valid: false},
    {field: 'fromAccountId', value: db.accounts.find((account) => account.type === 'credit').id, valid: false},
  ]
  return cases.map((test) => {
    const schema = createTransferSchema(db.accounts, db.payees, test.remaining ?? 5000)
    const parsed = schema.safeParse({...base, fromAccountId: test.account ?? base.fromAccountId, [test.field]: test.value})
    assert.equal(parsed.success, test.valid, JSON.stringify(test))
    const issues = parsed.success ? [] : parsed.error.issues.map((issue) => ({path: issue.path, message: issue.message}))
    if (!test.valid) assert.ok(issues.some((issue) => issue.path.includes(test.field)), JSON.stringify({test, issues}))
    if (test.message) assert.ok(issues.some((issue) => issue.message === test.message), JSON.stringify({test, issues}))
    return {...test, issues}
  })
}

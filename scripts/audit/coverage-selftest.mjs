import {test} from 'node:test'
import assert from 'node:assert/strict'
import {aggregateCoverage, coverageMarkdown} from './coverage.mjs'
const requirement = (overrides = {}) => ({id: 'D1.clause', clause: 'Requirement', scope: 'mandatory', mode: 'automated', checkNames: ['specific check'], manualInstructions: '', acceptedException: '', ...overrides})
const check = (status = 'pass', name = 'specific check') => ({name, status, evidence: {observed: true}})
test('broad ID pass cannot satisfy a missing named probe', () => {
  const result = aggregateCoverage([requirement()], [{...check('pass', 'other'), ids: ['D1']}])
  assert.equal(result.rows[0].status, 'unverified'); assert.equal(result.overallCandidateCompliance, 'partial')
})
test('all named checks must run and pass; empty bindings cannot pass', () => {
  assert.equal(aggregateCoverage([requirement({checkNames: []})], [check()]).rows[0].status, 'unverified')
  assert.equal(aggregateCoverage([requirement({checkNames: ['specific check', 'missing']})], [check()]).rows[0].status, 'unverified')
  assert.equal(aggregateCoverage([requirement()], [check('unverified')]).rows[0].status, 'unverified')
  assert.equal(aggregateCoverage([requirement()], [check()]).overallCandidateCompliance, 'pass')
})
test('failed or repeated failed evidence cannot be hidden by later pass', () => {
  const result = aggregateCoverage([requirement()], [check('fail'), check()])
  assert.equal(result.rows[0].status, 'fail'); assert.equal(result.overallCandidateCompliance, 'fail')
})
test('manual remains outstanding even with matching passed evidence', () => {
  const result = aggregateCoverage([requirement({mode: 'manual', manualInstructions: 'Use a screen reader.'})], [check()])
  assert.equal(result.rows[0].status, 'manual'); assert.equal(result.overallCandidateCompliance, 'partial')
})
test('accepted exception is distinct from strict acceptance and manual', () => {
  const result = aggregateCoverage([requirement({mode: 'accepted', acceptedException: 'User accepted.'})], [check()])
  assert.equal(result.rows[0].status, 'accepted'); assert.equal(result.counts.pass, 0); assert.equal(result.overallCandidateCompliance, 'partial')
})
test('source drift invalidates all mandatory evidence modes', () => {
  const result = aggregateCoverage(['automated', 'manual', 'accepted'].map((mode) => requirement({mode})), [check()], false)
  assert.ok(result.rows.every((row) => row.status === 'unverified')); assert.equal(result.overallCandidateCompliance, 'partial')
})
test('product or script drift invalidates reports even when specification versions still match', () => {
  for (const integrity of [{sourceUnchanged: false}, {scriptUnchanged: false}]) {
    const result = aggregateCoverage(['automated', 'manual', 'accepted'].map((mode) => requirement({mode})), [check()], true, integrity)
    assert.equal(result.sourceVersionsMatch, true)
    assert.equal(result.evidenceValid, false)
    assert.ok(result.rows.every((row) => row.status === 'unverified'))
    assert.equal(result.overallCandidateCompliance, 'partial')
    assert.equal(result.invalidationReasons.length, 1)
    assert.ok(coverageMarkdown(result).includes(result.invalidationReasons[0]))
  }
})
test('optional and excluded requirements do not inflate mandatory counts', () => {
  const result = aggregateCoverage([requirement(), requirement({scope: 'optional'}), requirement({scope: 'out-of-scope'})], [check()])
  assert.equal(result.counts.pass, 1); assert.equal(result.rows[1].status, 'optional'); assert.equal(result.rows[2].status, 'out-of-scope')
})
test('unknown evidence mode cannot accidentally become automated pass', () => {
  assert.equal(aggregateCoverage([requirement({mode: 'manul'})], [check()]).rows[0].status, 'unverified')
})

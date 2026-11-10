export function aggregateCoverage(requirements, checks, sourceVersionsMatch = true, integrity = {}) {
  const invalidationReasons = [
    ...(!sourceVersionsMatch ? ['Specification versions do not match the reviewed registry.'] : []),
    ...(integrity.sourceUnchanged === false ? ['Product source or HEAD changed during the audit.'] : []),
    ...(integrity.scriptUnchanged === false ? ['Audit script or helper modules changed during the audit.'] : []),
  ]
  const byName = new Map()
  for (const check of checks) byName.set(check.name, [...(byName.get(check.name) ?? []), check])
  const rows = requirements.map((requirement) => {
    const evidence = requirement.checkNames.flatMap((name) => byName.get(name) ?? [])
    const missingChecks = requirement.checkNames.filter((name) => !byName.has(name))
    let status = 'unverified'
    if (requirement.scope === 'optional') status = 'optional'
    else if (requirement.scope === 'out-of-scope') status = 'out-of-scope'
    else if (invalidationReasons.length) status = 'unverified'
    else if (requirement.mode === 'accepted') status = 'accepted'
    else if (requirement.mode === 'manual') status = 'manual'
    else if (requirement.mode !== 'automated') status = 'unverified'
    else if (evidence.some((check) => check.status === 'fail')) status = 'fail'
    else if (requirement.checkNames.length && !missingChecks.length && evidence.every((check) => check.status === 'pass')) status = 'pass'
    return {...requirement, status, missingChecks, evidence}
  })
  const mandatory = rows.filter((row) => row.scope === 'mandatory')
  const counts = Object.fromEntries(['pass', 'fail', 'unverified', 'manual', 'accepted'].map((status) => [status, mandatory.filter((row) => row.status === status).length]))
  return {overallCandidateCompliance: counts.fail ? 'fail' : mandatory.length && counts.pass === mandatory.length ? 'pass' : 'partial', sourceVersionsMatch, evidenceValid: invalidationReasons.length === 0, invalidationReasons, counts, rows}
}

const cell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
export function coverageMarkdown(coverage) {
  return `# Requirement coverage\n\nOverall candidate compliance: **${coverage.overallCandidateCompliance}**.\n\nSource versions match registry: ${coverage.sourceVersionsMatch}. Evidence integrity valid: ${coverage.evidenceValid}.\n\nInvalidation reasons: ${coverage.invalidationReasons.join(' ') || 'None.'}\n\nMandatory counts: ${JSON.stringify(coverage.counts)}. Accepted exceptions are not strict acceptance passes.\n\n| Clause | Original requirement / subclause | Source | Scope | Mode | Result | Actual check names | Manual instructions / accepted exception |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${coverage.rows.map((row) => `| ${[row.id, row.clause, row.source, row.scope, row.mode, row.status, row.checkNames.join('; '), [row.manualInstructions, row.acceptedException].filter(Boolean).join(' ')].map(cell).join(' | ')} |`).join('\n')}\n`
}

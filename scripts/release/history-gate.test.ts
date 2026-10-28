import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { join } from 'node:path'
import { checkHistoryAudit } from './history-gate.ts'

const tempRoot = process.env.TMPDIR ?? join(process.env.HOME ?? '', '.cache/wseffect-work/release-packages/tmp')
const makeTempDirectory = async () => {
  await mkdir(tempRoot, { recursive: true })
  return mkdtemp(join(tempRoot, 'wseffect-history-gate-'))
}

test('rejectsMissingReport', async () => {
  const directory = await makeTempDirectory()
  try {
    const result = await checkHistoryAudit({ reportPath: join(directory, 'missing.md'), ownerApprovedClean: true })
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /report/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejectsEmptyReport', async () => {
  const directory = await makeTempDirectory()
  const reportPath = join(directory, 'REPORT.md')
  try {
    await writeFile(reportPath, '  \n')
    const result = await checkHistoryAudit({ reportPath, ownerApprovedClean: true })
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /empty/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejectsMissingOwnerConfirmation', async () => {
  const directory = await makeTempDirectory()
  const reportPath = join(directory, 'REPORT.md')
  try {
    await writeFile(reportPath, 'Audit report reviewed separately.\n')
    const result = await checkHistoryAudit({ reportPath, ownerApprovedClean: false })
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /review|approval|confirm/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('acceptsOwnerConfirmedReport', async () => {
  const directory = await makeTempDirectory()
  const reportPath = join(directory, 'REPORT.md')
  try {
    await writeFile(reportPath, 'Reviewed report.\n')
    assert.deepEqual(await checkHistoryAudit({ reportPath, ownerApprovedClean: true }), { ok: true })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('doesNotCopyReportIntoRepository', async () => {
  const directory = await makeTempDirectory()
  const reportPath = join(directory, 'REPORT.md')
  const repositoryPath = join(directory, 'repository')
  try {
    await writeFile(reportPath, 'Reviewed report.\n')
    await mkdir(repositoryPath)
    const result = await checkHistoryAudit({ reportPath, ownerApprovedClean: true })
    assert.equal(result.ok, true)
    assert.equal(await readFile(reportPath, 'utf8'), 'Reviewed report.\n')
    await assert.rejects(readFile(join(repositoryPath, 'REPORT.md')))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { join } from 'node:path'
import { checkEffectExclusions, packRelease, runPreflight } from './preflight.ts'

const packageNames = ['@wsagency/wseffect-app', '@wsagency/wseffect-themes', '@wsagency/wseffect-foldkit', '@wsagency/wseffect-foldkit-ui', '@wsagency/wseffect-vite-plugin']
const fixture = () => ({
  manifests: packageNames.map((name) => ({ name, version: '1.2.3', repository: { url: 'https://github.com/wsagency/wseffect.git' } })),
  graph: { order: packageNames, edges: [{ from: packageNames[0]!, to: packageNames[1]! }] },
  commands: [] as Array<{ command: string; args: string[]; cwd?: string }>,
})

test('preflight requires a clean main branch equal to freshly fetched origin/main', async () => {
  const f = fixture()
  const result = await runPreflight({ version: '1.2.3', root: '/repo' }, {
    ...f,
    run: async (command, args, options) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      if (args[0] === 'branch') return 'feature'
      if (args[0] === 'status') return '?? untracked\n'
      if (args[0] === 'rev-parse') return args.includes('HEAD') ? 'same' : 'same'
      return ''
    },
    inspect: async () => ({ errors: [], sha256: 'abc', manifest: {} }),
    checkManifest: () => [],
  })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /branch.*main/i)
  assert.match(result.errors.join('\n'), /untracked|dirty/i)
})

test('preflight checks coordinated versions, repository checks, archives and every npm dry-run', async () => {
  const f = fixture()
  const result = await runPreflight({ version: '1.2.3', root: '/repo', historyAuditReviewed: true, forceRecord: true }, {
    ...f,
    run: async (command, args, options) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      if (args[0] === 'branch') return 'main'
      if (args[0] === 'status') return ''
      if (args[0] === 'rev-parse') return 'same'
      return ''
    },
    inspect: async () => ({ errors: [], sha256: 'abc', integrity: 'sha512-abc', manifest: {} }),
    checkManifest: () => [],
    checkHistoryAudit: async ({ ownerApprovedClean }) => ({ ok: ownerApprovedClean }),
  })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.deepEqual(result.order, f.graph.order)
  const dryRuns = f.commands.filter((entry) => entry.command === 'npm' && entry.args[0] === 'publish')
  assert.equal(dryRuns.length, 5)
  assert.deepEqual(dryRuns.map((entry) => entry.args), result.archives.map((artifact) => ['publish', artifact.archive, '--dry-run', '--ignore-scripts', '--tag', 'next', '--access', 'public']))
  assert.ok(f.commands.some((x) => x.args.includes('--release-version')))
})
test('preflight does not default owner audit approval and refuses before packing', async () => {
  const f = fixture()
  let ownerApprovedClean: boolean | undefined
  const result = await runPreflight({ version: '1.2.3', root: '/repo' }, {
    ...f,
    run: async (command, args, options) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      if (args[0] === 'branch') return 'main'
      if (args[0] === 'status') return ''
      if (args[0] === 'rev-parse') return 'same'
      return ''
    },
    inspect: async () => ({ errors: [], sha256: 'abc', integrity: 'sha512-abc', manifest: {} }),
    checkManifest: () => [],
    checkHistoryAudit: async ({ ownerApprovedClean: approved }) => {
      ownerApprovedClean = approved
      return { ok: false, reason: 'History audit requires --history-audit-reviewed' }
    },
  })
  assert.equal(ownerApprovedClean, false)
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /--history-audit-reviewed/)
  assert.equal(result.archives.length, 0)
  assert.equal(f.commands.some((entry) => entry.command === 'npm'), false)
})

test('preflight rejects mismatched manifest versions before artifact packing', async () => {
  const f = fixture()
  f.manifests[0]!.version = '0.0.0'
  const result = await runPreflight({ version: '1.2.3', root: '/repo' }, {
    ...f,
    run: async (command, args) => {
      if (args[0] === 'branch') return 'main'
      if (args[0] === 'rev-parse') return 'same'
      return ''
    },
    checkManifest: () => [],
  })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /version/i)
})

test('preflight rejects archive inspection errors and npm dry-run failures', async () => {
  const f = fixture()
  let rejectInspection = true
  let rejectDryRun = false
  const dependencies = {
    ...f,
    run: async (command: string, args: string[], options?: { cwd?: string }) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      if (args[0] === 'branch') return 'main'
      if (args[0] === 'status') return ''
      if (args[0] === 'rev-parse') return 'same'
      if (command === 'npm' && args.includes('--dry-run') && rejectDryRun) throw new Error('dry-run rejected')
      return ''
    },
    inspect: async () => ({ errors: rejectInspection ? ['bad archive'] : [], sha256: 'abc', integrity: 'sha512-abc', manifest: {} }),
    checkManifest: () => [],
    checkHistoryAudit: async () => ({ ok: true }),
  }
  const inspectionFailure = await runPreflight({ version: '1.2.3', root: '/repo', forceRecord: true }, dependencies)
  assert.match(inspectionFailure.errors.join('\\n'), /bad archive/)
  assert.equal(f.commands.some((command) => command.args.includes('--dry-run')), false)
  rejectInspection = false
  rejectDryRun = true
  const dryRunFailure = await runPreflight({ version: '1.2.3', root: '/repo', forceRecord: true }, dependencies)
  assert.match(dryRunFailure.errors.join('\\n'), /dry-run rejected/)
})

test('pack emits inspected archives and hashes in graph order outside the repository', async () => {
  const f = fixture()
  const out = `${process.env.HOME}/.cache/wseffect-work/release-packages/test-archives`
  const result = await packRelease({ version: '1.2.3', root: '/repo', out, forceRecord: true }, {
    ...f,
    run: async (command, args, options) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      return ''
    },
    inspect: async ({ archivePath }) => ({ errors: [], sha256: archivePath, manifest: {} }),
  })
  assert.deepEqual(result.map((item) => item.package), f.graph.order)
  assert.ok(f.commands.filter((x) => x.args[0] === 'pack').every((x) => x.command === 'pnpm' && x.cwd?.startsWith('/repo/packages/') && x.args.includes(out)))
})

async function makeTempRoot(): Promise<string> {
  const base = join(process.env.HOME!, '.cache/wseffect-work/release-packages/tmp')
  await mkdir(base, { recursive: true })
  return mkdtemp(join(base, 'preflight-pack-test-'))
}

test('pack rejects a child directory named with a leading dot-dot prefix', async () => {
  const parent = await makeTempRoot()
  const root = join(parent, 'repo')
  await mkdir(root)
  try {
    await assert.rejects(packRelease({ version: '1.2.3', root, out: join(root, '..cache') }, { manifests: [], graph: { order: [], edges: [] } }), /outside the Git working tree/)
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('pack accepts an actual sibling output directory', async () => {
  const parent = await makeTempRoot()
  const root = join(parent, 'repo')
  await mkdir(root)
  try {
    const result = await packRelease({ version: '1.2.3', root, out: join(parent, 'archives'), forceRecord: true }, { manifests: [], graph: { order: [], edges: [] }, run: async () => '' })
    assert.deepEqual(result, [])
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('pack rejects an output symlink resolving into the worktree', async () => {
  const parent = await makeTempRoot()
  const root = join(parent, 'repo')
  const link = join(parent, 'linked-archives')
  await mkdir(root)
  await symlink(root, link, 'dir')
  try {
    await assert.rejects(packRelease({ version: '1.2.3', root, out: link }, { manifests: [], graph: { order: [], edges: [] } }), /outside the Git working tree/)
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})
test('pack persists graph ordered release record and refuses overwrite unless forced', async () => {
  const parent = await makeTempRoot()
  const root = join(parent, 'repo')
  const recordPath = join(parent, 'records', '1.2.3.json')
  await mkdir(root)
  const f = fixture()
  const dependencies = {
    ...f,
    run: async (command: string, args: string[]) => args[0] === 'rev-parse' ? 'git-sha' : '',
    inspect: async ({ archivePath }: { archivePath: string }) => ({ errors: [], sha256: 'sha', integrity: 'sha512-integrity', manifest: {} }),
  }
  try {
    await packRelease({ version: '1.2.3', root, out: join(parent, 'archives'), record: recordPath }, dependencies)
    const record = JSON.parse(await readFile(recordPath, 'utf8'))
    assert.equal(record.version, '1.2.3')
    assert.equal(record.gitSha, 'git-sha')
    assert.ok(record.timestamp)
    assert.deepEqual(record.packages.map((item: { package: string }) => item.package), f.graph.order)
    assert.equal(record.packages[0].integrity, 'sha512-integrity')
    await assert.rejects(packRelease({ version: '1.2.3', root, out: join(parent, 'archives'), record: recordPath }, dependencies), /already exists/)
    await packRelease({ version: '1.2.3', root, out: join(parent, 'archives'), record: recordPath, forceRecord: true }, dependencies)
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('preflight accepts detached HEAD only at origin/main, but rejects other detached and named branches and stale main', async () => {
  const check = async (branch: string, head: string, origin: string) => {
    const f = fixture()
    return runPreflight({ version: '1.2.3', root: '/repo', historyAuditReviewed: true, forceRecord: true }, {
      ...f,
      run: async (_command, args) => {
        if (args[0] === 'branch') return branch
        if (args[0] === 'rev-parse') return args.includes('HEAD') ? head : origin
        return ''
      },
      inspect: async () => ({ errors: [], sha256: 'abc', integrity: 'sha512-abc', manifest: {} }),
      checkManifest: () => [],
      checkHistoryAudit: async () => ({ ok: true }),
    })
  }
  assert.equal((await check('', 'same', 'same')).ok, true)
  assert.match((await check('', 'other', 'same')).errors.join('\n'), /does not equal origin\/main/)
  assert.match((await check('release', 'same', 'same')).errors.join('\n'), /branch.*main/i)
  assert.match((await check('main', 'old', 'new')).errors.join('\n'), /does not equal origin\/main/)
})

test('preflight detects temporary Effect exclusions in root and consumer fixture workspaces', async () => {
  const root = await makeTempRoot()
  try {
    await mkdir(join(root, 'tests/consumer/fixtures/effect-4.0.7'), { recursive: true })
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAgeExclude: [ effect@4.0.7 ]\n')
    await writeFile(join(root, 'tests/consumer/fixtures/effect-4.0.7/pnpm-workspace.yaml'), 'minimumReleaseAgeExclude:\n  - "@effect/platform-browser@4.0.7"\n')
    const rootErrors = await checkEffectExclusions(root)
    assert.match(rootErrors.join('\n'), /effect@4\.0\.7/)
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAgeExclude: [ lodash@1.0.0 ]\n')
    const fixtureErrors = await checkEffectExclusions(root)
    assert.match(fixtureErrors.join('\n'), /@effect\/platform-browser@4\.0\.7/)
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAgeExclude: [ lodash@1.0.0 ]\n')
    await writeFile(join(root, 'tests/consumer/fixtures/effect-4.0.7/pnpm-workspace.yaml'), 'packages: []\n')
    assert.deepEqual(await checkEffectExclusions(root), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

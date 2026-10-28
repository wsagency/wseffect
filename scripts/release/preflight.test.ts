import assert from 'node:assert/strict'
import test from 'node:test'
import { runPreflight, packRelease } from './preflight.ts'

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
  const result = await runPreflight({ version: '1.2.3', root: '/repo' }, {
    ...f,
    run: async (command, args, options) => {
      f.commands.push({ command, args, cwd: options?.cwd })
      if (args[0] === 'branch') return 'main'
      if (args[0] === 'status') return ''
      if (args[0] === 'rev-parse') return 'same'
      return ''
    },
    inspect: async () => ({ errors: [], sha256: 'abc', manifest: {} }),
    checkManifest: () => [],
  })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.deepEqual(result.order, f.graph.order)
  assert.deepEqual(f.commands.filter((x) => x.args.includes('--dry-run')).length, 5)
  assert.ok(f.commands.some((x) => x.args.includes('--release-version')))
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
    inspect: async () => ({ errors: rejectInspection ? ['bad archive'] : [], sha256: 'abc', manifest: {} }),
    checkManifest: () => [],
  }
  const inspectionFailure = await runPreflight({ version: '1.2.3', root: '/repo' }, dependencies)
  assert.match(inspectionFailure.errors.join('\\n'), /bad archive/)
  assert.equal(f.commands.some((command) => command.args.includes('--dry-run')), false)
  rejectInspection = false
  rejectDryRun = true
  const dryRunFailure = await runPreflight({ version: '1.2.3', root: '/repo' }, dependencies)
  assert.match(dryRunFailure.errors.join('\\n'), /dry-run rejected/)
})

test('pack emits inspected archives and hashes in graph order outside the repository', async () => {
  const f = fixture()
  const out = `${process.env.HOME}/.cache/wseffect-work/release-packages/test-archives`
  const result = await packRelease({ version: '1.2.3', root: '/repo', out }, {
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

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import test from 'node:test'
import { attributeShell, classifyRequestTable, compareSize, measureSize, withMergeBaseFallback } from './size.ts'

const baseline = (entries: Record<string, { bytes: number; reason: string }> = {}) => ({
  unit: 'B' as const,
  compression: 'brotli-q11' as const,
  entries,
})

const report = (
  shell: number,
  firstVisitBytes = 0,
  pages: Record<string, number> = {},
  stylesCss?: number,
  speculativeBytes = 0,
  requestTable: Array<{ path: string; bytes: number; classification: 'mandatory' | 'speculative' }> = [],
) => ({
  shell,
  shellRaw: shell,
  firstVisit: { bytes: firstVisitBytes, requests: 0 },
  speculativePrefetch: { bytes: speculativeBytes, requests: requestTable.filter(({ classification }) => classification === 'speculative').length },
  requestTable,
  pages,
  ...(stylesCss === undefined ? {} : { stylesCss }),
})

const brotliBytes = (contents: Buffer) => brotliCompressSync(contents, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
}).byteLength

test('GATE-S1 rejects a shell over 120 KiB and accepts the exact limit', () => {
  const initial = baseline({ shell: { bytes: 122_880, reason: '' }, 'first-visit': { bytes: 1, reason: '' }, 'speculative-prefetch': { bytes: 1, reason: '' } })
  assert.deepEqual(compareSize(report(122_880), initial, initial).failures, [])
  assert.deepEqual(compareSize(report(122_881), initial, initial).failures, [
    'GATE-S1: shell 122881 B exceeds 122,880 B; do not raise the budget without user decision',
  ])
})

test('GATE-S2 rejects first-visit transfer over 160 KiB and accepts the exact limit', () => {
  const initial = baseline({ shell: { bytes: 1, reason: '' }, 'first-visit': { bytes: 163_840, reason: '' }, 'speculative-prefetch': { bytes: 1, reason: '' } })
  assert.deepEqual(compareSize(report(1, 163_840), initial, initial).failures, [])
  assert.ok(compareSize(report(1, 163_841), initial, initial).failures.includes(
    'GATE-S2: first-visit 163841 B exceeds 163,840 B',
  ))
})

test('GATE-S4 rejects speculative prefetch over 64 KiB and accepts the exact limit', () => {
  const initial = baseline({
    shell: { bytes: 1, reason: '' },
    'first-visit': { bytes: 1, reason: '' },
    'speculative-prefetch': { bytes: 65_536, reason: '' },
  })
  assert.deepEqual(compareSize(report(1, 1, {}, undefined, 65_536), initial, initial).failures, [])
  assert.ok(compareSize(report(1, 1, {}, undefined, 65_537), initial, initial).failures.includes(
    'GATE-S4: speculative-prefetch 65537 B exceeds 65,536 B',
  ))
})

test('manifest classification makes only non-primary page JS and CSS speculative', () => {
  const manifest = {
    'index.html': { file: 'assets/index.js', imports: ['_framework.js'], css: ['assets/index.css'] },
    'src/pages/dialog.ts': { file: 'assets/dialog.js', name: 'dialog', isDynamicEntry: true, imports: ['index.html', '_dialog-shared.js'] },
    'src/pages/theme.ts': { file: 'assets/theme.js', name: 'theme', isDynamicEntry: true, imports: ['index.html'], css: ['assets/theme.css'] },
    '_framework.js': { file: 'assets/framework.js' },
    '_dialog-shared.js': { file: 'assets/dialog-shared.js' },
  }
  const classified = classifyRequestTable(
    [
      { path: '/assets/index.js', bytes: 100 },
      { path: '/assets/theme.js', bytes: 20 },
      { path: '/assets/theme.css', bytes: 10 },
      { path: '/assets/dialog-shared.js', bytes: 30 },
      { path: '/manifest.webmanifest', bytes: 15 },
    ],
    manifest,
    ['dialog'],
    ['theme', 'dialog'],
  )
  assert.deepEqual(classified, [
    { path: '/assets/index.js', bytes: 100, classification: 'mandatory' },
    { path: '/assets/theme.js', bytes: 20, classification: 'speculative' },
    { path: '/assets/theme.css', bytes: 10, classification: 'speculative' },
    { path: '/assets/dialog-shared.js', bytes: 30, classification: 'mandatory' },
    { path: '/manifest.webmanifest', bytes: 15, classification: 'mandatory' },
  ])
})
test('manifest classification keeps the root static graph mandatory when the app has no primary pages', () => {
  const manifest = {
    'index.html': { file: 'assets/index.js', imports: ['_framework.js'], css: ['assets/index.css'] },
    'src/pages/buttons.ts': { file: 'assets/buttons.js', name: 'buttons', isDynamicEntry: true, imports: ['index.html'] },
    '_framework.js': { file: 'assets/framework.js' },
  }
  const classified = classifyRequestTable(
    [
      { path: '/assets/index.js', bytes: 100 },
      { path: '/assets/index.css', bytes: 200 },
      { path: '/assets/framework.js', bytes: 300 },
      { path: '/assets/buttons.js', bytes: 400 },
    ],
    manifest,
    [],
    ['buttons'],
  )
  assert.deepEqual(classified, [
    { path: '/assets/index.js', bytes: 100, classification: 'mandatory' },
    { path: '/assets/index.css', bytes: 200, classification: 'mandatory' },
    { path: '/assets/framework.js', bytes: 300, classification: 'mandatory' },
    { path: '/assets/buttons.js', bytes: 400, classification: 'speculative' },
  ])
})

test('size gate uses the candidate baseline when merge-base lookup is unavailable', () => {
  const candidate = baseline({ shell: { bytes: 100, reason: 'checked-out baseline' } })
  assert.equal(withMergeBaseFallback(candidate, () => { throw new Error('no origin/main') }), candidate)
  const base = baseline({ shell: { bytes: 90, reason: '' } })
  assert.equal(withMergeBaseFallback(candidate, () => base), base)
})

test('GATE-S3 rejects unexplained growth against merge-base and accepts only an updated candidate baseline', () => {
  const previous = baseline({
    shell: { bytes: 100, reason: '' },
    'first-visit': { bytes: 100, reason: '' },
    'speculative-prefetch': { bytes: 100, reason: '' },
    'page:form': { bytes: 100, reason: '' },
    'styles.css': { bytes: 100, reason: '' },
  })
  const current = report(103, 103, { form: 103 }, 103)
  const failures = compareSize(current, previous, previous).failures
  assert.deepEqual(failures.map((failure) => failure.match(/^GATE-S3: (.+?) /)?.[1]).sort(), [
    'first-visit', 'page:form', 'shell', 'styles.css',
  ])

  const explained = baseline(Object.fromEntries(
    Object.entries(previous.entries).map(([id, _entry]) => [id, { bytes: 103, reason: 'expected gallery increase' }]),
  ))
  assert.deepEqual(compareSize(current, previous, explained).failures, [])
})

test('GATE-S3 rejects current artifacts missing from the candidate baseline', () => {
  const failures = compareSize(report(103, 103, { form: 103 }), baseline(), baseline()).failures
  assert.ok(failures.some((failure) => failure.includes('shell is missing from size.json')))
  assert.ok(failures.some((failure) => failure.includes('page:form is missing from size.json')))
})

test('GATE-S3 permits a seeded artifact only with a reason and an encompassing baseline', () => {
  const current = report(100, 100, { form: 100 })
  const candidate = baseline({
    shell: { bytes: 100, reason: 'initial gallery measurement' },
    'first-visit': { bytes: 100, reason: 'initial gallery measurement' },
    'speculative-prefetch': { bytes: 100, reason: 'initial gallery measurement' },
    'page:form': { bytes: 100, reason: 'initial gallery measurement' },
  })
  const missingReason = baseline({ ...candidate.entries, shell: { bytes: 100, reason: '' } })
  assert.ok(compareSize(current, baseline(), missingReason).failures.some((failure) =>
    failure.includes('shell was added without a baseline reason')))
})

test('measureSize reports the built Gallery shell and all initial server responses', async () => {
  const appDir = resolve(import.meta.dirname, '../../apps/gallery')
  execFileSync('pnpm', ['--dir', appDir, 'build'], { stdio: 'inherit' })
  const distDir = join(appDir, 'dist')
  const assetsDir = join(distDir, 'assets')
  const assets = readdirSync(assetsDir)
  const entry = assets.find((name) => /^index-.*\.js$/.test(name))
  const framework = assets.find((name) => /^framework-.*\.js$/.test(name))
  assert.ok(entry, 'production build has an index entry chunk')
  assert.ok(framework, 'production build has the APP-23 framework chunk')
  const expectedShellRaw = readFileSync(join(assetsDir, entry)).byteLength + readFileSync(join(assetsDir, framework)).byteLength
  const expectedShell = brotliBytes(readFileSync(join(assetsDir, entry))) + brotliBytes(readFileSync(join(assetsDir, framework)))

  const result = await measureSize({ distDir, pagesDir: join(appDir, 'src', 'pages') })
  assert.equal(result.shell, expectedShell)
  assert.equal(result.shellRaw, expectedShellRaw)
  assert.deepEqual(Object.keys(result.pages).sort(), ['browser', 'buttons', 'capabilities', 'cards', 'dialog', 'dropdownMenu', 'form', 'island', 'layout', 'menus', 'persistence', 'sharedA', 'sharedB', 'signals', 'tabs', 'textField', 'theme', 'typography', 'validation', 'virtualList'])
  assert.ok((result.stylesCss ?? 0) > 0, 'Gallery emits CSS tracked as styles.css')
  assert.ok(result.firstVisit.requests >= 5, 'server counts the document, entry, framework, stylesheet, and service worker')
  assert.ok(result.firstVisit.bytes > 0, 'first-visit bytes come from server response bodies')
  assert.equal(result.requestTable.length, result.firstVisit.requests + result.speculativePrefetch.requests)
  assert.equal(result.requestTable.reduce((total, request) => total + request.bytes, 0), result.firstVisit.bytes + result.speculativePrefetch.bytes)
  assert.ok(result.requestTable.every(({ path, classification }) => path.startsWith('/') && (
    classification === 'mandatory' || classification === 'speculative'
  )))
})


test('shell source-map attribution reports source modules from both shell chunks', () => {
  const distDir = mkdtempSync(join(tmpdir(), 'wseffect-size-attribution-'))
  try {
    const assetsDir = join(distDir, 'assets')
    mkdirSync(assetsDir, { recursive: true })
    const sourceMap = (file: string, sources: string[], sourcesContent: Array<string | null>) => ({
      version: 3,
      file,
      sources,
      sourceRoot: '',
      names: [],
      mappings: '',
      sourcesContent,
    })
    writeFileSync(join(assetsDir, 'index-a.js.map'), JSON.stringify(sourceMap(
      'index-a.js',
      ['src/entry.ts'],
      ['export const entry = 1;'],
    )))
    writeFileSync(join(assetsDir, 'framework-b.js.map'), JSON.stringify(sourceMap(
      'framework-b.js',
      ['node_modules/foldkit/runtime.js'],
      ['export const frameworkRuntime = "shared framework module";'],
    )))
    writeFileSync(join(assetsDir, 'form-c.js.map'), JSON.stringify(sourceMap(
      'form-c.js',
      ['src/pages/form.ts'],
      ['export const formPage = true;'],
    )))

    const attribution = attributeShell(distDir)
    assert.deepEqual(attribution.map(({ chunk, source }) => `${chunk}:${source}`).sort(), [
      'framework:node_modules/foldkit/runtime.js',
      'index:src/entry.ts',
    ])
    assert.ok(attribution.every(({ bytes }) => bytes > 0))
  } finally {
    rmSync(distDir, { recursive: true, force: true })
  }
})

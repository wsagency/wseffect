import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import test from 'node:test'
import { build } from 'vite'
import { attributeShell, compareSize, measureSize } from './size.ts'

const baseline = (entries: Record<string, { bytes: number; reason: string }> = {}) => ({
  unit: 'B' as const,
  compression: 'brotli-q11' as const,
  entries,
})

const report = (shell: number, firstVisitBytes = 0, pages: Record<string, number> = {}, stylesCss?: number) => ({
  shell,
  shellRaw: shell,
  firstVisit: { bytes: firstVisitBytes, requests: 0 },
  pages,
  ...(stylesCss === undefined ? {} : { stylesCss }),
})

const brotliBytes = (contents: Buffer) => brotliCompressSync(contents, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
}).byteLength

test('GATE-S1 rejects a shell over 120 KiB and accepts the exact limit', () => {
  assert.deepEqual(compareSize(report(122_880), baseline()).failures, [])
  assert.deepEqual(compareSize(report(122_881), baseline()).failures, [
    'GATE-S1: shell 122881 B exceeds 122,880 B; do not raise the budget without user decision',
  ])
})

test('GATE-S2 rejects first-visit transfer over 160 KiB and accepts the exact limit', () => {
  assert.deepEqual(compareSize(report(1, 163_840), baseline()).failures, [])
  assert.ok(compareSize(report(1, 163_841), baseline()).failures.includes(
    'GATE-S2: first-visit 163841 B exceeds 163,840 B',
  ))
})

test('GATE-S3 checks every tracked artifact and permits explained growth', () => {
  const previous = baseline({
    shell: { bytes: 100, reason: '' },
    'first-visit': { bytes: 100, reason: '' },
    'page:form': { bytes: 100, reason: '' },
    'styles.css': { bytes: 100, reason: '' },
  })
  const current = report(103, 103, { form: 103 }, 103)
  const failures = compareSize(current, previous).failures
  assert.deepEqual(failures.map((failure) => failure.match(/^GATE-S3: (.+?) grew/)?.[1]).sort(), [
    'first-visit', 'page:form', 'shell', 'styles.css',
  ])

  const explained = baseline(Object.fromEntries(
    Object.entries(previous.entries).map(([id, entry]) => [id, { ...entry, reason: 'initial fixture measurement' }]),
  ))
  assert.deepEqual(compareSize(current, explained).failures, [])
})

test('measureSize reports the built shell and all initial server responses', async () => {
  const fixtureDir = resolve(import.meta.dirname, '../fixtures/mini-app')
  await build({ root: fixtureDir, configFile: join(fixtureDir, 'vite.config.ts'), logLevel: 'error' })

  const distDir = join(fixtureDir, 'dist')
  const assetsDir = join(distDir, 'assets')
  const assets = readdirSync(assetsDir)
  const entry = assets.find((name) => /^index-.*\.js$/.test(name))
  const framework = assets.find((name) => /^framework-.*\.js$/.test(name))
  assert.ok(entry, 'production build has an index entry chunk')
  assert.ok(framework, 'production build has the APP-23 framework chunk')
  const expectedShellRaw = readFileSync(join(assetsDir, entry)).byteLength + readFileSync(join(assetsDir, framework)).byteLength

  const expectedShell = brotliBytes(readFileSync(join(assetsDir, entry))) + brotliBytes(readFileSync(join(assetsDir, framework)))

  const result = await measureSize({ distDir, pagesDir: join(fixtureDir, 'src/pages') })
  assert.equal(result.shell, expectedShell)
  assert.equal(result.shellRaw, expectedShellRaw)
  assert.deepEqual(Object.keys(result.pages).sort(), ['form', 'menus'])
  assert.ok((result.stylesCss ?? 0) > 0, 'fixture emits CSS tracked as styles.css')
  assert.ok(result.firstVisit.requests >= 5, 'server counts the document, entry, framework, stylesheet, and service worker')
  assert.ok(result.firstVisit.bytes > 0, 'first-visit bytes come from server response bodies')
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
      ['export const frameworkRuntime = \"shared framework module\";'],
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

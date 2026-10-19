import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

import { validateManifest, wseffect } from '../src/vite/index.js'

const manifest = {
  name: 'Example app',
  short_name: 'Example',
  start_url: '/',
  display: 'standalone' as const,
  theme_color: '#123456',
  background_color: '#ffffff',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}

const testDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(testDirectory, '../../..')
const fixtureDirectory = join(testDirectory, 'fixtures/app-pages')
const appBuildId = resolve(testDirectory, '../src/buildId.ts')
const appEntry = resolve(testDirectory, '../src/index.ts')

async function buildFixture(
  pwa: false | { manifest: typeof manifest },
  alphaSource?: string,
): Promise<{ directory: string; output: string }> {
  const directory = mkdtempSync(join(workspaceRoot, '.wseffect-app-build-'))
  try {
    cpSync(fixtureDirectory, directory, { recursive: true })
    writeFileSync(join(directory, 'src/pages/package.json'), JSON.stringify({ sideEffects: false }))
    if (alphaSource !== undefined) writeFileSync(join(directory, 'src/pages/alpha.ts'), alphaSource)
    writeFileSync(join(directory, 'src/main.ts'), `${readFileSync(join(directory, 'src/main.ts'), 'utf8')}\nimport './entry.css'\n`)
    mkdirSync(join(directory, 'public'), { recursive: true })
    mkdirSync(join(directory, 'public/assets'), { recursive: true })
    writeFileSync(join(directory, 'public/extra.html'), '<!doctype html>')
    writeFileSync(join(directory, 'public/extra.css'), '.extra {}')
    writeFileSync(join(directory, 'public/assets/workbox-helper.js'), 'export {}')
    writeFileSync(join(directory, 'src/pages/alpha.ts'), `${readFileSync(join(directory, 'src/pages/alpha.ts'), 'utf8')}\nimport './alpha.css'\n`)
    writeFileSync(join(directory, 'src/pages/theme.ts'), `${readFileSync(join(directory, 'src/pages/beta.ts'), 'utf8')}\nimport './theme.css'\n`)
    writeFileSync(join(directory, 'src/entry.css'), 'html { --document-style: document; } body { --entry-style: entry; }')
    writeFileSync(join(directory, 'src/pages/alpha.css'), '.alpha { --primary-page-style: primary; }')
    writeFileSync(join(directory, 'src/pages/theme.css'), '.theme { --secondary-page-style: theme-palette; }')
    mkdirSync(join(directory, 'public/icons'), { recursive: true })
    writeFileSync(join(directory, 'public/icons/icon-extra.png'), '')
    writeFileSync(join(directory, 'public/icons/icon-192.png'), '')
    writeFileSync(join(directory, 'public/icons/icon-512.png'), '')
    mkdirSync(join(directory, 'node_modules/@wsagency'), { recursive: true })
    mkdirSync(join(directory, 'node_modules/@foldkit'), { recursive: true })
    symlinkSync(resolve(testDirectory, '../node_modules/foldkit'), join(directory, 'node_modules/foldkit'), 'dir')
    symlinkSync(resolve(testDirectory, '..'), join(directory, 'node_modules/@wsagency/wseffect-app'), 'dir')
    symlinkSync(resolve(testDirectory, '../node_modules/@foldkit/ui'), join(directory, 'node_modules/@foldkit/ui'), 'dir')
    await build({
      configFile: false,
      root: directory,
      plugins: wseffect({ primaryPages: ['alpha'], pwa }),
      resolve: {
        alias: [
          { find: '@wsagency/wseffect-app/buildId', replacement: appBuildId },
          { find: '@wsagency/wseffect-app', replacement: appEntry },
        ],
      },
      build: { outDir: join(directory, 'dist'), emptyOutDir: true, sourcemap: true, manifest: true },
    })
    return { directory, output: join(directory, 'dist') }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}

type BuildManifestEntry = {
  readonly file: string
  readonly name?: string
  readonly isDynamicEntry?: boolean
  readonly imports?: ReadonlyArray<string>
  readonly css?: ReadonlyArray<string>
}

type BuildManifest = Record<string, BuildManifestEntry>

function precacheUrls(output: string): string[] {
  const sw = readFileSync(join(output, 'sw.js'), 'utf8')
  const match = sw.match(/precacheAndRoute\((\[[\s\S]*?\])(?:\s*,[^)]*)?\s*\)/)
  if (match === null) throw new Error('Could not find precacheAndRoute manifest in sw.js')
  const entries = JSON.parse(match[1]!) as Array<{ url: string }>
  return entries.map(({ url }) => url).sort()
}

function expectedPrecacheUrls(
  output: string,
  appManifest: typeof manifest,
  primaryPages: ReadonlyArray<string>,
): string[] {
  const buildManifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8')) as BuildManifest
  const expected = new Set([
    'index.html',
    'manifest.webmanifest',
    ...appManifest.icons.map(({ src }) => src.replace(/^\/+/, '')),
  ])
  const addEntry = (key: string, visited = new Set<string>()) => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = buildManifest[key]
    if (entry === undefined) throw new Error(`Vite manifest is missing ${key}`)
    expected.add(entry.file)
    for (const css of entry.css ?? []) expected.add(css)
    for (const imported of entry.imports ?? []) addEntry(imported, visited)
  }

  addEntry('index.html')
  for (const page of primaryPages) {
    const pageEntry = Object.entries(buildManifest).find(([key, entry]) =>
      entry.isDynamicEntry === true && (entry.name === page || key.endsWith(`/pages/${page}.ts`)),
    )
    if (pageEntry === undefined) throw new Error(`Vite manifest is missing primary page ${page}`)
    addEntry(pageEntry[0])
  }
  for (const [key, entry] of Object.entries(buildManifest)) {
    if (entry.name === 'workbox-window' || /(?:^|\/)workbox-window-[^/]+\.js$/.test(entry.file)) addEntry(key)
  }
  return [...expected].sort()
}

function outputFiles(output: string): string[] {
  return readdirSync(join(output, 'assets')).filter((file) => file.endsWith('.js'))
}

describe('wseffect Vite plugin', () => {
  it('requires app identity and installable PNG icons in the web manifest', () => {
    expect(validateManifest(manifest)).toEqual([])
    expect(validateManifest({ ...manifest, icons: [] })).toEqual([
      'manifest requires a PNG icon at 192x192',
      'manifest requires a PNG icon at 512x512',
    ])
    expect(validateManifest({ ...manifest, start_url: '/app' })).toContain('manifest.start_url must be /')
  })

  it('precaches exactly the app manifest and allowed Vite build outputs', async () => {
    const { directory, output } = await buildFixture({ manifest })
    try {
      const files = outputFiles(output)
      const framework = files.find((file) => file.startsWith('framework-'))
      const index = files.find((file) => file.startsWith('index-'))
      const alpha = files.find((file) => file.startsWith('alpha-'))
      const beta = files.find((file) => file.startsWith('beta-'))
      expect(framework).toBeDefined()
      expect(index).toBeDefined()
      expect(alpha).toBeDefined()
      expect(beta).toBeDefined()

      const entry = readFileSync(join(output, 'assets', index!), 'utf8')
      const version = JSON.parse(readFileSync(join(output, 'version.json'), 'utf8')) as { buildId: string }
      expect(entry).toContain(version.buildId)
      for (const page of [alpha!, beta!]) {
        expect(readFileSync(join(output, 'assets', page), 'utf8')).toContain(framework)
        expect(readFileSync(join(output, 'assets', page), 'utf8')).not.toContain(index)
      }

      const sw = readFileSync(join(output, 'sw.js'), 'utf8')
      const assets = readdirSync(join(output, 'assets'))
      const actual = precacheUrls(output)
      expect(actual).toEqual(expectedPrecacheUrls(output, manifest, ['alpha']))
      expect(actual).toContain(`assets/${assets.find((file) => file.startsWith('index-') && file.endsWith('.css'))!}`)
      expect(actual).toContain(`assets/${assets.find((file) => file.startsWith('alpha-') && file.endsWith('.css'))!}`)
      expect(actual).not.toContain('extra.html')
      expect(actual).not.toContain('extra.css')
      expect(actual).not.toContain('icons/icon-extra.png')
      expect(actual).not.toContain('assets/workbox-helper.js')
      expect(actual.some((file) => /^(?:assets\/)?workbox-(?!window-).*\.js$/.test(file))).toBe(false)
      expect(actual.some((file) => /^(?:beta|theme)-.*\.css$/.test(file))).toBe(false)
      expect(actual.some((file) => /^(?:beta|theme)-.*\.js$/.test(file))).toBe(false)
      expect(sw).toContain('CacheFirst')
      expect(sw).toContain('wseffect-pages')
      expect(sw).toMatch(/maxEntries:\s*200/)
      expect(sw).toMatch(/maxAgeSeconds:\s*2592000/)
      expect(sw).toMatch(/clientsClaim|clients\.claim/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('keeps only boot packages in framework and lazy-loads page-only menu code', async () => {
    const { directory, output } = await buildFixture(false, "import * as Menu from '@foldkit/ui/menu'\n\nexport const page = { Menu }\n")
    try {
      const files = outputFiles(output)
      const framework = files.find((file) => file.startsWith('framework-'))!
      const index = files.find((file) => file.startsWith('index-'))!
      const alpha = files.find((file) => file.startsWith('alpha-'))!
      const sources = (file: string) =>
        (JSON.parse(readFileSync(join(output, 'assets', `${file}.map`), 'utf8')) as { sources: string[] }).sources
      const bootPackages = ['foldkit', 'effect', '@effect/platform-browser', '@wsagency/wseffect-app', 'workbox-window']
      const bootModule = (source: string) => source.includes('/packages/app/src/') || bootPackages.some((name) =>
        source.includes(`/node_modules/${name}/`) || source.includes(`/node_modules/.pnpm/${name.replace('/', '+')}@`),
      )
      expect(sources(framework).every(bootModule)).toBe(true)
      expect(sources(framework).some((source) => source.includes('@foldkit/ui/menu'))).toBe(false)
      expect(sources(alpha).some((source) => source.includes('/dist/menu/'))).toBe(true)
      expect(sources(index).some((source) => source.includes('/dist/menu/'))).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('changes only the entry and changed page chunk filenames when a page changes', async () => {
    const first = await buildFixture(false)
    try {
      const second = await buildFixture(false, "import { BUILD_ID } from '@wsagency/wseffect-app/buildId'\n\nexport const page = { name: 'alpha-updated', buildId: BUILD_ID }\n")
      try {
        const firstFiles = new Set(outputFiles(first.output))
        const secondFiles = new Set(outputFiles(second.output))
        const changed = [...firstFiles].filter((file) => !secondFiles.has(file))
        expect(changed).toHaveLength(2)
        expect(changed.map((file) => file.split('-')[0]).sort()).toEqual(['alpha', 'index'])
        expect([...secondFiles].filter((file) => !firstFiles.has(file)).map((file) => file.split('-')[0]).sort())
          .toEqual(['alpha', 'index'])
      } finally {
        rmSync(second.directory, { recursive: true, force: true })
      }
    } finally {
      rmSync(first.directory, { recursive: true, force: true })
    }
  })

  it('builds without a service worker when PWA is disabled', async () => {
    const { directory, output } = await buildFixture(false)
    try {
      expect(readdirSync(output)).not.toContain('sw.js')
      const entry = readFileSync(join(output, 'assets', outputFiles(output).find((file) => file.startsWith('index-'))!), 'utf8')
      expect(entry).not.toContain('workbox')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

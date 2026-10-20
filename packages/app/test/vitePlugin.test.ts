import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
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

type FixtureResolveDependencies = (
  filename: string,
  deps: Array<string>,
  context: { readonly hostId: string; readonly hostType: 'html' | 'js' },
) => Array<string>

interface BuildFixtureOptions {
  readonly modulePreload?: false | {
    readonly polyfill?: boolean
    readonly resolveDependencies?: FixtureResolveDependencies
  }
  readonly extraPages?: Readonly<Record<string, string>>
  readonly outputFilePattern?: string
}

async function buildFixture(
  pwa: false | { manifest: typeof manifest },
  alphaSource?: string,
  options: BuildFixtureOptions = {},
): Promise<{ directory: string; output: string }> {
  const directory = mkdtempSync(join(workspaceRoot, '.wseffect-app-build-'))
  try {
    cpSync(fixtureDirectory, directory, { recursive: true })
    writeFileSync(join(directory, 'src/pages/package.json'), JSON.stringify({ sideEffects: false }))
    if (alphaSource !== undefined) writeFileSync(join(directory, 'src/pages/alpha.ts'), alphaSource)
    for (const [key, source] of Object.entries(options.extraPages ?? {})) {
      writeFileSync(join(directory, `src/pages/${key}.ts`), source)
    }
    writeFileSync(
      join(directory, 'src/main.ts'),
      `${readFileSync(join(directory, 'src/main.ts'), 'utf8')}\nimport './entry.css'\nimport { Props } from '@wsagency/wseffect-themes/components/box'\ndocument.documentElement.dataset.theme = String(Props)\n`,
    )
    mkdirSync(join(directory, 'public'), { recursive: true })
    mkdirSync(join(directory, 'public/assets'), { recursive: true })
    writeFileSync(join(directory, 'public/extra.html'), '<!doctype html>')
    writeFileSync(join(directory, 'public/extra.css'), '.extra {}')
    writeFileSync(join(directory, 'public/assets/workbox-helper.js'), 'export {}')
    writeFileSync(
      join(directory, 'src/pages/alpha.ts'),
      `${readFileSync(join(directory, 'src/pages/alpha.ts'), 'utf8')}\nimport { Props } from '@wsagency/wseffect-themes/components/box'\nexport const sharedTheme = Props\nimport './alpha.css'\n`,
    )
    writeFileSync(
      join(directory, 'src/pages/theme.ts'),
      `${readFileSync(join(directory, 'src/pages/beta.ts'), 'utf8')}\nimport { Props } from '@wsagency/wseffect-themes/components/box'\nexport const sharedTheme = Props\nimport './theme.css'\n`,
    )
    writeFileSync(join(directory, 'src/entry.css'), 'html { --document-style: document; } body { --entry-style: entry; }')
    writeFileSync(join(directory, 'src/pages/alpha.css'), '.alpha { --primary-page-style: primary; }')
    writeFileSync(join(directory, 'src/pages/theme.css'), '.theme { --secondary-page-style: theme-palette; }')
    mkdirSync(join(directory, 'public/icons'), { recursive: true })
    writeFileSync(join(directory, 'public/icons/icon-extra.png'), '')
    writeFileSync(join(directory, 'public/icons/icon-192.png'), '')
    writeFileSync(join(directory, 'public/icons/icon-512.png'), '')
    mkdirSync(join(directory, 'node_modules/@wsagency'), { recursive: true })
    symlinkSync(
      resolve(testDirectory, '../../themes'),
      join(directory, 'node_modules/@wsagency/wseffect-themes'),
      'dir',
    )
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
          { find: /^@wsagency\/wseffect-app$/, replacement: appEntry },
        ],
      },
      build: {
        outDir: join(directory, 'dist'),
        emptyOutDir: true,
        sourcemap: true,
        manifest: true,
        ...(options.modulePreload === undefined ? {} : { modulePreload: options.modulePreload }),
        ...(options.outputFilePattern === undefined ? {} : {
          rolldownOptions: {
            output: {
              entryFileNames: options.outputFilePattern,
              chunkFileNames: options.outputFilePattern,
            },
          },
        }),
      },
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
  const assets = join(output, 'assets')
  const files: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) files.push(relative(assets, path))
    }
  }
  visit(assets)
  return files
}

function modulePreloadDependencies(output: string): Array<string> {
  return outputFiles(output).flatMap((file) => {
    const code = readFileSync(join(output, 'assets', file), 'utf8')
    const match = code.match(/__vite__mapDeps[\s\S]*?\.f=\[([^\]]*)\]/)
    return match === null ? [] : [...match[1].matchAll(/"([^"]+)"/g)].map(([, dependency]) => dependency!)
  })
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
      const appShared = files.find((file) => file.startsWith('app-shared-'))
      expect(framework).toBeDefined()
      expect(index).toBeDefined()
      expect(alpha).toBeDefined()
      expect(beta).toBeDefined()
      expect(appShared).toBeDefined()

      const entry = readFileSync(join(output, 'assets', index!), 'utf8')
      const version = JSON.parse(readFileSync(join(output, 'version.json'), 'utf8')) as { buildId: string }
      expect(entry).toContain(version.buildId)
      for (const page of [alpha!, beta!]) {
        expect(readFileSync(join(output, 'assets', page), 'utf8')).toContain(appShared)
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
      expect(sw).toContain(String.raw`/\/assets\/.*\.(?:js|css)$/`)
      expect(sw).toContain('CacheFirst')
      expect(sw).toContain('wseffect-pages')
      expect(sw).toMatch(/statuses:\s*\[200\]/)
      expect(sw).toMatch(/maxEntries:\s*200/)
      expect(sw).toMatch(/maxAgeSeconds:\s*2592000/)
      expect(sw).toMatch(/clientsClaim|clients\.claim/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('keeps boot packages and app runtime in framework and lazy-loads page-only menu code', async () => {
    const { directory, output } = await buildFixture(false, "import * as Menu from '@foldkit/ui/menu'\nimport * as Dialog from '@foldkit/ui/dialog'\nimport * as Tabs from '@foldkit/ui/tabs'\n\nexport const page = { Menu, Dialog, Tabs }\n")
    try {
      const files = outputFiles(output)
      const framework = files.find((file) => file.startsWith('framework-'))!
      const alpha = files.find((file) => file.startsWith('alpha-'))!
      const sources = (file: string) =>
        (JSON.parse(readFileSync(join(output, 'assets', `${file}.map`), 'utf8')) as { sources: string[] }).sources
      const bootPackages = ['foldkit', 'effect', '@effect/platform-browser', 'workbox-window']
      const bootModule = (source: string) => source.includes('/packages/app/') || bootPackages.some((name) =>
        source.includes(`/node_modules/${name}/`) || source.includes(`/node_modules/.pnpm/${name.replace('/', '+')}@`),
      )
      expect(sources(framework).every(bootModule)).toBe(true)
      expect(sources(framework).some((source) => source.includes('@foldkit/ui/menu'))).toBe(false)
      expect(sources(alpha).some((source) => source.includes('/dist/menu/'))).toBe(true)
      const buildManifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8')) as BuildManifest
      const staticKeys = new Set<string>()
      const pending = ['index.html']
      while (pending.length > 0) {
        const key = pending.pop()!
        if (staticKeys.has(key)) continue
        staticKeys.add(key)
        pending.push(...(buildManifest[key]?.imports ?? []))
      }
      const staticSources = [...staticKeys].flatMap((key) => {
        const file = buildManifest[key]?.file
        if (file === undefined || !file.endsWith('.js')) return []
        return sources(file.split('/').at(-1)!)
      })
      expect(staticSources.some((source) => /@foldkit\/ui\/(?:dialog|menu|tabs)|@floating-ui/.test(source))).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('keeps app runtime modules statically used by the entry in framework', async () => {
    const { directory, output } = await buildFixture(false)
    try {
      const framework = outputFiles(output).find((file) => file.startsWith('framework-'))
      expect(framework).toBeDefined()
      const sources = (JSON.parse(readFileSync(join(output, 'assets', `${framework}.map`), 'utf8')) as { sources: string[] }).sources
      expect(sources.some((source) => source.endsWith('/dist/registry.js'))).toBe(true)
      expect(sources.some((source) => source.endsWith('/dist/kit/binding.js'))).toBe(true)
      expect(sources.some((source) => source.endsWith('/dist/kit/messages.js'))).toBe(true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })


  it('keeps app capability helpers in their lazy page chunks', async () => {
    const { directory, output } = await buildFixture(false, "import { signalSubscription } from '@wsagency/wseffect-app'\nexport const page = { name: 'alpha', signalSubscription }\n")
    try {
      const buildManifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8')) as BuildManifest
      const helperEntry = Object.entries(buildManifest).find(([key, entry]) =>
        entry.isDynamicEntry === true && key.endsWith('/pages/alpha.ts'),
      )
      if (helperEntry === undefined) throw new Error('Vite manifest is missing the helper page')
      const closure = (start: string): Set<string> => {
        const visited = new Set<string>()
        const pending = [start]
        while (pending.length > 0) {
          const key = pending.pop()!
          if (visited.has(key)) continue
          visited.add(key)
          pending.push(...(buildManifest[key]?.imports ?? []))
        }
        return visited
      }
      const includesSignalHelper = (keys: ReadonlySet<string>): boolean =>
        [...keys].some((key) => {
          const file = buildManifest[key]?.file
          if (file === undefined || !file.endsWith('.js')) return false
          const sourceMap = JSON.parse(readFileSync(join(output, `${file}.map`), 'utf8')) as { sources?: string[] }
          return (sourceMap.sources ?? []).some((source) =>
            source.endsWith('/src/signals.ts') || source.endsWith('/dist/signals.js'),
          )
        })
      expect(includesSignalHelper(closure('index.html'))).toBe(false)
      expect(includesSignalHelper(closure(helperEntry[0]))).toBe(true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps app-shared stable while the entry and changed page chunk are renamed', async () => {
    const first = await buildFixture(false)
    try {
      const second = await buildFixture(false, "import { sharedContract } from '../sharedContract'\nimport { BUILD_ID } from '@wsagency/wseffect-app/buildId'\n\nexport const page = { name: 'alpha-updated', buildId: BUILD_ID, contract: sharedContract }\n")
      try {
        const firstFiles = new Set(outputFiles(first.output))
        const secondFiles = new Set(outputFiles(second.output))
        const changed = [...firstFiles].filter((file) => !secondFiles.has(file))
        const added = [...secondFiles].filter((file) => !firstFiles.has(file))
        expect(changed.map((file) => file.split('-')[0]).sort()).toEqual(['alpha', 'index'])
        expect(added.map((file) => file.split('-')[0]).sort()).toEqual(['alpha', 'index'])

        const appShared = [...firstFiles].find((file) => file.startsWith('app-shared-'))
        const framework = [...firstFiles].find((file) => file.startsWith('framework-'))
        const beta = [...firstFiles].find((file) => file.startsWith('beta-'))
        const theme = [...firstFiles].find((file) => file.startsWith('theme-'))
        expect(appShared).toBeDefined()
        expect(framework).toBeDefined()
        expect(beta).toBeDefined()
        expect(theme).toBeDefined()
        for (const file of [appShared!, framework!, beta!, theme!]) {
          expect(secondFiles.has(file)).toBe(true)
          expect(readFileSync(join(first.output, 'assets', file))).toEqual(readFileSync(join(second.output, 'assets', file)))
        }
        const sharedMap = JSON.parse(readFileSync(join(first.output, 'assets', `${appShared}.map`), 'utf8')) as { sources: string[] }
        expect(sharedMap.sources.some((source) => source.endsWith('/src/sharedContract.ts'))).toBe(true)
        expect(sharedMap.sources.some((source) => source.endsWith('/packages/themes/dist/components/box.js'))).toBe(true)
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
  it('does not modulepreload registry page chunks', async () => {
    const { directory, output } = await buildFixture(
      false,
      "import { page as frameworkPage } from './framework'\nexport const page = { name: 'alpha', frameworkPage }\n",
      {
        extraPages: {
          app: "export const page = { name: 'app' }",
          framework: "export const page = { name: 'framework' }",
        },
        outputFilePattern: 'assets/[name]-[hash]/index.js',
      },
    )
    try {
      const buildManifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8')) as BuildManifest
      const pageFiles = new Set(Object.entries(buildManifest)
        .filter(([key, entry]) => entry.isDynamicEntry === true && key.includes('/pages/'))
        .map(([, entry]) => entry.file))
      expect([...pageFiles].every((file) => file.endsWith('/index.js'))).toBe(true)
      const preloadDependencies = modulePreloadDependencies(output)
      expect([...preloadDependencies].filter((dependency) => pageFiles.has(dependency))).toEqual([])

      const sharedFiles = outputFiles(output)
        .filter((file) => /(?:^|\/)(?:app-shared|framework)-/.test(file))
        .map((file) => `assets/${file}`)
        .filter((file) => !pageFiles.has(file))
      expect(sharedFiles.some((file) => file.includes('/app-shared-'))).toBe(true)
      expect(sharedFiles.some((file) => file.includes('/framework-'))).toBe(true)
      expect(preloadDependencies).toEqual(expect.arrayContaining(sharedFiles))
      const alpha = buildManifest['src/pages/alpha.ts']!
      expect(alpha.css).toBeDefined()
      expect(preloadDependencies).toContain(alpha.css![0])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('composes a path-rewriting consumer resolver without reintroducing page chunks', async () => {
    const observed: Array<string> = []
    const { directory, output } = await buildFixture(
      false,
      "import { page as frameworkPage } from './framework'\nexport const page = { name: 'alpha', frameworkPage }\n",
      {
        extraPages: { framework: "export const page = { name: 'framework' }" },
        modulePreload: {
          resolveDependencies: (_filename, deps, context) => {
            observed.push(context.hostType)
            return deps.map((dependency) => `./${dependency}`)
          },
        },
        outputFilePattern: 'assets/[name]-[hash].mjs',
      },
    )
    try {
      expect(observed.length).toBeGreaterThan(0)
      const buildManifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8')) as BuildManifest
      const pageFiles = new Set(Object.entries(buildManifest)
        .filter(([key, entry]) => entry.isDynamicEntry === true && key.includes('/pages/'))
        .map(([, entry]) => entry.file))
      expect([...pageFiles].every((file) => file.endsWith('.mjs'))).toBe(true)
      const dependencies = modulePreloadDependencies(output)
      const canonicalDependencies = dependencies.map((dependency) => dependency.replace(/^\.\//, ''))
      expect(canonicalDependencies.filter((dependency) => pageFiles.has(dependency))).toEqual([])
      const sharedFiles = outputFiles(output)
        .filter((file) => /(?:^|\/)(?:app-shared|framework)-/.test(file))
        .map((file) => `assets/${file}`)
        .filter((file) => !pageFiles.has(file))
      expect(sharedFiles.some((file) => file.includes('/app-shared-'))).toBe(true)
      expect(sharedFiles.some((file) => file.includes('/framework-'))).toBe(true)
      expect(dependencies).toEqual(expect.arrayContaining(sharedFiles.map((file) => `./${file}`)))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('preserves disabled modulepreload configuration', async () => {
    const { directory, output } = await buildFixture(false, undefined, { modulePreload: false })
    try {
      expect(modulePreloadDependencies(output).some((dependency) => dependency.endsWith('.js'))).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

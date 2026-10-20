import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { build } from 'vite'
import { wseffect } from '../../packages/app/dist/vite/index.js'
import {
  checkAppCapabilityModules,
  checkUnusedAppCapabilityModules,
  effectModulesFromSourceMap,
  formatAppCapabilityModuleFailure,
  resolveAppCapabilityAvailability,
} from '../../tools/gates/app-capabilities.ts'
import { appCapabilityManifestClosures, checkAppCapabilitySizes } from '../../tools/gates/app-capability-size.ts'

interface SourceMap {
  readonly sources?: ReadonlyArray<string>
}
interface ManifestEntry {
  readonly file: string
  readonly isEntry?: boolean
  readonly isDynamicEntry?: boolean
  readonly src?: string
  readonly imports?: ReadonlyArray<string>
  readonly dynamicImports?: ReadonlyArray<string>
}
type Manifest = Record<string, ManifestEntry>

const FIXTURE_EXTERNALS = /^(?:effect|@effect\/platform-browser|foldkit|@foldkit\/ui|@wsagency\/wseffect-themes|virtual:pwa-register)(?:\/.*)?$/

export async function exportedNamesFromTypes(declarationFile: string): Promise<Set<string>> {
  const names = new Set<string>()
  const visited = new Set<string>()
  const visit = async (path: string): Promise<void> => {
    const file = resolve(path)
    if (visited.has(file)) return
    visited.add(file)
    const declaration = await readFile(file, 'utf8')
    for (const match of declaration.matchAll(/\bexport\s+(?:declare\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([\w$]+)/g)) {
      names.add(match[1]!)
    }
    for (const match of declaration.matchAll(/\bexport\s+(?:type\s+)?\*\s+as\s+([\w$]+)\s+from\s*(['"])(.*?)\2/g)) {
      names.add(match[1]!)
    }
    for (const match of declaration.matchAll(/\bexport\s+(?:type\s+)?\{([^}]+)\}(?:\s*from\s*(['"])(.*?)\2)?/g)) {
      for (const item of match[1]!.split(',')) {
        const [original, alias] = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)
        const exported = alias ?? original
        if (exported && exported !== 'default') names.add(exported)
      }
    }
    for (const match of declaration.matchAll(/\bexport\s+(?:type\s+)?\*\s+from\s*(['"])(.*?)\1/g)) {
      const specifier = match[2]!
      if (!specifier.startsWith('.')) continue
      const target = resolve(dirname(file), specifier)
      const candidates = target.endsWith('.js')
        ? [target.slice(0, -'.js'.length) + '.d.ts']
        : [target.endsWith('.d.ts') ? target : `${target}.d.ts`, join(target, 'index.d.ts'), target]
      let child: string | undefined
      for (const candidate of candidates) {
        try {
          await readFile(candidate)
          child = candidate
          break
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
      if (!child) throw new Error(`${file}: could not resolve declaration export '${specifier}'`)
      await visit(child)
    }
  }
  await visit(declarationFile)
  names.delete('default')
  return names
}

function brotliBytes(source: Buffer): number {
  return brotliCompressSync(source, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength
}

async function findFiles(directory: string, suffix: string): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await findFiles(path, suffix))
    else if (entry.name.endsWith(suffix)) result.push(path)
  }
  return result
}

const BASELINE_APP_SOURCE = `import { Effect, Option, Schema, Stream } from 'effect'
import { Command, Runtime, Subscription } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'


const Model = Schema.Struct({ count: Schema.Number })
const Message = defineTaggedUnion({
  OpenHelper: {},
  HelperLoaded: {},
  HelperFailed: {},
  Incremented: { count: Schema.Number },
})
const LoadHelper = Command.define('LoadHelper', {
  messages: [Message.HelperLoaded, Message.HelperFailed],
  execute: () => Effect.match(
    Effect.tryPromise({ try: () => import('./pages/helper.ts'), catch: () => new Error('Helper page failed') }),
    {
      onFailure: () => Message.HelperFailed(),
      onSuccess: (module) => module.page === undefined ? Message.HelperFailed() : Message.HelperLoaded(),
    },
  ),
})
const subscriptions = Subscription.make<typeof Model.Type, typeof Message.Type>()((entry) => ({
  'baseline:count': entry(
    { count: Schema.Number },
    {
      modelToDependencies: (model) => ({ count: model.count }),
      dependenciesToStream: () => Stream.empty,
    },
  ),
}))
const decodedModel = Schema.decodeUnknownOption(Model)({ count: 0 })
const application = Runtime.makeElement({
  Model,
  container: document.getElementById('app'),
  init: () => ({ model: Option.getOrElse(decodedModel, () => ({ count: 0 })) }),
  update: (model, message) => {
    if (message._tag === 'OpenHelper') return { model, commands: [LoadHelper()] }
    if (message._tag === 'Incremented') return { model: { count: model.count + message.count } }
    return { model }
  },
  view: (_model, h) => h.div([], ['baseline']),
  subscriptions,
})
Runtime.run(application)
`

function lazyManifestClosure(manifest: Manifest, start: string, eager: ReadonlySet<string>): Set<string> {
  const lazy = new Set<string>()
  const visit = (key: string): void => {
    if (eager.has(key) || lazy.has(key)) return
    const entry = manifest[key]
    if (!entry) throw new Error(`Vite manifest references missing chunk '${key}'`)
    lazy.add(key)
    for (const imported of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) visit(imported)
  }
  visit(start)
  return lazy
}

function manifestImportChain(manifest: Manifest, start: string, target: string): string[] {
  const previous = new Map<string, { readonly importer: string; readonly kind: 'static' | 'dynamic' }>()
  previous.set(start, { importer: '', kind: 'static' })
  const pending = [start]
  for (let index = 0; index < pending.length; index += 1) {
    const importer = pending[index]!
    if (importer === target) break
    const entry = manifest[importer]
    if (!entry) continue
    for (const [kind, imported] of [
      ...((entry.imports ?? []).map((key) => ['static', key] as const)),
      ...((entry.dynamicImports ?? []).map((key) => ['dynamic', key] as const)),
    ]) {
      if (previous.has(imported)) continue
      previous.set(imported, { importer, kind })
      pending.push(imported)
    }
  }
  if (!previous.has(target)) return []
  const reversed: string[] = []
  for (let key = target; key !== start;) {
    const step = previous.get(key)!
    reversed.push(`${step.kind} import: ${step.importer} -> ${key}`)
    key = step.importer
  }
  return reversed.reverse()
}

async function buildFixture(input: {
  readonly consumerRoot: string
  readonly fixturesDirectory: string
  readonly helper?: string
  readonly externals: boolean
}): Promise<{
  readonly helperBytes: number
  readonly modules: string[]
  readonly eagerReachable: boolean
  readonly helperIncluded: boolean
  readonly helperImporterChains: string[]
  readonly effectModuleImporterChains: Readonly<Record<string, string[]>>
  readonly sources: string[]
}> {
  const fixtureName = input.helper === undefined
    ? 'baseline'
    : `${input.helper}${input.externals ? '-size' : '-modules'}`
  const fixture = join(input.consumerRoot, `.app-capability-${fixtureName}`)
  const src = join(fixture, 'src')
  const pages = join(src, 'pages')
  await mkdir(pages, { recursive: true })
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: `wseffect-app-capability-${fixtureName}`, private: true, type: 'module' }))
  await writeFile(join(fixture, 'index.html'), '<!doctype html><html><head></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n')
  await writeFile(join(src, 'main.ts'), BASELINE_APP_SOURCE)
  await writeFile(join(pages, 'package.json'), JSON.stringify({ sideEffects: false }))
  const helperSource = input.helper === undefined
    ? 'export const page = {}\n'
    : await readFile(join(input.fixturesDirectory, `${input.helper}.ts`), 'utf8')
  await writeFile(join(pages, 'helper.ts'), helperSource)

  const previousBuildId = process.env.WSEFFECT_BUILD_ID
  process.env.WSEFFECT_BUILD_ID ??= 'd5c0ffee'
  try {
    await build({
      configFile: false,
      root: fixture,
      logLevel: 'error',
      plugins: wseffect({ primaryPages: [], pwa: false }),
      define: { 'process.env.NODE_ENV': '"production"' },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        manifest: true,
        minify: true,
        rollupOptions: input.externals ? { external: FIXTURE_EXTERNALS } : {},
      },
    })
  } finally {
    if (previousBuildId === undefined) delete process.env.WSEFFECT_BUILD_ID
    else process.env.WSEFFECT_BUILD_ID = previousBuildId
  }

  const dist = join(fixture, 'dist')
  const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8')) as Manifest
  const entryPair = Object.entries(manifest).find(([, item]) => item.isEntry)
  if (!entryPair) throw new Error(`${fixtureName}: Vite manifest is missing its entry`)
  const [entryKey] = entryPair
  const closures = appCapabilityManifestClosures(manifest, entryKey)
  const helperEntryPair = Object.entries(manifest).find(([key, item]) =>
    item.isDynamicEntry === true && (key.endsWith('/pages/helper.ts') || item.src?.endsWith('/pages/helper.ts')),
  )
  if (!helperEntryPair) throw new Error(`${fixtureName}: Vite manifest is missing the lazy helper page`)
  const helperLazy = lazyManifestClosure(manifest, helperEntryPair[0], closures.eager)

  const maps = await findFiles(dist, '.js.map')
  const sourcesByFile = new Map<string, ReadonlyArray<string>>()
  for (const path of maps) {
    const sourceMap = JSON.parse(await readFile(path, 'utf8')) as SourceMap
    const file = path.slice(dist.length + 1, -'.map'.length).replaceAll('\\', '/')
    sourcesByFile.set(file, sourceMap.sources ?? [])
  }
  const measuredKeys = new Set([...closures.eager, ...helperLazy])
  const sources: string[] = []
  for (const key of measuredKeys) {
    const file = manifest[key]!.file
    if (file.endsWith('.js')) sources.push(...(sourcesByFile.get(file) ?? []))
  }
  let helperBytes = 0
  for (const key of helperLazy) {
    const file = manifest[key]!.file
    if (file.endsWith('.js')) helperBytes += brotliBytes(await readFile(join(dist, file)))
  }
  const helperSourcePath = input.helper === undefined ? undefined : `/dist/${input.helper}.js`
  const helperLazySources = [...helperLazy].flatMap((key) => sourcesByFile.get(manifest[key]!.file) ?? [])
  const helperIncluded = helperSourcePath !== undefined && helperLazySources.some((source) => source.replaceAll('\\', '/').endsWith(helperSourcePath))
  const eagerReachable = helperSourcePath !== undefined && [...closures.eager].some((key) =>
    (sourcesByFile.get(manifest[key]!.file) ?? []).some((source) => source.replaceAll('\\', '/').endsWith(helperSourcePath)),
  )
  const helperChunks = helperSourcePath === undefined ? [] : Object.entries(manifest).filter(([, entry]) =>
    (sourcesByFile.get(entry.file) ?? []).some((source) => source.replaceAll('\\', '/').endsWith(helperSourcePath)),
  )
  const importerChain = (key: string): string => {
    const chain = manifestImportChain(manifest, entryKey, key)
    return chain.length > 0 ? chain.join(' ; ') : key === entryKey ? `entry ${key}` : `no manifest path from ${entryKey} to ${key}`
  }
  const helperImporterChains = helperChunks.map(([key]) => importerChain(key))
  const modules = effectModulesFromSourceMap(sources)
  const effectModuleImporterChains = Object.fromEntries(modules.map((module) => {
    const suffix = `/effect/dist/${module}`
    const chunkKeys = Object.entries(manifest).filter(([, entry]) =>
      (sourcesByFile.get(entry.file) ?? []).some((source) => source.replaceAll('\\', '/').endsWith(suffix)),
    ).map(([key]) => key)
    return [module, chunkKeys.map(importerChain)]
  }))
  return { helperBytes, modules, eagerReachable, helperIncluded, helperImporterChains, effectModuleImporterChains, sources }
}

export async function checkPackedAppCapabilities(input: {
  readonly consumerRoot: string
  readonly fixturesDirectory: string
  readonly requireAll?: boolean
}): Promise<void> {
  const appRoot = resolve(input.consumerRoot, 'node_modules/@wsagency/wseffect-app')
  const packageJson = JSON.parse(await readFile(join(appRoot, 'package.json'), 'utf8')) as { exports?: Record<string, unknown> }
  if (!packageJson.exports?.['.']) throw new Error('@wsagency/wseffect-app does not expose its root export')
  const availability = resolveAppCapabilityAvailability({ exportedNames: await exportedNamesFromTypes(join(appRoot, 'dist/index.d.ts')), requireAll: input.requireAll })
  for (const missing of availability.missing) console.log(`app capability not exported yet: ${missing}`)
  if (availability.available.length === 0) {
    console.log('app capability fixtures: no registered helpers are exported yet; set WSEFFECT_REQUIRE_APP_CAPABILITIES=1 after helper integration')
    return
  }

  const baseline = await buildFixture({ consumerRoot: input.consumerRoot, fixturesDirectory: input.fixturesDirectory, externals: false })
  for (const capability of availability.available) {
    const sizeFixture = await buildFixture({ consumerRoot: input.consumerRoot, fixturesDirectory: input.fixturesDirectory, helper: capability.helper, externals: true })
    if (!sizeFixture.helperIncluded) {
      const candidateSources = sizeFixture.sources.filter((source) => source.replaceAll('\\', '/').includes(`${capability.helper}.js`))
      throw new Error(`${capability.helper}: helper implementation is missing from its lazy chunks (source-map candidates: ${candidateSources.join(', ') || 'none'}; importer chain(s): ${sizeFixture.helperImporterChains.join(' | ') || 'none'})`)
    }
    try {
      checkAppCapabilitySizes({ helper: capability.helper, helperOnlyBytes: sizeFixture.helperBytes, eagerReachable: sizeFixture.eagerReachable })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${message}\nImporter chain(s): ${sizeFixture.helperImporterChains.join(' | ') || 'none'}`, { cause: error })
    }
    const moduleFixture = await buildFixture({ consumerRoot: input.consumerRoot, fixturesDirectory: input.fixturesDirectory, helper: capability.helper, externals: false })
    if (!moduleFixture.helperIncluded) {
      const candidateSources = moduleFixture.sources.filter((source) => source.replaceAll('\\', '/').includes(`${capability.helper}.js`))
      throw new Error(`${capability.helper}: helper implementation is missing from its lazy chunks (eager reachable: ${moduleFixture.eagerReachable}; source-map candidates: ${candidateSources.join(', ') || 'none'}; importer chain(s): ${moduleFixture.helperImporterChains.join(' | ') || 'none'})`)
    }
    const moduleResult = checkAppCapabilityModules({ helper: capability.helper, modules: moduleFixture.modules, baseline: baseline.modules })
    if (!moduleResult.ok) {
      const importerChains = moduleResult.unexpected.map((module) =>
        `${module}: ${(moduleFixture.effectModuleImporterChains[module] ?? []).join(' | ') || 'no chunk importer chain'}`,
      )
      throw new Error(`${formatAppCapabilityModuleFailure(capability.helper, moduleResult.unexpected)}\nImporter chain(s):\n${importerChains.join('\n')}`)
    }
    const unrelated = checkUnusedAppCapabilityModules({ helper: capability.helper, modules: moduleFixture.sources })
    if (unrelated.length > 0) throw new Error(`${capability.helper} fixture pulled unrelated helpers: ${unrelated.join(', ')}; importer chain(s): ${moduleFixture.helperImporterChains.join(' | ') || 'none'}`)
    const baselineModules = new Set(baseline.modules)
    const addedModules = moduleFixture.modules.filter((module) => !baselineModules.has(module))
    console.log(`app capability ${capability.helper}: ${sizeFixture.helperBytes}/${capability.budgetBytes} B Brotli-q11; added Effect modules: ${addedModules.join(', ') || 'none'}; lazy chunk verified`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const consumerRoot = process.argv[2]
  const fixturesDirectory = process.argv[3]
  if (!consumerRoot || !fixturesDirectory) throw new Error('usage: check-app-capabilities.ts <packed-consumer-root> <fixture-directory>')
  await checkPackedAppCapabilities({ consumerRoot, fixturesDirectory, requireAll: process.env.WSEFFECT_REQUIRE_APP_CAPABILITIES === '1' })
}

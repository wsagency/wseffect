import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { build } from 'vite'
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
  readonly imports?: ReadonlyArray<string>
  readonly dynamicImports?: ReadonlyArray<string>
}
type Manifest = Record<string, ManifestEntry>

const PEER_EXTERNALS = /^(?:effect|@effect\/platform-browser|foldkit|@foldkit\/ui)(?:\/.*)?$/

function exportedNamesFromTypes(declaration: string): Set<string> {
  const names = new Set<string>()
  for (const match of declaration.matchAll(/\bexport\s+(?:declare\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([\w$]+)/g)) names.add(match[1]!)
  for (const match of declaration.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const item of match[1]!.split(',')) {
      const [original, alias] = item.trim().split(/\s+as\s+/)
      if (original) names.add(alias ?? original)
    }
  }
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

async function buildFixture(input: {
  readonly consumerRoot: string
  readonly fixturesDirectory: string
  readonly helper: string
  readonly externals: boolean
}): Promise<{ readonly helperBytes: number; readonly modules: string[]; readonly eagerReachable: boolean; readonly sources: string[] }> {
  const fixture = join(input.consumerRoot, `.app-capability-${input.helper}${input.externals ? '-size' : '-modules'}`)
  const src = join(fixture, 'src')
  await mkdir(src, { recursive: true })
  const template = await readFile(join(input.fixturesDirectory, `${input.helper}.ts`), 'utf8')
  await writeFile(join(fixture, 'index.html'), '<!doctype html><html><head></head><body><script type="module" src="/src/main.ts"></script></body></html>\n')
  await writeFile(join(src, 'main.ts'), template)
  await build({
    configFile: false,
    root: fixture,
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      manifest: true,
      minify: true,
      rollupOptions: { external: input.externals ? PEER_EXTERNALS : [] },
    },
  })
  const dist = join(fixture, 'dist')
  const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8')) as Manifest
  const entry = Object.values(manifest).find((item) => item.isEntry)
  if (!entry) throw new Error(`${input.helper}: Vite manifest is missing its entry`)
  const entryKey = Object.keys(manifest).find((key) => manifest[key] === entry)!
  const closures = appCapabilityManifestClosures(manifest, entryKey)
  const maps = await findFiles(dist, '.js.map')
  const sources: string[] = []
  const sourcesByFile = new Map<string, ReadonlyArray<string>>()
  for (const path of maps) {
    const sourceMap = JSON.parse(await readFile(path, 'utf8')) as SourceMap
    const file = path.slice(dist.length + 1, -'.map'.length).replaceAll('\\', '/')
    sourcesByFile.set(file, sourceMap.sources ?? [])
    sources.push(...(sourceMap.sources ?? []))
  }
  let helperBytes = 0
  for (const [key, item] of Object.entries(manifest)) {
    if (item.isEntry || key === entryKey || closures.eager.has(key) || !item.file.endsWith('.js')) continue
    helperBytes += brotliBytes(await readFile(join(dist, item.file)))
  }
  const helperSource = `/dist/${input.helper}.js`
  const eagerReachable = [...closures.eager].some((key) => (sourcesByFile.get(manifest[key]!.file) ?? []).some((source) => source.endsWith(helperSource)))
  return { helperBytes, modules: effectModulesFromSourceMap(sources), eagerReachable, sources }
}

export async function checkPackedAppCapabilities(input: {
  readonly consumerRoot: string
  readonly fixturesDirectory: string
  readonly requireAll?: boolean
}): Promise<void> {
  const appRoot = resolve(input.consumerRoot, 'node_modules/@wsagency/wseffect-app')
  const packageJson = JSON.parse(await readFile(join(appRoot, 'package.json'), 'utf8')) as { exports?: Record<string, unknown> }
  if (!packageJson.exports?.['.']) throw new Error('@wsagency/wseffect-app does not expose its root export')
  const declaration = await readFile(join(appRoot, 'dist/index.d.ts'), 'utf8')
  const availability = resolveAppCapabilityAvailability({ exportedNames: exportedNamesFromTypes(declaration), requireAll: input.requireAll })
  for (const missing of availability.missing) console.log(`app capability not exported yet: ${missing}`)
  if (availability.available.length === 0) {
    console.log('app capability fixtures: no registered helpers are exported yet; set WSEFFECT_REQUIRE_APP_CAPABILITIES=1 after helper integration')
    return
  }

  const galleryMaps = await findFiles(join(input.consumerRoot, 'dist'), '.js.map')
  const frameworkMap = galleryMaps.find((path) => /framework-[^/]+\.js\.map$/.test(path))
  if (!frameworkMap) throw new Error('packed consumer: gallery framework source-map baseline is missing')
  const frameworkModules = effectModulesFromSourceMap((JSON.parse(await readFile(frameworkMap, 'utf8')) as SourceMap).sources ?? [])

  for (const capability of availability.available) {
    const sizeFixture = await buildFixture({ consumerRoot: input.consumerRoot, fixturesDirectory: input.fixturesDirectory, helper: capability.helper, externals: true })
    const size = checkAppCapabilitySizes({ helper: capability.helper, helperOnlyBytes: sizeFixture.helperBytes, eagerReachable: sizeFixture.eagerReachable })
    if (!size.ok) throw new Error(size.errors.join('\n'))
    const moduleFixture = await buildFixture({ consumerRoot: input.consumerRoot, fixturesDirectory: input.fixturesDirectory, helper: capability.helper, externals: false })
    const moduleResult = checkAppCapabilityModules({ helper: capability.helper, modules: moduleFixture.modules, baseline: frameworkModules })
    if (!moduleResult.ok) throw new Error(formatAppCapabilityModuleFailure(capability.helper, moduleResult.unexpected))
    const unrelated = checkUnusedAppCapabilityModules({ helper: capability.helper, modules: moduleFixture.sources })
    if (unrelated.length > 0) throw new Error(`${capability.helper} fixture pulled unrelated helpers: ${unrelated.join(', ')}`)
    console.log(`app capability ${capability.helper}: ${sizeFixture.helperBytes}/${capability.budgetBytes} B Brotli-q11; module closure clean; lazy chunk verified`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const consumerRoot = process.argv[2]
  const fixturesDirectory = process.argv[3]
  if (!consumerRoot || !fixturesDirectory) throw new Error('usage: check-app-capabilities.ts <packed-consumer-root> <fixture-directory>')
  await checkPackedAppCapabilities({ consumerRoot, fixturesDirectory, requireAll: process.env.WSEFFECT_REQUIRE_APP_CAPABILITIES === '1' })
}

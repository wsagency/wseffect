import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { chromium } from '@playwright/test'
import { primaryPages } from '../../apps/gallery/src/primaryPages.ts'
import { startServer, type ServerHandle, type ServerResponseStat, type ServerStats } from '../serve/server.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export interface RequestMeasurement {
  readonly path: string
  readonly bytes: number
  readonly classification: 'mandatory' | 'speculative'
}

export interface SizeReport {
  readonly shell: number
  readonly shellRaw: number
  readonly firstVisit: { readonly bytes: number; readonly requests: number }
  readonly speculativePrefetch: { readonly bytes: number; readonly requests: number }
  readonly requestTable: ReadonlyArray<RequestMeasurement>
  readonly pages: Record<string, number>
  readonly stylesCss?: number
}

export interface SizeBaseline {
  readonly unit: 'B'
  readonly compression: 'brotli-q11'
  readonly entries: Record<string, { readonly bytes: number; readonly reason: string }>
}

interface ManifestEntry {
  readonly file: string
  readonly name?: string
  readonly isEntry?: boolean
  readonly isDynamicEntry?: boolean
  readonly imports?: ReadonlyArray<string>
  readonly css?: ReadonlyArray<string>
}

type Manifest = Record<string, ManifestEntry>


const SHELL_LIMIT = 122_880
const FIRST_VISIT_LIMIT = 163_840
const SPECULATIVE_PREFETCH_LIMIT = 65_536
const GROWTH_LIMIT = 0.02
const BUD1_BASE_COMMIT = '200a6a5'
const BUD1_BASE_ARTIFACT = 'bench/baselines/size.json'
const BUD1_BASE_SHA256 = '83592a2dc3173c744ceeca56ab9394a1c703e87b82bd8540c216561256ebe9eb'
const BUD1_DELTA_LIMIT = 1_024
const BROWSER_PORT_START = 4500
const BROWSER_PORT_END = 4599
const IDLE_MILLISECONDS = 1_000

let cachedBUD1BaseShellBytes: number | undefined

function approvedBUD1BaseShellBytes(): number {
  if (cachedBUD1BaseShellBytes !== undefined) return cachedBUD1BaseShellBytes
  const artifact = execFileSync('git', ['show', `${BUD1_BASE_COMMIT}:${BUD1_BASE_ARTIFACT}`], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const sha256 = createHash('sha256').update(artifact).digest('hex')
  if (sha256 !== BUD1_BASE_SHA256) {
    throw new Error(`approved BUD-1 base artifact ${BUD1_BASE_COMMIT}:${BUD1_BASE_ARTIFACT} has unexpected SHA-256 ${sha256}`)
  }
  const baseline = JSON.parse(artifact) as SizeBaseline
  const shell = baseline.entries.shell
  if (baseline.unit !== 'B' || baseline.compression !== 'brotli-q11' || shell === undefined || shell.bytes <= 0) {
    throw new Error(`approved BUD-1 base artifact ${BUD1_BASE_COMMIT}:${BUD1_BASE_ARTIFACT} has invalid shell metadata`)
  }
  cachedBUD1BaseShellBytes = shell.bytes
  return shell.bytes
}

function brotliBytes(contents: Buffer): number {
  return brotliCompressSync(contents, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).byteLength
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : []
  })
}

function readManifest(distDir: string): Manifest {
  const path = join(distDir, '.vite', 'manifest.json')
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest
}

function relativeKey(root: string, file: string): string {
  return relative(root, file).split(sep).join('/')
}

function pageSizes(distDir: string, pagesDir: string, manifest: Manifest): Record<string, number> {
  const appDir = dirname(resolve(distDir))
  const pageFiles = filesUnder(pagesDir).filter((path) => /\.(?:[cm]?[jt]sx?)$/.test(path))
  const sizes: Record<string, number> = {}

  for (const source of pageFiles) {
    const entry = manifest[relativeKey(appDir, source)]
    if (entry?.isDynamicEntry !== true) continue
    const key = basename(source, extname(source))
    if (Object.hasOwn(sizes, key)) throw new Error(`duplicate page chunk key: ${key}`)
    sizes[key] = brotliBytes(readFileSync(join(distDir, entry.file)))
  }
  return sizes
}

export function classifyRequestTable(
  responses: ReadonlyArray<ServerResponseStat>,
  manifest: Manifest,
  primaryPageKeys: ReadonlyArray<string>,
  pageKeys: ReadonlyArray<string>,
): RequestMeasurement[] {
  const primary = new Set(primaryPageKeys)
  const requestedPages = new Set(pageKeys)
  const ownersByAsset = new Map<string, Set<string>>()

  const assetsForEntry = (source: string): Set<string> => {
    const visited = new Set<string>()
    const assets = new Set<string>()
    const visit = (manifestKey: string): void => {
      if (visited.has(manifestKey)) return
      visited.add(manifestKey)
      const dependency = manifest[manifestKey]
      if (dependency === undefined) return
      assets.add(`/${dependency.file}`)
      for (const css of dependency.css ?? []) assets.add(`/${css}`)
      for (const imported of dependency.imports ?? []) visit(imported)
    }
    visit(source)
    return assets
  }
  const mandatoryAssets = assetsForEntry('index.html')

  for (const [source, entry] of Object.entries(manifest)) {
    const pageKey = entry.name ?? basename(source, extname(source))
    if (entry.isDynamicEntry !== true || !requestedPages.has(pageKey)) continue

    for (const asset of assetsForEntry(source)) {
      const owners = ownersByAsset.get(asset) ?? new Set<string>()
      owners.add(pageKey)
      ownersByAsset.set(asset, owners)
    }
  }

  return responses.map(({ path, bytes }) => {
    const owners = ownersByAsset.get(path)
    let isSpeculative = owners !== undefined && !mandatoryAssets.has(path)
    if (owners !== undefined) {
      for (const owner of owners) {
        if (primary.has(owner)) {
          isSpeculative = false
          break
        }
      }
    }
    return { path, bytes, classification: isSpeculative ? 'speculative' : 'mandatory' }
  })
}

function startOnAvailablePort(): Promise<{ readonly handle: ServerHandle; readonly port: number }> {
  const tryPort = async (port: number): Promise<{ readonly handle: ServerHandle; readonly port: number }> => {
    try {
      return { handle: await startServer({ port, brotli: true }), port }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error
      if (port === BROWSER_PORT_END) throw new Error(`no free browser port in ${BROWSER_PORT_START}-${BROWSER_PORT_END}`, { cause: error })
      return tryPort(port + 1)
    }
  }
  return tryPort(BROWSER_PORT_START)
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

async function waitForQuiet(server: ServerHandle, page: import('@playwright/test').Page): Promise<ServerStats> {
  await page.waitForFunction(
    () => 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
    undefined,
    { timeout: 30_000 },
  )

  let previousRequests = server.stats().requests
  while (true) {
    await delay(IDLE_MILLISECONDS)
    const current = server.stats()
    if (current.requests === previousRequests) return current
    previousRequests = current.requests
  }
}

export async function measureSize(input: {
  readonly distDir: string
  readonly pagesDir: string
  readonly primaryPageKeys?: ReadonlyArray<string>
}): Promise<SizeReport> {
  const distDir = resolve(input.distDir)
  const assetsDir = join(distDir, 'assets')
  const manifest = readManifest(distDir)
  const htmlEntry = manifest['index.html']
  if (htmlEntry === undefined) throw new Error('Vite manifest is missing index.html')
  const jsFiles = filesUnder(assetsDir).filter((path) => path.endsWith('.js'))
  const entryFile = jsFiles.find((path) => basename(path).startsWith('index-'))
  const frameworkFile = jsFiles.find((path) => basename(path).startsWith('framework-'))
  if (entryFile === undefined) throw new Error('production build is missing the index entry chunk')
  if (frameworkFile === undefined) throw new Error('production build is missing the framework chunk')

  const entryContents = readFileSync(entryFile)
  const frameworkContents = readFileSync(frameworkFile)
  const shellRaw = entryContents.byteLength + frameworkContents.byteLength
  const shell = brotliBytes(entryContents) + brotliBytes(frameworkContents)
  const pages = pageSizes(distDir, input.pagesDir, manifest)
  const cssFiles = filesUnder(assetsDir).filter((path) => path.endsWith('.css'))
  const stylesCss = cssFiles.length === 0
    ? undefined
    : cssFiles.reduce((total, path) => total + brotliBytes(readFileSync(path)), 0)

  const { handle: server, port } = await startOnAvailablePort()
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    server.deploy(distDir)
    server.stats(true)
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' })
    const serverStats = await waitForQuiet(server, page)
    const requestTable = classifyRequestTable(serverStats.responses, manifest, input.primaryPageKeys ?? primaryPages, Object.keys(pages))
    const totals = requestTable.reduce((summary, request) => {
      if (request.classification === 'speculative') {
        summary.speculativeBytes += request.bytes
        summary.speculativeRequests++
      } else {
        summary.mandatoryBytes += request.bytes
        summary.mandatoryRequests++
      }
      return summary
    }, { mandatoryBytes: 0, mandatoryRequests: 0, speculativeBytes: 0, speculativeRequests: 0 })
    return {
      shell,
      shellRaw,
      firstVisit: { bytes: totals.mandatoryBytes, requests: totals.mandatoryRequests },
      speculativePrefetch: { bytes: totals.speculativeBytes, requests: totals.speculativeRequests },
      requestTable,
      pages,
      ...(stylesCss === undefined ? {} : { stylesCss }),
    }
  } finally {
    await browser?.close()
    await server.close()
  }
}

export function attributeShell(distDir: string): Array<{ readonly chunk: 'index' | 'framework'; readonly source: string; readonly bytes: number }> {
  const assetsDir = join(resolve(distDir), 'assets')
  const maps = filesUnder(assetsDir).filter((path) => /^(?:index|framework)-.*\.js\.map$/.test(basename(path)))
  const chunks = new Set(maps.map((path) => basename(path).startsWith('index-') ? 'index' : 'framework'))
  for (const chunk of ['index', 'framework'] as const) {
    if (!chunks.has(chunk)) throw new Error(`source map for ${chunk} chunk is missing; rebuild with sourcemaps enabled`)
  }

  const attribution: Array<{ readonly chunk: 'index' | 'framework'; readonly source: string; readonly bytes: number }> = []
  for (const path of maps) {
    const chunk = basename(path).startsWith('index-') ? 'index' : 'framework'
    const sourceMap = JSON.parse(readFileSync(path, 'utf8')) as {
      sources?: unknown
      sourcesContent?: unknown
    }
    if (!Array.isArray(sourceMap.sources) || !Array.isArray(sourceMap.sourcesContent)) {
      throw new Error(`source map is missing sources or sourcesContent: ${path}`)
    }
    for (let index = 0; index < sourceMap.sources.length; index++) {
      const source = sourceMap.sources[index]
      const content = sourceMap.sourcesContent[index]
      if (typeof source !== 'string' || typeof content !== 'string') continue
      attribution.push({ chunk, source, bytes: brotliBytes(Buffer.from(content)) })
    }
  }
  return attribution.sort((left, right) => right.bytes - left.bytes || left.source.localeCompare(right.source))
}

function parseArguments(args: readonly string[]): { appDir: string; writeBaseline: boolean; reason: string; attribute: boolean } {
  let app: string | undefined
  let writeBaseline = false
  let reason = ''
  let attribute = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--app') app = args[++index]
    else if (argument === '--write-baseline') writeBaseline = true
    else if (argument === '--reason') reason = args[++index] ?? ''
    else if (argument === '--attribute') attribute = true
    else throw new Error(`unknown size-gate argument: ${argument}`)
  }
  if (app === undefined) throw new Error('usage: pnpm gate:size --app <app-dir> [--write-baseline --reason <text> | --attribute]')
  if (writeBaseline && reason.trim() === '') throw new Error('--write-baseline requires a non-empty --reason')
  if (writeBaseline && attribute) throw new Error('--attribute cannot be combined with --write-baseline')
  return { appDir: resolve(process.cwd(), app), writeBaseline, reason, attribute }
}

async function runCli(): Promise<void> {
  const { appDir, writeBaseline, reason, attribute } = parseArguments(process.argv.slice(2))
  if (!statSync(appDir).isDirectory()) throw new Error(`app directory does not exist: ${appDir}`)
  const distDir = join(appDir, 'dist')
  if (attribute) {
    console.log('Source attribution: Brotli-q11 size of each source map sourcesContent; indicative per-module weights, not an additive decomposition of the minified chunk.')
    console.log(JSON.stringify(attributeShell(distDir), null, 2))
    return
  }

  execFileSync('pnpm', ['--dir', appDir, 'build'], { stdio: 'inherit' })
  const report = await measureSize({ distDir, pagesDir: join(appDir, 'src', 'pages') })
  console.log(JSON.stringify(report, null, 2))

  const baselinePath = join(ROOT, 'bench/baselines/size.json')
  if (writeBaseline) {
    const entries = Object.fromEntries(Object.entries(artifactSizes(report)).map(([id, bytes]) => [id, { bytes, reason }]))
    writeFileSync(baselinePath, `${JSON.stringify({ unit: 'B', compression: 'brotli-q11', entries }, null, 2)}\n`)
    return
  }

  const candidateBaseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as SizeBaseline
  const baseBaseline = readMergeBaseBaseline(candidateBaseline)
  const { failures } = compareSize(report, baseBaseline, candidateBaseline)
  for (const failure of failures) console.error(failure)
  if (failures.length > 0) process.exitCode = 1
}

function artifactSizes(report: SizeReport): Record<string, number> {
  const artifacts: Record<string, number> = {
    shell: report.shell,
    'first-visit': report.firstVisit.bytes,
    'speculative-prefetch': report.speculativePrefetch.bytes,
  }
  for (const [key, bytes] of Object.entries(report.pages)) artifacts[`page:${key}`] = bytes
  if (report.stylesCss !== undefined) artifacts['styles.css'] = report.stylesCss
  return artifacts
}

export function withMergeBaseFallback<T>(candidateBaseline: T, readMergeBase: () => T): T {
  try {
    return readMergeBase()
  } catch {
    return candidateBaseline
  }
}

function readCommitBaseline(baseCommit: string): SizeBaseline {
  const baseline = execFileSync('git', ['show', `${baseCommit}:bench/baselines/size.json`], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return JSON.parse(baseline) as SizeBaseline
}

function readMergeBaseBaseline(candidateBaseline: SizeBaseline): SizeBaseline {
  const explicitBase = process.env.WSEFFECT_BASE_SHA || process.env.BASE_SHA
  if (explicitBase !== undefined) return readCommitBaseline(explicitBase)
  const baseline = withMergeBaseFallback(candidateBaseline, () => {
    const baseCommit = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
    return readCommitBaseline(baseCommit)
  })
  const fellBack = baseline === candidateBaseline
  if (fellBack) console.warn('warning: no merge base for origin/main; using the checked-out size.json baseline')
  return baseline
}

export function compareSize(
  report: SizeReport,
  baseBaseline: SizeBaseline,
  candidateBaseline: SizeBaseline,
): { readonly failures: string[] } {
  const failures: string[] = []
  if (report.shell > SHELL_LIMIT) {
    failures.push(`GATE-S1: shell ${report.shell} B exceeds 122,880 B; do not raise the budget without user decision`)
  }
  if (report.firstVisit.bytes > FIRST_VISIT_LIMIT) {
    failures.push(`GATE-S2: first-visit ${report.firstVisit.bytes} B exceeds 163,840 B`)
  }
  if (report.speculativePrefetch.bytes > SPECULATIVE_PREFETCH_LIMIT) {
    failures.push(`GATE-S4: speculative-prefetch ${report.speculativePrefetch.bytes} B exceeds 65,536 B`)
  }
  const approvedBaseShellBytes = approvedBUD1BaseShellBytes()
  const shellDelta = report.shell - approvedBaseShellBytes
  if (shellDelta > BUD1_DELTA_LIMIT) {
    failures.push(
      `GATE-BUD-1: entry + framework grew ${shellDelta.toLocaleString('en-US')} B over the approved ${BUD1_BASE_COMMIT} artifact (${approvedBaseShellBytes.toLocaleString('en-US')} → ${report.shell.toLocaleString('en-US')} B); hard cap is ${BUD1_DELTA_LIMIT.toLocaleString('en-US')} B`,
    )
  }

  const current = artifactSizes(report)
  for (const [id, bytes] of Object.entries(current)) {
    const candidate = candidateBaseline.entries[id]
    if (candidate === undefined || candidate.bytes <= 0) {
      failures.push(`GATE-S3: ${id} is missing from size.json`)
      continue
    }
    const previous = baseBaseline.entries[id]
    if (previous === undefined || previous.bytes <= 0) {
      if (candidate.reason.trim() === '') {
        failures.push(`GATE-S3: ${id} was added without a baseline reason`)
      } else if (bytes > candidate.bytes * (1 + GROWTH_LIMIT)) {
        failures.push(`GATE-S3: ${id} ${bytes} B exceeds its candidate baseline ${candidate.bytes} B`)
      }
      continue
    }
    const growth = (bytes - previous.bytes) / previous.bytes
    if (growth > GROWTH_LIMIT) {
      if (candidate.bytes === previous.bytes || candidate.reason.trim() === '') {
        failures.push(`GATE-S3: ${id} grew ${(growth * 100).toFixed(1)}% (${previous.bytes} → ${bytes} B); update its bytes and reason in size.json`)
      } else if (bytes > candidate.bytes * (1 + GROWTH_LIMIT)) {
        failures.push(`GATE-S3: ${id} grew ${(growth * 100).toFixed(1)}% (${previous.bytes} → ${bytes} B); candidate baseline ${candidate.bytes} B is too small`)
      }
    }
  }
  return { failures }
}


if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}

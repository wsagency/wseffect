import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { checkManifest } from '../check-repo.ts'
import { releaseOrder, type PackageManifest, type ReleaseEdge } from './graph.ts'
import { checkHistoryAudit } from './history-gate.ts'
import { inspectArchive, type InspectionResult } from './inspect.ts'

const execFileAsync = promisify(execFile)
const packageDirectories = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin']
const repositoryUrl = 'https://github.com/wsagency/wseffect.git'
export type ReleasePackageManifest = PackageManifest & { version: string; repository?: string | { url?: string } }
export type ReleaseArchive = { package: string; archive: string; sha256: string; integrity: string }
export type CommandRunner = (command: string, args: string[], options?: { cwd?: string }) => Promise<string>
export type ReleaseGraph = { order: string[]; edges: ReleaseEdge[] }
export type ReleaseDependencies = {
  manifests?: ReleasePackageManifest[]
  graph?: ReleaseGraph
  run?: CommandRunner
  inspect?: (args: { archivePath: string; expectedName: string; version: string; repositoryUrl: string; sourceNotices?: Buffer }) => Promise<InspectionResult>
  checkManifest?: typeof checkManifest
  checkHistoryAudit?: typeof checkHistoryAudit
}
export type PreflightResult = { ok: boolean; errors: string[]; order: string[]; edges: ReleaseEdge[]; archives: ReleaseArchive[] }
export type ReleaseRecord = { version: string; gitSha: string; timestamp: string; packages: Array<{ package: string; archive: string; sha256: string; integrity: string }> }

async function realRun(command: string, args: string[], options?: { cwd?: string }): Promise<string> {
  const result = await execFileAsync(command, args, { cwd: options?.cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return result.stdout.trim()
}

async function readManifests(root: string): Promise<ReleasePackageManifest[]> {
  return Promise.all(packageDirectories.map(async (directory) => JSON.parse(await readFile(join(root, 'packages', directory, 'package.json'), 'utf8')) as ReleasePackageManifest))
}
function packageDirectory(manifest: ReleasePackageManifest): string {
  const suffix = manifest.name.replace('@wsagency/wseffect-', '')
  return suffix
}
async function realPathWithMissingAncestors(path: string): Promise<string> {
  let candidate = resolve(path)
  const missingSegments: string[] = []
  while (true) {
    try {
      const existingPath = await realpath(candidate)
      return resolve(existingPath, ...missingSegments)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error
      const parent = dirname(candidate)
      if (parent === candidate) throw error
      missingSegments.unshift(basename(candidate))
      candidate = parent
    }
  }
}

export async function checkEffectExclusions(root: string): Promise<string[]> {
  const workspaces = [join(root, 'pnpm-workspace.yaml')]
  const fixtureRoot = join(root, 'tests', 'consumer', 'fixtures')
  try {
    for (const entry of await readdir(fixtureRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) workspaces.push(join(fixtureRoot, entry.name, 'pnpm-workspace.yaml'))
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const errors: string[] = []
  for (const path of workspaces) {
    let text: string
    try { text = await readFile(path, 'utf8') }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    const lines = text.split(/\r?\n/)
    const settingIndex = lines.findIndex((line) => /^\s*minimumReleaseAgeExclude\s*:/.test(line))
    if (settingIndex < 0) continue
    const setting = lines[settingIndex]!
    let section = setting.slice(setting.indexOf(':') + 1).trim()
    if (!section.startsWith('[')) {
      const values: string[] = []
      for (const line of lines.slice(settingIndex + 1)) {
        const item = line.match(/^\s+-\s*(.*?)\s*$/)
        if (item) values.push(item[1]!)
        else if (line.trim() !== '') break
      }
      section = values.join(',')
    }
    const entries = section.match(/['"]?(@[^@\s,'"]+\/[^@\s,'"]+|[^@\s,'"]+)@[^,\s'"]+['"]?/g) ?? []
    for (const entry of entries) {
      const packageName = entry.replace(/^['"]|['"]$/g, '').split('@').slice(0, -1).join('@')
      if (packageName === 'effect' || packageName.startsWith('@effect/')) {
        errors.push(`${path}: remove temporary ${entry} from minimumReleaseAgeExclude, reinstall, and re-run the checks`)
      }
    }
  }
  return errors
}


export async function packRelease(options: { version: string; root: string; out?: string; record?: string; forceRecord?: boolean; printGraph?: boolean }, dependencies: ReleaseDependencies = {}): Promise<ReleaseArchive[]> {
  const root = resolve(options.root)
  const out = resolve(options.out ?? join(process.env.HOME ?? '', '.cache/wseffect-work/release-packages/archives'))
  const recordPath = resolve(options.record ?? join(process.env.HOME ?? '', '.cache/wseffect-work/release-records', `${options.version}.json`))
  const [realRoot, realOut, realRecord] = await Promise.all([realPathWithMissingAncestors(root), realPathWithMissingAncestors(out), realPathWithMissingAncestors(recordPath)])
  const isInsideRoot = (candidate: string) => {
    const path = relative(realRoot, candidate)
    return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
  }
  if (isInsideRoot(realOut)) throw new Error(`Pack output must be outside the Git working tree: ${out}`)
  if (isInsideRoot(realRecord)) throw new Error(`Release record must be outside the Git working tree: ${recordPath}`)
  if (!options.forceRecord) {
    try {
      await readFile(recordPath)
      throw new Error(`Release record already exists: ${recordPath}; use --force-record to overwrite it`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  await mkdir(out, { recursive: true })
  const manifests = dependencies.manifests ?? await readManifests(root)
  const graph = dependencies.graph ?? releaseOrder(manifests)
  const run = dependencies.run ?? realRun
  const inspect = dependencies.inspect ?? inspectArchive
  const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]))
  const archives: ReleaseArchive[] = []
  if (options.printGraph !== false) consoleGraph(graph)
  for (const name of graph.order) {
    const manifest = byName.get(name)
    if (!manifest) throw new Error(`Release graph refers to unknown package ${name}`)
    const packagePath = join(root, 'packages', packageDirectory(manifest))
    await run('pnpm', ['pack', '--pack-destination', out], { cwd: packagePath })
    const filename = `${name.replace('@', '').replace('/', '-')}-${options.version}.tgz`
    const archive = join(out, filename)
    const manifestRepository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
    let sourceNotices: Buffer | undefined
    try { sourceNotices = await readFile(join(packagePath, 'THIRD-PARTY-NOTICES.md')) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const inspection = await inspect({ archivePath: archive, expectedName: name, version: options.version, repositoryUrl: manifestRepository ?? repositoryUrl, sourceNotices })
    if (inspection.errors.length) throw new Error(`${name}: ${inspection.errors.join('; ')}`)
    archives.push({ package: name, archive, sha256: inspection.sha256, integrity: inspection.integrity })
  }
  const gitSha = await run('git', ['rev-parse', 'HEAD'], { cwd: root })
  const record: ReleaseRecord = { version: options.version, gitSha, timestamp: new Date().toISOString(), packages: archives.map(({ package: packageName, archive, sha256, integrity }) => ({ package: packageName, archive, sha256, integrity })) }
  await mkdir(dirname(recordPath), { recursive: true })
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, { flag: options.forceRecord ? 'w' : 'wx' })
  console.log(JSON.stringify(archives))
  console.log(`Release record: ${recordPath}`)
  return archives
}

function consoleGraph(graph: ReleaseGraph): void {
  console.log('Edges:')
  for (const edge of graph.edges) console.log(`  ${edge.from} -> ${edge.to}`)
  console.log('Order:')
  for (const name of graph.order) console.log(`  ${name}`)
}

export async function runPreflight(options: { version: string; root: string; out?: string; record?: string; forceRecord?: boolean; historyAuditReport?: string; historyAuditReviewed?: boolean }, dependencies: ReleaseDependencies = {}): Promise<PreflightResult> {
  const root = resolve(options.root)
  const errors: string[] = []
  const run = dependencies.run ?? realRun
  const inspect = dependencies.inspect ?? inspectArchive
  const manifests = dependencies.manifests ?? await readManifests(root)
  const graph = dependencies.graph ?? releaseOrder(manifests)
  consoleGraph(graph)
  const attempt = async (command: string, args: string[], cwd = root): Promise<string> => {
    try { return await run(command, args, { cwd }) }
    catch (error) { errors.push(`${command} ${args.join(' ')} failed: ${error instanceof Error ? error.message : String(error)}`); return '' }
  }
  await attempt('git', ['fetch', 'origin', 'main'])
  const branch = await attempt('git', ['branch', '--show-current'])
  if (branch && branch !== 'main') errors.push(`Preflight requires branch main or a detached HEAD at origin/main; current branch is ${branch}`)
  errors.push(...await checkEffectExclusions(root))
  const status = await attempt('git', ['status', '--porcelain', '--untracked-files=all'])
  if (status) errors.push(`Preflight requires a clean tree (including untracked files):\n${status}`)
  const head = await attempt('git', ['rev-parse', 'HEAD'])
  const origin = await attempt('git', ['rev-parse', 'origin/main'])
  if (head && origin && head !== origin) errors.push(`HEAD ${head} does not equal origin/main ${origin}`)
  const guardManifest = dependencies.checkManifest ?? checkManifest
  for (const manifest of manifests) {
    if (manifest.version !== options.version) errors.push(`${manifest.name} version must be ${options.version}; got ${manifest.version}`)
    errors.push(...guardManifest(manifest, `packages/${packageDirectory(manifest)}/package.json`, options.version))
  }
  await attempt(process.execPath, ['scripts/check-repo.ts', '--release-version', options.version])
  const audit = await (dependencies.checkHistoryAudit ?? checkHistoryAudit)({
    reportPath: options.historyAuditReport ?? join(process.env.HOME ?? '', '.cache/wseffect-work/history-audit/REPORT.md'),
    ownerApprovedClean: options.historyAuditReviewed ?? false,
  })
  if (!audit.ok) errors.push(audit.reason ?? 'History audit was not approved')
  const archives: ReleaseArchive[] = []
  if (errors.length === 0) {
    try {
      const packed = await packRelease({ ...options, root, printGraph: false }, { manifests, graph, run, inspect })
      archives.push(...packed)
      for (const artifact of archives) await attempt('npm', ['publish', artifact.archive, '--dry-run', '--ignore-scripts', '--tag', 'next', '--access', 'public'], root)
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)) }
  }
  return { ok: errors.length === 0, errors, order: graph.order, edges: graph.edges, archives }
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const preflight = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  const args = process.argv.slice(2)
  const versionIndex = args.indexOf('--version')
  const version = versionIndex >= 0 ? args[versionIndex + 1] : undefined
  const outIndex = args.indexOf('--out')
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined
  const recordIndex = args.indexOf('--record')
  const record = recordIndex >= 0 ? args[recordIndex + 1] : undefined
  const forceRecord = args.includes('--force-record')
  const reportIndex = args.indexOf('--history-audit-report')
  const historyAuditReport = reportIndex >= 0 ? args[reportIndex + 1] : undefined
  const historyAuditReviewed = args.includes('--history-audit-reviewed')
  const packMode = args.includes('--pack') || !preflight
  if (!packMode && !version) throw new Error('--version requires a version')
  const result = packMode
    ? await packRelease({ version: version ?? (await readManifests(root))[0]!.version, root, out, record, forceRecord })
    : await runPreflight({ version: version!, root, out, record, forceRecord, historyAuditReport, historyAuditReviewed })
  if (!packMode && !result.ok) {
    for (const error of result.errors) console.error(`REFUSED: ${error}`)
    process.exitCode = 1
  } else if (!packMode) console.log('Release preflight passed.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

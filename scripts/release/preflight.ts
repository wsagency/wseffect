import { execFile } from 'node:child_process'
import { mkdir, readFile, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { checkManifest } from '../check-repo.ts'
import { releaseOrder, type PackageManifest, type ReleaseEdge } from './graph.ts'
import { inspectArchive, type InspectionResult } from './inspect.ts'

const execFileAsync = promisify(execFile)
const packageDirectories = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin']
const repositoryUrl = 'https://github.com/wsagency/wseffect.git'
export type ReleasePackageManifest = PackageManifest & { version: string; repository?: string | { url?: string } }
export type ReleaseArchive = { package: string; archive: string; sha256: string }
export type CommandRunner = (command: string, args: string[], options?: { cwd?: string }) => Promise<string>
export type ReleaseGraph = { order: string[]; edges: ReleaseEdge[] }
export type ReleaseDependencies = {
  manifests?: ReleasePackageManifest[]
  graph?: ReleaseGraph
  run?: CommandRunner
  inspect?: (args: { archivePath: string; expectedName: string; version: string; repositoryUrl: string }) => Promise<InspectionResult>
  checkManifest?: typeof checkManifest
}
export type PreflightResult = { ok: boolean; errors: string[]; order: string[]; edges: ReleaseEdge[]; archives: ReleaseArchive[] }

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


export async function packRelease(options: { version: string; root: string; out?: string; printGraph?: boolean }, dependencies: ReleaseDependencies = {}): Promise<ReleaseArchive[]> {
  const root = resolve(options.root)
  const out = resolve(options.out ?? join(process.env.HOME ?? '', '.cache/wseffect-work/release-packages/archives'))
  const [realRoot, realOut] = await Promise.all([realPathWithMissingAncestors(root), realPathWithMissingAncestors(out)])
  const relativeOut = relative(realRoot, realOut)
  const insideRoot = relativeOut === '' || (relativeOut !== '..' && !relativeOut.startsWith(`..${sep}`) && !isAbsolute(relativeOut))
  if (insideRoot) throw new Error(`Pack output must be outside the Git working tree: ${out}`)
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
    const inspection = await inspect({ archivePath: archive, expectedName: name, version: options.version, repositoryUrl: manifestRepository ?? repositoryUrl })
    if (inspection.errors.length) throw new Error(`${name}: ${inspection.errors.join('; ')}`)
    archives.push({ package: name, archive, sha256: inspection.sha256 })
  }
  console.log(JSON.stringify(archives))
  return archives
}

function consoleGraph(graph: ReleaseGraph): void {
  console.log('Edges:')
  for (const edge of graph.edges) console.log(`  ${edge.from} -> ${edge.to}`)
  console.log('Order:')
  for (const name of graph.order) console.log(`  ${name}`)
}

export async function runPreflight(options: { version: string; root: string; out?: string }, dependencies: ReleaseDependencies = {}): Promise<PreflightResult> {
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
  if (branch !== 'main') errors.push(`Preflight requires branch main; current branch is ${branch || '(unknown)'}`)
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
  const packMode = args.includes('--pack') || !preflight
  if (!packMode && !version) throw new Error('--version requires a version')
  const result = packMode
    ? await packRelease({ version: version ?? (await readManifests(root))[0]!.version, root, out })
    : await runPreflight({ version: version!, root, out })
  if (!packMode && !result.ok) {
    for (const error of result.errors) console.error(`REFUSED: ${error}`)
    process.exitCode = 1
  } else if (!packMode) console.log('Release preflight passed.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

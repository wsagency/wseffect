import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export interface ComputeBuildIdInput {
  readonly appRoot: string
  readonly workspaceRoot: string
  readonly env: NodeJS.ProcessEnv
}

const overridePattern = /^[0-9a-f]{7,64}$/
const testPathPattern = /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/
const sourcePathPattern = /\.(?:[cm]?[jt]sx?|json|css)$/

function importerLinks(lockfile: string): ReadonlyMap<string, ReadonlyArray<string>> {
  const links = new Map<string, Array<string>>()
  let importer: string | undefined
  for (const line of lockfile.split('\n')) {
    const key = /^(\s*)([^\s:#][^:]*):\s*$/.exec(line)
    if (key !== null && key[1]!.length === 2) {
      importer = key[2]!
      continue
    }
    if (importer === undefined) continue
    const version = /version:\s*(?:link|file):([^\s]+)/.exec(line)
    if (version === null) continue
    const values = links.get(importer) ?? []
    values.push(version[1]!.replace(/^['"]|['"]$/g, ''))
    links.set(importer, values)
  }
  return links
}

export function computeBuildId({ appRoot, workspaceRoot, env }: ComputeBuildIdInput): string {
  const override = env.WSEFFECT_BUILD_ID
  if (override !== undefined) {
    if (!overridePattern.test(override)) throw new Error('WSEFFECT_BUILD_ID must match ^[0-9a-f]{7,64}$')
    return override
  }
  const root = resolve(workspaceRoot)
  const app = resolve(root, appRoot)
  const appImporter = relative(root, app).split(sep).join('/') || '.'
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
  const lockfilePath = join(root, 'pnpm-lock.yaml')
  const lockfile = readFileSync(lockfilePath, 'utf8')
  const links = importerLinks(lockfile)
  const includedDirectories = new Set([app])
  const pending = [appImporter]
  const visitedImporters = new Set<string>()
  while (pending.length > 0) {
    const current = pending.shift()!
    if (visitedImporters.has(current)) continue
    visitedImporters.add(current)
    for (const target of links.get(current) ?? []) {
      if (isAbsolute(target)) continue
      const directory = resolve(root, dirname(current === '.' ? join('.', 'package.json') : join(current, 'package.json')), target)
      try {
        if (!statSync(directory).isDirectory()) continue
      } catch {
        continue
      }
      includedDirectories.add(directory)
      pending.push(relative(root, directory).split(sep).join('/') || '.')
    }
  }

  const files = tracked.filter((path) => {
    if (path === 'pnpm-lock.yaml') return false
    if (testPathPattern.test(path) || path.includes('/dist/') || path.startsWith('dist/')) return false
    if (!sourcePathPattern.test(path)) return false
    const absolute = resolve(root, path)
    for (const directory of includedDirectories) {
      const relativePath = relative(directory, absolute)
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) continue
      if (directory === app || relativePath === 'package.json' || relativePath.startsWith(`src${sep}`)) return true
    }
    return false
  }).sort()

  const hash = createHash('sha256')
  const hashFile = (path: string, bytes: Buffer) => {
    hash.update(path)
    hash.update('\0')
    hash.update(String(bytes.byteLength))
    hash.update('\0')
    hash.update(bytes)
  }
  for (const path of files) hashFile(path, readFileSync(join(root, path)))
  hashFile('pnpm-lock.yaml', readFileSync(lockfilePath))
  return hash.digest('hex')
}

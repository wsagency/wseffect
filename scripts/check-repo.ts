import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Manifest = {
  name?: string
  version?: string
  private?: boolean
  type?: string
  license?: string
  publishConfig?: { access?: string }
  repository?: { type?: string; url?: string; directory?: string }
  files?: string[]
  exports?: Record<string, unknown>
  sideEffects?: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  pnpm?: { patchedDependencies?: Record<string, string> }
}

const up8 = `overrides:\n  effect: 4.0.5\n  '@effect/platform-browser': 4.0.5\npeerDependencyRules:\n  allowedVersions:\n    foldkit>effect: 4.0.5\n    foldkit>@effect/platform-browser: 4.0.5\n    '@foldkit/ui>effect': 4.0.5\n    '@foldkit/vite-plugin>effect': 4.0.5`
const allowedFiles = new Set(['dist', 'LICENSE', 'README.md', 'CHANGELOG.md'])

export function checkManifest(manifest: Manifest, path: string): string[] {
  const errors: string[] = []
  const fail = (message: string) => errors.push(`${path}: ${message}`)
  for (const [section, dependencies] of Object.entries({
    dependencies: manifest.dependencies,
    devDependencies: manifest.devDependencies,
  })) {
    for (const [name, version] of Object.entries(dependencies ?? {})) {
      if (version.startsWith('^') || version.startsWith('~') || version === '*' || version.includes('||')) {
        fail(`${section}.${name} must use an exact version`)
      }
    }
  }
  if (manifest.pnpm?.patchedDependencies && Object.keys(manifest.pnpm.patchedDependencies).length > 0) {
    fail('pnpm.patchedDependencies is forbidden')
  }
  if (!path.replaceAll('\\', '/').startsWith('packages/')) return errors

  if (manifest.version !== '0.0.0') fail('version must be 0.0.0')
  if (manifest.private !== false) fail('private must be false')
  if (manifest.type !== 'module') fail('type must be module')
  if (manifest.license !== 'MIT') fail('license must be MIT')
  if (manifest.publishConfig?.access !== 'public') fail('publishConfig.access must be public')
  if (manifest.repository?.url !== 'git+https://git.wsagency.io/ws-agency/wseffect.git' || !manifest.repository.directory) {
    fail('repository must identify the wseffect repository and package directory')
  }
  if (!manifest.files?.length || manifest.files.some((file) => !allowedFiles.has(file))) {
    fail('files must contain only dist, LICENSE, README.md, and CHANGELOG.md')
  }
  if (!manifest.exports || Object.values(manifest.exports).some((entry) =>
    !entry || typeof entry !== 'object' || !('types' in entry) || !('default' in entry))) {
    fail('every exports entry must contain types and default')
  }
  if (path.includes('/themes/') || path.startsWith('packages/themes/')) {
    if (JSON.stringify(manifest.sideEffects) !== JSON.stringify(['**/*.css'])) fail('themes sideEffects must be ["**/*.css"]')
  } else if (manifest.sideEffects !== false) {
    fail('JS package sideEffects must be false')
  }
  for (const name of ['foldkit', '@foldkit/ui', '@foldkit/vite-plugin']) {
    const version = manifest.peerDependencies?.[name]
    if (version && !['0.168.0', '0.27.1'].includes(version)) fail(`peerDependencies.${name} must be pinned exactly`)
  }
  for (const name of ['effect', '@effect/platform-browser']) {
    if (manifest.peerDependencies?.[name] !== '^4.0.5') fail(`peerDependencies.${name} must be ^4.0.5`)
  }
  return errors
}

export function checkWorkspace(yamlText: string): string[] {
  const canonical = yamlText.replaceAll('\r\n', '\n')
  return canonical.includes(up8) ? [] : ['pnpm-workspace.yaml: UP-8 Effect resolution block differs from the required snippet']
}

export function checkEffectCopies(lockfileText: string): string[] {
  const versions = new Map<string, Set<string>>()
  for (const match of lockfileText.matchAll(/^\s{2,}((?:'[^']+'|[^:\s]+)):\s*$/gm)) {
    const key = match[1].replaceAll("'", '')
    const parsed = /^(effect|@effect\/platform-browser)@(\d+\.\d+\.\d+)(?:\(|$)/.exec(key)
    if (parsed) {
      const set = versions.get(parsed[1]) ?? new Set<string>()
      set.add(parsed[2])
      versions.set(parsed[1], set)
    }
  }
  return [...versions].flatMap(([name, found]) => found.size > 1 ? [`${name} resolves to multiple versions: ${[...found].join(', ')}`] : [])
}

async function packageFiles(root: string): Promise<string[]> {
  const found: string[] = []
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.name === 'package.json') found.push(path)
    }
  }
  await visit(root)
  return found
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const errors: string[] = []
  for (const path of await packageFiles(root)) {
    let manifest: Manifest
    try {
      manifest = JSON.parse(await readFile(path, 'utf8')) as Manifest
    } catch (error) {
      errors.push(`${relative(root, path)}: invalid package.json (${String(error)})`)
      continue
    }
    errors.push(...checkManifest(manifest, relative(root, path)))
  }
  errors.push(...checkWorkspace(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')))
  errors.push(...checkEffectCopies(await readFile(join(root, 'pnpm-lock.yaml'), 'utf8')))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log('repo checks: 0 errors')
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

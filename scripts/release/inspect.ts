import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { posix } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

type Manifest = {
  name?: string
  version?: string
  repository?: string | { url?: string; directory?: string }
  exports?: unknown
  homepage?: string
  bugs?: { url?: string }
  publishConfig?: { access?: string; registry?: string; tag?: string }
  main?: string
  module?: string
  types?: string
  typings?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  [key: string]: unknown
}

export type InspectionResult = {
  manifest: Manifest
  errors: string[]
  sha256: string
  integrity: string
}

export async function inspectArchive({
  archivePath,
  expectedName,
  version,
  repositoryUrl,
  sourceNotices,
}: {
  archivePath: string
  expectedName: string
  version: string
  repositoryUrl: string
  sourceNotices?: Buffer
}): Promise<InspectionResult> {
  const archive = await readFile(archivePath)
  const sha256 = createHash('sha256').update(archive).digest('hex')
  const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`
  const { stdout } = await execFileAsync('tar', ['-tzf', archivePath], { maxBuffer: 32 * 1024 * 1024 })
  const entries = stdout.split('\n').filter(Boolean)
  const fileEntries = entries.filter((entry) => entry.startsWith('package/') && !entry.endsWith('/'))
  const paths = new Set(fileEntries.map((entry) => entry.slice('package/'.length)))
  const errors: string[] = []
  const readMember = async (path: string) => {
    try {
      const { stdout } = await execFileAsync('tar', ['-xOf', archivePath, `package/${path}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
      return stdout as Buffer
    } catch {
      return undefined
    }
  }

  const manifestBytes = await readMember('package.json')
  let manifest: Manifest = {}
  try {
    if (!manifestBytes) throw new Error('missing package/package.json')
    manifest = JSON.parse(manifestBytes.toString('utf8')) as Manifest
  } catch (error) {
    errors.push(`Invalid packed package.json: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (manifest.name !== expectedName) errors.push(`Manifest name must be ${expectedName}; got ${String(manifest.name)}`)
  if (manifest.version !== version) errors.push(`Manifest version must be ${version}; got ${String(manifest.version)}`)
  const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
  if (repository !== repositoryUrl) errors.push(`Manifest repository URL must be ${repositoryUrl}; got ${String(repository)}`)
  if (typeof manifest.repository !== 'string' && manifest.repository?.directory !== `packages/${expectedName.replace('@wsagency/wseffect-', '')}`) {
    errors.push(`Manifest repository directory must be packages/${expectedName.replace('@wsagency/wseffect-', '')}`)
  }
  if (manifest.homepage !== 'https://wseffect.com') errors.push(`Manifest homepage must be https://wseffect.com; got ${String(manifest.homepage)}`)
  if (manifest.bugs?.url !== 'https://github.com/wsagency/wseffect/issues') errors.push(`Manifest bugs URL must be https://github.com/wsagency/wseffect/issues; got ${String(manifest.bugs?.url)}`)
  if (manifest.publishConfig?.access !== 'public' || manifest.publishConfig?.registry !== 'https://registry.npmjs.org/' || manifest.publishConfig?.tag !== 'next') {
    errors.push('Manifest publishConfig must use public access, https://registry.npmjs.org/ registry, and next tag')
  }

  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const dependencies = manifest[section]
    if (dependencies !== undefined && (typeof dependencies !== 'object' || dependencies === null || Array.isArray(dependencies))) {
      errors.push(`Manifest ${section} must be an object`)
      continue
    }
    for (const [dependency, specifier] of Object.entries(dependencies ?? {})) {
      if (typeof specifier !== 'string') {
        errors.push(`Manifest ${section} specifier for ${dependency} must be a string`)
        continue
      }
      if (/^(?:workspace:|file:|link:)/.test(specifier)) errors.push(`Forbidden ${section} specifier for ${dependency}: ${specifier}`)
      if (dependency.startsWith('@wsagency/wseffect-') && specifier !== version) {
        errors.push(`Internal dependency ${dependency} must be ${version}; got ${specifier}`)
      }
    }
  }

  const exportTargets = new Set<string>()
  const collectTargets = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.startsWith('./')) exportTargets.add(value.slice(2))
    } else if (Array.isArray(value)) {
      value.forEach(collectTargets)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(collectTargets)
    }
  }
  collectTargets(manifest.exports)
  for (const target of [manifest.main, manifest.module, manifest.types, manifest.typings]) {
    if (typeof target === 'string' && target.startsWith('./')) exportTargets.add(target.slice(2))
  }
  for (const target of exportTargets) {
    const targetPattern = new RegExp(`^${target.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
    if (!paths.has(target) && ![...paths].some((path) => targetPattern.test(path))) {
      errors.push(`Export target is missing from archive: ${target}`)
    }
  }

  const foldkitTestUtilityFiles = new Set<string>()
  if (expectedName === '@wsagency/wseffect-foldkit') {
    const pending = [...exportTargets].filter((target) => target.startsWith('dist/test/') && paths.has(target))
    while (pending.length > 0) {
      const path = pending.pop()!
      if (foldkitTestUtilityFiles.has(path)) continue
      foldkitTestUtilityFiles.add(path)
      const contents = await readMember(path)
      if (!contents) continue
      const text = contents.toString('utf8')
      const imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+(?=['"]))['"](\.[^'"]+)['"]/g
      for (const match of text.matchAll(imports)) {
        const resolved = posix.normalize(posix.join(posix.dirname(path), match[1]!))
        const candidates = [resolved]
        if (resolved.endsWith('.js')) candidates.push(resolved.slice(0, -3) + '.d.ts')
        else if (!posix.extname(resolved)) candidates.push(`${resolved}.js`, `${resolved}.d.ts`, `${resolved}/index.js`, `${resolved}/index.d.ts`)
        for (const candidate of candidates) if (paths.has(candidate)) pending.push(candidate)
      }
    }
  }
  const required = ['README.md', 'LICENSE', 'CHANGELOG.md', 'WS-AGENCY-NOTICE.md']
  if (['@wsagency/wseffect-foldkit', '@wsagency/wseffect-foldkit-ui', '@wsagency/wseffect-vite-plugin', '@wsagency/wseffect-themes'].includes(expectedName)) required.push('UPSTREAM.md')
  if (sourceNotices) required.push('THIRD-PARTY-NOTICES.md')
  for (const filename of required) if (!paths.has(filename)) errors.push(`Required file is missing from archive: ${filename}`)
  if (sourceNotices) {
    const archivedNotices = await readMember('THIRD-PARTY-NOTICES.md')
    if (archivedNotices && !archivedNotices.equals(sourceNotices)) errors.push('THIRD-PARTY-NOTICES.md does not match package source')
  }

  for (const path of paths) {
    if (/\.d\.ts\.map$/i.test(path)) errors.push(`Forbidden declaration map in archive: ${path}`)
    const testArtifact = /(?:^|\/)(?:test|__tests__)(?:\/|$)|(?:^|\/)[^/]*(?:\.test|\.spec)\.[^/]*$/i.test(path)
      || /(?:^|\/)vitest-setup(?:\.[^/]+)?$/i.test(path)
    const allowedFoldkitTestUtility = foldkitTestUtilityFiles.has(path)
    const allowedToastTestUtility = expectedName === '@wsagency/wseffect-foldkit-ui' && path === 'dist/toast/test.js'
    if (testArtifact && !allowedFoldkitTestUtility && !allowedToastTestUtility && !exportTargets.has(path)) {
      errors.push(`Unexported test artifact in archive: ${path}`)
    }
  }

  const forbiddenMarkers: Array<[string, RegExp]> = [
    ['host path /home/', /\/home\//i],
    ['$HOME/.cache', /\$HOME\/\.cache/i],
    ['internal host', /wsagency\.io/i],
    ['npm token', /\bnpm_[A-Za-z0-9]{20,}\b/],
    ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
    ['private-key header', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ]
  for (const path of paths) {
    const contents = await readMember(path)
    if (!contents) {
      errors.push(`Could not read archive file contents: ${path}`)
      continue
    }
    const text = contents.toString('utf8')
    for (const [label, pattern] of forbiddenMarkers) if (pattern.test(text)) errors.push(`Forbidden ${label} marker in ${path}`)
  }

  return { manifest, errors, sha256, integrity }
}

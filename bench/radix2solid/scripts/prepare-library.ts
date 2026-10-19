import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY = 'https://github.com/wsagency/radix2solid.git'
const COMMIT = '383676172abb84b4a1d2e54a087d290437ee8848'
const PACKAGES = [
  { name: '@wsagency/radix2solid-primitives', path: 'primitives' },
  { name: '@wsagency/radix2solid-themes', path: 'themes' },
] as const

type PackedTarball = {
  readonly file: string
  readonly contentSha256: string
}

type LibrarySource = {
  readonly repository: string
  readonly commit: string
  readonly packedTarballs: Record<string, PackedTarball>
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function unpackedFiles(root: string, directory: string): Array<{ path: string; contentSha256: string }> {
  const files: Array<{ path: string; contentSha256: string }> = []
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => compare(left.name, right.name))
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...unpackedFiles(root, path))
      continue
    }
    if (!entry.isFile() && !entry.isSymbolicLink()) continue
    const relativePath = relative(root, path).split(sep).join('/')
    const contents = entry.isSymbolicLink() ? readlinkSync(path) : readFileSync(path)
    files.push({
      path: relativePath,
      contentSha256: createHash('sha256').update(contents).digest('hex'),
    })
  }
  return files
}

export function contentSha256(tarballPath: string): string {
  const extractionDirectory = mkdtempSync(join(tmpdir(), 'radix2solid-content-hash-'))
  try {
    execFileSync('tar', ['-xzf', resolve(tarballPath), '-C', extractionDirectory], { stdio: 'pipe' })
    const files = unpackedFiles(extractionDirectory, extractionDirectory)
      .sort((left, right) => compare(left.path, right.path))
    if (files.length === 0) throw new Error(`tarball contains no files: ${tarballPath}`)
    const manifest = files.map(({ path, contentSha256: digest }) => `${path}\t${digest}`).join('\n')
    return createHash('sha256').update(manifest).digest('hex')
  } finally {
    rmSync(extractionDirectory, { recursive: true, force: true })
  }
}

function appRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..')
}

function workspaceRoot(root: string): string {
  return resolve(root, '../..')
}

function assertCleanCheckout(sourceDirectory: string): void {
  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: sourceDirectory,
    encoding: 'utf8',
  })
  if (status !== '') throw new Error(`radix2solid checkout is not clean:\n${status}`)
}

function checkoutPinnedSource(root: string, fresh: boolean): string {
  const artifactsDirectory = join(workspaceRoot(root), '.artifacts')
  const sourceDirectory = join(artifactsDirectory, 'radix2solid-src')
  mkdirSync(artifactsDirectory, { recursive: true })
  if (fresh) rmSync(sourceDirectory, { recursive: true, force: true })
  if (!existsSync(join(sourceDirectory, '.git'))) {
    rmSync(sourceDirectory, { recursive: true, force: true })
    execFileSync('git', ['clone', '--filter=blob:none', REPOSITORY, sourceDirectory], { stdio: 'inherit' })
  }
  execFileSync('git', ['fetch', 'origin', COMMIT], { cwd: sourceDirectory, stdio: 'inherit' })
  execFileSync('git', ['checkout', '--detach', COMMIT], { cwd: sourceDirectory, stdio: 'inherit' })
  assertCleanCheckout(sourceDirectory)
  return sourceDirectory
}

function packageMetadata(sourceDirectory: string, packagePath: string, expectedName: string): { name: string; version: string; directory: string } {
  const packageDirectory = join(sourceDirectory, 'packages', packagePath)
  const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8')) as { name?: unknown; version?: unknown }
  if (manifest.name !== expectedName || typeof manifest.version !== 'string') {
    throw new Error(`package manifest does not match ${expectedName}: ${packageDirectory}`)
  }
  return { name: expectedName, version: manifest.version, directory: packageDirectory }
}

function packedFilename(name: string, version: string): string {
  return `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`
}

function verify(root: string): void {
  const metadataPath = join(root, 'library-source.json')
  const source = JSON.parse(readFileSync(metadataPath, 'utf8')) as LibrarySource
  if (source.repository !== REPOSITORY || source.commit !== COMMIT) {
    throw new Error(`library source pin must be ${REPOSITORY} at ${COMMIT}`)
  }
  for (const { name } of PACKAGES) {
    const packed = source.packedTarballs[name]
    if (packed === undefined) throw new Error(`missing packed tarball entry for ${name}`)
    const filePath = resolve(root, packed.file)
    const fromRoot = relative(root, filePath)
    if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) throw new Error(`packed tarball path escapes bench root: ${packed.file}`)
    const actual = contentSha256(filePath)
    if (actual !== packed.contentSha256) {
      throw new Error(`content hash mismatch for ${name}: expected ${packed.contentSha256}, received ${actual}`)
    }
  }
  if (Object.keys(source.packedTarballs).length !== PACKAGES.length) {
    throw new Error('library-source.json must contain only the primitives and themes tarballs')
  }
  console.log('content hashes match')
}

function write(root: string): void {
  const sourceDirectory = checkoutPinnedSource(root, true)
  execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: sourceDirectory, stdio: 'inherit' })
  execFileSync('pnpm', ['build'], { cwd: sourceDirectory, stdio: 'inherit' })

  const workspaceArtifacts = join(workspaceRoot(root), '.artifacts')
  const stagingDirectory = join(workspaceArtifacts, 'radix2solid-packs')
  rmSync(stagingDirectory, { recursive: true, force: true })
  mkdirSync(stagingDirectory, { recursive: true })
  const packedTarballs: Record<string, PackedTarball> = {}
  for (const { name, path } of PACKAGES) {
    const metadata = packageMetadata(sourceDirectory, path, name)
    execFileSync('pnpm', ['pack', '--pack-destination', stagingDirectory], {
      cwd: metadata.directory,
      stdio: 'inherit',
    })
    const file = packedFilename(metadata.name, metadata.version)
    const stagedFile = join(stagingDirectory, file)
    const packsDirectory = join(root, 'packs')
    mkdirSync(packsDirectory, { recursive: true })
    const outputFile = join(packsDirectory, file)
    copyFileSync(stagedFile, outputFile)
    packedTarballs[metadata.name] = {
      file: `packs/${basename(outputFile)}`,
      contentSha256: contentSha256(outputFile),
    }
  }
  const source: LibrarySource = { repository: REPOSITORY, commit: COMMIT, packedTarballs }
  writeFileSync(join(root, 'library-source.json'), `${JSON.stringify(source, null, 2)}\n`)
  verify(root)
}

function main(args: string[]): void {
  const root = appRoot()
  if (args.length !== 1 || (args[0] !== '--write' && args[0] !== '--verify')) {
    throw new Error('usage: node bench/radix2solid/scripts/prepare-library.ts --write|--verify')
  }
  if (args[0] === '--write') {
    write(root)
    return
  }
  checkoutPinnedSource(root, false)
  verify(root)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}

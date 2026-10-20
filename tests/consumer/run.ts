import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkTreeShaking } from './check-tree-shaking.ts'
import { checkUp8 } from './check-up8.ts'
import { checkBranding } from './check-branding.ts'
import { checkCoverageManifest } from './check-coverage-manifest.ts'
import { discoverPackagePublicSurface } from './discover-public-surface.ts'
import type { CoverageManifest } from './check-coverage-manifest.ts'
import { checkEffectCopies } from '../../scripts/check-repo.ts'
import { checkPackedAppCapabilities } from './check-app-capabilities.ts'
import { createScratchDir } from '../../e2e/helpers/build.ts'

const consumerDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(consumerDir, '../..')
const packageNames = ['app', 'themes'] as const
const forbiddenTreeShakingMarkers = ['viewPage', 'ServiceWorker', 'makeApp', 'prefetchOnVisible']
const passedChecks: string[] = []

export function packedBuildEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...env, WSEFFECT_BUILD_ID: 'd5c0ffee' }
}

function run(command: string, args: ReadonlyArray<string>, cwd: string, env: NodeJS.ProcessEnv = process.env): void {
  execFileSync(command, [...args], { cwd, env, stdio: 'inherit' })
}

async function filesUnder(directory: string, suffix: string): Promise<string[]> {
  const paths: string[] = []
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.name.endsWith(suffix)) paths.push(path)
    }
  }
  await visit(directory)
  return paths
}

function fail(errors: ReadonlyArray<string>): void {
  if (errors.length) throw new Error(errors.join('\n'))
}

export function packageDirectory(rootDir: string, packageName: (typeof packageNames)[number]): string {
  return resolve(rootDir, 'packages', packageName)
}

export function findNewTarballName(existingFiles: ReadonlySet<string>, currentFiles: ReadonlyArray<string>): string | undefined {
  return currentFiles.find((name) => name.endsWith('.tgz') && !existingFiles.has(name))
}

async function packPackages(packsDir: string): Promise<Record<(typeof packageNames)[number], string>> {
  const tarballs = {} as Record<(typeof packageNames)[number], string>
  for (const packageName of packageNames) {
    const before = new Set(await readdir(packsDir))
    const packageDir = packageDirectory(repoRoot, packageName)
    execFileSync('pnpm', ['pack', '--pack-destination', packsDir], {
      cwd: packageDir,
      stdio: 'inherit',
    })
    const packedName = findNewTarballName(before, await readdir(packsDir))
    if (!packedName) throw new Error(`pnpm pack did not create a tarball for ${packageName}`)
    const packedPath = resolve(packsDir, packedName)
    const bytes = await readFile(packedPath)
    const fileName = `${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.tgz`
    const renamed = join(packsDir, fileName)
    await cp(packedPath, renamed)
    await rm(packedPath)
    tarballs[packageName] = renamed
  }
  return tarballs
}

async function copyConsumerFixture(root: string, tarballs: Record<(typeof packageNames)[number], string>): Promise<void> {
  const galleryDir = resolve(repoRoot, 'apps/gallery')
  await cp(galleryDir, root, {
    recursive: true,
    filter: (source) => {
      const rel = relative(galleryDir, source)
      return rel === '' || (!rel.split('/').some((segment) => segment === 'dist' || segment === 'node_modules')
        && !rel.endsWith('.tsbuildinfo'))
    },
  })
  const rootManifest = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8')) as {
    packageManager: string
    engines: { node: string }
    devDependencies: Record<string, string>
  }
  const galleryManifest = JSON.parse(await readFile(resolve(galleryDir, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
  }
  const dependencies = {
    ...galleryManifest.dependencies,
    '@wsagency/wseffect-app': `file:${tarballs.app}`,
    '@wsagency/wseffect-themes': `file:${tarballs.themes}`,
  }
  delete dependencies['@wsagency/wseffect-app']
  delete dependencies['@wsagency/wseffect-themes']
  const packageJson = {
    packageManager: rootManifest.packageManager,
    engines: rootManifest.engines,
    type: 'module',
    scripts: { build: 'vite build', typecheck: 'tsc --noEmit' },
    dependencies: {
      ...dependencies,
      '@wsagency/wseffect-app': `file:${tarballs.app}`,
      '@wsagency/wseffect-themes': `file:${tarballs.themes}`,
    },
    devDependencies: rootManifest.devDependencies,
  }
  await writeFile(resolve(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)

  const readme = await readFile(resolve(repoRoot, 'README.md'), 'utf8')
  const workspaceYaml = readme.match(/<!-- up8:start -->\s*```yaml\n([\s\S]*?)\n```\s*<!-- up8:end -->/)?.[1]
  if (!workspaceYaml) throw new Error('README.md: could not extract the UP-8 workspace block')
  await writeFile(resolve(root, 'pnpm-workspace.yaml'), `${workspaceYaml}\n`)
  await cp(resolve(repoRoot, 'tsconfig.base.json'), resolve(root, 'tsconfig.base.json'))
  await writeFile(resolve(root, 'tsconfig.json'), `${JSON.stringify({
    extends: './tsconfig.base.json',
    compilerOptions: { composite: true, declaration: true, noEmit: true },
    include: ['src/**/*.ts', 'vite.config.ts'],
  }, null, 2)}\n`)
  await cp(resolve(repoRoot, 'e2e'), resolve(root, 'e2e'), { recursive: true })
  await cp(resolve(repoRoot, 'tools/serve'), resolve(root, 'tools/serve'), { recursive: true })
  await writeFile(resolve(root, 'playwright.packed.config.ts'), `
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  reporter: 'list', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4450' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [{ command: 'pnpm exec vite preview --host 127.0.0.1 --port 4450 --strictPort', url: 'http://127.0.0.1:4450', reuseExistingServer: false }],
})\n`)
  await writeFile(resolve(root, 'tree-shaking.ts'), `
import { makePages, loaderSubscriptions } from '@wsagency/wseffect-app'
console.log(makePages, loaderSubscriptions)
`)
  await writeFile(resolve(root, 'vite.tree-shaking.config.ts'), `
import { defineConfig } from 'vite'
import { wseffect } from '@wsagency/wseffect-app/vite'
export default defineConfig({
  plugins: wseffect({ primaryPages: [], pwa: false }),
  build: { outDir: 'tree-shaking-out', emptyOutDir: true, minify: false,
    lib: { entry: 'tree-shaking.ts', formats: ['es'], fileName: 'tree-shaking' } },
})\n`)
}

async function main(): Promise<void> {
  const scratch = await createScratchDir('wseffect-consumer-')
  const packsDir = join(scratch, 'packs')
  await mkdir(packsDir, { recursive: true })
  try {
    const tarballs = await packPackages(packsDir)
    const root = join(scratch, 'consumer')
    await mkdir(root, { recursive: true })
    await copyConsumerFixture(root, tarballs)
    const readme = await readFile(resolve(repoRoot, 'README.md'), 'utf8')
    const workspaceYaml = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    fail(checkUp8(readme, workspaceYaml))

    run('pnpm', ['install', '--lockfile-only'], root)
    run('pnpm', ['install', '--frozen-lockfile'], root)
    run('pnpm', ['exec', 'vite', 'build'], root, packedBuildEnvironment())
    await checkPackedAppCapabilities({
      consumerRoot: root,
      fixturesDirectory: resolve(consumerDir, 'fixtures/app-capabilities'),
      requireAll: process.env.WSEFFECT_REQUIRE_APP_CAPABILITIES === '1',
    })
    run('pnpm', ['exec', 'tsc', '--noEmit'], root)
    passedChecks.push('consumer-install', 'gallery-build', 'app-capabilities', 'gallery-typecheck', 'up8')

    const lockfile = await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')
    fail(checkEffectCopies(lockfile))
    const effectDirs = (await readdir(resolve(root, 'node_modules/.pnpm'))).filter((entry) => entry.startsWith('effect@'))
    if (effectDirs.length !== 1) throw new Error(`packed consumer: expected one effect package directory, found ${effectDirs.length}`)
    passedChecks.push('single-effect')

    const packageDistModules: { path: string; source: string }[] = []
    for (const packageName of packageNames) {
      const modulePaths = await filesUnder(resolve(root, 'node_modules/@wsagency', `wseffect-${packageName}`, 'dist'), '.js')
      for (const path of modulePaths) packageDistModules.push({ path: relative(root, path), source: await readFile(path, 'utf8') })
    }
    fail(checkBranding(packageDistModules))
    passedChecks.push('branding')

    run('pnpm', ['exec', 'vite', 'build', '--config', 'vite.tree-shaking.config.ts'], root, packedBuildEnvironment())
    const treeBundle = await readFile(resolve(root, 'tree-shaking-out/tree-shaking.js'), 'utf8')
    for (const marker of forbiddenTreeShakingMarkers) fail(checkTreeShaking(treeBundle, marker))
    passedChecks.push('tree-shaking')

    const e2eFiles = (await filesUnder(resolve(root, 'e2e'), '.spec.ts'))
      .filter((path) => !path.endsWith('/buildId.spec.ts') && !path.endsWith('/chunks.spec.ts') && !path.endsWith('/devReload.spec.ts'))
    run('pnpm', ['exec', 'playwright', 'test', ...e2eFiles.map((path) => relative(root, path)), '--config', 'playwright.packed.config.ts', '--project=chromium'], root, packedBuildEnvironment({
      ...process.env,
      GALLERY_PACKED: '1',
    }))
    passedChecks.push('playwright')

    const publicSurface = [
      ...await discoverPackagePublicSurface(resolve(root, 'node_modules/@wsagency/wseffect-app'), '@wsagency/wseffect-app'),
      ...await discoverPackagePublicSurface(resolve(root, 'node_modules/@wsagency/wseffect-themes'), '@wsagency/wseffect-themes'),
    ]
    passedChecks.push('public-surface')
    const coverageManifest = JSON.parse(await readFile(resolve(consumerDir, 'coverage-manifest.json'), 'utf8')) as CoverageManifest
    fail(checkCoverageManifest(coverageManifest, publicSurface, passedChecks))
    console.log('packed consumer: all checks passed')
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync, spawnSync } from 'node:child_process'
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
import { checkPackedSp2Artifacts, checkPrimitiveTreeShaking, disallowedEffectModules } from './check-sp2.ts'
import { createScratchDir } from '../../e2e/helpers/build.ts'

const consumerDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(consumerDir, '../..')
const packageNames = ['app', 'primitives', 'themes'] as const
const forbiddenTreeShakingMarkers = ['viewPage', 'ServiceWorker', 'makeApp', 'prefetchOnVisible']
const passedChecks: string[] = []

export function packedBuildEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...env, WSEFFECT_BUILD_ID: 'd5c0ffee', GALLERY_CAPABILITY_SSE: '1' }
}
export async function findFreePreviewPort(): Promise<number> {
  const server = createServer()
  const { promise, resolve, reject } = Promise.withResolvers<number>()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') {
      server.close()
      reject(new Error('could not determine the packed consumer preview port'))
      return
    }
    server.close((error) => error ? reject(error) : resolve(address.port))
  })
  return promise
}
function processOutput(error: unknown, key: 'stdout' | 'stderr'): string {
  if (!error || typeof error !== 'object') return ''
  const output = key === 'stdout' && 'stdout' in error ? error.stdout : key === 'stderr' && 'stderr' in error ? error.stderr : undefined
  return typeof output === 'string' ? output : Buffer.isBuffer(output) ? output.toString() : ''
}

function isPreviewPortCollision(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /\bEADDRINUSE\b|port \d+ is already in use/i.test(`${message}\n${processOutput(error, 'stdout')}\n${processOutput(error, 'stderr')}`)
}

export async function runWithPreviewPortRetry(runAtPort: (port: number) => void, initialPort?: string): Promise<void> {
  let port = initialPort ? Number(initialPort) : await findFreePreviewPort()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      runAtPort(port)
      return
    } catch (error) {
      if (attempt === 2 || !isPreviewPortCollision(error)) throw error
      port = await findFreePreviewPort()
    }
  }
}

function runPlaywrightAtPort(args: ReadonlyArray<string>, cwd: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync('pnpm', [...args], { cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  if (result.error) throw Object.assign(result.error, { stdout: result.stdout, stderr: result.stderr })
  if (result.status !== 0) {
    throw Object.assign(new Error(`packed consumer Playwright exited with status ${result.status ?? result.signal}`), {
      stdout: result.stdout,
      stderr: result.stderr,
    })
  }
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
  await mkdir(resolve(root, '..', '..', 'bench/radix2solid'), { recursive: true })
  await cp(
    resolve(repoRoot, 'bench/radix2solid/sp2-capture-matrix.json'),
    resolve(root, '..', '..', 'bench/radix2solid/sp2-capture-matrix.json'),
  )
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
    '@wsagency/wseffect-primitives': `file:${tarballs.primitives}`,
    '@wsagency/wseffect-themes': `file:${tarballs.themes}`,
  }
  delete dependencies['@wsagency/wseffect-app']
  delete dependencies['@wsagency/wseffect-primitives']
  delete dependencies['@wsagency/wseffect-themes']
  const packageJson = {
    packageManager: rootManifest.packageManager,
    engines: rootManifest.engines,
    type: 'module',
    scripts: { build: 'vite build', typecheck: 'tsc --noEmit' },
    dependencies: {
      ...dependencies,
      '@wsagency/wseffect-app': `file:${tarballs.app}`,
      '@wsagency/wseffect-primitives': `file:${tarballs.primitives}`,
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
const port = Number(process.env.WSEFFECT_CONSUMER_PREVIEW_PORT ?? 4450)
const url = \`http://127.0.0.1:\${port}\`
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  reporter: 'list', use: { ...devices['Desktop Chrome'], baseURL: url },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [{ command: \`pnpm exec vite preview --host 127.0.0.1 --port \${port} --strictPort\`, url, reuseExistingServer: false }],
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
  await cp(resolve(consumerDir, 'fixtures/sp2'), resolve(root, 'sp2'), { recursive: true })
  await mkdir(resolve(root, 'src/consumer'), { recursive: true })
  await cp(resolve(consumerDir, 'fixtures/themes-root-types.ts'), resolve(root, 'src/consumer/themes-root-types.ts'))
  await cp(resolve(consumerDir, 'fixtures/themes-root-consumer.mjs'), resolve(root, 'themes-root-consumer.mjs'))
  await writeFile(resolve(root, 'vite.sp2.config.ts'), `
import { defineConfig } from 'vite'
export default defineConfig({
  build: { outDir: process.env.WSEFFECT_SP2_OUT_DIR, emptyOutDir: true, sourcemap: true, minify: false,
    lib: { entry: process.env.WSEFFECT_SP2_ENTRY, formats: ['es'], fileName: 'bundle' } },
})\n`)
}

async function main(): Promise<void> {
  const scratch = await createScratchDir('wseffect-consumer-')
  const packsDir = join(scratch, 'packs')
  await mkdir(packsDir, { recursive: true })
  try {
    const tarballs = await packPackages(packsDir)
    const root = join(scratch, 'apps', 'gallery')
    await mkdir(root, { recursive: true })
    await copyConsumerFixture(root, tarballs)
    const readme = await readFile(resolve(repoRoot, 'README.md'), 'utf8')
    const workspaceYaml = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    fail(checkUp8(readme, workspaceYaml))
    const primitiveOverrideAnchor = "  '@effect/platform-browser': 4.0.5\n"
    if (!workspaceYaml.includes(primitiveOverrideAnchor)) throw new Error('consumer fixture: could not locate UP-8 dependency overrides')
    const workspaceYamlWithPrimitive = workspaceYaml.replace(
      primitiveOverrideAnchor,
      `${primitiveOverrideAnchor}  '@wsagency/wseffect-primitives': file:${tarballs.primitives}\n`,
    )
    await writeFile(resolve(root, 'pnpm-workspace.yaml'), workspaceYamlWithPrimitive)

    run('pnpm', ['install', '--lockfile-only'], root)
    run('pnpm', ['install', '--frozen-lockfile'], root)
    run('pnpm', ['exec', 'vite', 'build'], root, packedBuildEnvironment())
    await checkPackedAppCapabilities({
      consumerRoot: root,
      fixturesDirectory: resolve(consumerDir, 'fixtures/app-capabilities'),
      requireAll: process.env.WSEFFECT_REQUIRE_APP_CAPABILITIES === '1',
    })
    run('pnpm', ['exec', 'tsc', '--noEmit'], root)
    passedChecks.push('themes-root-types')
    run('node', ['themes-root-consumer.mjs'], root)
    passedChecks.push('themes-root-api')
    passedChecks.push('consumer-install', 'gallery-build', 'app-capabilities', 'gallery-typecheck', 'up8')

    const lockfile = await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')
    fail(checkEffectCopies(lockfile))
    const effectDirs = (await readdir(resolve(root, 'node_modules/.pnpm'))).filter((entry) => entry.startsWith('effect@'))
    if (effectDirs.length !== 1) throw new Error(`packed consumer: expected one effect package directory, found ${effectDirs.length}`)
    const primitiveDirs = (await readdir(resolve(root, 'node_modules/.pnpm')))
      .filter((entry) => entry.startsWith('@wsagency+wseffect-primitives@'))
    if (primitiveDirs.length !== 1) {
      throw new Error(`packed consumer: expected one primitives package directory, found ${primitiveDirs.length}`)
    }
    passedChecks.push('single-primitives')
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
    const themesPackage = resolve(root, 'node_modules/@wsagency/wseffect-themes')
    await checkPackedSp2Artifacts(themesPackage)
    passedChecks.push('sp2-packed')

    const sp2Bundles = [
      { entry: 'sp2/primitive.ts', outDir: 'sp2-primitive-out' },
      { entry: 'sp2/box-heading.ts', outDir: 'sp2-box-heading-out' },
    ]
    for (const bundle of sp2Bundles) {
      run('pnpm', ['exec', 'vite', 'build', '--config', 'vite.sp2.config.ts'], root, packedBuildEnvironment({
        ...process.env,
        WSEFFECT_SP2_ENTRY: bundle.entry,
        WSEFFECT_SP2_OUT_DIR: bundle.outDir,
      }))
    }
    const primitiveMaps = await filesUnder(resolve(root, sp2Bundles[0]!.outDir), '.js.map')
    const primitiveSources = (await Promise.all(primitiveMaps.map(async (path) => {
      const map = JSON.parse(await readFile(path, 'utf8')) as { sources?: string[] }
      return map.sources ?? []
    }))).flat()
    fail(checkPrimitiveTreeShaking(primitiveSources))
    passedChecks.push('sp2-primitive-tree-shaking')

    const boxHeadingMaps = await filesUnder(resolve(root, sp2Bundles[1]!.outDir), '.js.map')
    const boxHeadingSources = (await Promise.all(boxHeadingMaps.map(async (path) => {
      const map = JSON.parse(await readFile(path, 'utf8')) as { sources?: string[] }
      return map.sources ?? []
    }))).flat()
    const effectModules = disallowedEffectModules(boxHeadingSources)
    if (effectModules.length) throw new Error(`packed SP2 Box+Heading includes Effect modules: ${effectModules.join(', ')}`)
    passedChecks.push('sp2-box-heading-effect')

    const e2eFiles = (await filesUnder(resolve(root, 'e2e'), '.spec.ts'))
      .filter((path) => !path.endsWith('/buildId.spec.ts') && !path.endsWith('/chunks.spec.ts') && !path.endsWith('/devReload.spec.ts'))
    await runWithPreviewPortRetry((previewPort) => runPlaywrightAtPort(
      ['exec', 'playwright', 'test', ...e2eFiles.map((path) => relative(root, path)), '--config', 'playwright.packed.config.ts', '--project=chromium'],
      root,
      packedBuildEnvironment({
        ...process.env,
        GALLERY_PACKED: '1',
        WSEFFECT_CONSUMER_PREVIEW_PORT: String(previewPort),
      }),
    ), process.env.WSEFFECT_CONSUMER_PREVIEW_PORT)
    passedChecks.push('playwright')

    const publicSurface = [
      ...await discoverPackagePublicSurface(resolve(root, 'node_modules/@wsagency/wseffect-app'), '@wsagency/wseffect-app'),
      ...await discoverPackagePublicSurface(resolve(root, 'node_modules/@wsagency/wseffect-primitives'), '@wsagency/wseffect-primitives'),
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

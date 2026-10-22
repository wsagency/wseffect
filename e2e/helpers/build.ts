import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'

export async function createScratchDir(prefix: string): Promise<string> {
  const scratchBase = resolve(process.env.WSEFFECT_SCRATCH_DIR ?? tmpdir())
  await mkdir(scratchBase, { recursive: true })
  return mkdtemp(join(scratchBase, prefix))
}

export async function galleryPageAssets(keys: ReadonlyArray<string>): Promise<Record<string, string>> {
  const galleryRoot = process.env.GALLERY_PACKED === '1' ? process.cwd() : resolve(process.cwd(), 'apps/gallery')
  const manifest = JSON.parse(await readFile(resolve(galleryRoot, 'dist/.vite/manifest.json'), 'utf8')) as Record<string, { file?: string }>
  return Object.fromEntries(keys.map((key) => {
    const file = manifest[`src/pages/${key}.ts`]?.file
    if (file === undefined) throw new Error(`missing build manifest page entry: ${key}`)
    return [key, `/${file}`]
  }))
}

export interface GalleryBuildOptions {
  readonly outDir: string
  readonly buildId?: string
  readonly env?: NodeJS.ProcessEnv
}

export interface GalleryBuildFixture {
  readonly rootDir: string
  readonly galleryDir: string
  readonly pagesDir: string
  readonly packagesDir: string
  build(options: GalleryBuildOptions): void
  cleanup(): Promise<void>
}


export async function createGalleryBuildFixture(): Promise<GalleryBuildFixture> {
  const workspaceDir = resolve(import.meta.dirname, '../..')
  const sourceGallery = resolve(workspaceDir, 'apps/gallery')
  const rootDir = await createScratchDir('wseffect-gallery-')
  const galleryDir = resolve(rootDir, 'apps/gallery')
  const packagesDir = resolve(rootDir, 'packages')

  try {
    await mkdir(resolve(rootDir, 'apps'), { recursive: true })
    await mkdir(packagesDir, { recursive: true })
    await mkdir(resolve(rootDir, 'bench/radix2solid'), { recursive: true })
    await cp(
      resolve(workspaceDir, 'bench/radix2solid/sp2-capture-matrix.json'),
      resolve(rootDir, 'bench/radix2solid/sp2-capture-matrix.json'),
    )
    await cp(sourceGallery, galleryDir, {
      recursive: true,
      filter: (source) => {
        const firstSegment = relative(sourceGallery, source).split(sep)[0]
        return firstSegment !== 'dist' && firstSegment !== 'node_modules'
      },
    })
    for (const name of ['app', 'themes']) {
      const sourcePackage = resolve(workspaceDir, 'packages', name)
      const copyPackage = resolve(packagesDir, name)
      await cp(sourcePackage, copyPackage, {
        recursive: true,
        filter: (source) => relative(sourcePackage, source).split(sep)[0] !== 'node_modules',
      })
      await symlink(resolve(sourcePackage, 'node_modules'), resolve(copyPackage, 'node_modules'), 'dir')
    }

    await cp(resolve(workspaceDir, 'package.json'), resolve(rootDir, 'package.json'))
    await cp(resolve(workspaceDir, 'pnpm-lock.yaml'), resolve(rootDir, 'pnpm-lock.yaml'))
    await cp(resolve(workspaceDir, 'pnpm-workspace.yaml'), resolve(rootDir, 'pnpm-workspace.yaml'))
    await cp(resolve(workspaceDir, 'tsconfig.base.json'), resolve(rootDir, 'tsconfig.base.json'))
    await symlink(resolve(workspaceDir, 'node_modules'), resolve(rootDir, 'node_modules'), 'dir')

    const galleryNodeModules = resolve(galleryDir, 'node_modules')
    const sourceNodeModules = resolve(sourceGallery, 'node_modules')
    await mkdir(galleryNodeModules)
    for (const entry of await readdir(sourceNodeModules)) {
      const sourceEntry = resolve(sourceNodeModules, entry)
      const targetEntry = resolve(galleryNodeModules, entry)
      if (entry !== '@wsagency') {
        await symlink(sourceEntry, targetEntry)
        continue
      }
      await mkdir(targetEntry)
      const sourceScope = resolve(sourceEntry)
      for (const packageName of await readdir(sourceScope)) {
        const workspacePackage = packageName === 'wseffect-app' || packageName === 'wseffect-themes'
        const target = workspacePackage
          ? resolve(packagesDir, packageName === 'wseffect-app' ? 'app' : 'themes')
          : resolve(sourceScope, packageName)
        await symlink(target, resolve(targetEntry, packageName), 'dir')
      }
    }
    await writeFile(resolve(rootDir, '.gitignore'), 'node_modules/\n**/node_modules/\n**/dist/\n')
    execFileSync('git', ['init', '--quiet'], { cwd: rootDir, stdio: 'pipe' })
    execFileSync('git', ['add', '-A'], { cwd: rootDir, stdio: 'pipe' })
  } catch (error) {
    await rm(rootDir, { recursive: true, force: true })
    throw error
  }

  let packagesBuilt = false
  return {
    rootDir,
    galleryDir,
    pagesDir: resolve(galleryDir, 'src/pages'),
    packagesDir,
    build({ outDir, buildId, env = {} }) {
      const buildEnv = { ...process.env, ...env }
      if (buildId === undefined) delete buildEnv.WSEFFECT_BUILD_ID
      else buildEnv.WSEFFECT_BUILD_ID = buildId

      if (!packagesBuilt) {
        for (const name of ['app', 'themes']) {
          const packageDir = resolve(packagesDir, name)
          const compiler = resolve(workspaceDir, 'node_modules/typescript/bin/tsc')
          execFileSync(process.execPath, [compiler, '-p', 'tsconfig.build.json'], {
            cwd: packageDir,
            stdio: 'pipe',
            env: buildEnv,
          })
          execFileSync(process.execPath, [resolve(packageDir, 'scripts/brand-dist.mjs')], {
            cwd: packageDir,
            stdio: 'pipe',
            env: buildEnv,
          })
          if (name === 'themes') {
            execFileSync(process.execPath, [resolve(packageDir, 'scripts/build-css.js')], {
              cwd: packageDir,
              stdio: 'pipe',
              env: buildEnv,
            })
          }
        }
        packagesBuilt = true
      }
      const vite = resolve(workspaceDir, 'node_modules/vite/bin/vite.js')
      execFileSync(process.execPath, [
        vite, 'build', '--outDir', resolve(outDir), '--emptyOutDir',
      ], {
        cwd: galleryDir,
        stdio: 'pipe',
        env: buildEnv,
      })
    },
    cleanup: () => rm(rootDir, { recursive: true, force: true }),
  }
}

import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, parse, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

function packageRootFrom(entry: string, expectedName: string): string | undefined {
  let current = existsSync(join(entry, 'package.json')) ? entry : dirname(entry)
  while (current !== parse(current).root) {
    const packageFile = join(current, 'package.json')
    if (existsSync(packageFile)) {
      const packageJson = JSON.parse(readFileSync(packageFile, 'utf8')) as { name?: string }
      if (packageJson.name === expectedName) return current
    }
    current = dirname(current)
  }
  return undefined
}

export function frameworkChunking(pagesDir: string): Plugin {
  const appShared = new Set<string>()
  let appRoot = ''
  let pagesRoot = ''
  let packageRoots: Array<string> = []
  const modulePath = (id: string): string => {
    const cleanId = id.split('?')[0]!
    try {
      return realpathSync(cleanId)
    } catch {
      // Virtual and generated modules are not filesystem modules.
      return cleanId
    }
  }
  const isInside = (modulePath: string, directory: string): boolean =>
    modulePath === directory || modulePath.startsWith(`${directory}${sep}`)
  const isFrameworkPath = (resolvedId: string): boolean =>
    packageRoots.some((packageRoot) => isInside(resolvedId, packageRoot))
  const isFrameworkModule = (id: string): boolean => isFrameworkPath(modulePath(id))
  const isAppSharedModule = (id: string): boolean => {
    const resolvedId = modulePath(id)
    return existsSync(resolvedId) && !isInside(resolvedId, pagesRoot) && !isFrameworkPath(resolvedId)
  }
  return {
    name: 'wseffect:framework-chunk',
    config(config) {
      const root = resolve(config.root ?? process.cwd())
      const require = createRequire(join(root, 'package.json'))
      packageRoots = []
      for (const packageName of ['foldkit', 'effect', '@effect/platform-browser', '@wsagency/wseffect-app', 'workbox-window']) {
        try {
          const resolvedEntry = realpathSync(require.resolve(packageName))
          const packageRoot = packageRootFrom(resolvedEntry, packageName)
          if (packageRoot !== undefined) packageRoots.push(realpathSync(packageRoot))
        } catch {
          // Some framework packages are optional to an app build.
        }
      }
      appRoot = realpathSync(root)
      const pageDirectory = resolve(root, pagesDir)
      pagesRoot = existsSync(pageDirectory) ? realpathSync(pageDirectory) : pageDirectory
      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: 'framework',
                    test: isFrameworkModule,
                  },
                  {
                    name: 'app-shared',
                    test: (id) => appShared.has(id),
                  },
                ],
              },
            },
          },
        },
      }
    },
    buildEnd() {
      appShared.clear()
      const moduleIds = [...this.getModuleIds()]
      const pageRoots: Array<string> = []
      const entryRoots: Array<string> = []
      for (const id of moduleIds) {
        const isPage = isInside(modulePath(id), pagesRoot)
        if (isPage) pageRoots.push(id)
        else if (this.getModuleInfo(id)?.isEntry === true) entryRoots.push(id)
      }
      const reachableFrom = (roots: ReadonlyArray<string>): Set<string> => {
        const reachable = new Set<string>()
        const pending = [...roots]
        while (pending.length > 0) {
          const id = pending.pop()!
          if (reachable.has(id)) continue
          reachable.add(id)
          const info = this.getModuleInfo(id)
          if (info !== null) pending.push(...info.importedIds)
        }
        return reachable
      }
      const pageReachable = reachableFrom(pageRoots)
      const entryReachable = reachableFrom(entryRoots)
      for (const id of pageReachable) {
        if (entryReachable.has(id) && isAppSharedModule(id)) appShared.add(id)
      }
    },
  }
}

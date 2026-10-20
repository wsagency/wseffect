import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, parse, posix, resolve, sep } from 'node:path'
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
  let appRoot: string | undefined
  let runtimeEntryId: string | undefined
  let runtimeModuleIds: Set<string> | undefined
  let pagesRoot = ''
  let pageChunkFiles = new Set<string>()
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
  const isAppModule = (id: string): boolean =>
    appRoot !== undefined && isInside(modulePath(id), appRoot)
  const isRuntimeModule = (
    id: string,
    getModuleInfo: (moduleId: string) => { readonly importedIds: ReadonlyArray<string> } | null,
  ): boolean => {
    if (!isAppModule(id) || runtimeEntryId === undefined || appRoot === undefined) return false
    if (runtimeModuleIds === undefined) {
      const modules = new Set<string>()
      const visited = new Set<string>()
      const pending = [runtimeEntryId]
      while (pending.length > 0) {
        const current = pending.pop()!
        const resolvedId = modulePath(current)
        if (visited.has(resolvedId) || !isInside(resolvedId, appRoot)) continue
        visited.add(resolvedId)
        modules.add(resolvedId)
        const info = getModuleInfo(current)
        if (info !== null) pending.push(...info.importedIds)
      }
      runtimeModuleIds = modules
    }
    return runtimeModuleIds.has(modulePath(id))
  }
  const isAppSharedModule = (id: string): boolean => {
    const resolvedId = modulePath(id)
    return existsSync(resolvedId) &&
      !isInside(resolvedId, pagesRoot) &&
      !(appRoot !== undefined && isInside(resolvedId, appRoot)) &&
      !isFrameworkPath(resolvedId)
  }

  return {
    name: 'wseffect:framework-chunk',
    config(config) {
      const root = resolve(config.root ?? process.cwd())
      const require = createRequire(join(root, 'package.json'))
      packageRoots = []
      for (const packageName of ['foldkit', 'effect', '@effect/platform-browser', 'workbox-window']) {
        try {
          const resolvedEntry = realpathSync(require.resolve(packageName))
          const packageRoot = packageRootFrom(resolvedEntry, packageName)
          if (packageRoot !== undefined) packageRoots.push(realpathSync(packageRoot))
        } catch {
          // Some framework packages are optional to an app build.
        }
      }
      try {
        const resolvedEntry = realpathSync(require.resolve('@wsagency/wseffect-app'))
        const packageRoot = packageRootFrom(resolvedEntry, '@wsagency/wseffect-app')
        appRoot = packageRoot === undefined ? undefined : realpathSync(packageRoot)
        runtimeEntryId = realpathSync(require.resolve('@wsagency/wseffect-app/runtime'))
      } catch {
        appRoot = undefined
        runtimeEntryId = undefined
      }
      runtimeModuleIds = undefined
      const pageDirectory = resolve(root, pagesDir)
      pagesRoot = existsSync(pageDirectory) ? realpathSync(pageDirectory) : pageDirectory
      pageChunkFiles.clear()
      const modulePreload = config.build?.modulePreload
      const configuredResolver = typeof modulePreload === 'object'
        ? modulePreload.resolveDependencies
        : undefined
      return {
        build: {
          ...(modulePreload === false ? {} : {
            modulePreload: {
              ...(typeof modulePreload === 'object' ? modulePreload : {}),
              resolveDependencies(filename, deps, context) {
                // Filter canonical paths before and after consumer rewrites.
                const canonicalFilename = posix.normalize(filename.split(/[?#]/, 1)[0]!)
                const shouldExclude = (dependency: string): boolean => {
                  const path = posix.normalize(dependency.split(/[?#]/, 1)[0]!)
                  return path === canonicalFilename || pageChunkFiles.has(path)
                }
                const filtered = deps.filter((dependency) => !shouldExclude(dependency))
                const resolved = configuredResolver?.(filename, filtered, context) ?? filtered
                return resolved.filter((dependency) => !shouldExclude(dependency))
              },
            },
          }),
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: (id, context) =>
                      isFrameworkPath(modulePath(id)) ||
                      isRuntimeModule(id, (moduleId) => context.getModuleInfo(moduleId))
                        ? 'framework'
                        : null,
                    debugName: 'framework',
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
    buildStart() {
      runtimeModuleIds = undefined
    },
    // Use page module facades to collect exact output paths regardless of naming pattern.
    generateBundle: {
      order: 'pre',
      handler(_options, bundle) {
        pageChunkFiles.clear()
        for (const output of Object.values(bundle)) {
          if (output.type !== 'chunk' || output.facadeModuleId === null) continue
          if (!isInside(modulePath(output.facadeModuleId), pagesRoot)) continue
          pageChunkFiles.add(posix.normalize(output.fileName))
        }
      },
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
      const reachableFrom = (roots: ReadonlyArray<string>, stopAtPages = false): Set<string> => {
        const reachable = new Set<string>()
        const pending = [...roots]
        while (pending.length > 0) {
          const id = pending.pop()!
          const resolvedId = modulePath(id)
          if (reachable.has(id) || (stopAtPages && isInside(resolvedId, pagesRoot))) continue
          reachable.add(id)
          const info = this.getModuleInfo(id)
          if (info !== null) pending.push(...info.importedIds)
        }
        return reachable
      }
      const pageReachable = reachableFrom(pageRoots)
      const entryReachable = reachableFrom(entryRoots, true)
      for (const id of pageReachable) {
        if (!entryReachable.has(id) || !isAppSharedModule(id)) continue
        const hasDirectEntryImporter = this.getModuleInfo(id)?.importers.some((importer) =>
          entryReachable.has(importer) && !isAppModule(importer) && !isInside(modulePath(importer), pagesRoot),
        ) ?? false
        // App barrels re-export page-only helpers; don't promote their dependencies into the eager shared chunk.
        if (hasDirectEntryImporter) appShared.add(id)
      }
    },
  }
}

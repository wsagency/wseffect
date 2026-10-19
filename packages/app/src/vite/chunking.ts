import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
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

export function frameworkChunking(): Plugin {
  return {
    name: 'wseffect:framework-chunk',
    config(config) {
      const root = resolve(config.root ?? process.cwd())
      const require = createRequire(join(root, 'package.json'))
      const packageRoots: Array<string> = []
      for (const packageName of ['foldkit', 'effect', '@effect/platform-browser', '@wsagency/wseffect-app', 'workbox-window']) {
        try {
          const resolvedEntry = realpathSync(require.resolve(packageName))
          const packageRoot = packageRootFrom(resolvedEntry, packageName)
          if (packageRoot !== undefined) packageRoots.push(realpathSync(packageRoot))
        } catch {
          // Some framework packages are optional to an app build.
        }
      }
      const isFrameworkModule = (id: string): boolean => {
        const cleanId = id.split('?')[0]!
        let resolvedId = cleanId
        try {
          resolvedId = realpathSync(cleanId)
        } catch {
          // Virtual and generated modules are not filesystem package modules.
        }
        return packageRoots.some((packageRoot) =>
          resolvedId === packageRoot || resolvedId.startsWith(`${packageRoot}${sep}`),
        )
      }
      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [{
                  name: 'framework',
                  test: isFrameworkModule,
                }],
              },
            },
          },
        },
      }
    },
  }
}

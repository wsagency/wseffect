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
      const scopeDirectories: Array<string> = []
      let directory = root
      while (true) {
        const scopeDirectory = join(directory, 'node_modules', '@wsagency')
        if (existsSync(scopeDirectory)) scopeDirectories.push(scopeDirectory)
        const parent = dirname(directory)
        if (parent === directory) break
        directory = parent
      }
      const packageRoots: Array<string> = []
      for (const scopeDirectory of scopeDirectories) {
        for (const entry of readdirSync(scopeDirectory, { withFileTypes: true })) {
          const name = entry.name
          if (!name.startsWith('wseffect-')) continue
          const packageName = `@wsagency/${name}`
          try {
            let resolvedPackage: string
            try {
              resolvedPackage = require.resolve(packageName)
            } catch {
              resolvedPackage = join(scopeDirectory, name)
            }
            const resolvedEntry = realpathSync(resolvedPackage)
            const packageRoot = packageRootFrom(resolvedEntry, packageName)
            if (packageRoot !== undefined) packageRoots.push(realpathSync(packageRoot))
          } catch {
            // Ignore broken or non-resolvable workspace links.
          }
        }
      }
      const isFrameworkModule = (id: string): boolean => {
        if (id.includes(`${sep}node_modules${sep}`)) return true
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

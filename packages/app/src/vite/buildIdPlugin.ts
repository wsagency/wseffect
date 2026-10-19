import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { computeBuildId } from '../codegen/buildId.js'

function workspaceRootFrom(start: string): string {
  let current = resolve(start)
  while (true) {
    if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(start)
    current = parent
  }
}
export function buildIdPlugin(pwaEnabled: boolean): Plugin {
  let buildId = ''
  return {
    name: 'wseffect:build-id',
    enforce: 'pre',
    async config(config) {
      const appRoot = resolve(config.root ?? process.cwd())
      const workspaceRoot = workspaceRootFrom(appRoot)
      buildId = await computeBuildId({ appRoot, workspaceRoot, env: process.env })
      return { define: { __WSEFFECT_BUILD_ID__: JSON.stringify(buildId), __WSEFFECT_PWA__: JSON.stringify(pwaEnabled) } }
    },
    generateBundle() {
      const version = JSON.stringify({ buildId })
      this.emitFile({ type: 'asset', fileName: 'version.json', source: version })
    },
  }
}

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { foldkit } from '@foldkit/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { writePages } from '../codegen/index.js'
import { buildIdPlugin } from './buildIdPlugin.js'
import { frameworkChunking } from './chunking.js'

export interface WseffectOptions {
  readonly pagesDir?: string
  readonly primaryPages: ReadonlyArray<string>
  readonly pwa: false | { readonly manifest: Partial<ManifestOptions> }
}

const moduleDir = dirname(fileURLToPath(import.meta.url))

export function validateManifest(manifest: Partial<ManifestOptions>): string[] {
  const errors: Array<string> = []
  const icons = manifest.icons ?? []
  for (const size of ['192x192', '512x512']) {
    if (!icons.some((icon) => icon.sizes?.split(/\s+/).includes(size) && (
      icon.type === 'image/png' || (icon.type === undefined && icon.src.toLowerCase().endsWith('.png'))
    ))) {
      errors.push(`manifest requires a PNG icon at ${size}`)
    }
  }
  if (typeof manifest.name !== 'string') errors.push('manifest.name must be string')
  if (typeof manifest.short_name !== 'string') errors.push('manifest.short_name must be string')
  if (manifest.start_url !== '/') errors.push('manifest.start_url must be /')
  if (manifest.display !== 'standalone') errors.push('manifest.display must be standalone')
  if (typeof manifest.theme_color !== 'string') errors.push('manifest.theme_color must be string')
  if (typeof manifest.background_color !== 'string') errors.push('manifest.background_color must be string')
  return errors
}

function pagesPlugin(pagesDir: string, primaryPages: ReadonlyArray<string>): Plugin {
  let root = process.cwd()
  const options = { pagesDir, primaryPages }
  const syncPages = () => writePages(root, options)
  return {
    name: 'wseffect:pages',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
    },
    async buildStart() {
      const generated = await syncPages()
      this.addWatchFile(generated)
    },
    configureServer(server) {
      const directory = resolve(root, pagesDir)
      for (const event of ['add', 'unlink']) {
        server.watcher.on(event, (path) => {
          if (resolve(path).startsWith(`${directory}/`)) void syncPages()
        })
      }
    },
  }
}

type ViteManifestEntry = {
  readonly file: string
  readonly name?: string
  readonly isDynamicEntry?: boolean
  readonly imports?: ReadonlyArray<string>
  readonly css?: ReadonlyArray<string>
}

function allowedPrecacheFiles(outDir: string, primaryPages: ReadonlyArray<string>): Set<string> {
  const manifest = JSON.parse(readFileSync(resolve(outDir, '.vite/manifest.json'), 'utf8')) as Record<string, ViteManifestEntry>
  const allowed = new Set<string>(['index.html', 'manifest.webmanifest'])
  const addEntry = (key: string, visited = new Set<string>()): void => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = manifest[key]
    if (entry === undefined) throw new Error(`Vite manifest is missing ${key}`)
    allowed.add(entry.file)
    for (const css of entry.css ?? []) allowed.add(css)
    for (const imported of entry.imports ?? []) addEntry(imported, visited)
  }
  addEntry('index.html')
  for (const page of primaryPages) {
    const pageEntry = Object.entries(manifest).find(([key, entry]) =>
      entry.isDynamicEntry === true && (entry.name === page || key.endsWith(`/pages/${page}.ts`)),
    )
    if (pageEntry === undefined) throw new Error(`Vite manifest is missing primary page ${page}`)
    addEntry(pageEntry[0])
  }
  const workbox = Object.entries(manifest).find(([, entry]) =>
    entry.name === 'workbox-window' || /(?:^|\/)workbox-window-[^/]+\.js$/.test(entry.file),
  )
  if (workbox !== undefined) addEntry(workbox[0])
  const webManifest = JSON.parse(readFileSync(resolve(outDir, 'manifest.webmanifest'), 'utf8')) as {
    readonly icons?: ReadonlyArray<{ readonly src: string }>
  }
  for (const icon of webManifest.icons ?? []) allowed.add(icon.src.replace(/^\/+/, ''))
  return allowed
}

export function wseffect(options: WseffectOptions): Array<Plugin> {
  const pagesDir = options.pagesDir ?? 'src/pages'
  let pwaOutDir = resolve(process.cwd(), 'dist')
  const plugins: Array<Plugin> = [
    ...foldkit(),
    pagesPlugin(pagesDir, options.primaryPages),
    buildIdPlugin(options.pwa !== false),
    frameworkChunking(pagesDir),
    {
      name: 'wseffect:pwa-manifest-output',
      configResolved(config) {
        pwaOutDir = resolve(config.root, config.build.outDir)
      },
    },
  ]
  if (options.pwa === false) {
    plugins.push({
      name: 'wseffect:pwa-disabled',
      config() {
        const javascriptStub = resolve(moduleDir, '../pwa/register-stub.js')
        const typescriptStub = resolve(moduleDir, '../pwa/register-stub.ts')
        return { resolve: { alias: { 'virtual:pwa-register': existsSync(javascriptStub) ? javascriptStub : typescriptStub } } }
      },
    })
  } else {
    const errors = validateManifest(options.pwa.manifest)
    if (errors.length > 0) throw new Error(errors.join('\n'))
    plugins.push(...VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      manifest: options.pwa.manifest,
      workbox: {
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/assets\//],
        globPatterns: ['index.html', 'assets/**/*.{js,css}'],
        manifestTransforms: [async (entries) => {
          const allowed = allowedPrecacheFiles(pwaOutDir, options.primaryPages)
          const selected = entries.filter(({ url }) => allowed.has(url.replace(/^\/+/, '').replaceAll('\\', '/')))
          return { manifest: [...new Map(selected.map((entry) => [entry.url, entry])).values()], warnings: [] }
        }],
        runtimeCaching: [{
          urlPattern: /\/assets\/.*\.(?:js|css)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'wseffect-pages',
            cacheableResponse: { statuses: [200] },
            expiration: { maxEntries: 200, maxAgeSeconds: 2_592_000 },
          },
        }],
      },
    }))
  }
  return plugins
}

export { computeBuildId } from '../codegen/buildId.js'
export type { ManifestOptions }

import { describe, expect, it } from 'vitest'
import { validateManifest, wseffect } from '../src/vite/index.js'

const manifest = {
  name: 'Example app',
  short_name: 'Example',
  start_url: '/',
  display: 'standalone' as const,
  theme_color: '#123456',
  background_color: '#ffffff',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}

describe('wseffect Vite plugin', () => {
  it('requires app identity and installable PNG icons in the web manifest', () => {
    expect(validateManifest(manifest)).toEqual([])
    expect(validateManifest({ ...manifest, icons: [] })).toEqual([
      'manifest requires a PNG icon at 192x192',
      'manifest requires a PNG icon at 512x512',
    ])
    expect(validateManifest({ ...manifest, start_url: '/app' })).toContain('manifest.start_url must be /')
  })

  it('includes build ID and chunking plugins and keeps PWA disabled builds free of the service worker plugin', () => {
    const plugins = wseffect({ primaryPages: ['alpha'], pwa: false })
    const names = plugins.map((plugin) => plugin.name)
    expect(names).toContain('wseffect:pages')
    expect(names).toContain('wseffect:build-id')
    expect(names).toContain('wseffect:framework-chunk')
    expect(names).toContain('wseffect:pwa-disabled')
    expect(names.some((name) => name?.includes('vite-plugin-pwa'))).toBe(false)
  })
})

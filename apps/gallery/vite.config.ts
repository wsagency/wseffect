import { primaryPages } from './src/primaryPages.js'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

const serveCapabilitySignals = (server: ViteDevServer | PreviewServer) => {
  server.middlewares.use((request, response, next) => {
    if (process.env.GALLERY_CAPABILITY_SSE !== '1' || request.url !== '/__gallery/capabilities/signals') return next()
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')
    response.write('event: datastar-patch-signals\ndata: signals {"count":7}\n\n')
  })
}

const capabilitySignalEndpoint: Plugin = {
  name: 'gallery-capability-signal-endpoint',
  configureServer: serveCapabilitySignals,
  configurePreviewServer: serveCapabilitySignals,
}

import { defineConfig } from 'vite'
import { wseffect } from '@wsagency/wseffect-app/vite'

export const manifest = {
  name: 'WS Effect Gallery',
  short_name: 'wseffect',
  start_url: '/',
  display: 'standalone' as const,
  theme_color: '#3e63dd',
  background_color: '#fdfdfe',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}

export default defineConfig({
  define: { __GALLERY_REVISION__: JSON.stringify(process.env.GALLERY_REVISION ?? 'r1') },
  build: { manifest: true, sourcemap: true },
  plugins: [wseffect({
    primaryPages,
    pwa: { manifest },
  }), capabilitySignalEndpoint],
})

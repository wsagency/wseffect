import { primaryPages } from './src/primaryPages.js'
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
  })],
})

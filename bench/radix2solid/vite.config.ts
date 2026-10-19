import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

function configuredPort(name: string): number {
  const value = process.env[name]
  if (value === undefined) return 0
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`${name} must be a valid TCP port`)
  return port
}

const devPort = configuredPort('RADIX2SOLID_DEV_PORT')
const previewPort = configuredPort('RADIX2SOLID_PREVIEW_PORT')
export default defineConfig({
  plugins: [solid()],
  resolve: { dedupe: ['solid-js', '@solidjs/web', '@solidjs/signals'] },
  build: {
    manifest: true,
    target: 'esnext',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/solid-js/') || id.includes('/node_modules/@solidjs/web/') || id.includes('/node_modules/@solidjs/signals/')) return 'framework'
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: devPort, strictPort: devPort !== 0 },
  preview: { host: '127.0.0.1', port: previewPort, strictPort: previewPort !== 0 },
})

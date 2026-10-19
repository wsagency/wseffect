import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

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
  server: { host: '127.0.0.1', port: 4510, strictPort: true },
  preview: { host: '127.0.0.1', port: 4511, strictPort: true },
})

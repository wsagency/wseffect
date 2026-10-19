import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa/register-stub.ts', import.meta.url)) } },
  define: { __WSEFFECT_BUILD_ID__: JSON.stringify('test-build'), __WSEFFECT_PWA__: 'true' },
  test: {
    environment: 'happy-dom',
    setupFiles: ['foldkit/test/vitest'],
    include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], reporter: ['text', 'json'] },
  },
})

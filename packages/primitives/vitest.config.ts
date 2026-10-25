import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['@wsagency/wseffect-foldkit/test/vitest'],
    include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], reporter: ['text', 'json'] },
  },
})

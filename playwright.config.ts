import { defineConfig, devices } from '@playwright/test'

const root = new URL('.', import.meta.url).pathname
const productionURL = 'http://127.0.0.1:4450'
const developmentURL = 'http://127.0.0.1:4451'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 4,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    ...(['chromium', 'firefox', 'webkit'] as const).map((name) => {
      const device = name === 'chromium'
        ? devices['Desktop Chrome']
        : name === 'firefox' ? devices['Desktop Firefox'] : devices['Desktop Safari']
      return {
        name,
        testIgnore: ['**/devReload.spec.ts', '**/capabilities.spec.ts'],
        ...(name === 'chromium' ? {} : { grepInvert: /PWA service-worker/ }),
        use: { ...device, baseURL: productionURL },
      }
    }),
    ...(['chromium', 'firefox', 'webkit'] as const).map((name) => {
      const device = name === 'chromium'
        ? devices['Desktop Chrome']
        : name === 'firefox' ? devices['Desktop Firefox'] : devices['Desktop Safari']
      return {
        name: `capabilities-${name}`,
        testMatch: '**/capabilities.spec.ts',
        use: { ...device, baseURL: 'http://127.0.0.1:4452', browserName: name },
      }
    }),
    {
      name: 'devReload',
      testMatch: '**/devReload.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: developmentURL, browserName: 'chromium' },
    },
    {
      name: 'devNavigation',
      testMatch: '**/navigation.spec.ts',
      grep: /dialog-tabs-dialog navigation interrupts/,
      use: { ...devices['Desktop Chrome'], baseURL: developmentURL, browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: `node ${root}tools/serve/cli.ts ${root}apps/gallery/dist 4450`,
      url: productionURL,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm --dir ${root}apps/gallery exec vite --host 127.0.0.1 --port 4451 --strictPort`,
      url: developmentURL,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm --dir ${root}apps/gallery build && GALLERY_CAPABILITY_SSE=1 pnpm --dir ${root}apps/gallery exec vite preview --host 127.0.0.1 --port 4452 --strictPort`,
      url: 'http://127.0.0.1:4452',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})

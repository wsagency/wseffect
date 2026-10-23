import { defineConfig, devices } from '@playwright/test'

const root = new URL('.', import.meta.url).pathname
const productionURL = 'http://127.0.0.1:4450'
const developmentURL = 'http://127.0.0.1:4451'
const capabilitiesPort = Number(process.env.WSEFFECT_CAPABILITIES_PREVIEW_PORT ?? 4452)
const capabilitiesURL = `http://127.0.0.1:${capabilitiesPort}`

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
        use: { ...device, baseURL: capabilitiesURL, browserName: name },
      }
    }),
    // Dev-server projects share Vite's cold transform cache; reload tests also edit source files.
    // Keep them serial so parallel browser workers cannot race HMR or starve first-load compilation.
    {
      name: 'devReload',
      testMatch: '**/devReload.spec.ts',
      workers: 1,
      use: { ...devices['Desktop Chrome'], baseURL: developmentURL, browserName: 'chromium' },
    },
    {
      name: 'devNavigation',
      testMatch: '**/navigation.spec.ts',
      grep: /dialog-tabs-dialog navigation interrupts/,
      workers: 1,
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
      command: `pnpm --dir ${root}apps/gallery build && GALLERY_CAPABILITY_SSE=1 pnpm --dir ${root}apps/gallery exec vite preview --host 127.0.0.1 --port ${capabilitiesPort} --strictPort`,
      url: capabilitiesURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})

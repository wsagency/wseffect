import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'island.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  projects: (['chromium', 'firefox', 'webkit'] as const).map((name) => ({
    name,
    use: { ...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'], browserName: name },
  })),
})

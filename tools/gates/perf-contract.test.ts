import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { chromium } from '@playwright/test'
import { build, preview } from 'vite'

test('mini-app matches the shared virtual-list, form, and menu contract', async () => {
  const fixtureDir = resolve(import.meta.dirname, '../fixtures/mini-app')
  await build({ root: fixtureDir, configFile: join(fixtureDir, 'vite.config.ts'), logLevel: 'error' })
  const server = await preview({
    root: fixtureDir,
    configFile: join(fixtureDir, 'vite.config.ts'),
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const baseUrl = server.resolvedUrls?.local?.[0]
  assert.ok(baseUrl, 'Vite preview exposes a local URL')
  try {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.goto(new URL('/virtual-list', baseUrl).href)
      await page.locator('[data-perf="vl-filter"]').waitFor({ state: 'visible', timeout: 1_000 })
      assert.equal(await page.locator('[data-perf="vl-filter"]').getAttribute('type'), 'text')
      await page.locator('[data-perf="vl-sort"]').waitFor({ state: 'visible', timeout: 1_000 })
      assert.equal(await page.locator('[data-perf="vl-sort"]').count(), 1)
      assert.equal(await page.locator('[data-perf="vl-row"]').count(), 15)
      assert.equal(await page.locator('[data-perf="vl-row"]').first().locator(':scope > *').count(), 6)
      assert.equal(await page.locator('[data-perf="vl-cell-input"]').count(), 1)
      assert.equal(await page.locator('[data-perf="vl-cell-input"]').getAttribute('type'), 'text')
      assert.equal(await page.locator('[data-perf="vl-select"]').count(), 1)

      await page.goto(new URL('/form', baseUrl).href)
      await page.locator('[data-perf="form-field-0"]').waitFor({ state: 'visible', timeout: 1_000 })
      assert.equal(await page.locator('.form-grid input[type="text"]').count(), 200)

      await page.goto(new URL('/menus', baseUrl).href)
      await page.locator('[data-perf="menus-tick"]').waitFor({ state: 'visible', timeout: 1_000 })
      assert.equal(await page.locator('[data-menu-index]').count(), 200)
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
})

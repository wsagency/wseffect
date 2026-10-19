import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

test('Gallery prefetches page links when they enter the viewport', { timeout: 60_000 }, async () => {
  const appDir = resolve(import.meta.dirname, '../../apps/gallery')
  const server = await createServer({
    root: appDir,
    configFile: resolve(appDir, 'vite.config.ts'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  try {
    await server.listen()
    const baseUrl = server.resolvedUrls?.local?.[0]
    assert.ok(baseUrl, 'Vite dev server exposes a local URL')
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.goto(new URL('/virtual-list', baseUrl).href)
      await page.waitForFunction((key) => {
        const messages = (window as Window & {
          __wseffectMessages?: ReadonlyArray<{ _tag?: string; message?: { _tag?: string; key?: string } }>
        }).__wseffectMessages ?? []
        return messages.some((message) =>
          message._tag === 'GotKitMessage'
          && message.message?._tag === 'RequestedPrefetch'
          && message.message.key === key)
      }, 'layout', { timeout: 20_000 })

      const prefetchedBeforeScroll = await page.evaluate(() => {
        const messages = (window as Window & {
          __wseffectMessages?: ReadonlyArray<{ _tag?: string; message?: { _tag?: string; key?: string } }>
        }).__wseffectMessages ?? []
        return messages.flatMap((message) =>
          message._tag === 'GotKitMessage' && message.message?._tag === 'RequestedPrefetch' && message.message.key
            ? [message.message.key]
            : [])
      })
      assert.ok(prefetchedBeforeScroll.includes('layout'))
      assert.ok(!prefetchedBeforeScroll.includes('form'), 'the off-screen form link waits for scrolling')

      await page.locator('#gallery-page-links').evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await page.waitForFunction((key) => {
        const messages = (window as Window & {
          __wseffectMessages?: ReadonlyArray<{ _tag?: string; message?: { _tag?: string; key?: string } }>
        }).__wseffectMessages ?? []
        return messages.some((message) =>
          message._tag === 'GotKitMessage'
          && message.message?._tag === 'RequestedPrefetch'
          && message.message.key === key)
      }, 'form', { timeout: 20_000 })
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
})

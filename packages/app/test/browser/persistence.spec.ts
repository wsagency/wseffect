import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { resolve } from 'node:path'
declare global {
  interface Window {
    startPersistence?: (key: string) => { save: (value: number) => Promise<void>; stop: () => Promise<void> }
    persistence?: { save: (value: number) => Promise<void>; stop: () => Promise<void> }
    persistenceSubscribed?: boolean
  }
}


let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  const root = resolve(import.meta.dirname, '../..')
  server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, appType: 'spa' })
  await server.listen()
  const address = server.httpServer!.address()
  if (address === null || typeof address === 'string') throw new Error('Vite did not bind a TCP port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => { await server?.close() })

async function start(page: import('@playwright/test').Page, key: string): Promise<void> {
  await page.goto(`${baseUrl}/test/browser/persistence.html`)
  await page.waitForFunction(() => typeof window.startPersistence === 'function')
  await page.evaluate((storageKey) => {
    window.addEventListener('persist-subscribed', () => { window.persistenceSubscribed = true }, { once: true })
    Object.assign(window, { persistence: window.startPersistence!(storageKey) })
  }, key)
  await page.waitForFunction(() => window.persistenceSubscribed === true, undefined, { timeout: 5_000 })
}

async function waitForMessage(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const { promise, resolve } = Promise.withResolvers<{ value: number }>()
    window.addEventListener('persist-message', (event) => resolve((event as CustomEvent<{ value: number }>).detail), { once: true })
    return promise
  })
}

test('BroadcastChannel sync sends one typed message between actual page contexts', async ({ browser }) => {
  const context = await browser.newContext()
  const sender = await context.newPage()
  const receiver = await context.newPage()
  const key = `persist-${crypto.randomUUID()}`
  await start(sender, key)
  await start(receiver, key)
  const received = waitForMessage(receiver)
  await sender.evaluate(() => window.persistence!.save(42))
  expect(await received).toEqual({ value: 42 })
  await context.close()
})

test('storage-event fallback syncs when BroadcastChannel is unavailable', async ({ browser }) => {
  const context = await browser.newContext()
  const sender = await context.newPage()
  const receiver = await context.newPage()
  await receiver.addInitScript(() => { Object.defineProperty(window, 'BroadcastChannel', { configurable: true, value: undefined }) })

  const key = `persist-${crypto.randomUUID()}`
  await start(sender, key)
  await start(receiver, key)
  expect(sender.context()).toBe(receiver.context())
  expect(await sender.evaluate(() => location.origin)).toBe(await receiver.evaluate(() => location.origin))
  expect(await receiver.evaluate(() => typeof BroadcastChannel)).toBe('undefined')
  const received = waitForMessage(receiver)
  await sender.evaluate(() => window.persistence!.save(43))
  expect(await received).toEqual({ value: 43 })
  const [writerValue, receiverValue] = await Promise.all([
    sender.evaluate((storageKey) => localStorage.getItem(storageKey), key),
    receiver.evaluate((storageKey) => localStorage.getItem(storageKey), key),
  ])
  expect(receiverValue).toBe(writerValue)
  expect(writerValue).not.toBeNull()
  await context.close()
})

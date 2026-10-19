import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import { chromium } from '@playwright/test'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

async function availablePort(): Promise<number> {
  for (let port = 4500; port <= 4599; port += 1) {
    const server = createServer()
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => resolve())
      })
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      return port
    } catch {
      server.close()
    }
  }
  throw new Error('no free browser test port in 4500-4599')
}

async function waitForServer(child: ChildProcess, url: string, spawnError: () => Error | undefined): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const error = spawnError()
    if (error !== undefined) throw new Error('could not start Vite', { cause: error })
    if (child.exitCode !== null) throw new Error(`Vite exited before becoming ready (exit ${child.exitCode})`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The development server is still starting.
    }
    await delay(100)
  }
  throw new Error(`Vite did not become ready at ${url}`)
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise<void>(resolve => child.once('exit', () => resolve()))
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    // The process may have exited between the state check and signal.
  }
  const didExit = await Promise.race([exited.then(() => true), delay(5_000).then(() => false)])
  if (didExit) return
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    // The process group may already be gone.
  }
  if (!await Promise.race([exited.then(() => true), delay(1_000).then(() => false)])) {
    throw new Error('Vite process group did not exit after SIGKILL')
  }
}

test('renders the shared performance hooks on their gallery routes', { timeout: 45_000 }, async () => {
  const port = await availablePort()
  const url = `http://127.0.0.1:${port}`
  let spawnError: Error | undefined
  const server = spawn('pnpm', ['--filter', 'radix2solid-bench', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: workspaceRoot,
    detached: true,
    stdio: 'ignore',
  })
  server.once('error', error => { spawnError = error })
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    await waitForServer(server, url, () => spawnError)
    browser = await chromium.launch({ headless: true, timeout: 10_000 })
    const page = await browser.newPage()
    page.setDefaultTimeout(5_000)
    page.setDefaultNavigationTimeout(10_000)

    await page.goto(`${url}/virtual-list`)
    for (const hook of ['vl-filter', 'vl-sort', 'vl-cell-input', 'vl-select']) {
      await page.locator(`[data-perf="${hook}"]`).waitFor()
    }
    assert.equal(await page.locator('[data-perf="vl-row"]').count(), 15)
    assert.equal(await page.locator('[data-perf="vl-cell-input"]').count(), 1)
    assert.equal(await page.locator('[data-perf="vl-cell-input"]').getAttribute('type'), 'text')
    assert.equal(await page.locator('[data-perf="vl-select"]').count(), 1)

    await page.goto(`${url}/form`)
    await page.locator('[data-perf="form-field-0"]').waitFor()
    assert.equal(await page.locator('.form-grid input[type="text"]').count(), 200)

    await page.goto(`${url}/menus`)
    await page.locator('[data-perf="menus-tick"]').waitFor()
    assert.equal(await page.locator('[data-menu-index]').count(), 200)
  } finally {
    await browser?.close()
    await stopServer(server)
  }
})


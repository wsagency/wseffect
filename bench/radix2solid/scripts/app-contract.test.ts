import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
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

test('renders the shared and comparison performance hooks on their routes', { timeout: 45_000 }, async () => {
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
    for (const hook of ['nav-cold', 'nav-prefetch', 'shared-date']) {
      await page.locator(`[data-perf="${hook}"]`).waitFor()
    }
    assert.equal(await page.locator('[data-perf="nav-cold"]').getAttribute('href'), '/menus')
    assert.equal(await page.locator('[data-perf="nav-prefetch"]').getAttribute('href'), '/dialog')
    assert.equal(await page.locator('[data-perf="shared-date"]').count(), 1)
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

    await page.goto(`${url}/theme`)
    for (const hook of ['theme-appearance', 'theme-accent']) {
      await page.locator(`[data-perf="${hook}"]`).waitFor()
    }

    await page.goto(`${url}/dialog`)
    await page.locator('[data-perf="dialog-open"]').waitFor()

    await page.goto(`${url}/dropdown-menu`)
    await page.locator('[data-perf="dropdown-open"]').waitFor()
  } finally {
    await browser?.close()
    await stopServer(server)
  }
})
test('every new Gallery capture has a paired Solid route', () => {
  const matrix = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../sp2-capture-matrix.json'), 'utf8')) as {
    families: Array<{ family: string; route: string; captures: Array<{ id: string; theme: string; props: Record<string, unknown> }> }>
  }
  const app = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/App.tsx'), 'utf8')
  for (const family of matrix.families) {
    assert.match(app, new RegExp(`['"]?${family.route}['"]?\\s*:`), `missing lazy route ${family.route}`)
    assert.ok(family.captures.length > 0, `${family.family} has no captures`)
    assert.ok(family.captures.every(capture => capture.id.startsWith(`${family.family}/`) && capture.props.size === 2), `${family.family} capture IDs/size props do not match`)
  }
  const captures = matrix.families.flatMap(family => family.captures)
  assert.equal(matrix.families.length, 20)
  assert.equal(captures.length, 58)
  assert.equal(new Set(captures.map(capture => capture.id)).size, captures.length)
  assert.ok(matrix.families.every(family => new Set(family.captures.map(capture => capture.theme)).size === 2))
  assert.equal(new Set(matrix.families.map(family => family.family)).size, matrix.families.length)
})

test('bench source pin and content hashes are unchanged', () => {
  const source = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../library-source.json'), 'utf8')) as {
    commit: string
    packedTarballs: Record<string, { contentSha256: string }>
  }
  assert.equal(source.commit, '383676172abb84b4a1d2e54a087d290437ee8848')
  assert.equal(source.packedTarballs['@wsagency/radix2solid-primitives']?.contentSha256, '85b6e8e9b3ba3a541efe51081cbf81cfc720eb2d5367274469ed6276876f5965')
  assert.equal(source.packedTarballs['@wsagency/radix2solid-themes']?.contentSha256, '13d22458b0feef9e4c0c70541683d95e02017bfea991f714a24c9a05b39ccde0')
})


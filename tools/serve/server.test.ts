import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { startServer } from './server.ts'
import type { ServerHandle } from './server.ts'

interface ResponseData {
  readonly status: number
  readonly headers: Record<string, string | string[] | undefined>
  readonly body: Buffer
}

async function freePort(): Promise<number> {
  for (let port = 4500; port <= 4599; port++) {
    const probe = createServer()
    const { promise, resolve } = Promise.withResolvers<boolean>()
    probe.once('error', () => resolve(false))
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)))
    const available = await promise
    if (available) return port
  }
  throw new Error('no free test port in 4500–4599')
}

function request(port: number, path: string, headers: Record<string, string> = {}): Promise<ResponseData> {
  const { promise, resolve, reject } = Promise.withResolvers<ResponseData>()
  const req = httpRequest({ hostname: '127.0.0.1', port, path, headers, agent: false }, (res) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => chunks.push(chunk))
    res.on('error', (error) => reject(new Error(`response for ${path} failed`, { cause: error })))
    res.on('end', () => resolve({
      status: res.statusCode ?? 0,
      headers: res.headers,
      body: Buffer.concat(chunks),
    }))
  })
  req.on('error', (error) => reject(new Error(`request for ${path} failed`, { cause: error })))
  req.end()
  return promise
}

function build(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'wseffect-server-build-'))
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(dir, relativePath)
    mkdirSync(join(filePath, '..'), { recursive: true })
    writeFileSync(filePath, content)
  }
  return dir
}

async function withServer<T>(brotli: boolean, run: (port: number, server: ServerHandle) => Promise<T>): Promise<T> {
  const port = await freePort()
  const server = await startServer({ port, brotli })
  try {
    return await run(port, server)
  } finally {
    await server.close()
  }
}

function removeBuilds(builds: string[]): void {
  for (const dir of builds) rmSync(dir, { recursive: true, force: true })
}

test('deploys immutable asset caching and no-cache shell metadata', async () => {
  const dir = build({
    'index.html': '<main>home</main>',
    'assets/app.abc.js': 'console.log("app")',
    'sw.js': 'self.skipWaiting()',
    'version.json': '{"buildId":"abc"}',
    'manifest.webmanifest': '{"name":"wseffect"}',
  })
  await withServer(false, async (port, server) => {
    try {
      server.deploy(dir)
      const assets = await request(port, '/assets/app.abc.js')
      assert.equal(assets.status, 200)
      assert.equal(assets.headers['cache-control'], 'public, max-age=31536000, immutable')
      for (const path of ['/index.html', '/sw.js', '/version.json', '/manifest.webmanifest']) {
        const response = await request(port, path)
        assert.equal(response.status, 200, path)
        assert.equal(response.headers['cache-control'], 'no-cache', path)
      }
    } finally {
      removeBuilds([dir])
    }
  })
})

test('uses index fallback only for extensionless routes and returns 404 for missing assets', async () => {
  const dir = build({ 'index.html': '<main>app shell</main>' })
  await withServer(false, async (port, server) => {
    try {
      server.deploy(dir)
      const route = await request(port, '/settings/profile')
      assert.equal(route.status, 200)
      assert.equal(route.body.toString(), '<main>app shell</main>')
      const missingAsset = await request(port, '/assets/missing.js')
      assert.equal(missingAsset.status, 404)
    } finally {
      removeBuilds([dir])
    }
  })
})

test('retains the current deployment and previous three deployments', async () => {
  const builds: string[] = []
  await withServer(false, async (port, server) => {
    try {
      for (let version = 1; version <= 5; version++) {
        const dir = build({
          'index.html': `<main>build-${version}</main>`,
          [`assets/build-${version}.js`]: `asset-${version}`,
        })
        builds.push(dir)
        server.deploy(dir)
      }
      assert.equal((await request(port, '/')).body.toString(), '<main>build-5</main>')
      assert.equal((await request(port, '/assets/build-1.js')).status, 404)
      for (let version = 2; version <= 5; version++) {
        const response = await request(port, `/assets/build-${version}.js`)
        assert.equal(response.status, 200)
        assert.equal(response.body.toString(), `asset-${version}`)
      }
    } finally {
      removeBuilds(builds)
    }
  })
})

test('counts encoded brotli response bytes and returns brotli bodies', async () => {
  const dir = build({
    'index.html': '<main>compressed shell</main>',
    'assets/app.js': 'console.log("compressed asset")',
  })
  await withServer(true, async (port, server) => {
    try {
      server.deploy(dir)
      server.stats(true)
      const shell = await request(port, '/', { 'accept-encoding': 'br' })
      const asset = await request(port, '/assets/app.js', { 'accept-encoding': 'br' })
      assert.equal(shell.headers['content-encoding'], 'br')
      assert.equal(asset.headers['content-encoding'], 'br')
      assert.equal(brotliDecompressSync(shell.body).toString(), '<main>compressed shell</main>')
      assert.equal(brotliDecompressSync(asset.body).toString(), 'console.log("compressed asset")')
      const stats = server.stats()
      assert.equal(stats.requests, 2)
      assert.equal(stats.bytes, shell.body.length + asset.body.length)
      assert.deepEqual(stats.byPath, ['/', '/assets/app.js'])
    } finally {
      removeBuilds([dir])
    }
  })
})

test('serves the deployed app from the CLI and closes cleanly on SIGTERM', async () => {
  const dir = build({ 'index.html': '<main>cli server</main>' })
  const port = await freePort()
  const cliPath = fileURLToPath(new URL('./cli.ts', import.meta.url))
  const child = spawn(process.execPath, [cliPath, dir, String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const ready = Promise.withResolvers<void>()
  const closed = Promise.withResolvers<{ code: number | null; signal: NodeJS.Signals | null }>()
  const readyText = `http://127.0.0.1:${port}`
  let output = ''
  let errors = ''
  let isReady = false
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    output += chunk
    if (output.includes(readyText)) {
      isReady = true
      ready.resolve()
    }
  })
  child.stderr.on('data', (chunk: string) => { errors += chunk })
  child.once('error', ready.reject)
  child.once('close', (code, signal) => {
    if (!isReady) ready.reject(new Error(`CLI exited before listening: ${errors}`))
    closed.resolve({ code, signal })
  })
  try {
    await ready.promise
    const response = await request(port, '/')
    assert.equal(response.status, 200)
    assert.equal(response.body.toString(), '<main>cli server</main>')
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    const exit = await closed.promise
    removeBuilds([dir])
    assert.equal(exit.code, 0, `CLI exit status; stderr: ${errors}`)
  }
})

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { readFileSync, statSync } from 'node:fs'

export interface ServerStats {
  readonly requests: number
  readonly bytes: number
  readonly byPath: string[]
}

export interface ServerHandle {
  deploy(dir: string, options?: { retain?: number }): void
  stats(reset?: boolean): ServerStats
  close(): Promise<void>
}

export interface ServerOptions {
  readonly port: number
  readonly brotli: boolean
}

const DEFAULT_RETENTION = 3
const NOT_FOUND = Buffer.from('Not Found')
const BAD_REQUEST = Buffer.from('Bad Request')
const METHOD_NOT_ALLOWED = Buffer.from('Method Not Allowed')
const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function responsePath(request: IncomingMessage): string | undefined {
  try {
    return decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  } catch {
    return undefined
  }
}

function fileAt(root: string, relativePath: string): string | undefined {
  const rootPath = resolve(root)
  const filePath = resolve(rootPath, relativePath)
  const fromRoot = relative(rootPath, filePath)
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) return undefined
  try {
    return statSync(filePath).isFile() ? filePath : undefined
  } catch {
    return undefined
  }
}

function acceptsBrotli(header: string | undefined): boolean {
  if (header === undefined) return false
  return header.split(',').some((item) => {
    const [encoding, ...parameters] = item.trim().split(';')
    if (encoding?.trim().toLowerCase() !== 'br') return false
    const quality = parameters.find((parameter) => parameter.trim().toLowerCase().startsWith('q='))
    return quality === undefined || Number(quality.slice(quality.indexOf('=') + 1)) > 0
  })
}

function contentType(filePath: string): string {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function isImmutableAsset(relativePath: string): boolean {
  return relativePath.startsWith(`assets${sep}`) || relativePath.startsWith('assets/')
}

function cacheControl(relativePath: string): string | undefined {
  if (isImmutableAsset(relativePath)) return 'public, max-age=31536000, immutable'
  if (relativePath === 'index.html' || relativePath === 'sw.js' || relativePath === 'version.json' || relativePath === 'manifest.webmanifest') return 'no-cache'
  return undefined
}

export async function startServer(options: ServerOptions): Promise<ServerHandle> {
  const deployments: string[] = []
  const brotliCache = new Map<string, Buffer>()
  let requests = 0
  let bytes = 0
  const byPath: string[] = []

  function send(
    request: IncomingMessage,
    response: ServerResponse,
    status: number,
    body: Buffer,
    type: string,
    policy: string | undefined,
    extraHeaders: Record<string, string> = {},
  ): void {
    const headers = { ...extraHeaders, 'Content-Type': type }
    if (policy !== undefined) headers['Cache-Control'] = policy
    headers['Content-Length'] = String(body.length)
    response.writeHead(status, headers)
    response.once('finish', () => { bytes += request.method === 'HEAD' ? 0 : body.length })
    if (request.method === 'HEAD') response.end()
    else response.end(body)
  }
  const server = createServer((request, response) => {
    requests++
    const path = responsePath(request)
    byPath.push(path ?? request.url ?? '/')
    if (path === undefined) {
      send(request, response, 400, BAD_REQUEST, 'text/plain; charset=utf-8', 'no-cache')
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(request, response, 405, METHOD_NOT_ALLOWED, 'text/plain; charset=utf-8', 'no-cache', { Allow: 'GET, HEAD' })
      return
    }
    const current = deployments.at(-1)
    if (current === undefined) {
      send(request, response, 503, NOT_FOUND, 'text/plain; charset=utf-8', 'no-cache')
      return
    }

    const relativePath = path.replace(/^\/+/, '') || 'index.html'
    const asset = isImmutableAsset(relativePath)
    let filePath: string | undefined
    if (asset) {
      for (let index = deployments.length - 1; index >= 0 && filePath === undefined; index--) {
        const deployment = deployments[index]
        if (deployment !== undefined) filePath = fileAt(deployment, relativePath)
      }
    } else {
      filePath = fileAt(current, relativePath)
    }
    const isShellRoute = relativePath === 'index.html' || (filePath === undefined && !asset && extname(relativePath) === '')
    if (filePath === undefined && isShellRoute) filePath = fileAt(current, 'index.html')
    if (filePath === undefined) {
      send(request, response, 404, NOT_FOUND, 'text/plain; charset=utf-8', 'no-cache')
      return
    }

    const content = readFileSync(filePath)
    const compressed = options.brotli && acceptsBrotli(request.headers['accept-encoding'])
    let body = content
    if (compressed) {
      body = brotliCache.get(filePath) ?? brotliCompressSync(content, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
      })
      brotliCache.set(filePath, body)
    }
    const headers: Record<string, string> = {
      'Content-Length': String(body.length),
      'Content-Type': contentType(filePath),
    }
    const policy = cacheControl(asset ? relativePath : isShellRoute ? 'index.html' : relativePath)
    if (policy !== undefined) headers['Cache-Control'] = policy
    if (options.brotli) headers.Vary = 'Accept-Encoding'
    if (compressed) headers['Content-Encoding'] = 'br'
    send(request, response, 200, body, contentType(filePath), policy, headers)
  })

  const { promise: listening, resolve: resolveListening, reject: rejectListening } = Promise.withResolvers<void>()
  server.once('error', rejectListening)
  server.listen(options.port, '127.0.0.1', resolveListening)
  await listening

  let closePromise: Promise<void> | undefined
  return {
    deploy(dir, deployOptions = {}) {
      const root = resolve(dir)
      if (!statSync(root).isDirectory()) throw new Error(`deployment path is not a directory: ${dir}`)
      const retain = deployOptions.retain ?? DEFAULT_RETENTION
      if (!Number.isInteger(retain) || retain < 1) throw new RangeError('deployment retention must be a positive integer')
      for (const cachedPath of brotliCache.keys()) {
        const fromDeployment = relative(root, cachedPath)
        if (fromDeployment === '' || (!fromDeployment.startsWith(`..${sep}`) && fromDeployment !== '..' && !isAbsolute(fromDeployment))) {
          brotliCache.delete(cachedPath)
        }
      }
      deployments.push(root)
      while (deployments.length > retain) {
        const retired = deployments.shift()
        if (retired === undefined) continue
        for (const cachedPath of brotliCache.keys()) {
          const fromRetired = relative(retired, cachedPath)
          if (fromRetired === '' || (!fromRetired.startsWith(`..${sep}`) && fromRetired !== '..' && !isAbsolute(fromRetired))) {
            brotliCache.delete(cachedPath)
          }
        }
      }
    },
    stats(reset = false) {
      const snapshot = { requests, bytes, byPath: [...byPath] }
      if (reset) {
        requests = 0
        bytes = 0
        byPath.length = 0
      }
      return snapshot
    },
    close() {
      if (closePromise !== undefined) return closePromise
      const { promise, resolve: resolveClose, reject: rejectClose } = Promise.withResolvers<void>()
      closePromise = promise
      server.close((error) => error === undefined ? resolveClose() : rejectClose(error))
      return promise
    },
  }

}

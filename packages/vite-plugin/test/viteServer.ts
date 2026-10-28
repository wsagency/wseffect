import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type InlineConfig,
  type ViteDevServer,
  createServer,
} from 'vite'
import { onTestFinished } from 'vitest'

export const createIsolatedViteServer = async (
  config: InlineConfig,
  serverFactory: typeof createServer = createServer,
): Promise<ViteDevServer> => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'foldkit-vite-test-cache-'))
  try {
    const server = await serverFactory({ ...config, cacheDir })
    onTestFinished(async () => {
      try {
        await server.close().catch(() => undefined)
      } finally {
        await rm(cacheDir, { recursive: true, force: true })
      }
    })
    return server
  } catch (error) {
    await rm(cacheDir, { recursive: true, force: true })
    throw error
  }
}

import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startServer, type ServerHandle } from '../../tools/serve/server.ts'

const PORT_START = 4460
const PORT_END = 4499

export async function startStaticServer(directory: string): Promise<{ readonly port: number; readonly server: ServerHandle }> {
  const distDir = resolve(directory)
  await access(distDir)
  for (let port = PORT_START; port <= PORT_END; port++) {
    try {
      const server = await startServer({ port, brotli: false })
      server.deploy(distDir)
      return { port, server }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error
    }
  }
  throw new Error(`no free browser port in ${PORT_START}-${PORT_END}`)
}

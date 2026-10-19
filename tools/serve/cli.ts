import { resolve } from 'node:path'
import { startServer } from './server.ts'

const args = process.argv.slice(2)
const directory = args[0]
if (directory === undefined) {
  console.error('usage: node tools/serve/cli.ts <dist-dir> [port] [--brotli]')
  process.exitCode = 2
} else {
  const portArgument = args.find((argument, index) => index > 0 && argument !== '--brotli')
  const port = portArgument === undefined ? 4500 : Number(portArgument)
  const brotli = args.includes('--brotli')
  const server = await startServer({ port, brotli })
  try {
    const deployment = resolve(directory)
    server.deploy(deployment)
    console.log(`Serving ${deployment} at http://127.0.0.1:${port}`)
  } catch (error) {
    await server.close()
    throw error
  }
  const shutdown = (): void => {
    void server.close().then(
      () => { process.exitCode = 0 },
      (error: unknown) => {
        console.error(error)
        process.exitCode = 1
      },
    )
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

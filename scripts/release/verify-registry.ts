import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const packageNames = ['@wsagency/wseffect-app', '@wsagency/wseffect-themes', '@wsagency/wseffect-foldkit', '@wsagency/wseffect-foldkit-ui', '@wsagency/wseffect-vite-plugin']
export type RegistryRecord = { version: string; integrity: string; tags: Record<string, string> }
export type RegistryExpectation = Record<string, { integrity: string }>
export type RegistryView = (name: string, version: string) => Promise<RegistryRecord>
export type RegistryDependencies = { view?: RegistryView; sleep?: (milliseconds: number) => Promise<void> }
export type RegistryResult = { ok: boolean; errors: string[] }

async function realView(name: string, version: string): Promise<RegistryRecord> {
  const recordResult = await execFileAsync('npm', ['view', `${name}@${version}`, '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  const tagResult = await execFileAsync('npm', ['view', name, 'dist-tags', '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  const record = JSON.parse(recordResult.stdout) as { version?: string; dist?: { integrity?: string } }
  const tags = JSON.parse(tagResult.stdout) as Record<string, string>
  return { version: record.version ?? '', integrity: record.dist?.integrity ?? '', tags }
}

export async function verifyRegistry(options: { version: string; expected: RegistryExpectation; attempts?: number; delayMs?: number }, dependencies: RegistryDependencies = {}): Promise<RegistryResult> {
  const attempts = options.attempts ?? 6
  const delayMs = options.delayMs ?? 10_000
  const view = dependencies.view ?? realView
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)))
  let errors: string[] = []
  for (let attempt = 1; attempt <= attempts; attempt++) {
    errors = []
    console.log(`Registry verification attempt ${attempt}/${attempts}`)
    for (const name of packageNames) {
      try {
        const actual = await view(name, options.version)
        const expectedIntegrity = options.expected[name]?.integrity
        if (actual.version !== options.version) errors.push(`${name}: expected version ${options.version}; registry has ${actual.version || '(missing)'}`)
        if (!actual.integrity) errors.push(`${name}: registry integrity is missing`)
        else if (expectedIntegrity && actual.integrity !== expectedIntegrity) errors.push(`${name}: integrity mismatch (expected ${expectedIntegrity}, got ${actual.integrity})`)
        if (actual.tags.next !== options.version) errors.push(`${name}: next dist-tag must be ${options.version}; got ${actual.tags.next ?? '(missing)'}`)
        if (actual.tags.latest !== options.version) errors.push(`${name}: latest dist-tag must be ${options.version}; got ${actual.tags.latest ?? '(missing)'}`)
      } catch (error) { errors.push(`${name}: npm view failed: ${error instanceof Error ? error.message : String(error)}`) }
    }
    if (errors.length === 0) {
      console.log(`Verified ${packageNames.length} packages at ${options.version}, including integrity and next/latest dist-tags.`)
      return { ok: true, errors }
    }
    console.log(errors.join('\n'))
    if (attempt < attempts) await sleep(delayMs)
  }
  return { ok: false, errors }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const versionIndex = args.indexOf('--version')
  const version = versionIndex >= 0 ? args[versionIndex + 1] : undefined
  if (!version) throw new Error('--version requires a version')
  const outIndex = args.indexOf('--out')
  const out = resolve(outIndex >= 0 ? args[outIndex + 1] ?? join(process.env.HOME ?? '', '.cache/wseffect-work/release-packages/archives') : join(process.env.HOME ?? '', '.cache/wseffect-work/release-packages/archives'))
  const expected: RegistryExpectation = {}
  for (const name of packageNames) {
    const fileName = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`
    const archive = await readFile(join(out, fileName))
    expected[name] = { integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}` }
  }
  const result = await verifyRegistry({ version, expected })
  if (!result.ok) {
    console.error('Registry verification failed; no publish or dist-tag changes were attempted.')
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

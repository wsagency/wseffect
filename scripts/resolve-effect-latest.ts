import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type PublishTimes = Record<string, string>

export function latestEligibleEffect(times: PublishTimes, now = new Date()): string {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000
  const candidates = Object.entries(times)
    .filter(([version, published]) => /^4\.\d+\.\d+$/.test(version) && Date.parse(published) <= cutoff)
    .map(([version]) => version)
    .sort((left, right) => {
      const a = left.split('.').map(Number)
      const b = right.split('.').map(Number)
      return b[0] - a[0] || b[1] - a[1] || b[2] - a[2]
    })
  if (candidates.length === 0) throw new Error('npm has no Effect 4.x release at least 24 hours old')
  return candidates[0]
}

export function replaceEffectOverrides(workspaceText: string, version: string): string {
  const match = /(^overrides:\n)([\s\S]*?)(?=^peerDependencyRules:)/m.exec(workspaceText)
  if (!match || !/^  effect: 4\.0\.5\n  '@effect\/platform-browser': 4\.0\.5\n/m.test(match[2])) {
    throw new Error('pnpm-workspace.yaml does not contain the expected UP-2 overrides')
  }
  const overrides = match[2]
    .replace('  effect: 4.0.5', `  effect: ${version}`)
    .replace("  '@effect/platform-browser': 4.0.5", `  '@effect/platform-browser': ${version}`)
  return workspaceText.replace(match[0], `${match[1]}${overrides}`)
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const times = JSON.parse(execFileSync('npm', ['view', 'effect', 'time', '--json'], { encoding: 'utf8' })) as PublishTimes
  const version = latestEligibleEffect(times)
  const workspace = replaceEffectOverrides(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8'), version)
  const scratch = join(root, '.artifacts', 'pnpm-workspace.effect-latest.yaml')
  await mkdir(dirname(scratch), { recursive: true })
  await writeFile(scratch, workspace)
  console.log(`Effect ${version}; scratch workspace: ${scratch}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

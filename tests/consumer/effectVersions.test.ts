import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const consumerDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(consumerDir, '../..')
const packageNames = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin'] as const
const effectVersions = ['4.0.5', '4.0.7'] as const

test('acceptsEffect405', async () => {
  await assertFixtureAccepts('4.0.5')
})

test('acceptsEffect407', async () => {
  await assertFixtureAccepts('4.0.7')
})

test('packsOneEffectCopy', async () => {
  for (const version of effectVersions) {
    const lockfile = await readFile(resolve(consumerDir, `fixtures/effect-${version}/pnpm-lock.yaml`), 'utf8')
    assert.deepEqual([...lockfile.matchAll(/^  effect@([^:]+):$/gm)].map((match) => match[1]), [version])
  }
})

test('buildsEveryPackageSetAtBothVersions', async () => {
  const runner = await readFile(resolve(consumerDir, 'run.ts'), 'utf8')
  assert.match(runner, /for \(const effectVersion of \['4\.0\.5', '4\.0\.7'\]\)/)
  for (const version of effectVersions) {
    const manifest = JSON.parse(await readFile(resolve(consumerDir, `fixtures/effect-${version}/package.json`), 'utf8')) as {
      dependencies: Record<string, string>
    }
    assert.equal(manifest.dependencies.effect, version)
    assert.equal(manifest.dependencies['@effect/platform-browser'], version)
  }
})

test('all published Effect peers accept both matrix versions', async () => {
  for (const packageName of packageNames) {
    const manifest = JSON.parse(await readFile(resolve(repoRoot, 'packages', packageName, 'package.json'), 'utf8')) as {
      peerDependencies: Record<string, string>
    }
    assert.equal(manifest.peerDependencies.effect, '^4.0.5', `${packageName} effect peer`)
    assert.equal(manifest.peerDependencies['@effect/platform-browser'], '^4.0.5', `${packageName} platform-browser peer`)
  }
})

async function assertFixtureAccepts(version: string): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(consumerDir, `fixtures/effect-${version}/package.json`), 'utf8')) as {
    dependencies: Record<string, string>
  }
  assert.equal(manifest.dependencies.effect, version)
  assert.equal(manifest.dependencies['@effect/platform-browser'], version)
}

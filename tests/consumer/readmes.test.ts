import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const releases = [
  { directory: 'app', name: '@wsagency/wseffect-app', example: "from '@wsagency/wseffect-app'", role: /lazy pages|application foundation/i },
  { directory: 'themes', name: '@wsagency/wseffect-themes', example: "from '@wsagency/wseffect-themes'", role: /theme|styles/i },
  { directory: 'foldkit', name: '@wsagency/wseffect-foldkit', example: "from '@wsagency/wseffect-foldkit/runtime'", role: /runtime|framework/i },
  { directory: 'foldkit-ui', name: '@wsagency/wseffect-foldkit-ui', example: "from '@wsagency/wseffect-foldkit-ui/button'", role: /component|ui/i },
  { directory: 'vite-plugin', name: '@wsagency/wseffect-vite-plugin', example: "from '@wsagency/wseffect-vite-plugin'", role: /vite/i },
] as const

const readme = (directory: string) => readFile(resolve(repoRoot, 'packages', directory, 'README.md'), 'utf8')

test('package landing pages document RC and stable installs, peers, runtime, API and docs', async () => {
  for (const pkg of releases) {
    const text = await readme(pkg.directory)
    assert.match(text, new RegExp(pkg.name.replaceAll('/', '\\/')))
    assert.match(text, /pnpm add[^\n]*@next/)
    assert.match(text, /pnpm add[^\\n]*@wsagency\/wseffect-/)
    assert.match(text, /effect/)
    assert.match(text, /@effect\/platform-browser/)
    assert.match(text, />=20\.19\.0/)
    assert.match(text, /https:\/\/wseffect\.com/)
    assert.match(text, pkg.role)
    assert.ok(text.includes(pkg.example), `${pkg.directory} must show a scoped public import`)
  }
})

test('root README gives consumer install guidance for all five package roles', async () => {
  const text = await readFile(resolve(repoRoot, 'README.md'), 'utf8')
  for (const pkg of releases) {
    assert.ok(text.includes(pkg.name), `missing ${pkg.name}`)
  }
  assert.match(text, /@next/)
  assert.match(text, /pnpm add/)
  assert.match(text, /stable|0\.1\.0/)
  assert.match(text, /https:\/\/wseffect\.com/)
  assert.match(text, /https:\/\/github\.com\/wsagency\/wseffect\/issues/)
  assert.doesNotMatch(text, /git\.wsagency\.io/i)
  assert.doesNotMatch(text, /pnpm add[^\n]*(?:\.tgz|file:|tarball)/i)
})

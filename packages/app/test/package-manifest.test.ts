import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  peerDependencies: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

describe('app package manifest', () => {
  it('requires Themes because the root barrel statically exports its breakpoint subscription', () => {
    expect(manifest.peerDependencies['@wsagency/wseffect-themes']).toBe('workspace:*')
    expect(manifest.peerDependenciesMeta?.['@wsagency/wseffect-themes']?.optional).not.toBe(true)
  })
})

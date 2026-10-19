import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('package README', () => {
  it('keeps the Effect peer resolution snippet exact', async () => {
    const readme = await readFile(resolve(packageRoot, 'README.md'), 'utf8')
    const snippet = readme.split('<!-- up8:start -->')[1]?.split('<!-- up8:end -->')[0]?.trim()
    expect(snippet).toBe(`\`\`\`yaml
overrides:
  effect: 4.0.5
  '@effect/platform-browser': 4.0.5
peerDependencyRules:
  allowedVersions:
    foldkit>effect: 4.0.5
    foldkit>@effect/platform-browser: 4.0.5
    '@foldkit/ui>effect': 4.0.5
    '@foldkit/vite-plugin>effect': 4.0.5
\`\`\``)
  })

  it('documents cache behavior and limits that update prompts cannot solve', async () => {
    const readme = await readFile(resolve(packageRoot, 'README.md'), 'utf8')
    expect(readme).toContain('## Server contract')
    expect(readme).toContain('Cache-Control: public, max-age=31536000, immutable')
    expect(readme).toContain('`sw.js`')
    expect(readme).toContain('three newest deployment asset trees')
    expect(readme).toContain('backend APIs or stored data')
    expect(readme).toContain('loses in-memory application state')
    expect(readme).toContain('Remove this override and its `allowedVersions` entries when the Foldkit upgrade')
  })
})

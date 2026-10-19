import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const componentNames = ['theme', 'box', 'flex', 'grid', 'text', 'heading', 'card', 'button', 'text-field', 'dialog', 'dropdown-menu', 'tabs'] as const
const cssSubpaths = [
  './styles.css', './components.css', './utilities.css', './tokens.css', './tokens/base.css',
  './layout.css', './layout/tokens.css', './layout/components.css', './layout/utilities.css',
  './css/common.css', './css/utilities.css',
  ...['box', 'flex', 'grid', 'text', 'heading', 'button', 'card', 'text-field', 'dialog', 'dropdown-menu', 'tabs', 'spinner', 'scroll-area'].map(name => `./css/${name}.css`),
]

describe('themes distribution', () => {
  it('brands every component view in the built package', async () => {
    for (const name of componentNames) {
      const code = await readFile(resolve(packageRoot, `dist/components/${name}.js`), 'utf8')
      expect(code, name).toContain("from 'foldkit/brand'")
    }
  })

  it('exports all components and generated stylesheets', async () => {
    const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as { exports: Record<string, unknown> }
    expect(packageJson.exports['.']).toBeDefined()
    for (const name of componentNames) expect(packageJson.exports[`./components/${name}`], name).toBeDefined()
    for (const subpath of cssSubpaths) expect(packageJson.exports[subpath], subpath).toBeDefined()
    const layerEntry = packageJson.exports['./*.layer.css']
    expect(layerEntry).toBeDefined()
    for (const subpath of cssSubpaths) {
      expect(packageJson.exports[subpath.replace(/\.css$/, '.layer.css')] ?? layerEntry, subpath).toBeDefined()
    }
    const colors = await readdir(resolve(packageRoot, 'src/styles/tokens/colors'))
    for (const color of colors.filter(name => name.endsWith('.css'))) {
      const subpath = `./tokens/colors/${color}`
      expect(packageJson.exports[subpath], color).toBeDefined()
      expect(packageJson.exports[subpath.replace(/\.css$/, '.layer.css')] ?? layerEntry, `${color} layer`).toBeDefined()
    }
  })

  it('documents the retained license notices', async () => {
    const readme = await readFile(resolve(packageRoot, 'README.md'), 'utf8')
    expect(readme.trimEnd()).toMatch(/## License\n\n[^\n]*(MIT|WorkOS)[^\n]*(WorkOS|Radix)[^\n]*(Radix2Solid|Radix)/)
  })
})

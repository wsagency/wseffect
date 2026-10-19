import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')
const outputFiles = [
  'styles.css',
  'components.css',
  'utilities.css',
  'tokens.css',
  'tokens/base.css',
  'layout.css',
  'layout/tokens.css',
  'layout/components.css',
  'layout/utilities.css',
  'css/common.css',
  'css/utilities.css',
  ...['box', 'flex', 'grid', 'text', 'heading', 'button', 'card', 'text-field', 'dialog', 'dropdown-menu', 'tabs', 'spinner', 'scroll-area'].map(name => `css/${name}.css`),
]

describe('Themes CSS distribution', () => {
  it('emits every public CSS target and its radix layer sibling', async () => {
    for (const relativePath of outputFiles) {
      const output = resolve(packageRoot, 'dist/styles', relativePath)
      expect((await stat(output)).isFile(), relativePath).toBe(true)
      expect(await readFile(output.replace(/\.css$/, '.layer.css'), 'utf8'), relativePath).toMatch(/^@layer radix \{/)
    }
  })

  it('limits component CSS to the foundation closure', async () => {
    const files = await readdir(resolve(packageRoot, 'dist/styles/css'))
    expect(files).toContain('button.css')
    expect(files).not.toContain('checkbox.css')
  })
  it('includes all 31 Radix Colors token files with layered siblings', async () => {
    const directory = resolve(packageRoot, 'dist/styles/tokens/colors')
    const files = await readdir(directory)
    const colors = files.filter(file => file.endsWith('.css') && !file.endsWith('.layer.css'))
    expect(colors).toHaveLength(31)
    for (const color of colors) {
      expect((await readFile(resolve(directory, `${color.slice(0, -4)}.layer.css`), 'utf8')).startsWith('@layer radix {')).toBe(true)
    }
  })

  it('expands the five min-width breakpoints', async () => {
    const css = await readFile(resolve(packageRoot, 'dist/styles/styles.css'), 'utf8')
    for (const width of [520, 768, 1024, 1280, 1640]) {
      expect(css).toContain(`@media (min-width: ${width}px)`)
    }
  })

  it('uses the exact Radix Colors dependency and retains all CSS notices', async () => {
    const colors = JSON.parse(await readFile(resolve(packageRoot, '../../node_modules/@radix-ui/colors/package.json'), 'utf8')) as { version: string }
    expect(colors.version).toBe('3.0.0')
    const license = await readFile(resolve(packageRoot, 'LICENSE'), 'utf8')
    expect(license).toContain('Copyright (c) 2026 wseffect contributors')
    expect(license).toContain('Copyright (c) 2023 WorkOS')
    expect(license).toContain('Copyright (c) 2021 Radix')
    expect(license).toContain('Copyright (c) 2026 Radix2Solid contributors')
  })
})

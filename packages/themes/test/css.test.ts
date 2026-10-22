import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')
const outputFiles = [
  'styles.css',
  'components.css',
  'components-base.css',
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
  it('keeps the components-base aggregate equal to the pre-SP2 file list and order', async () => {
    const source = await readFile(resolve(packageRoot, 'src/css-components/index-base.css'), 'utf8')
    const files = [...source.matchAll(/^@import '\.\/([\w-]+)\.css';$/gm)].map(([, name]) => name)
    expect(files).toEqual([
      'reset',
      'animations',
      'layout',
      'skeleton',
      'text',
      'button',
      'card',
      'dialog',
      'dropdown-menu',
      'heading',
      'scroll-area',
      'spinner',
      'tabs',
      'text-field',
      'shared',
    ])
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

  it('ships CSS module type declarations for exported stylesheets', async () => {
    const source = await readFile(resolve(packageRoot, 'src/css.d.ts'), 'utf8')
    const output = await readFile(resolve(packageRoot, 'dist/css.d.ts'), 'utf8')
    expect(output).toBe(source)
  })


  it('copies reset and component CSS import closure', async () => {
    const source = resolve(packageRoot, 'src/css-components')
    for (const file of ['reset.css', 'data-list.css', 'table.css', 'icon-button.css', '_internal/base-button.css']) {
      expect((await stat(resolve(source, file))).isFile(), file).toBe(true)
    }
    expect(await readFile(resolve(source, 'icon-button.css'), 'utf8')).toContain("@import './_internal/base-button.css';")
  })
})

  it('records every copied CSS and lane 2C source in UPSTREAM.md', async () => {
    const cssDirectory = resolve(packageRoot, 'src/css-components')
    const cssFiles = await readdir(cssDirectory, { recursive: true })
    const sources = [
      'accessible-icon.tsx', 'aspect-ratio.tsx', 'avatar.tsx', 'avatar.props.ts',
      'badge.tsx', 'badge.props.ts', 'blockquote.tsx', 'blockquote.props.ts',
      'callout.tsx', 'callout.props.ts', 'code.tsx', 'code.props.ts',
      'container.tsx', 'container.props.ts', 'data-list.tsx', 'data-list.props.ts',
      'em.tsx', 'em.props.ts', '_internal/base-button.tsx', '_internal/base-button.props.ts',
      'icon-button.tsx', 'icon-button.props.ts', 'inset.tsx', 'inset.props.ts',
      'kbd.tsx', 'kbd.props.ts', 'link.tsx', 'link.props.ts', 'progress.tsx',
      'progress.props.ts', 'quote.tsx', 'quote.props.ts', 'scroll-area.tsx',
      'scroll-area.props.ts', 'section.tsx', 'section.props.ts', 'separator.tsx',
      'separator.props.ts', 'skeleton.tsx', 'skeleton.props.ts', 'spinner.tsx',
      'spinner.props.ts', 'strong.tsx', 'strong.props.ts', 'table.tsx', 'table.props.ts',
      'theme-panel.tsx', 'visually-hidden.tsx',
    ]
    const upstream = await readFile(resolve(packageRoot, 'UPSTREAM.md'), 'utf8')
    for (const file of cssFiles.filter(file => file.endsWith('.css'))) {
      if (file === 'index.css') {
        expect(upstream).toContain('packages/themes/src/css-components/index.css')
      } else if (file === 'index-base.css') {
        expect(upstream).toContain('packages/themes/src/css-components/index-base.css')
      } else if (file === 'data-table.css') {
        expect(upstream).toContain('`data-table.css` is locally authored')
      } else {
        expect(upstream, file).toContain(`packages/themes/src/components/${file}`)
      }
    }
    for (const file of sources) {
      expect(upstream, file).toContain(`packages/themes/src/components/${file}`)
    }
  })

import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')
const outputFiles = [
  'styles.css',
  'components.css',
  'tokens.css',
  'tokens/base.css',
  'layout.css',
  'layout/tokens.css',
  'layout/components.css',
  'layout/utilities.css',
  'css/common.css',
  'css/utilities.css',
  ...['box', 'flex', 'grid', 'text', 'heading', 'button', 'card', 'text-field', 'dialog', 'dropdown-menu', 'tabs', 'spinner', 'scroll-area'].map(name => `css/${name}.css`),
  ...['checkbox', 'checkbox-group', 'checkbox-cards', 'radio', 'radio-group', 'radio-cards', 'switch', 'segmented-control', 'select', 'text-area', 'slider'].map(name => `css/${name}.css`),
]

describe('Themes CSS distribution', () => {
  it('emits every public CSS target and its radix layer sibling', async () => {
    for (const relativePath of outputFiles) {
      const output = resolve(packageRoot, 'dist/styles', relativePath)
      expect((await stat(output)).isFile(), relativePath).toBe(true)
      expect(await readFile(output.replace(/\.css$/, '.layer.css'), 'utf8'), relativePath).toMatch(/^@layer radix \{/)
    }
  })

  it('removes obsolete styles from an incremental CSS rebuild', async () => {
    const stylesDirectory = await mkdtemp(join(tmpdir(), 'wseffect-themes-css-'))
    try {
      await mkdir(stylesDirectory, { recursive: true })
      await writeFile(resolve(stylesDirectory, 'components-base.css'), 'stale')
      await writeFile(resolve(stylesDirectory, 'components-base.layer.css'), 'stale')

      const build = spawnSync(process.execPath, [resolve(packageRoot, 'scripts/build-css.js')], {
        cwd: packageRoot,
        encoding: 'utf8',
        env: { ...process.env, WSEFFECT_THEMES_STYLES_OUT_DIR: stylesDirectory },
      })

      expect(build.status, build.stderr).toBe(0)
      expect(await readdir(stylesDirectory)).not.toContain('components-base.css')
      expect(await readdir(stylesDirectory)).not.toContain('components-base.layer.css')
    } finally {
      await rm(stylesDirectory, { recursive: true, force: true })
    }
  })

  it('emits CSS targets for each implemented component', async () => {
    const files = await readdir(resolve(packageRoot, 'dist/styles/css'))
    for (const name of ['button', 'checkbox', 'checkbox-group', 'checkbox-cards', 'radio', 'radio-group', 'radio-cards', 'switch', 'segmented-control', 'select', 'text-area', 'slider']) {
      expect(files).toContain(`${name}.css`)
    }
  })
  it('includes primitive styles in standalone grouped control sheets', async () => {
    const dependencies = {
      'checkbox-group': ['.rt-BaseCheckboxRoot'],
      'radio-group': ['.rt-BaseRadioRoot'],
      'radio-cards': ['.rt-BaseRadioRoot', '.rt-BaseCard'],
      'segmented-control': ['.rt-BaseRadioRoot'],
    }
    for (const [component, selectors] of Object.entries(dependencies)) {
      const css = await readFile(resolve(packageRoot, `dist/styles/css/${component}.css`), 'utf8')
      for (const selector of selectors) expect(css, `${component}: ${selector}`).toContain(selector)
    }
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

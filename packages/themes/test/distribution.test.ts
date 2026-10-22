import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const componentNames = ['theme', 'box', 'flex', 'grid', 'text', 'heading', 'card', 'button', 'text-field', 'dialog', 'dropdown-menu', 'tabs', 'data-table', 'checkbox', 'checkbox-group', 'checkbox-cards', 'radio', 'radio-group', 'radio-cards', 'switch', 'segmented-control', 'select', 'text-area', 'slider'] as const
const viewComponentNames = componentNames.filter(name => name !== 'radio-cards')
const cssSubpaths = [
  './styles.css', './components.css', './utilities.css', './tokens.css', './tokens/base.css',
  './layout.css', './layout/tokens.css', './layout/components.css', './layout/utilities.css',
  './css/common.css', './css/utilities.css',
  ...['box', 'flex', 'grid', 'text', 'heading', 'button', 'card', 'text-field', 'dialog', 'dropdown-menu', 'tabs', 'spinner', 'scroll-area', 'data-table', 'checkbox', 'checkbox-group', 'checkbox-cards', 'radio', 'radio-group', 'radio-cards', 'switch', 'segmented-control', 'select', 'text-area', 'slider'].map(name => `./css/${name}.css`),
]

describe('themes distribution', () => {
  it('brands every component view in the built package', async () => {
    for (const name of viewComponentNames) {
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
  it('registers form controls in the root barrel', async () => {
    const source = await readFile(resolve(packageRoot, 'src/index.ts'), 'utf8')
    for (const name of ['Checkbox', 'CheckboxGroup', 'CheckboxCards', 'Radio', 'RadioGroup', 'RadioCards', 'Switch', 'SegmentedControl', 'Select', 'TextArea', 'Slider']) {
      expect(source).toContain(`export * as ${name} from`)
    }
  })

  it('ships selectors for the upstream structural classes used by stateful views', async () => {
    const contracts = {
      dialog: ['rt-BaseDialogOverlay', 'rt-BaseDialogScroll', 'rt-BaseDialogScrollPadding', 'rt-BaseDialogContent', 'rt-Button', 'rt-Flex'],
      'dropdown-menu': ['rt-BaseMenuContent', 'rt-BaseMenuViewport', 'rt-BaseMenuItem'],
      tabs: ['rt-BaseTabList', 'rt-BaseTabListTrigger', 'rt-BaseTabListTriggerInner', 'rt-BaseTabListTriggerInnerHidden', 'rt-TabsContent'],
      button: ['rt-Spinner', 'rt-SpinnerLeaf'],
      heading: ['rt-Heading'],
    } as const
    for (const [component, classes] of Object.entries(contracts)) {
      const css = await readFile(resolve(packageRoot, `dist/styles/css/${component}.css`), 'utf8')
      for (const className of classes) expect(css, `${component}: .${className}`).toContain(`.${className}`)
    }
    const menuCss = await readFile(resolve(packageRoot, 'dist/styles/css/dropdown-menu.css'), 'utf8')
    expect(menuCss).toContain('.rt-BaseMenuItem[data-active]')
    expect(menuCss).toContain('.rt-Button:where(.rt-r-size-2)')
    const menuAdapter = await readFile(resolve(packageRoot, 'src/css-components/_adapters/menu.css'), 'utf8')
    expect(menuAdapter).toContain('.rt-BaseMenuItem:where([data-active])')
    expect(menuAdapter).not.toContain('data-disabled')
    expect(menuAdapter).not.toContain("data-state='open'")
  })
  it('has selectors for emitted styling classes and limits semantic aliases to pinned upstream markup', async () => {
    const sourceFiles = await readdir(resolve(packageRoot, 'src/components'))
    const emittedClasses = new Set<string>()
    for (const fileName of sourceFiles.filter(name => name.endsWith('.ts'))) {
      const source = await readFile(resolve(packageRoot, 'src/components', fileName), 'utf8')
      for (const [, className] of source.matchAll(/\b(rt-[A-Za-z0-9_-]+)/g)) {
        if (!className.endsWith('-')) emittedClasses.add(className)
      }
    }
    const semanticAliases = [
      'rt-DialogContent', 'rt-DialogOverlay', 'rt-DialogScroll', 'rt-DialogScrollPadding',
      'rt-DropdownMenuContent', 'rt-DropdownMenuItem', 'rt-DropdownMenuViewport',
      'rt-BaseMenuGroup', 'rt-ContextMenuGroup', 'rt-ContextMenuItem', 'rt-ContextMenuLabel', 'rt-ContextMenuSeparator',
      'rt-TabsList', 'rt-TabsRoot', 'rt-TabsTrigger', 'rt-TabsTriggerInner', 'rt-TabsTriggerInnerHidden',
      // Pinned R2S callout.css has no rt-CalloutText selector by design.
      'rt-CalloutText',
    ] as const
    const unstyledStructuralClasses = new Set(['rt-ScrollAreaCorner', 'rt-underline-none', 'rt-SelectGroup'])
    const radix2solidMarkup = await readFile(resolve(packageRoot, 'test/fixtures/radix2solid-383676172-markup.txt'), 'utf8')
    expect(radix2solidMarkup).toContain('383676172abb84b4a1d2e54a087d290437ee8848')
    const upstreamClasses = new Set([...radix2solidMarkup.matchAll(/\b(rt-[A-Za-z0-9_-]+)\b/g)].map(([, className]) => className))
    for (const alias of semanticAliases) {
      expect(upstreamClasses.has(alias), `upstream semantic alias ${alias}`).toBe(true)
      expect(emittedClasses.has(alias), `emitted semantic alias ${alias}`).toBe(true)
    }
    const css = await readFile(resolve(packageRoot, 'dist/styles/styles.css'), 'utf8')
    for (const structuralClass of unstyledStructuralClasses) {
      expect(emittedClasses.has(structuralClass), `emitted structural alias ${structuralClass}`).toBe(true)
    }
    for (const className of emittedClasses) {
      if (!semanticAliases.includes(className as typeof semanticAliases[number]) && !unstyledStructuralClasses.has(className)) {
        expect(css, `.${className}`).toContain(`.${className}`)
      }
    }
  })

  it('documents the retained license notices', async () => {
    const readme = await readFile(resolve(packageRoot, 'README.md'), 'utf8')
    expect(readme.trimEnd()).toMatch(/## License\n\n[^\n]*(MIT|WorkOS)[^\n]*(WorkOS|Radix)[^\n]*(Radix2Solid|Radix)/)
  })
})

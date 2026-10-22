import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { checkoutPinnedSource } from './prepare-library.ts'

const PIN = '383676172abb84b4a1d2e54a087d290437ee8848'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scratch = process.env.WSEFFECT_SCRATCH_DIR ?? resolve(tmpdir(), 'wseffect-radix2solid-sp2')
const sourceRoot = process.env.RADIX2SOLID_SOURCE_DIR ?? checkoutPinnedSource(resolve(scratch, 'source/bench/radix2solid'), false)
const componentsRoot = resolve(sourceRoot, 'packages/themes/src/components')
type Spec = { id: string; sourceProps?: string; domainProps?: string[]; interactive?: string; visualReference?: string; fixtureId?: string }
type FamilySpec = { family: string; components: Spec[] }
const families: FamilySpec[] = [
  { family: 'accessibility', components: [{ id: 'AccessibleIcon' }, { id: 'VisuallyHidden' }] },
  { family: 'layout-extra', components: [{ id: 'AspectRatio' }, { id: 'Container', sourceProps: 'container.props.ts' }, { id: 'Inset', sourceProps: 'inset.props.ts' }, { id: 'Section', sourceProps: 'section.props.ts' }] },
  { family: 'avatar', components: [{ id: 'Avatar', sourceProps: 'avatar.props.ts' }] },
  { family: 'feedback', components: [{ id: 'Badge', sourceProps: 'badge.props.ts' }, { id: 'Callout', sourceProps: 'callout.props.ts' }, { id: 'Progress', sourceProps: 'progress.props.ts' }, { id: 'Separator', sourceProps: 'separator.props.ts' }, { id: 'Skeleton', sourceProps: 'skeleton.props.ts' }, { id: 'Spinner', sourceProps: 'spinner.props.ts' }] },
  { family: 'typography-extra', components: [{ id: 'Blockquote', sourceProps: 'blockquote.props.ts' }, { id: 'Quote', sourceProps: 'quote.props.ts' }, { id: 'Em', sourceProps: 'em.props.ts' }, { id: 'Strong', sourceProps: 'strong.props.ts' }, { id: 'Code', sourceProps: 'code.props.ts' }, { id: 'Kbd', sourceProps: 'kbd.props.ts' }] },
  { family: 'icon-button', components: [{ id: 'IconButton', sourceProps: 'icon-button.props.ts', domainProps: ['_internal/base-button.props.ts'], interactive: 'keyboard-focus' }] },
  { family: 'links', components: [{ id: 'Link', sourceProps: 'link.props.ts' }] },
  { family: 'scroll-area', components: [{ id: 'ScrollArea', sourceProps: 'scroll-area.props.ts' }] },
  { family: 'data', components: [{ id: 'Table', sourceProps: 'table.props.ts', fixtureId: 'sp2-data-table' }, { id: 'DataList', sourceProps: 'data-list.props.ts' }] },
  { family: 'forms-extra', components: [
    { id: 'Checkbox', sourceProps: 'checkbox.props.ts', domainProps: ['_internal/base-checkbox.props.ts'] },
    { id: 'CheckboxGroup', sourceProps: 'checkbox-group.props.ts', domainProps: ['_internal/base-checkbox.props.ts'] },
    { id: 'CheckboxCards', sourceProps: 'checkbox-cards.props.ts' },
    { id: 'Radio', sourceProps: 'radio.props.ts', domainProps: ['_internal/base-radio.props.ts'] },
    { id: 'RadioGroup', sourceProps: 'radio-group.props.ts', interactive: 'keyboard-focus' },
    { id: 'RadioCards', sourceProps: 'radio-cards.props.ts' },
    { id: 'Switch', sourceProps: 'switch.props.ts' },
    { id: 'SegmentedControl', sourceProps: 'segmented-control.props.ts' },
    { id: 'TextArea', sourceProps: 'text-area.props.ts' },
  ] },
  { family: 'select', components: [{ id: 'Select', sourceProps: 'select.props.ts', interactive: 'open' }] },
  { family: 'range-slider', components: [{ id: 'Slider', sourceProps: 'slider.props.ts', interactive: 'keyboard-focus' }] },
  { family: 'tab-nav', components: [{ id: 'TabNav', sourceProps: 'tab-nav.props.ts', interactive: 'keyboard-focus' }] },
  { family: 'alert-dialog', components: [{ id: 'AlertDialog', sourceProps: 'alert-dialog.props.ts', interactive: 'open' }] },
  { family: 'popover', components: [{ id: 'Popover', sourceProps: 'popover.props.ts', interactive: 'open' }] },
  { family: 'hover-card', components: [{ id: 'HoverCard', sourceProps: 'hover-card.props.ts', interactive: 'hover' }] },
  { family: 'tooltip', components: [{ id: 'Tooltip', sourceProps: 'tooltip.props.ts', interactive: 'hover' }] },
  { family: 'context-menu', components: [{ id: 'ContextMenu', sourceProps: 'context-menu.props.ts', domainProps: ['_internal/base-menu.props.ts'] }] },
  { family: 'theme-panel', components: [{ id: 'ThemePanel' }] },
  { family: 'data-table', components: [{ id: 'DataTable', sourceProps: 'table.props.ts', fixtureId: 'sp2-data-table', visualReference: 'Table' }] },
]

function literalsFor(source: string, identifier: string): string[] {
  const declaration = source.match(new RegExp(`(?:const|export const)\\s+${identifier}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as const`))
  assert.ok(declaration, `missing literal domain ${identifier} in pinned .props.ts`)
  return [...declaration[1]!.matchAll(/'([^']+)'/g)].map(match => match[1]!)
}

async function componentInfo(spec: Spec) {
  const propPaths = [spec.sourceProps, ...(spec.domainProps ?? [])].filter((path): path is string => path !== undefined)
  const entries = await Promise.all(propPaths.map(async path => ({ path, source: await readFile(join(componentsRoot, path), 'utf8') })))
  const combined = entries.map(entry => entry.source).join('\n')
  const variantSlots: Array<{ prop: string; values: string[]; sourceProps: string }> = []
  for (const entry of entries) for (const match of entry.source.matchAll(/variant\s*:\s*\{[\s\S]{0,250}?values:\s*([A-Za-z_$][\w$]*)/g)) {
    const domainName = match[1]!
    const prop = domainName === 'variants' ? 'variant' : domainName.replace(/Variants$/, 'Variant')
    variantSlots.push({ prop, values: literalsFor(entry.source, domainName), sourceProps: entry.path })
  }
  const size = /\bsize\s*:\s*\{[\s\S]{0,150}?values:\s*[A-Za-z_$][\w$]*/.test(combined)
  const defaultProps: Record<string, unknown> = size ? { size: '2' } : {}
  for (const slot of variantSlots) defaultProps[slot.prop] = slot.values.includes('surface') ? 'surface' : slot.values[0]
  return { id: spec.id, sourceProps: spec.sourceProps ?? null, domainProps: spec.domainProps ?? [], size, variantSlots, ...(spec.visualReference ? { visualReference: spec.visualReference } : {}), defaultProps, interactive: spec.interactive ?? null, fixtureId: spec.fixtureId ?? null }
}

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim()
assert.equal(revision, PIN, `variant extraction source must be pinned ${PIN}`)
const generatedFamilies = []
for (const family of families) {
  const components = await Promise.all(family.components.map(componentInfo))
  const captures: Array<Record<string, unknown>> = []
  for (const component of components) {
    const commonProps = { ...component.defaultProps, ...(component.fixtureId ? { fixtureId: component.fixtureId, rows: 10 } : {}) }
    const add = (state: string, theme: 'light' | 'dark', props: Record<string, unknown>) => captures.push({ id: `${family.family}/${component.id}/${state}/${theme}`, component: component.id, theme, state, props })
    for (const theme of ['light', 'dark'] as const) {
      add('default', theme, { ...commonProps })
      for (const slot of component.variantSlots) for (const value of slot.values) add(`variant-${slot.prop}-${value}`, theme, { ...commonProps, [slot.prop]: value })
      if (component.interactive) add(component.interactive, theme, { ...commonProps, ...(component.interactive === 'open' ? { open: true } : component.interactive === 'hover' ? { hovered: true } : { focused: true }) })
      if (component.id === 'Slider') add('range-keyboard-focus', theme, { ...commonProps, focused: true, value: [25, 70] })
    }
  }
  generatedFamilies.push({ family: family.family, route: family.family, galleryRoute: `/components/${family.family}`, components, captures })
}
const matrix = {
  schemaVersion: 3,
  source: { repository: 'https://github.com/wsagency/radix2solid.git', commit: PIN, extraction: 'packages/themes/src/components/*.props.ts' },
  viewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  browser: 'playwright.chromium (repository-pinned revision)',
  reducedMotion: 'reduce', font: { family: 'Noto Sans', face: 'SP2 Capture Noto Sans', file: 'fixtures/fonts/NotoSans-Regular.ttf', license: 'fixtures/fonts/OFL.txt', weight: 400 }, animationClock: 'fixed at document start; animations disabled',
  fixtures: { 'sp2-data-table': Array.from({ length: 10 }, (_, index) => ({ id: `row-${index + 1}`, name: `Record ${String(index + 1).padStart(2, '0')}`, status: index % 2 === 0 ? 'Active' : 'Pending' })) },
  families: generatedFamilies,
}
await writeFile(resolve(root, 'sp2-capture-matrix.json'), `${JSON.stringify(matrix, null, 2)}\n`)
console.log(`Generated ${generatedFamilies.length} families and ${generatedFamilies.reduce((sum, family) => sum + family.captures.length, 0)} captures from pinned .props.ts`)

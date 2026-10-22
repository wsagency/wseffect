import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

type Capture = { id: string; component: string; theme: 'light' | 'dark'; state: string; props: Record<string, unknown> }
type Slot = { prop: string; values: ReadonlyArray<string>; sourceProps: string }
type Component = { id: string; sourceProps: string | null; domainProps: string[]; size: boolean; variantSlots: Slot[]; visualReference?: string; fixtureId: string | null; defaultProps: Record<string, unknown>; interactive: string | null }
type Family = { family: string; route: string; galleryRoute: string; components: Component[]; captures: Capture[] }
const matrix = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../sp2-capture-matrix.json'), 'utf8')) as { schemaVersion: number; source: { commit: string }; font: { family: string; face: string; file: string; license: string; weight: number }; fixtures: Record<string, Array<{ id: string; name: string; status: string }>>; families: Family[] }
const EXPECTED: Record<string, ReadonlyArray<string>> = {
  accessibility: ['AccessibleIcon', 'VisuallyHidden'],
  'layout-extra': ['AspectRatio', 'Container', 'Inset', 'Section'],
  avatar: ['Avatar'],
  feedback: ['Badge', 'Callout', 'Progress', 'Separator', 'Skeleton', 'Spinner'],
  'typography-extra': ['Blockquote', 'Quote', 'Em', 'Strong', 'Code', 'Kbd'],
  'icon-button': ['IconButton'],
  links: ['Link'],
  'scroll-area': ['ScrollArea'],
  data: ['Table', 'DataList'],
  'forms-extra': ['Checkbox', 'CheckboxGroup', 'CheckboxCards', 'Radio', 'RadioGroup', 'RadioCards', 'Switch', 'SegmentedControl', 'TextArea'],
  select: ['Select'],
  'range-slider': ['Slider'],
  'tab-nav': ['TabNav'],
  'alert-dialog': ['AlertDialog'],
  popover: ['Popover'],
  'hover-card': ['HoverCard'],
  tooltip: ['Tooltip'],
  'context-menu': ['ContextMenu'],
  'theme-panel': ['ThemePanel'],
  'data-table': ['DataTable'],
}

test('matrix includes every SP2 comparison component on its prescribed family page', () => {
  assert.equal(matrix.schemaVersion, 3)
  assert.equal(matrix.source.commit, '383676172abb84b4a1d2e54a087d290437ee8848')
  assert.deepEqual(Object.fromEntries(matrix.families.map(family => [family.family, family.components.map(component => component.id)])), EXPECTED)
  for (const family of matrix.families) {
    assert.equal(family.galleryRoute, `/components/${family.family}`)
    for (const component of family.components) {
      assert.equal(family.captures.filter(capture => capture.component === component.id && capture.state === 'default').length, 2, `${family.family}/${component.id} needs light and dark default captures`)
    }
  }
})

test('matrix captures every .props.ts variant slot in both themes at size 2 where available', () => {
  for (const family of matrix.families) for (const component of family.components) {
    for (const slot of component.variantSlots) {
      assert.ok(slot.values.length > 0 && slot.sourceProps.endsWith('.props.ts'))
      for (const variant of slot.values) for (const theme of ['light', 'dark'] as const) {
        assert.ok(family.captures.some(capture => capture.component === component.id && capture.theme === theme && capture.props[slot.prop] === variant && (!component.size || capture.props.size === '2')), `${family.family}/${component.id}/${slot.prop}=${variant}/${theme} missing`)
      }
    }
  }
})

test('matrix includes the declared interactive states with explicit props', () => {
  const required = { Select: 'open', Popover: 'open', AlertDialog: 'open', HoverCard: 'hover', Tooltip: 'hover', RadioGroup: 'keyboard-focus', Slider: 'keyboard-focus', TabNav: 'keyboard-focus' }
  for (const [id, state] of Object.entries(required)) {
    const family = matrix.families.find(item => item.components.some(component => component.id === id))!
    const component = family.components.find(item => item.id === id)!
    assert.ok(family.captures.some(capture => capture.component === id && capture.state === state && capture.theme === 'light' && Object.keys(capture.props).length > 0), `${id} ${state} state is missing`)
    assert.equal(component.interactive, state)
  }
})

test('DataTable explicitly pairs with R2S Table using identical sample data', () => {
  const table = matrix.families.find(family => family.family === 'data-table')!
  const dataTable = table.components.find(component => component.id === 'DataTable')!
  assert.equal(dataTable.visualReference, 'Table')
  const dataFamily = matrix.families.find(family => family.family === 'data')!
  const reference = dataFamily.components.find(component => component.id === 'Table')!
  const dataTableCapture = table.captures.find(capture => capture.component === 'DataTable' && capture.state === 'default' && capture.theme === 'light')!
  const referenceCapture = dataFamily.captures.find(capture => capture.component === 'Table' && capture.state === 'default' && capture.theme === 'light')!
  assert.equal(dataTable.fixtureId, reference.fixtureId)
  assert.deepEqual(matrix.fixtures[dataTable.fixtureId!], matrix.fixtures[reference.fixtureId!])
  assert.deepEqual(dataTableCapture.props, referenceCapture.props)
  assert.equal(dataTableCapture.props.rows, 10)
  assert.equal(dataTableCapture.props.rowHeight, 44)
  assert.equal(dataTableCapture.props.viewportHeight, 486)
})
test('matrix records the vendored deterministic capture font and its license', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  assert.deepEqual(matrix.font, {
    family: 'Noto Sans',
    face: 'SP2 Capture Noto Sans',
    file: 'fixtures/fonts/NotoSans-Regular.ttf',
    license: 'fixtures/fonts/OFL.txt',
    weight: 400,
  })
  assert.ok(readFileSync(resolve(root, matrix.font.file)).byteLength > 0)
  assert.match(readFileSync(resolve(root, matrix.font.license), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/)
})

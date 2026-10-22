import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { resolveCaptureRequest, startCapture } from '../src/capture.js'

type MatrixCapture = { readonly id: string; component: string; readonly theme: 'light' | 'dark'; readonly state: string; readonly props: Record<string, unknown> }
type CaptureMatrix = {
  readonly fixtures: Readonly<Record<string, ReadonlyArray<Record<string, unknown>>>>
  readonly families: ReadonlyArray<{
    readonly family: string
    readonly galleryRoute: string
    readonly components: ReadonlyArray<{ readonly id: string; readonly fixtureId: string | null; readonly visualReference?: string }>
    readonly captures: ReadonlyArray<MatrixCapture>
  }>
}
const captureMatrix: CaptureMatrix = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../bench/radix2solid/sp2-capture-matrix.json'), 'utf8'))
const dataTableUrl = () => {
  const url = new URL('https://gallery.test/components/data-table')
  url.searchParams.set('capture', 'data-table/DataTable/default/light')
  url.searchParams.set('state', 'default')
  url.searchParams.set('props', JSON.stringify({
    size: '2',
    variant: 'surface',
    fixtureId: 'sp2-data-table',
    rows: 10,
    rowHeight: 44,
    viewportHeight: 486,
  }))
  url.searchParams.set('appearance', 'light')
  return url
}

const integratedFamilies: Readonly<Record<string, true>> = {
  accessibility: true, 'layout-extra': true, avatar: true, feedback: true, 'typography-extra': true,
  'icon-button': true, links: true, 'scroll-area': true, data: true, 'theme-panel': true,
  'alert-dialog': true, popover: true, 'hover-card': true, tooltip: true, 'context-menu': true, 'tab-nav': true, 'data-table': true,
}
const integratedCaptures = captureMatrix.families
  .filter((family) => Object.hasOwn(integratedFamilies, family.family))
  .flatMap((family) => family.captures.map((capture) => ({ ...capture, family: family.family, route: family.galleryRoute })))

describe('Gallery capture resolver', () => {
  it('resolves a matrix capture with its fixture and visual reference', () => {
    expect(resolveCaptureRequest(dataTableUrl(), captureMatrix)).toEqual({
      family: 'data-table',
      route: '/components/data-table',
      id: 'data-table/DataTable/default/light',
      component: 'DataTable',
      state: 'default',
      theme: 'light',
      props: { size: '2', variant: 'surface', fixtureId: 'sp2-data-table', rows: 10, rowHeight: 44, viewportHeight: 486 },
      fixtureId: 'sp2-data-table',
      fixture: [
        { id: 'row-1', name: 'Record 01', status: 'Active' },
        { id: 'row-2', name: 'Record 02', status: 'Pending' },
        { id: 'row-3', name: 'Record 03', status: 'Active' },
        { id: 'row-4', name: 'Record 04', status: 'Pending' },
        { id: 'row-5', name: 'Record 05', status: 'Active' },
        { id: 'row-6', name: 'Record 06', status: 'Pending' },
        { id: 'row-7', name: 'Record 07', status: 'Active' },
        { id: 'row-8', name: 'Record 08', status: 'Pending' },
        { id: 'row-9', name: 'Record 09', status: 'Active' },
        { id: 'row-10', name: 'Record 10', status: 'Pending' },
      ],
      visualReference: 'Table',
    })
  })

  it('renders the integrated data-table matrix capture from its fixture', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const fetchMatrix = vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 }))
    vi.stubGlobal('fetch', fetchMatrix)
    try {
      await startCapture(dataTableUrl())
      const app = document.getElementById('app')!
      expect(app.querySelector('[data-sp2-capture-error]')).toBeNull()
      const target = app.querySelector('[data-sp2-family="data-table"][data-sp2-component="DataTable"]')
      expect(target).not.toBeNull()
      expect(target?.querySelectorAll('.wse-data-table tbody tr[data-virtual-list-item-key]')).toHaveLength(10)
      expect(target?.textContent).toContain('Record 01')
      expect(target?.textContent).toContain('Record 10')
      const table = target?.querySelector('.wse-data-table')
      expect(Array.from(table?.querySelectorAll('thead th') ?? []).map(cell => cell.textContent?.trim()).filter(Boolean)).toEqual(['Name', 'Status'])
      expect(table?.querySelector('caption')?.textContent).toBe('')
      const scroll = target?.querySelector<HTMLElement>('.wse-data-table__scroll')
      expect(scroll?.style.height).toBe('486px')
      expect(scroll?.style.maxHeight).toBe('486px')
      expect(Array.from(table?.querySelectorAll('tbody tr[data-virtual-list-item-key]') ?? []).every(row => (row as HTMLElement).style.height === '44px')).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

  it.each(integratedCaptures.map((capture) => [capture] as const))('$family $id renders its matrix capture inside the requested theme', async ({
    family, route, id, component, state, theme, props,
  }) => {
    const url = new URL(route, 'https://gallery.test')
    url.search = new URLSearchParams({
      capture: id,
      state,
      props: JSON.stringify(props),
      appearance: theme,
    }).toString()
    document.documentElement.classList.remove('radix-themes', 'light', 'dark')
    delete document.documentElement.dataset.sp2CaptureMode
    document.body.innerHTML = '<div id="app"></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 })))
    try {
      await startCapture(url)
      const app = document.getElementById('app')!
      expect(app.querySelector('[data-sp2-capture-error]')).toBeNull()
      const target = app.querySelector(`[data-sp2-family="${family}"][data-sp2-component="${component}"]`)
      expect(target).not.toBeNull()
      expect(document.documentElement.classList.contains('radix-themes')).toBe(true)
      expect(document.documentElement.classList.contains(theme)).toBe(true)
      expect(document.documentElement.dataset.sp2CaptureMode).toBe('true')
      expect(target?.querySelectorAll('[data-is-root-theme="true"]')).toHaveLength(1)
      expect(target?.querySelectorAll('#foldkit-portal-root')).toHaveLength(1)
      if (component === 'ContextMenu') {
        const trigger = target?.querySelector('button')
        expect(trigger?.textContent).toBe('Right-click for actions')
        expect(trigger?.classList.contains('rt-variant-outline')).toBe(true)
        expect(target?.textContent).not.toContain('Actions')
      }
      if (component === 'AlertDialog' && state === 'open') {
        expect(target?.querySelector('dialog[open][role="alertdialog"]')).not.toBeNull()
        expect(target?.closest('.sp2-capture')).not.toBeNull()
        expect(target?.closest('.sp2-capture')?.getAttribute('data-sp2-capture-family')).toBe(family)
        const trigger = target?.querySelector('button[data-state]')
        expect(trigger?.textContent).toBe('Delete record')
        expect(trigger?.getAttribute('data-state')).toBe('open')
        expect(trigger?.getAttribute('data-accent-color')).toBe('')
      }
      if (component === 'Tooltip' && state === 'hover') {
        expect(target?.querySelector('button')?.getAttribute('data-state')).toBe('instant-open')
        expect(document.querySelector('[role="tooltip"]')?.getAttribute('data-state')).toBe('instant-open')
      }
      if (state === 'keyboard-focus') {
        const focusTarget = target?.querySelector<HTMLElement>(component === 'TabNav' ? 'a[href="#overview"]' : 'button')
        expect(focusTarget).not.toBeNull()
        expect(document.activeElement).toBe(focusTarget)
      }
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

  it('rejects query state or props that do not match the matrix capture', () => {
    const url = dataTableUrl()
    url.searchParams.set('state', 'keyboard-focus')
    expect(() => resolveCaptureRequest(url, captureMatrix)).toThrow(/state/)

    const wrongProps = dataTableUrl()
    wrongProps.searchParams.set('props', JSON.stringify({ size: '3' }))
    expect(() => resolveCaptureRequest(wrongProps, captureMatrix)).toThrow(/props/)
  })

  it('rejects a capture URL whose route disagrees with the matrix family', () => {
    const url = dataTableUrl()
    url.pathname = '/form'
    expect(() => resolveCaptureRequest(url, captureMatrix)).toThrow(/route/)
  })
  it('rejects matrix metadata when component disagrees with the capture id', () => {
    const inconsistentMatrix = structuredClone(captureMatrix)
    const dataTable = inconsistentMatrix.families.find((family: { family: string }) => family.family === 'data-table')!
    dataTable.captures[0].component = 'Table'
    expect(() => resolveCaptureRequest(dataTableUrl(), inconsistentMatrix)).toThrow(/capture id.*component/i)
  })

  it('focuses the native range input in a keyboard-focused Slider capture', async () => {
    const family = captureMatrix.families.find((candidate) => candidate.family === 'range-slider')!
    const capture = family.captures.find((candidate) => candidate.state === 'keyboard-focus')!
    const url = new URL(family.galleryRoute, 'https://gallery.test')
    url.search = new URLSearchParams({
      capture: capture.id,
      state: capture.state,
      props: JSON.stringify(capture.props),
      appearance: capture.theme,
    }).toString()
    document.body.innerHTML = '<div id="app"></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 })))
    try {
      await startCapture(url)
      const slider = document.querySelector<HTMLInputElement>('input[type="range"]')
      expect(slider).not.toBeNull()
      expect(document.activeElement).toBe(slider)
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

  it('renders an integrated family capture without an error or missing target', async () => {
    const capture = captureMatrix.families
      .find((family: { family: string }) => family.family === 'forms-extra')!
      .captures[0]
    const url = new URL(`https://gallery.test/components/forms-extra?capture=${encodeURIComponent(capture.id)}&state=${encodeURIComponent(capture.state)}&props=${encodeURIComponent(JSON.stringify(capture.props))}&appearance=${capture.theme}`)
    document.body.innerHTML = '<div id="app"></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 })))
    try {
      await startCapture(url)
      const app = document.getElementById('app')!
      expect(app.querySelector('[data-sp2-capture-error]')).toBeNull()
      expect(app.querySelector('[data-sp2-family]')?.getAttribute('data-sp2-family')).toBe('forms-extra')
      expect(app.querySelector('[data-sp2-capture-target]')).not.toBeNull()
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

  it('renders the complete open AlertDialog capture', async () => {
    const family = captureMatrix.families.find((candidate) => candidate.family === 'alert-dialog')!
    const capture = family.captures.find((candidate) => candidate.state === 'open')!
    const url = new URL(family.galleryRoute, 'https://gallery.test')
    url.search = new URLSearchParams({
      capture: capture.id,
      state: capture.state,
      props: JSON.stringify(capture.props),
      appearance: capture.theme,
    }).toString()
    document.body.innerHTML = '<div id="app"></div>'
    const app = document.getElementById('app')!
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 })))
    try {
      await startCapture(url)
      const dialog = app.querySelector<HTMLDialogElement>('[role="alertdialog"]')
      expect(dialog).not.toBeNull()
      expect(Array.from(dialog?.querySelectorAll('button') ?? []).map((button) => button.textContent?.trim())).toEqual(['Cancel', 'Delete'])
      expect(dialog?.hasAttribute('open')).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

})

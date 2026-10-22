import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { resolveCaptureRequest, startCapture } from '../src/capture.js'

const captureMatrix = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../bench/radix2solid/sp2-capture-matrix.json'), 'utf8'))
const dataTableUrl = () => new URL(
  'https://gallery.test/data-table?capture=data-table%2FDataTable%2Fdefault%2Flight&state=default&props=%7B%22size%22%3A%222%22%2C%22variant%22%3A%22surface%22%2C%22fixtureId%22%3A%22sp2-data-table%22%2C%22rows%22%3A10%7D&appearance=light',
)

describe('Gallery capture resolver', () => {
  it('resolves a matrix capture with its fixture and visual reference', () => {
    expect(resolveCaptureRequest(dataTableUrl(), captureMatrix)).toEqual({
      family: 'data-table',
      route: 'data-table',
      id: 'data-table/DataTable/default/light',
      component: 'DataTable',
      state: 'default',
      theme: 'light',
      props: { size: '2', variant: 'surface', fixtureId: 'sp2-data-table', rows: 10 },
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


})

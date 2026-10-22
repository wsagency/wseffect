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
      visualReference: 'Table',
    })
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

  it('fails visibly without emitting a capture target until its page family is integrated', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const fetchMatrix = vi.fn(async () => new Response(JSON.stringify(captureMatrix), { status: 200 }))
    vi.stubGlobal('fetch', fetchMatrix)
    try {
      await startCapture(dataTableUrl())
      const app = document.getElementById('app')!
      expect(app.querySelector('[data-sp2-capture-error]')?.textContent)
        .toBe('Capture page module dataTable for family data-table has not been integrated')
      expect(app.querySelector('[data-sp2-component]')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
      document.body.replaceChildren()
    }
  })

})

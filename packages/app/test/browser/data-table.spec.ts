import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { resolve } from 'node:path'

let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  server = await createServer({
    root: resolve(import.meta.dirname, '../..'),
    configFile: false,
    server: { host: '127.0.0.1', port: 0 },
    appType: 'spa',
  })
  await server.listen()
  const address = server.httpServer!.address()
  if (address === null || typeof address === 'string') throw new Error('Vite did not bind a TCP port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => { await server?.close() })

test('DataTable cells truncate long content without changing the fixed virtual row height', async ({ page }) => {
  const rowHeight = 36
  await page.setContent(`
    <table class="wse-data-table" style="width: 240px">
      <tbody>
        <tr data-virtual-list-item-key="long-content" style="height: ${rowHeight}px">
          <td>Long cell content that must stay on a single line and be clipped at the cell boundary.</td>
        </tr>
      </tbody>
    </table>
  `)
  await page.addStyleTag({ path: resolve(import.meta.dirname, '../../../themes/src/css-components/data-table.css') })

  const cell = page.locator('td')
  await expect.poll(() => page.locator('tr').evaluate(row => row.getBoundingClientRect().height)).toBe(rowHeight)
  await expect.poll(() => cell.evaluate(node => getComputedStyle(node).whiteSpace)).toBe('nowrap')
  await expect.poll(() => cell.evaluate(node => getComputedStyle(node).textOverflow)).toBe('ellipsis')
})

test('Grid moves real focus into the sortable header and back through keyboard sorting', async ({ page }) => {
  await page.goto(`${baseUrl}/test/browser/data-table.html`)

  const header = page.locator('thead th[aria-colindex="2"]')
  const dataCell = (rowId: string) => page.locator(`tbody tr[data-virtual-list-item-key="${rowId}"] td[aria-colindex="2"]`)
  const rowIds = () => page.locator('tbody tr[data-virtual-list-item-key]').evaluateAll(rows =>
    rows.map(row => row.getAttribute('data-virtual-list-item-key')))

  await expect(page.getByRole('grid')).toBeVisible()
  await expect.poll(rowIds).toEqual(['b', 'a'])
  await dataCell('b').focus()
  await page.keyboard.press('ArrowUp')
  await expect(header).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await expect.poll(rowIds).toEqual(['a', 'b'])

  await page.keyboard.press('ArrowDown')
  await expect(dataCell('a')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(header).toBeFocused()

  await page.keyboard.press('Space')
  await expect(header).toHaveAttribute('aria-sort', 'descending')
  await expect.poll(rowIds).toEqual(['b', 'a'])
})

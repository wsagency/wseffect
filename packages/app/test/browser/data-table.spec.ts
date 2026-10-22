import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

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

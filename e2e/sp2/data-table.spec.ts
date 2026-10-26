import { expect, test } from '@playwright/test'

test('Grid roves focus through data and header cells; Ctrl+Home reaches the first data cell', async ({ page }) => {
  await page.goto('/components/data-table')
  const grid = page.getByRole('grid')
  const firstRow = grid.getByRole('row').nth(1)
  const firstSelectionCell = firstRow.getByRole('gridcell').first()
  const firstName = firstRow.getByRole('gridcell').nth(1)
  await expect(grid).toBeVisible()
  await firstSelectionCell.focus()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-1 / $selection')
  await expect(firstSelectionCell).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(firstName).toBeFocused()
  await page.keyboard.press('ArrowUp')
  const nameHeader = grid.getByRole('columnheader', { name: 'Name' })
  await expect(nameHeader).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(firstName).toBeFocused()
  await page.keyboard.press('ArrowRight')

  await page.keyboard.press('Control+Home')
  await expect(firstName).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-1 / name')
})

test('Space on the selection header toggles every visible row', async ({ page }) => {
  await page.goto('/components/data-table')
  const filter = page.getByRole('searchbox', { name: 'Filter rows' })
  await filter.fill('Record 1')
  const count = page.locator('#data-table-row-count')
  await expect(count).toHaveText('1111 rows shown')
  const visibleRows = Number((await count.textContent())?.match(/\d+/)?.[0])
  expect(visibleRows).toBeGreaterThan(0)

  const grid = page.getByRole('grid')
  const selectionHeader = grid.getByRole('columnheader').first()
  await selectionHeader.focus()
  await expect(selectionHeader).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused $header / $selection')
  await page.keyboard.press('Space')
  await expect(page.locator('#data-table-selection')).toHaveText(`${visibleRows} rows selected`)
  await page.keyboard.press('Space')
  await expect(page.locator('#data-table-selection')).toHaveText('0 rows selected')
})

test('10,000-row virtualization restores the focused cell after filtering and focuses the grid for empty results', async ({ page }) => {
  await page.goto('/components/data-table')
  const grid = page.getByRole('grid')
  await expect(grid).toHaveAttribute('aria-rowcount', '10001')
  const firstSelectionCell = grid.getByRole('row').nth(1).getByRole('gridcell').first()
  await firstSelectionCell.focus()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-1 / $selection')
  await expect(firstSelectionCell).toBeFocused()
  await page.keyboard.press('Control+End')
  const viewport = page.locator('#gallery-data-table-virtual-list')
  await expect(viewport).toHaveCSS('overflow-y', 'auto')
  await expect.poll(() => viewport.evaluate(element => element.clientHeight < element.scrollHeight)).toBe(true)
  const lastRow = grid.locator('[data-virtual-list-item-key="row-10000"]')
  const lastCell = lastRow.getByRole('gridcell').last()
  await expect(lastCell).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-10000 / status')
  await expect.poll(() => viewport.evaluate(element => element.scrollTop > 0)).toBe(true)
  await expect.poll(() => grid.getByRole('row').count()).toBeLessThan(50)

  const filter = page.getByRole('searchbox', { name: 'Filter rows' })
  await filter.fill('Record 01')
  await expect(page.locator('#data-table-row-count')).toHaveText('1 rows shown')
  const recoveredCell = grid.locator('[data-virtual-list-item-key="row-1"]').getByRole('gridcell').last()
  await expect(recoveredCell).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-1 / status')

  await filter.fill('no matching record')
  await expect(page.locator('#data-table-row-count')).toHaveText('0 rows shown')
  await expect(grid).toBeFocused()
})
test('filtering to a result set that retains the active row restores focus outside the reset window', async ({ page }) => {
  await page.goto('/components/data-table')
  const grid = page.getByRole('grid')
  await grid.getByRole('row').nth(1).getByRole('gridcell').first().focus()
  await page.keyboard.press('Control+End')
  const lastCell = grid.locator('[data-virtual-list-item-key="row-10000"]').getByRole('gridcell').last()
  await expect(lastCell).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-10000 / status')

  const filter = page.getByRole('searchbox', { name: 'Filter rows' })
  await filter.fill('Record')
  await expect(page.locator('#data-table-row-count')).toHaveText('10000 rows shown')
  const restoredCell = grid.locator('[data-virtual-list-item-key="row-10000"]').getByRole('gridcell').last()
  await expect(restoredCell).toBeFocused()
  await expect(page.locator('#data-table-active-cell')).toHaveText('Focused row-10000 / status')
})

test('measures caption and sticky-header height for virtual rows', async ({ page }) => {
  await page.goto('/components/data-table')
  const grid = page.getByRole('grid')
  const viewport = page.locator('#gallery-data-table-virtual-list')
  const geometry = await viewport.evaluate(root => {
    const table = root.querySelector('table')!
    const caption = table.querySelector('caption')!
    const header = table.querySelector('thead')!
    const body = table.querySelector('tbody')!
    const rootTop = root.getBoundingClientRect().top + root.clientTop
    return {
      leadingOffset: body.getBoundingClientRect().top - rootTop + root.scrollTop,
      captionHeight: caption.getBoundingClientRect().height,
      headerHeight: header.getBoundingClientRect().height,
    }
  })
  expect(geometry.leadingOffset).toBeGreaterThan(36)
  expect(geometry.leadingOffset).toBeCloseTo(
    geometry.captionHeight + geometry.headerHeight,
    0,
  )

  const firstCell = grid.getByRole('row').nth(1).getByRole('gridcell').first()
  await firstCell.focus()
  await page.keyboard.press('Control+End')
  const lastCell = grid.locator('[data-virtual-list-item-key="row-10000"]')
    .getByRole('gridcell')
    .last()
  await expect(lastCell).toBeFocused()
  const bounds = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>(
      '#gallery-data-table-virtual-list',
    )!
    const header = document.querySelector<HTMLElement>(
      '#gallery-data-table-virtual-list thead',
    )!
    const cell = document.querySelector<HTMLElement>(
      '[data-virtual-list-item-key="row-10000"] [role="gridcell"]:last-child',
    )!
    return {
      headerBottom: header.getBoundingClientRect().bottom,
      viewportBottom: viewport.getBoundingClientRect().bottom,
      cellTop: cell.getBoundingClientRect().top,
      cellBottom: cell.getBoundingClientRect().bottom,
    }
  })
  expect(bounds.cellTop).toBeGreaterThanOrEqual(bounds.headerBottom - 1)
  expect(bounds.cellBottom).toBeLessThanOrEqual(bounds.viewportBottom + 1)
})

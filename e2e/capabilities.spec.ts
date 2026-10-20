import { expect, test } from '@playwright/test'

test('capabilityRoutesAreLazy', async ({ page }) => {
  const scriptRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/assets/') && request.url().endsWith('.js')) scriptRequests.push(request.url())
  })
  await page.goto('/capabilities')
  await expect(page.getByRole('heading', { name: 'Capabilities' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Signals' })).toHaveAttribute('href', '/capabilities/signals')
  await expect(page.locator('#capability-hub')).toBeVisible()
  expect(scriptRequests.some((url) => ['/signals-', '/validation-', '/persistence-', '/browser-', '/island-'].some((name) => url.includes(name)) && url.endsWith('.js'))).toBe(false)
  await page.getByRole('link', { name: 'Signals' }).click()
  await expect(page.locator('#signal-count')).toHaveText('0')
  expect(scriptRequests.some((url) => url.includes('/signals-') && url.endsWith('.js'))).toBe(true)
})

test('signalPatchUpdatesModel over the local EventSource endpoint', async ({ page }) => {
  await page.goto('/capabilities/signals')
  await expect(page.locator('#signal-count')).toHaveText('0')
  await page.getByRole('button', { name: 'Connect to local signal stream' }).click()
  await expect(page.locator('#signal-count')).toHaveText('7')
  await expect(page.locator('#signal-status')).toHaveText('Signal patch applied')
})

test('nativeValidationTransitions', async ({ page }) => {
  await page.goto('/capabilities/validation')
  const input = page.locator('#validation-name')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAttribute('aria-describedby', /name-error/)
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
  const errorColor = await page.locator('#name-error .rt-Text').evaluate(element => getComputedStyle(element).color)
  const bodyTextColor = await page.locator('main h1').evaluate(element => getComputedStyle(element).color)
  expect(errorColor).not.toBe(bodyTextColor)
  await input.fill('Gallery')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true)
  await expect(page.locator('#name-error')).toHaveCount(0)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true)
  await expect(page.locator('#validation-result')).toHaveText('Valid')
  await input.fill('')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAttribute('aria-describedby', /name-error/)
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
  await page.locator('#link-capabilities').click()
  await page.getByRole('link', { name: 'Validation' }).click()
  await expect(page.locator('#validation-result')).toHaveText('Enter a name')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
})

test('persistenceRestoresAndReportsFailure across two tabs', async ({ context, page }) => {
  await page.goto('/capabilities/persistence')
  await page.getByLabel('Saved value').fill('saved in the first tab')
  await page.getByRole('button', { name: 'Save value' }).click()
  await expect(page.locator('#persistence-status')).toHaveText('Saved')
  const successColor = await page.locator('#persistence-status .rt-Text').evaluate(element => getComputedStyle(element).color)
  const headingColor = await page.locator('main h1').evaluate(element => getComputedStyle(element).color)
  expect(successColor).not.toBe(headingColor)

  const secondTab = await context.newPage()
  await secondTab.goto('/capabilities/persistence')
  await secondTab.getByRole('button', { name: 'Restore value' }).click()
  await expect(secondTab.locator('#persistence-value')).toHaveValue('saved in the first tab')
  await secondTab.evaluate(() => localStorage.setItem('gallery-capabilities-persist', '{invalid'))
  await secondTab.getByRole('button', { name: 'Restore value' }).click()
  await expect(secondTab.locator('#persistence-value')).toHaveValue('')
  await expect(secondTab.locator('#persistence-status')).toContainText('Persistence failure')
  await secondTab.close()
})

test('breakpointLocaleClipboardScrollResizeBehaviors', async ({ page, context, browserName }) => {
  await page.goto('/capabilities/browser')
  await expect(page.locator('#breakpoint-value')).not.toHaveText('')
  await expect(page.locator('#locale-number')).toHaveText('1.234,5')

  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copy capability text' }).click()
    await expect(page.locator('#clipboard-status')).toHaveText('Copied')
  } else {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    })
    await page.reload()
    await page.getByRole('button', { name: 'Copy capability text' }).click()
    await expect(page.locator('#clipboard-status')).toContainText('Clipboard failed:')
  }

  await page.getByRole('button', { name: 'Scroll to target' }).click()
  await expect(page.locator('#scroll-status')).toHaveText('Scrolled to target')
  await page.locator('#resize-box').evaluate((element) => { (element as HTMLElement).style.width = '240px' })
  await expect(page.locator('#resize-value')).toContainText('240')
})

test('islandRejectsOutOfRootPatch', async ({ page }) => {
  await page.goto('/capabilities/island')
  await expect(page.locator('#trusted-island')).toContainText('Trusted server-owned Island')
  await page.getByRole('button', { name: 'Apply in-island patch' }).click()
  await expect(page.locator('#trusted-message')).toHaveText('Updated by scripted Island patch')
  await expect(page.locator('#island-status')).toHaveText('Applied')
  await expect(page.locator('#island-log')).toHaveText('Applied')
  await page.getByRole('button', { name: 'Apply out-of-root patch' }).click()
  await expect(page.locator('#island-status')).toHaveText('RejectedIslandPatch: TargetOutsideIsland')
  await expect(page.locator('#island-log')).toHaveText('AppliedRejectedIslandPatch: TargetOutsideIsland')
  await expect(page.locator('#outside-island')).toHaveText('Outside content unchanged')
})

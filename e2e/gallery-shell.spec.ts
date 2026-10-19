import { expect, test } from '@playwright/test'

test('Gallery shell uses themed controls and retains its navigation contract', async ({ page }) => {
  await page.goto('/cards')

  await expect(page.locator('header h1.rt-Heading')).toHaveText('WS Effect Gallery')
  await expect(page.locator('#date-shell .rt-Text')).toHaveText('2026-10-19')
  await expect(page.locator('#build-id .rt-Text')).toHaveText(/^[\w-]+$/)
  await expect(page.locator('#date-input')).toHaveAttribute('type', 'date')
  await expect(page.locator('#date-input')).toHaveClass(/\brt-reset\b.*\brt-TextFieldInput\b/)
  await expect(page.locator('#date-submodel-next').getByRole('button')).toHaveText('Next day')
  const surface = page.locator('.gallery-page-content > .rt-Box')
  await expect(surface).toBeVisible()
  await expect(surface).toHaveClass(/\brt-r-p-4\b/)
  const surfaceStyle = await surface.evaluate((element) => {
    const css = getComputedStyle(element)
    return { padding: css.padding, borderWidth: css.borderWidth, borderStyle: css.borderStyle, borderRadius: css.borderRadius, background: css.backgroundColor }
  })
  expect(surfaceStyle.padding).toBe('16px')
  expect(surfaceStyle.borderWidth).toBe('1px')
  expect(surfaceStyle.borderStyle).toBe('solid')
  expect(surfaceStyle.borderRadius).not.toBe('0px')
  expect(surfaceStyle.background).not.toBe('rgba(0, 0, 0, 0)')

  const navigation = page.getByRole('navigation', { name: 'Gallery pages' })
  const cardsLink = navigation.getByRole('link', { name: 'cards' })
  await expect(cardsLink).toHaveAttribute('href', '/cards')
  await expect(cardsLink).toHaveAttribute('data-active', '')
  await expect(cardsLink).toHaveClass(/\brt-Button\b/)

  const shellStyle = await page.locator('.gallery-shell').evaluate((element) => {
    const css = getComputedStyle(element)
    const header = getComputedStyle(element.querySelector('header')!)
    const navigation = getComputedStyle(element.querySelector('.gallery-route-nav .rt-Flex')!)
    const link = getComputedStyle(element.querySelector('nav a')!)
    return { font: css.fontFamily, headerPosition: header.position, navigationDisplay: navigation.display, linkDecoration: link.textDecorationLine, linkColor: link.color }
  })
  expect(shellStyle.font).toContain('system-ui')
  expect(shellStyle.headerPosition).toBe('static')
  expect(shellStyle.navigationDisplay).toBe('flex')
  expect(shellStyle.linkDecoration).toBe('none')
  expect(shellStyle.linkColor).not.toBe('rgb(0, 0, 238)')
})

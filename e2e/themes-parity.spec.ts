import { expect, test } from '@playwright/test'

// Values sampled in Chromium from radix2solid @ 383676172abb84b4a1d2e54a087d290437ee8848.
test('Card surface matches the pinned Radix2Solid Card surface', async ({ page }) => {
  await page.goto('/cards')
  await expect(page.getByRole('heading', { name: 'Card sample' })).toBeVisible()
  const card = page.locator('main .rt-Card').last()
  await expect(card).toHaveClass(/\brt-reset\b.*\brt-BaseCard\b.*\brt-r-size-1\b.*\brt-variant-surface\b/)
  const style = await card.evaluate((element) => {
    const css = getComputedStyle(element)
    const before = getComputedStyle(element, '::before')
    const after = getComputedStyle(element, '::after')
    return {
      padding: css.padding,
      borderWidth: css.borderWidth,
      borderStyle: css.borderStyle,
      containment: css.contain,
      background: before.backgroundColor,
      surfaceRing: after.boxShadow,
    }
  })
  // The reference fixture adds its own .panel class; these are Card styles
  // sampled after removing that app-specific class in Chromium.
  expect(style.padding).toBe('12px')
  expect(style.borderWidth).toBe('0px')
  expect(style.borderStyle).toBe('none')
  expect(style.containment).toBe('paint')
  expect(style.background).toBe('rgba(255, 255, 255, 0.7)')
  expect(style.surfaceRing).toContain('0px 0px 0px 1px')
})

test('TextField uses the pinned Radix2Solid boxed surface defaults', async ({ page }) => {
  await page.goto('/text-field')
  const root = page.locator('main .rt-TextFieldRoot')
  await expect(root).toHaveClass(/\brt-r-size-2\b.*\brt-variant-surface\b/)
  const style = await root.evaluate((element) => {
    const css = getComputedStyle(element)
    return { background: css.backgroundColor, borderWidth: css.borderWidth, borderStyle: css.borderStyle, padding: css.padding, shadow: css.boxShadow }
  })
  expect(style.background).toBe('rgba(255, 255, 255, 0.85)')
  expect(style.borderWidth).toBe('0px')
  expect(style.borderStyle).toBe('none')
  expect(style.padding).toBe('1px')
  expect(style.shadow).toContain('0px 0px 0px 1px inset')
})

test('Dialog content uses the pinned 600px default max width', async ({ page }) => {
  await page.goto('/dialog')
  await page.getByRole('button', { name: 'Open dialog' }).click()
  const dialogRoot = page.locator('dialog')
  await expect(dialogRoot).toBeVisible()
  expect(await dialogRoot.evaluate(element => element.closest('.rt-BaseCard'))).toBeNull()
  const dialogContent = page.locator('.rt-DialogContent')
  await expect(dialogContent).toBeVisible()
  await expect(dialogContent).toHaveClass(/\brt-r-max-w\b/)
  const style = await dialogContent.evaluate((element) => {
    const css = getComputedStyle(element)
    return { maxWidth: css.maxWidth, width: element.getBoundingClientRect().width, padding: css.padding, background: css.backgroundColor }
  })
  expect(style.maxWidth).toBe('600px')
  expect(style.width).toBeLessThanOrEqual(600)
  expect(style.padding).toBe('24px')
  expect(style.background).toBe('rgb(255, 255, 255)')
})
test('Dialog content inherits the dark root Theme', async ({ page }) => {
  await page.goto('/theme')
  await page.getByRole('button', { name: 'Appearance' }).click()
  await page.locator('[href="/dialog"]').click()
  await page.getByRole('button', { name: 'Open dialog' }).click()
  const dialogContent = page.locator('.rt-DialogContent')
  await expect(dialogContent).toBeVisible()
  await expect(page.locator('.radix-themes.dark').first()).toBeVisible()
  const background = await dialogContent.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(background).not.toBe('rgb(255, 255, 255)')
})

test('DropdownMenu themes its visible portal panel', async ({ page }) => {
  await page.goto('/dropdown-menu')
  await page.getByRole('button', { name: 'Actions' }).click()
  const panel = page.getByRole('menu')
  await expect(panel).toBeVisible()
  await expect(panel).toHaveClass(/\bradix-themes\b.*\brt-PopperContent\b.*\brt-BaseMenuContent\b.*\brt-DropdownMenuContent\b/)
  const rootTheme = page.locator('.radix-themes').first()
  await expect(rootTheme).toHaveAttribute('data-is-root-theme', 'true')
  await expect(rootTheme).toHaveAttribute('data-has-background', 'true')
  await expect(panel).not.toHaveAttribute('data-is-root-theme')
  await expect(panel).not.toHaveAttribute('data-has-background')
  await expect(panel).not.toHaveAttribute('data-panel-background')
  const style = await panel.evaluate((element) => {
    const css = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return { background: css.backgroundColor, borderWidth: css.borderWidth, borderStyle: css.borderStyle, padding: css.padding, width: rect.width, shadow: css.boxShadow, zIndex: css.zIndex, position: css.position }
  })
  expect(style.background).toBe('rgb(255, 255, 255)')
  expect(style.borderWidth).toBe('0px')
  expect(style.borderStyle).toBe('none')
  expect(style.padding).toBe('0px')
  expect(style.zIndex).toBe('1')
  expect(style.position).toBe('absolute')
  expect(style.width).toBeGreaterThan(0)
})
test('DropdownMenu portals inherit light and dark root Themes', async ({ page }) => {
  await page.goto('/dropdown-menu')
  const lightPanel = page.getByRole('button', { name: 'Actions' })
  await lightPanel.click()
  const lightMenu = page.getByRole('menu')
  await expect(lightMenu).toBeVisible()
  const lightBackground = await lightMenu.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(lightBackground).toBe('rgb(255, 255, 255)')
  await page.getByRole('button', { name: 'Actions' }).click()

  await page.locator('[href="/theme"]').click()
  await page.getByRole('button', { name: 'Appearance' }).click()
  await page.locator('[href="/dropdown-menu"]').click()
  await page.getByRole('button', { name: 'Actions' }).click()
  const darkMenu = page.getByRole('menu')
  await expect(darkMenu).toBeVisible()
  await expect(page.locator('.radix-themes.dark #foldkit-portal-root .rt-DropdownMenuContent')).toHaveCount(1)
  const darkBackground = await darkMenu.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(darkBackground).not.toBe(lightBackground)
})

test('the shared portal root stays inside the Theme and survives shell/theme rerenders', async ({ page }) => {
  await page.goto('/menus')
  const portalRoot = page.locator('.radix-themes > #foldkit-portal-root')
  await expect(portalRoot).toHaveCount(1)
  await portalRoot.evaluate(element => {
    ;(window as typeof window & { __portalRootIdentity?: Element }).__portalRootIdentity = element
  })

  await page.locator('[href="/theme"]').click()
  await page.getByRole('button', { name: 'Appearance' }).click()
  await expect(page.locator('.radix-themes.dark > #foldkit-portal-root')).toHaveCount(1)
  await page.locator('[href="/menus"]').click()
  await expect(page.locator('.radix-themes.dark > #foldkit-portal-root')).toHaveCount(1)
  expect(await page.locator('#foldkit-portal-root').evaluate(element =>
    (window as typeof window & { __portalRootIdentity?: Element }).__portalRootIdentity === element,
  )).toBe(true)
})

test('Tabs retain the pinned Radix2Solid list and trigger surface styles', async ({ page }) => {
  await page.goto('/tabs')
  const list = page.getByRole('tablist')
  await expect(list).toHaveClass('rt-BaseTabList rt-TabsList rt-r-size-2')
  const style = await list.evaluate((element) => {
    const css = getComputedStyle(element)
    return { borderWidth: css.borderWidth, shadow: css.boxShadow, padding: css.padding }
  })
  expect(style.borderWidth).toBe('0px')
  expect(style.shadow).toContain('0px -1px 0px 0px inset')
  expect(style.padding).toBe('0px')
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('tabpanel')).toBeVisible()
})


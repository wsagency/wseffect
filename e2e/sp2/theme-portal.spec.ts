import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

type Overlay = {
  route: string
  open: (page: Page) => Promise<Locator>
}

const overlays: ReadonlyArray<Overlay> = [
  {
    route: '/components/popover',
    open: async (page) => {
      await page.getByText('Details', { exact: true }).click()
      return page.locator('.rt-PopoverContent')
    },
  },
  {
    route: '/components/tooltip',
    open: async (page) => {
      await page.getByRole('button', { name: 'Save' }).hover()
      return page.locator('.rt-TooltipContent')
    },
  },
  {
    route: '/components/hover-card',
    open: async (page) => {
      const trigger = page.getByText('@radix', { exact: true })
      await trigger.hover()
      return page.getByText('Radix2Solid profile card.', { exact: true })
    },
  },
  {
    route: '/components/alert-dialog',
    open: async (page) => {
      await page.getByRole('button', { name: 'Delete record' }).click()
      return page.locator('dialog[open][role="alertdialog"]')
    },
  },
]

const configureNonDefaultTheme = async (page: Page, route: string): Promise<void> => {
  await page.goto('/theme')
  await page.getByRole('button', { name: 'Accent color' }).click()
  await page.getByRole('button', { name: 'Gray color' }).click()
  await page.getByRole('button', { name: 'Radius' }).click()
  await page.getByRole('button', { name: 'Appearance' }).click()
  const rootTheme = page.locator('.radix-themes[data-is-root-theme="true"]')
  await expect(rootTheme).toHaveAttribute('data-accent-color', 'crimson')
  await expect(rootTheme).toHaveAttribute('data-gray-color', 'gray')
  await expect(rootTheme).toHaveAttribute('data-radius', 'large')
  await expect(rootTheme).toHaveClass(/dark/)
  await page.evaluate(route => {
    window.history.pushState({}, '', route)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}
test('alert dialog stays within a small viewport or scrolls within its content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto('/components/alert-dialog')
  const dialog = await overlays[3]!.open(page)
  await expect(dialog).toBeVisible()
  const layout = await dialog.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const scrollContainer = element.closest('dialog')?.querySelector<HTMLElement>('.rt-BaseDialogScroll')
    const scrollStyle = scrollContainer == null ? null : getComputedStyle(scrollContainer)
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      viewportWidth: element.ownerDocument.documentElement.clientWidth,
      viewportHeight: element.ownerDocument.documentElement.clientHeight,
      scrollable: scrollContainer != null &&
        scrollStyle?.overflowY === 'auto' && scrollContainer.scrollHeight > scrollContainer.clientHeight,
    }
  })
  const withinViewport = layout.left >= 0 && layout.top >= 0 &&
    layout.right <= layout.viewportWidth && layout.bottom <= layout.viewportHeight
  expect(withinViewport || layout.scrollable).toBe(true)
})

for (const overlayCase of overlays) {
  test(`${overlayCase.route} portal stays within the root Theme and inherits theme tokens`, async ({ page }) => {
    await configureNonDefaultTheme(page, overlayCase.route)
    const overlay = await overlayCase.open(page)
    await expect(overlay).toBeVisible()
    const tokens = await overlay.evaluate(element => {
      const rootTheme = element.ownerDocument.querySelector<HTMLElement>('.radix-themes[data-is-root-theme="true"]')
      const portal = rootTheme?.querySelector<HTMLElement>('#foldkit-portal-root') ?? null
      const overlayTheme = element.closest<HTMLElement>('.radix-themes')
      const overlayStyle = getComputedStyle(element)
      const themeStyle = rootTheme === null ? null : getComputedStyle(rootTheme)
      return {
        inRootPortal: portal?.parentElement === rootTheme && portal.contains(element),
        attributesMatch: rootTheme !== null && overlayTheme !== null &&
          ['data-accent-color', 'data-gray-color', 'data-radius', 'data-scaling', 'data-panel-background']
            .every(name => overlayTheme.getAttribute(name) === rootTheme.getAttribute(name)),
        darkTheme: overlayTheme?.classList.contains('dark') ?? false,
        accent: overlayStyle.getPropertyValue('--accent-9').trim(),
        themeAccent: themeStyle?.getPropertyValue('--accent-9').trim() ?? '',
        gray: overlayStyle.getPropertyValue('--gray-9').trim(),
        themeGray: themeStyle?.getPropertyValue('--gray-9').trim() ?? '',
        radius: overlayStyle.getPropertyValue('--radius-3').trim(),
        themeRadius: themeStyle?.getPropertyValue('--radius-3').trim() ?? '',
      }
    })
    expect(tokens.inRootPortal).toBe(true)
    expect(tokens.attributesMatch).toBe(true)
    expect(tokens.darkTheme).toBe(true)
    expect(tokens.accent).not.toBe('')
    expect(tokens.themeAccent).not.toBe('')
    expect(tokens.accent).toBe(tokens.themeAccent)
    expect(tokens.gray).not.toBe('')
    expect(tokens.themeGray).not.toBe('')
    expect(tokens.gray).toBe(tokens.themeGray)
    expect(tokens.radius).not.toBe('')
    expect(tokens.themeRadius).not.toBe('')
    expect(tokens.radius).toBe(tokens.themeRadius)
    await expect(page.locator('.radix-themes[data-is-root-theme="true"] > #foldkit-portal-root')).toHaveCount(1)
  })
}

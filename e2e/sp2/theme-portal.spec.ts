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

for (const overlayCase of overlays) {
  test(`${overlayCase.route} portal stays within the root Theme and inherits theme tokens`, async ({ page }) => {
    await page.goto(overlayCase.route)
    const overlay = await overlayCase.open(page)
    await expect(overlay).toBeVisible()
    const tokens = await overlay.evaluate(element => {
      const rootTheme = element.ownerDocument.querySelector<HTMLElement>('.radix-themes[data-is-root-theme="true"]')
      const portal = rootTheme?.querySelector<HTMLElement>('#foldkit-portal-root') ?? null
      const overlayStyle = getComputedStyle(element)
      const themeStyle = rootTheme === null ? null : getComputedStyle(rootTheme)
      return {
        inRootPortal: portal?.parentElement === rootTheme && portal.contains(element),
        accent: overlayStyle.getPropertyValue('--accent-9').trim(),
        themeAccent: themeStyle?.getPropertyValue('--accent-9').trim() ?? '',
        radius: overlayStyle.getPropertyValue('--radius-3').trim(),
        themeRadius: themeStyle?.getPropertyValue('--radius-3').trim() ?? '',
      }
    })
    expect(tokens.inRootPortal).toBe(true)
    expect(tokens.accent).not.toBe('')
    expect(tokens.themeAccent).not.toBe('')
    expect(tokens.accent).toBe(tokens.themeAccent)
    expect(tokens.radius).not.toBe('')
    expect(tokens.themeRadius).not.toBe('')
    expect(tokens.radius).toBe(tokens.themeRadius)
    await expect(page.locator('.radix-themes[data-is-root-theme="true"] > #foldkit-portal-root')).toHaveCount(1)
  })
}

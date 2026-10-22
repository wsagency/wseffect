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
      await page.getByRole('button', { name: 'Details' }).click()
      return page.getByRole('dialog', { name: 'Additional information' })
    },
  },
  {
    route: '/components/tooltip',
    open: async (page) => {
      const trigger = page.getByRole('button', { name: 'Save' })
      await trigger.hover()
      return page.getByRole('tooltip', { name: 'Save changes help' })
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
      return page.getByRole('alertdialog')
    },
  },
]

for (const overlayCase of overlays) {
  test(`${overlayCase.route} portal stays within the root Theme and inherits theme tokens`, async ({ page }) => {
    await page.goto(overlayCase.route)
    const overlay = await overlayCase.open(page)
    await expect(overlay).toBeVisible()
    await expect.poll(() => overlay.evaluate(element => {
      const rootTheme = element.ownerDocument.querySelector('.radix-themes')
      const theme = element.closest('.radix-themes')
      const portal = element.closest('#foldkit-portal-root')
      return Boolean(rootTheme && theme === rootTheme && portal?.parentElement === rootTheme && portal.contains(element) && !element.closest('main'))
    })).toBe(true)
    const lightTheme = await overlay.evaluate(element => {
      const theme = element.closest('.radix-themes')
      const overlayStyle = getComputedStyle(element)
      const themeStyle = theme === null ? null : getComputedStyle(theme)
      return {
        accent: overlayStyle.getPropertyValue('--accent-9').trim(),
        radius: overlayStyle.getPropertyValue('--radius-3').trim(),
        themeAccent: themeStyle?.getPropertyValue('--accent-9').trim(),
        themeRadius: themeStyle?.getPropertyValue('--radius-3').trim(),
      }
    })
    expect(lightTheme.accent).not.toBe('')
    expect(lightTheme.radius).not.toBe('')
    expect(lightTheme.accent).toBe(lightTheme.themeAccent)
    expect(lightTheme.radius).toBe(lightTheme.themeRadius)
    await expect(page.locator('.radix-themes > #foldkit-portal-root')).toHaveCount(1)
    const nav = page.getByRole('navigation', { name: 'Gallery pages', exact: true })
    await nav.getByRole('link', { name: 'theme', exact: true }).click()
    await page.getByRole('button', { name: 'Appearance' }).click()
    await nav.locator(`a[href="${overlayCase.route}"]`).click()
    const darkOverlay = await overlayCase.open(page)
    await expect(darkOverlay).toBeVisible()
    const darkTheme = await darkOverlay.evaluate(element => {
      const theme = element.closest('.radix-themes')
      const overlayStyle = getComputedStyle(element)
      const themeStyle = theme === null ? null : getComputedStyle(theme)
      return {
        accent: overlayStyle.getPropertyValue('--accent-9').trim(),
        radius: overlayStyle.getPropertyValue('--radius-3').trim(),
        themeAccent: themeStyle?.getPropertyValue('--accent-9').trim(),
        themeRadius: themeStyle?.getPropertyValue('--radius-3').trim(),
        dark: theme?.classList.contains('dark') ?? false,
      }
    })
    expect(darkTheme.accent).not.toBe('')
    expect(darkTheme.accent).toBe(darkTheme.themeAccent)
    expect(darkTheme.radius).toBe(darkTheme.themeRadius)
    expect(darkTheme.radius).not.toBe('')
    expect(darkTheme.dark).toBe(true)
    await expect(page.locator('.radix-themes > #foldkit-portal-root')).toHaveCount(1)
  })
}

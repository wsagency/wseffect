import type { Page } from '@playwright/test'

export type CaptureBounds = Readonly<{ x: number; y: number; width: number; height: number }>

const overlaySelector = '[data-radix-popper-content-wrapper], .rt-PopperContent, .rt-TooltipContent, .rt-BaseDialogContent, [role="dialog"]'

export async function captureBounds(page: Page): Promise<CaptureBounds> {
  const targetBounds = await page.locator('[data-sp2-capture-target]').boundingBox()
  if (targetBounds === null) throw new Error('SP2 capture target is not visible')
  const overlayBounds = await page.locator(overlaySelector).evaluateAll(elements =>
    elements.flatMap(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || rect.width === 0 || rect.height === 0) return []
      return [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }]
    }),
  )
  return overlayBounds.reduce<CaptureBounds>((bounds, overlay) => {
    const x = Math.min(bounds.x, overlay.x)
    const y = Math.min(bounds.y, overlay.y)
    const right = Math.max(bounds.x + bounds.width, overlay.x + overlay.width)
    const bottom = Math.max(bounds.y + bounds.height, overlay.y + overlay.height)
    return { x, y, width: right - x, height: bottom - y }
  }, targetBounds)
}

export async function captureTarget(page: Page, bounds?: CaptureBounds): Promise<Buffer> {
  const clip = bounds ?? await captureBounds(page)
  return page.screenshot({ clip, animations: 'disabled' })
}

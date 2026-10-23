import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const routesPath = resolve(root, 'apps/gallery/src/routes.ts')
const sharedAPath = resolve(root, 'apps/gallery/src/pages/sharedA.ts')

const consumePendingViteModel = async (page: Page): Promise<void> => {
  await page.goto('/shared')
  await expect(page.locator('#sharedB-init-count')).toBeVisible()
  await page.goto('about:blank')
}

test('dev reload restores shared state, filters init messages, and re-inits only changed schema', async ({ page }) => {
  const originalRoutes = await readFile(routesPath)
  const originalSharedA = await readFile(sharedAPath)
  try {
    // A preceding source edit can leave one HMR-preserved model queued by the shared Vite server.
    // Consume that one-shot snapshot in a throwaway document before asserting fresh initialization.
    await consumePendingViteModel(page)
    await page.goto('/shared')
    await expect(page.locator('#sharedB-init-count')).toHaveText('1')
    await page.locator('#sharedB-increment').click()
    await expect(page.locator('#sharedB-init-count')).toHaveText('2')
    await page.locator('#sharedA-add-note').click()
    await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
    await page.locator('#date-input').fill('2027-03-17')
    await expect(page.locator('#date-shell')).toHaveText('2027-03-17')
    await page.evaluate(() => {
      const messages = (window as Window & { __wseffectMessages?: Array<{ readonly _tag: string }> }).__wseffectMessages
      if (messages === undefined) throw new Error('DEV message instrumentation is unavailable')
      messages.length = 0
    })

    const reload = page.waitForEvent('load')
    await writeFile(routesPath, Buffer.concat([originalRoutes, Buffer.from('\n')]))
    await reload
    await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
    await expect(page.locator('#date-shell')).toHaveText('2027-03-17')
    const restoredMessages = await page.evaluate(() => {
      const messages = (window as Window & { __wseffectMessages?: ReadonlyArray<{ readonly _tag: string }> }).__wseffectMessages
      if (messages === undefined) throw new Error('DEV message instrumentation is unavailable')
      return messages.filter((message) => message._tag === 'GotSharedAPageMessage').length
    })
    expect(restoredMessages).toBe(0)
    await expect(page.locator('#sharedB-init-count')).toHaveText('2')

    const originalSource = originalSharedA.toString()
    const withNewSchemaField = originalSource.replace(
      'export const Model = Schema.Struct({ note: Schema.Option(Schema.String) })',
      'export const Model = Schema.Struct({ note: Schema.Option(Schema.String), revision: Schema.String })',
    ).replace('model: { note: Option.none() }', "model: { note: Option.none(), revision: 'new-schema' }")
    expect(withNewSchemaField).not.toBe(originalSource)
    await writeFile(sharedAPath, withNewSchemaField)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('#sharedA-note')).toHaveText('(none)')
    await expect(page.locator('#date-page-sharedB')).toHaveText('2027-03-17')
    await page.locator('#sharedA-add-note').click()
    await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
  } finally {
    await writeFile(routesPath, originalRoutes)
    await writeFile(sharedAPath, originalSharedA)
  }
})

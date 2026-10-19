import { expect, test } from '@playwright/test'
import { startChildListRecorder, stopChildListRecorder } from './helpers/mutations.ts'

const waitForDelay = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

test('date inputs update every mounted shared view without replacing nodes', async ({ page }) => {
  await page.goto('/shared')
  const shell = page.locator('#date-shell')
  const submodel = page.locator('#date-submodel')
  const sharedA = page.locator('#date-page-sharedA')
  const sharedB = page.locator('#date-page-sharedB')
  await expect(sharedB).toBeVisible()
  await startChildListRecorder(page)

  for (const date of ['2027-01-03', '2027-01-10']) {
    await page.locator('#date-input').fill(date)
    await expect(shell).toHaveText(date)
    await expect(submodel).toHaveText(date)
    await expect(sharedA).toHaveText(date)
    await expect(sharedB).toHaveText(date)
  }
  await page.locator('#date-submodel-next').click()
  await expect(shell).toHaveText('2027-01-11')
  await expect(submodel).toHaveText('2027-01-11')
  await expect(sharedA).toHaveText('2027-01-11')
  await expect(sharedB).toHaveText('2027-01-11')
  await page.locator('#sharedA-prev').click()
  await expect(shell).toHaveText('2027-01-10')
  await expect(submodel).toHaveText('2027-01-10')
  await expect(sharedA).toHaveText('2027-01-10')
  await expect(sharedB).toHaveText('2027-01-10')

  expect(await stopChildListRecorder(page)).toBe(0)
})

test('a date change made while sharedA is loading is used in its first view', async ({ page }) => {
  await page.route(/\/assets\/sharedA-[^/]+\.js(?:\?.*)?$/, async (route) => {
    await waitForDelay(1_200)
    await route.continue()
  })
  const navigation = page.goto('/shared-a')
  await page.locator('#date-input').fill('2027-02-14')
  await navigation
  await expect(page.locator('#date-page-sharedA')).toHaveText('2027-02-14')
})


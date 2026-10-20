import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  const root = fileURLToPath(new URL('../../../..', import.meta.url))
  const port = 5200 + (process.pid % 50)
  server = await createServer({
    root,
    configFile: false,
    appType: 'spa',
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  })
  await server.listen()
  baseUrl = `http://127.0.0.1:${port}`
})

test.afterAll(async () => {
  await server?.close()
})

test('preflightsRejectedPatchesWithoutDocumentMutationAcrossBrowsers', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/island.html`)
  const patches = [
    { _tag: 'InnerHtml', selector: '#broken:not(', html: '<p>changed</p>', reason: 'InvalidSelector' },
    { _tag: 'InnerHtml', selector: '#missing', html: '<p>changed</p>', reason: 'MissingTarget' },
    { _tag: 'InnerHtml', selector: '#island', html: '<p>changed</p>', reason: 'TargetOutsideIsland' },
    { _tag: 'OuterHtml', selector: '#outside', html: '<p>changed</p>', reason: 'TargetOutsideIsland' },
  ] as const
  for (const { _tag, selector, html, reason } of patches) {
    const before = await page.locator('html').evaluate((element) => element.outerHTML)
    const result = await page.evaluate(async (patch) => window.applyIslandPatches([patch]), { _tag, selector, html })
    expect(result).toEqual([{ _tag: 'RejectedIslandPatch', reason }])
    expect(await page.locator('html').evaluate((element) => element.outerHTML)).toBe(before)
  }
})

test('appliesDescendantPatchesAndPreservesFocusedSelection', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/island.html`)
  const result = await page.evaluate(async () => {
    const runPatches = window.prepareIslandPatches([
      { _tag: 'InnerHtml', selector: '#form', html: '<input id="field" value="updated">' },
      { _tag: 'OuterHtml', selector: '#field', html: '<input id="field" value="server-again">' },
    ])
    const root = document.getElementById('island')
    if (root === null) throw new Error('Missing island root')
    root.innerHTML = '<section id="form"><input id="field" value="server"></section>'
    const input = root.querySelector<HTMLInputElement>('#field')
    if (input === null) throw new Error('Missing input')
    input.value = 'typed by user'
    input.focus()
    input.setSelectionRange(3, 8)
    const messages = await runPatches()
    const current = root.querySelector<HTMLInputElement>('#field')
    return {
      messages,
      value: current?.value,
      focused: document.activeElement === current,
      start: current?.selectionStart,
      end: current?.selectionEnd,
    }
  })
  expect(result).toMatchObject({
    messages: [{ _tag: 'Applied' }, { _tag: 'Applied' }],
    value: 'typed by user', focused: true, start: 3, end: 8,
  })
})

test('preservesPatchedDomAcrossParentRendersWithSameAndChangedIslandHtml', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/island.html`)
  await expect(page.locator('#patched')).toHaveText('patched')

  await page.locator('#rerender-same').click()
  await expect(page.locator('#revision')).toHaveText('1')
  await expect(page.locator('#patched')).toHaveText('patched')

  await page.locator('#rerender-changed').click()
  await expect(page.locator('#revision')).toHaveText('2')
  await expect(page.locator('#patched')).toHaveText('patched')
  await expect(page.locator('#changed-html')).toHaveCount(0)
})

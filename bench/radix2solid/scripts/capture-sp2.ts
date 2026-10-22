import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from '@playwright/test'
import { comparePixels, validatePairs, type PixelComparison, type PixelImage } from './compare-sp2.ts'
import { captureBounds, captureTarget, type CaptureBounds } from './capture-target.ts'

type Capture = { id: string; component: string; theme: 'light' | 'dark'; state: string; props: Record<string, unknown> }
type CaptureResult = {
  id: string; family: string; theme: 'light' | 'dark'; state: string; props: Record<string, unknown>
  solidPath: string; galleryPath: string | undefined; comparison: PixelComparison | undefined
  sourceHashes: { radix2solidThemes: string | undefined; radix2solidPrimitives: string | undefined; solidScreenshot: string; galleryScreenshot: string | undefined }
}
type Family = { family: string; route: string; galleryRoute: string; captures: Capture[] }
type CaptureFont = { family: string; face: string; file: string; license: string; weight: number }
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const librarySource = JSON.parse(await readFile(resolve(root, 'library-source.json'), 'utf8')) as {
  commit: string
  packedTarballs: Record<string, { contentSha256: string }>
}
const matrix = JSON.parse(await readFile(resolve(root, 'sp2-capture-matrix.json'), 'utf8')) as {
  families: Family[]; viewport: { width: number; height: number; deviceScaleFactor: number }; font: CaptureFont
}
const fontData = (await readFile(resolve(root, matrix.font.file))).toString('base64')
const fontFamily = JSON.stringify(matrix.font.face)
const fontStylesheet = `
@font-face {
  font-family: ${fontFamily};
  font-style: normal;
  font-weight: ${matrix.font.weight};
  font-display: block;
  src: url("data:font/ttf;base64,${fontData}") format("truetype");
}
:root, .rt-Theme {
  --default-font-family: ${fontFamily}, sans-serif;
  --heading-font-family: ${fontFamily}, sans-serif;
  --code-font-family: ${fontFamily}, monospace;
  --strong-font-family: ${fontFamily}, sans-serif;
  --em-font-family: ${fontFamily}, sans-serif;
  --quote-font-family: ${fontFamily}, sans-serif;
}
`
const args = process.argv.slice(2)
const galleryBase = args.find(arg => arg.startsWith('--gallery-url='))?.slice('--gallery-url='.length).replace(/\/$/, '')
const comparing = args.includes('--compare')
if (comparing && !galleryBase) throw new Error('compare-sp2 requires --gallery-url=<production-gallery-url>')
const output = process.env.WSEFFECT_SCRATCH_DIR ?? resolve(tmpdir(), 'wseffect-radix2solid-sp2')
const captureDir = resolve(output, 'captures')
const reportPath = resolve(output, 'compare-sp2.json')
const port = Number(process.env.RADIX2SOLID_PREVIEW_PORT ?? 4178)
const solidBase = `http://127.0.0.1:${port}`

async function canConnect(portNumber: number): Promise<boolean> {
  return await new Promise(resolve => {
    const server = createServer()
    server.once('error', () => resolve(true))
    server.listen(portNumber, '127.0.0.1', () => server.close(() => resolve(false)))
  })
}

async function ready(child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`preview exited with ${child.exitCode}`)
    if (await canConnect(port)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`preview did not start on port ${port}`)
}

async function decodePng(page: Page, path: string): Promise<PixelImage> {
  const base64 = (await readFile(path)).toString('base64')
  return await page.evaluate(async encoded => {
    const image = new Image()
    image.src = `data:image/png;base64,${encoded}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return { width: canvas.width, height: canvas.height, data: new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data) }
  }, base64)
}
async function loadCaptureFont(page: Page): Promise<void> {
  await page.addStyleTag({ content: fontStylesheet })
  const result = await page.evaluate(async family => {
    const faces = await document.fonts.load(`400 16px "${family}"`, 'Radix2Solid capture font 0123456789')
    return { loaded: faces.some(face => face.family === family && face.status === 'loaded'), count: faces.length }
  }, matrix.font.face)
  assert.ok(result.count > 0 && result.loaded, `vendored ${matrix.font.family} did not load as ${matrix.font.face}`)
}
async function alignCaptureTarget(page: Page, position: Readonly<{ x: number; y: number }>): Promise<void> {
  await page.locator('[data-sp2-capture-target]').evaluate((target, coordinates) => {
    const element = target as HTMLElement
    element.style.position = 'fixed'
    element.style.left = `${coordinates.x}px`
    element.style.top = `${coordinates.y}px`
  }, position)
}
async function addCaptureInitScript(page: Page, theme: 'light' | 'dark', position?: Readonly<{ x: number; y: number }>): Promise<void> {
  await page.addInitScript(({ theme }) => {
    document.documentElement.dataset.appearance = theme
  }, { theme })
  if (!position) return
  await page.route('**/*', async route => {
    if (!route.request().isNavigationRequest() || route.request().frame() !== page.mainFrame()) {
      await route.continue()
      return
    }
    const response = await route.fetch()
    const html = await response.text()
    const positionStyles = `
      [data-sp2-capture-target] {
        position: fixed !important;
        left: ${position.x}px !important;
        top: ${position.y}px !important;
        z-index: 0 !important;
      }
    `
    const style = `<style data-sp2-capture-init>${fontStylesheet}${positionStyles}</style>`
    const injectedHtml = html.replace(/<head([^>]*)>/i, (_head, attributes: string) => `<head${attributes}>${style}`)
    if (injectedHtml === html) throw new Error(`Unable to inject capture positioning into ${route.request().url()}`)
    await route.fulfill({ response, body: injectedHtml })
  })
}
async function raiseCaptureOverlays(page: Page): Promise<void> {
  await page.addStyleTag({ content: `
    [data-sp2-capture-target] { z-index: 0 !important; }
    [data-radix-popper-content-wrapper], .rt-PopperContent, .rt-TooltipContent,
    .rt-BaseDialogContent, [role="dialog"] { z-index: 1 !important; }
  ` })
}
function initialCapture(family: Family, capture: Capture): Capture {
  const deferredOverlay = ['AlertDialog', 'Popover', 'HoverCard', 'Tooltip'].includes(capture.component)
    && (capture.state === 'open' || capture.state === 'hover')
  if (!deferredOverlay) return capture
  const initial = family.captures.find(candidate =>
    candidate.component === capture.component && candidate.theme === capture.theme && candidate.state === 'default',
  )
  assert.ok(initial, `missing default capture for ${capture.component} in ${family.family}`)
  return initial
}
async function activateCaptureState(page: Page, capture: Capture, focus = false): Promise<void> {
  if (focus && (capture.state === 'keyboard-focus' || capture.state === 'range-keyboard-focus')) {
    const target = capture.component === 'Slider' ? 'input[type="range"], [role="slider"]' : capture.component === 'RadioGroup' ? '[role="radio"]' : capture.component === 'TabNav' ? 'a[href="#overview"]' : 'button'
    await page.locator(`[data-sp2-component="${capture.component}"] ${target}`).first().focus()
  }
  if (capture.state === 'hover' && capture.props.hovered !== true) {
    const target = capture.component === 'HoverCard' ? 'a[href="#profile"]' : 'button'
    await page.locator(`[data-sp2-component="${capture.component}"] ${target}`).hover()
  }
}

function unionBounds(a: CaptureBounds, b: CaptureBounds): CaptureBounds {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

async function waitForOverlayPosition(page: Page, component: string, state: string): Promise<void> {
  if (state !== 'open' && state !== 'hover') return
  if (component !== 'Popover' && component !== 'HoverCard' && component !== 'Tooltip') return
  await page.waitForFunction(() => {
    const panels = document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper], .rt-PopperContent, .rt-TooltipContent')
    return Array.from(panels).some(panel => {
      if (panel.style.left === '' || panel.style.top === '') return false
      const rect = panel.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
  }, undefined, { timeout: 5000 }).catch(error => {
    throw new Error(`Unable to position ${component}/${state} overlay at ${page.url()}`, { cause: error })
  })
}


validatePairs(matrix.families.flatMap(family => family.captures))
await mkdir(captureDir, { recursive: true })
let server: ChildProcess | undefined
if (await canConnect(port)) throw new Error(`preview port ${port} is occupied; set RADIX2SOLID_PREVIEW_PORT`)
server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, detached: true, stdio: 'ignore', env: process.env })
let browser: Browser | undefined
try {
  await ready(server)
  browser = await chromium.launch({ headless: true })
  const results: CaptureResult[] = []
  for (const family of matrix.families) for (const capture of family.captures) {
    const context = await browser.newContext({ viewport: matrix.viewport, deviceScaleFactor: matrix.viewport.deviceScaleFactor, reducedMotion: 'reduce', colorScheme: capture.theme })
    const page = await context.newPage()
    const renderedCapture = initialCapture(family, capture)
    await addCaptureInitScript(page, capture.theme)
    const renderedParams = new URLSearchParams({ appearance: capture.theme, capture: renderedCapture.id, state: renderedCapture.state, props: JSON.stringify(renderedCapture.props) })
    const params = new URLSearchParams({ appearance: capture.theme, capture: capture.id, state: capture.state, props: JSON.stringify(capture.props) })
    const url = `${solidBase}/${family.route}?${params}`
    let capturePosition: { x: number; y: number } | undefined
    if (renderedCapture.id !== capture.id) {
      await page.goto(`${solidBase}/${family.route}?${renderedParams}`, { waitUntil: 'networkidle' })
      await loadCaptureFont(page)
      await page.locator(`[data-sp2-family="${family.family}"]`).waitFor()
      await page.locator(`[data-sp2-component="${capture.component}"]`).waitFor()
      capturePosition = await page.locator('[data-sp2-capture-target]').evaluate(target => {
        const { x, y } = target.getBoundingClientRect()
        return { x, y }
      })
      await addCaptureInitScript(page, capture.theme, capturePosition)
    }
    await page.goto(url, { waitUntil: 'networkidle' })
    await loadCaptureFont(page)
    await page.locator(`[data-sp2-family="${family.family}"]`).waitFor()
    await page.locator(`[data-sp2-component="${capture.component}"]`).waitFor()
    const solidComponent = page.locator('[data-sp2-capture-target]')
    capturePosition ??= await solidComponent.evaluate(target => {
      const { x, y } = target.getBoundingClientRect()
      return { x, y }
    })
    await alignCaptureTarget(page, capturePosition)
    await raiseCaptureOverlays(page)
    await activateCaptureState(page, capture, true)
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    await waitForOverlayPosition(page, capture.component, capture.state)
    const solidBounds = await captureBounds(page)
    const solidPath = resolve(captureDir, `${capture.id.replaceAll('/', '--')}.solid.png`)
    let galleryPath: string | undefined
    let comparison: PixelComparison | undefined
    if (galleryBase) {
      const galleryPage = await context.newPage()
      await addCaptureInitScript(galleryPage, capture.theme, capturePosition)
      const galleryParams = new URLSearchParams({ appearance: capture.theme, capture: capture.id, state: capture.state, props: JSON.stringify(capture.props) })
      const galleryUrl = `${galleryBase}${family.galleryRoute}?${galleryParams}`
      await galleryPage.goto(galleryUrl, { waitUntil: 'networkidle' })
      const galleryComponent = galleryPage.locator('[data-sp2-capture-target]')
      await galleryComponent.waitFor()
      await alignCaptureTarget(galleryPage, capturePosition)
      await raiseCaptureOverlays(galleryPage)
      await loadCaptureFont(galleryPage)
      await activateCaptureState(galleryPage, capture, true)
      await galleryPage.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
      await waitForOverlayPosition(galleryPage, capture.component, capture.state)
      const galleryBounds = await captureBounds(galleryPage)
      const sharedBounds = unionBounds(solidBounds, galleryBounds)
      galleryPath = resolve(captureDir, `${capture.id.replaceAll('/', '--')}.gallery.png`)
      await writeFile(solidPath, await captureTarget(page, sharedBounds))
      await writeFile(galleryPath, await captureTarget(galleryPage, sharedBounds))
      comparison = comparePixels(await decodePng(page, solidPath), await decodePng(galleryPage, galleryPath))
      await galleryPage.close()
    } else {
      await writeFile(solidPath, await captureTarget(page, solidBounds))
    }
    const solidSha256 = createHash('sha256').update(await readFile(solidPath)).digest('hex')
    const gallerySha256 = galleryPath ? createHash('sha256').update(await readFile(galleryPath)).digest('hex') : undefined
    results.push({
      id: capture.id, family: family.family, theme: capture.theme, state: capture.state, props: capture.props,
      solidPath, galleryPath, comparison,
      sourceHashes: {
        radix2solidThemes: librarySource.packedTarballs['@wsagency/radix2solid-themes']?.contentSha256,
        radix2solidPrimitives: librarySource.packedTarballs['@wsagency/radix2solid-primitives']?.contentSha256,
        solidScreenshot: solidSha256,
        galleryScreenshot: gallerySha256,
      },
    })
    await context.close()
  }
  await writeFile(reportPath, `${JSON.stringify({ sourcePin: librarySource.commit, browserVersion: browser.version(), viewport: matrix.viewport, font: matrix.font, reducedMotion: 'reduce', animationClock: 'disabled and settled for two animation frames', galleryBase, reportingOnly: true, results }, null, 2)}\n`)
  if (galleryBase) assert.ok(results.every(result => result.comparison?.accepted === true), `visual mismatches in ${reportPath}`)
  console.log(`Captured ${results.length} SP2 images; report: ${reportPath}`)
} finally {
  await browser?.close()
  if (server?.pid && server.exitCode === null) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { /* process exited during shutdown */ }
  }
}

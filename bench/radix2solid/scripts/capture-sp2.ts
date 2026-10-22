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

type Capture = { id: string; component: string; theme: 'light' | 'dark'; state: string; props: Record<string, unknown> }
type CaptureResult = {
  id: string; family: string; theme: 'light' | 'dark'; state: string; props: Record<string, unknown>
  solidPath: string; galleryPath: string | undefined; comparison: PixelComparison | undefined
  sourceHashes: { radix2solidThemes: string | undefined; radix2solidPrimitives: string | undefined; solidScreenshot: string; galleryScreenshot: string | undefined }
}
type Family = { family: string; route: string; captures: Capture[] }
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
    await page.addInitScript(({ theme }) => {
      document.documentElement.dataset.appearance = theme
      const style = document.createElement('style')
      style.textContent = '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}'
      document.head.appendChild(style)
    }, { theme: capture.theme })
    const params = new URLSearchParams({ appearance: capture.theme, capture: capture.id, state: capture.state, props: JSON.stringify(capture.props) })
    const url = `${solidBase}/${family.route}?${params}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await loadCaptureFont(page)
    await page.locator(`[data-sp2-family="${family.family}"]`).waitFor()
    await page.locator(`[data-sp2-component="${capture.component}"]`).waitFor()
    if (capture.state === 'keyboard-focus' || capture.state === 'range-keyboard-focus') {
      const target = capture.component === 'Slider' ? '[role="slider"]' : capture.component === 'RadioGroup' ? '[role="radio"]' : capture.component === 'TabNav' ? 'a[href="#overview"]' : 'button'
      await page.locator(`[data-sp2-component="${capture.component}"] ${target}`).first().focus()
    }
    if (capture.state === 'hover') {
      const target = capture.component === 'HoverCard' ? 'a[href="#profile"]' : 'button'
      await page.locator(`[data-sp2-component="${capture.component}"] ${target}`).hover()
    }
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    const solidPath = resolve(captureDir, `${capture.id.replaceAll('/', '--')}.solid.png`)
    await page.screenshot({ path: solidPath, fullPage: false, animations: 'disabled' })
    let galleryPath: string | undefined
    let comparison: PixelComparison | undefined
    if (galleryBase) {
      const galleryPage = await context.newPage()
      const galleryParams = new URLSearchParams({ appearance: capture.theme, capture: capture.id, state: capture.state, props: JSON.stringify(capture.props) })
      const galleryUrl = `${galleryBase}/${family.route}?${galleryParams}`
      await galleryPage.goto(galleryUrl, { waitUntil: 'networkidle' })
      await loadCaptureFont(galleryPage)
      await galleryPage.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
      const pairedGalleryPath = resolve(captureDir, `${capture.id.replaceAll('/', '--')}.gallery.png`)
      galleryPath = pairedGalleryPath
      await galleryPage.screenshot({ path: pairedGalleryPath, fullPage: false, animations: 'disabled' })
      comparison = comparePixels(await decodePng(page, solidPath), await decodePng(galleryPage, pairedGalleryPath))
      await galleryPage.close()
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

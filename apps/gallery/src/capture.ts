import matrixUrl from '../../../bench/radix2solid/sp2-capture-matrix.json?url'

type CaptureMatrix = {
  readonly fixtures: Readonly<Record<string, ReadonlyArray<Record<string, unknown>>>>
  readonly families: ReadonlyArray<{
    readonly family: string
    readonly route: string
    readonly components: ReadonlyArray<{
      readonly id: string
      readonly fixtureId: string | null
      readonly visualReference?: string
    }>
    readonly captures: ReadonlyArray<{
      readonly id: string
      readonly component: string
      readonly theme: 'light' | 'dark'
      readonly state: string
      readonly props: Record<string, unknown>
    }>
  }>
}

export type CaptureRequest = {
  readonly family: string
  readonly route: string
  readonly id: string
  readonly component: string
  readonly state: string
  readonly theme: 'light' | 'dark'
  readonly props: Record<string, unknown>
  readonly fixtureId: string | null
  readonly fixture: ReadonlyArray<Record<string, unknown>> | null
  readonly visualReference: string | null
}
export type CapturePageModule = {
  readonly renderCapture: (root: HTMLElement, request: CaptureRequest) => void | Promise<void>
}

const capturePages = import.meta.glob<CapturePageModule>('./pages/*.ts')


async function loadCaptureMatrix(): Promise<CaptureMatrix> {
  const response = await fetch(matrixUrl)
  if (!response.ok) throw new Error(`Unable to load SP2 capture matrix: ${response.status}`)
  return await response.json() as CaptureMatrix
}

export function resolveCaptureRequest(url: URL, matrix: CaptureMatrix): CaptureRequest {
  const captureId = url.searchParams.get('capture')
  if (!captureId) throw new Error('Capture URL requires a non-empty capture query parameter')

  const state = url.searchParams.get('state')
  if (state === null) throw new Error('Capture URL requires a state query parameter')

  const propsText = url.searchParams.get('props')
  if (propsText === null) throw new Error('Capture URL requires a props query parameter')
  let props: unknown
  try {
    props = JSON.parse(propsText)
  } catch {
    throw new Error('Capture props query parameter must contain valid JSON')
  }
  if (props === null || typeof props !== 'object' || Array.isArray(props)) {
    throw new Error('Capture props query parameter must contain a JSON object')
  }

  const route = url.pathname.replace(/^\/+|\/+$/g, '')
  const family = matrix.families.find((candidate) => candidate.route === route)
  if (!family) throw new Error(`Capture route ${url.pathname} is not declared in the matrix`)

  const capture = family.captures.find((candidate) => candidate.id === captureId)
  if (!capture) throw new Error(`Capture ${captureId} is not declared for route ${url.pathname}`)
  const [idFamily, componentId] = capture.id.split('/')
  if (idFamily !== family.family || !componentId || componentId !== capture.component) {
    throw new Error(`Capture id component does not match matrix component for ${capture.id}`)
  }
  if (capture.state !== state) throw new Error(`Capture state does not match matrix entry ${captureId}`)
  if (JSON.stringify(capture.props) !== JSON.stringify(props)) {
    throw new Error(`Capture props do not match matrix entry ${captureId}`)
  }

  const appearance = url.searchParams.get('appearance')
  if (appearance !== null && appearance !== capture.theme) {
    throw new Error(`Capture appearance does not match matrix entry ${captureId}`)
  }
  const component = family.components.find((candidate) => candidate.id === componentId)
  if (!component) throw new Error(`Capture component ${componentId} is missing from family ${family.family}`)
  const fixture = component.fixtureId === null ? null : matrix.fixtures[component.fixtureId]
  if (component.fixtureId !== null && fixture === undefined) {
    throw new Error(`Capture fixture ${component.fixtureId} is missing from the matrix`)
  }

  return {
    family: family.family,
    route: family.route,
    id: capture.id,
    component: componentId,
    state: capture.state,
    theme: capture.theme,
    props: props as Record<string, unknown>,
    fixtureId: component.fixtureId,
    fixture,
    visualReference: component.visualReference ?? null,
  }
}

function pageKeyForFamily(family: string): string {
  const segments = family.split('-')
  return segments.map((segment, index) => index === 0
    ? segment
    : `${segment[0]!.toUpperCase()}${segment.slice(1)}`).join('')
}

function showCaptureError(root: HTMLElement, message: string): void {
  const alert = document.createElement('main')
  alert.setAttribute('role', 'alert')
  alert.dataset.sp2CaptureError = ''
  alert.textContent = message
  root.replaceChildren(alert)
}

export async function startCapture(url: URL): Promise<void> {
  const root = document.getElementById('app')
  if (!root) throw new Error('Gallery capture root #app is missing')

  try {
    const request = resolveCaptureRequest(url, await loadCaptureMatrix())
    const pageKey = pageKeyForFamily(request.family)
    const pagePath = `./pages/${pageKey}.ts`
    const loadPage = capturePages[pagePath]
    if (!loadPage) throw new Error(`Capture page module ${pageKey} for family ${request.family} has not been integrated`)

    document.documentElement.dataset.appearance = request.theme
    const target = document.createElement('div')
    target.dataset.sp2Family = request.family
    target.dataset.sp2Component = request.component
    root.replaceChildren(target)
    await (await loadPage()).renderCapture(target, request)
    if (request.state === 'keyboard-focus') {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const selector = request.component === 'TabNav' ? 'a[href="#overview"]' : 'button'
      target.querySelector<HTMLElement>(selector)?.focus()
    }
  } catch (error) {
    showCaptureError(root, error instanceof Error ? error.message : String(error))
  }
}


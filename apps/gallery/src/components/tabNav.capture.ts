import * as TabNav from '@wsagency/wseffect-themes/components/tab-nav'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const items = [
  { value: 'overview', href: '#overview', label: 'Overview' },
  { value: 'api', href: '#api', label: 'API' },
] as const
const tabs = (currentValue: string) => ({ items, currentValue, ariaLabel: 'Documentation' })

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => h.div([], [
    TabNav.view(tabs('overview'), [], h),
  ]))
  if (request.state === 'keyboard-focus') root.querySelector<HTMLAnchorElement>('a[href="#overview"]')?.focus()
}

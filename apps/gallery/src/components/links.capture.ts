import * as Link from '@wsagency/wseffect-themes/components/link'
import type { HtmlBuilder } from 'foldkit/html'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, label = 'Read the guide') => Link.view({ href: '/guide', ...(props as Partial<Link.ViewProps>) }, [label], h)

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => draw(h, { ...request.props, href: '#details' }, 'View details'))
}

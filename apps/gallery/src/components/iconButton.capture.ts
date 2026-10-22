import '@wsagency/wseffect-themes/css/icon-button.css'
import * as IconButton from '@wsagency/wseffect-themes/components/icon-button'
import * as AccessibleIcon from '@wsagency/wseffect-themes/components/accessible-icon'
import type { HtmlBuilder } from 'foldkit/html'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, onClick?: M, label = 'Add', symbol = '+') => IconButton.view<M>({ ...props, onClick } as IconButton.ViewProps<M>, [AccessibleIcon.view<M>({ label }, [h.span([], [symbol])], h)], h)

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => draw(h, { ...request.props, 'aria-label': 'More options' }, undefined, 'More options', '⋯'))
  if (request.state === 'keyboard-focus') root.querySelector('button')?.focus()
}

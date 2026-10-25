import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as ScrollArea from '@wsagency/wseffect-themes/components/scroll-area'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, includeRows = true) => ScrollArea.view(props as ScrollArea.ViewProps, includeRows ? Array.from({ length: 8 }, (_, i) => h.p([], [`Scrollable item ${i + 1}`])) : [], h)

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => draw(h, request.props, false))
}

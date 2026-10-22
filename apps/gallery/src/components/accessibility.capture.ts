import * as AccessibleIcon from '@wsagency/wseffect-themes/components/accessible-icon'
import * as VisuallyHidden from '@wsagency/wseffect-themes/components/visually-hidden'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => {
    if (request.component !== 'AccessibleIcon') return VisuallyHidden.view({}, [], h)
    const icon = h.svg([h.Attribute('viewBox', '0 0 24 24')], [
      h.path([h.Attribute('d', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v6m0 4h.01'), h.Attribute('fill', 'none'), h.Attribute('stroke', 'currentColor'), h.Attribute('stroke-width', '2')], []),
    ])
    return AccessibleIcon.view({ label: 'Information' }, [icon], h)
  })
}

import '@wsagency/wseffect-themes/css/hover-card.css'
import * as HoverCard from '@wsagency/wseffect-themes/components/hover-card'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => HoverCard.embed(h, {
    slotId: 'capture-hover-card', id: 'capture-person',
    model: { ...HoverCard.init(), ...(request.state === 'hover' ? { isOpen: true, isHovered: true } : {}) },
    toParentMessage: () => ({ _tag: 'Noop' }),
    viewInputs: { id: 'capture-person', triggerHref: '#profile', trigger: ['@radix'], content: ['Radix2Solid profile card.'] },
  }))
}

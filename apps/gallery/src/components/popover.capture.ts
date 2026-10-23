import * as Popover from '@wsagency/wseffect-themes/components/popover'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const viewInputs = { trigger: ['Details'], content: ['Popover content for comparison.'], ariaLabel: 'Additional information' }

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => Popover.embed(h, {
    slotId: 'capture-popover',
    model: { ...Popover.init({ id: 'capture-popover' }), ...(request.state === 'open' ? { isOpen: true } : {}) },
    toParentMessage: () => ({ _tag: 'Noop' }),
    viewInputs: { ...viewInputs, trigger: ['Details'], content: ['Popover content for comparison.'] },
  }))
}

import { Duration } from 'effect'
import * as Tooltip from '@wsagency/wseffect-themes/components/tooltip'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const tooltipInputs = { trigger: ['Save'], content: ['Save your changes'], ariaLabel: 'Save changes help' }

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => Tooltip.embed(h, {
    slotId: 'capture-tooltip',
    model: { ...Tooltip.init({ id: 'capture-tooltip' }), ...(request.state === 'hover' ? { showDelay: Duration.millis(0), isHovered: true, isOpen: true } : {}) },
    toParentMessage: () => ({ _tag: 'Noop' }),
    viewInputs: { ...tooltipInputs, trigger: ['Save'], content: ['Save your changes'], anchor: { placement: 'top' } },
  }))
}

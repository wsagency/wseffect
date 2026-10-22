import '@wsagency/wseffect-themes/css/alert-dialog.css'
import * as AlertDialog from '@wsagency/wseffect-themes/components/alert-dialog'
import * as Button from '@wsagency/wseffect-themes/components/button'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => h.div([], [
    Button.view({ 'data-state': request.state === 'open' ? 'open' : 'closed' }, ['Delete record'], h),
    AlertDialog.embed(h, {
      slotId: 'capture-alert-dialog',
      model: request.state === 'open' ? { ...AlertDialog.init({ id: 'capture-alert-dialog' }), isOpen: true } : AlertDialog.init({ id: 'capture-alert-dialog' }),
      toParentMessage: () => ({ _tag: 'Noop' }),
      title: 'Delete record?', description: 'This action cannot be undone.', cancelLabel: 'Cancel',
      actions: [Button.view({}, ['Delete'], h)],
    }),
  ]))
}

import '@wsagency/wseffect-themes/css/blockquote.css'
import '@wsagency/wseffect-themes/css/quote.css'
import '@wsagency/wseffect-themes/css/em.css'
import '@wsagency/wseffect-themes/css/strong.css'
import '@wsagency/wseffect-themes/css/code.css'
import '@wsagency/wseffect-themes/css/kbd.css'
import * as Blockquote from '@wsagency/wseffect-themes/components/blockquote'
import * as Quote from '@wsagency/wseffect-themes/components/quote'
import * as Em from '@wsagency/wseffect-themes/components/em'
import * as Strong from '@wsagency/wseffect-themes/components/strong'
import * as Code from '@wsagency/wseffect-themes/components/code'
import * as Kbd from '@wsagency/wseffect-themes/components/kbd'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => {
    const props = request.props
    if (request.component === 'Blockquote') return Blockquote.view(props as Blockquote.ViewProps, ['The details are not the details. They make the design.'], h)
    if (request.component === 'Quote') return Quote.view(props as Quote.ViewProps, ['Good design is obvious. Great design is transparent.'], h)
    if (request.component === 'Em') return Em.view(props as Em.ViewProps, ['Emphasized example'], h)
    if (request.component === 'Strong') return Strong.view(props as Strong.ViewProps, ['Strong example'], h)
    if (request.component === 'Code') return Code.view(props as Code.ViewProps, ['pnpm check'], h)
    return Kbd.view(props as Kbd.ViewProps, ['⌘ K'], h)
  })
}

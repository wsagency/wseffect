import '@wsagency/wseffect-themes/css/container.css'
import '@wsagency/wseffect-themes/css/inset.css'
import '@wsagency/wseffect-themes/css/section.css'
import * as AspectRatio from '@wsagency/wseffect-themes/components/aspect-ratio'
import * as Container from '@wsagency/wseffect-themes/components/container'
import * as Inset from '@wsagency/wseffect-themes/components/inset'
import * as Section from '@wsagency/wseffect-themes/components/section'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => {
    const props = request.props
    if (request.component === 'AspectRatio') return AspectRatio.view(props as AspectRatio.ViewProps, [], h)
    if (request.component === 'Container') return Container.view(props as Container.ViewProps, [], h)
    if (request.component === 'Inset') return Inset.view(props as Inset.ViewProps, [], h)
    return Section.view(props as Section.ViewProps, [], h)
  })
}

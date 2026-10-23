import * as Badge from '@wsagency/wseffect-themes/components/badge'
import * as Callout from '@wsagency/wseffect-themes/components/callout'
import * as Progress from '@wsagency/wseffect-themes/components/progress'
import * as Separator from '@wsagency/wseffect-themes/components/separator'
import * as Skeleton from '@wsagency/wseffect-themes/components/skeleton'
import * as Spinner from '@wsagency/wseffect-themes/components/spinner'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => {
    if (request.component === 'Badge') return Badge.view(request.props as Badge.ViewProps, [], h)
    if (request.component === 'Callout') return Callout.Root.view(request.props as Callout.RootProps, [Callout.Icon.view({}, ['ⓘ'], h), Callout.Text.view({}, ['Changes saved successfully.'], h)], h)
    if (request.component === 'Progress') return Progress.view({ ...request.props, value: 64, max: 100 } as Progress.ViewProps, [], h)
    if (request.component === 'Separator') return Separator.view({ ...request.props, orientation: 'horizontal' } as Separator.ViewProps, [], h)
    if (request.component === 'Skeleton') return Skeleton.view(request.props as Skeleton.ViewProps, [], h)
    return Spinner.view(request.props as Spinner.ViewProps, [], h)
  })
}

import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as AccessibleIcon from '@wsagency/wseffect-themes/components/accessible-icon'
import * as VisuallyHidden from '@wsagency/wseffect-themes/components/visually-hidden'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export const Model = Schema.Struct({})
export const Message = defineMessageUnion({ Tick: {} })
type Model = typeof Model.Type
type Message = typeof Message.Type
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([], [Heading.view({ as: 'h1' }, ['Accessibility'], h), AccessibleIcon.view({ label: 'Search' }, [h.span([], ['⌕'])], h), h.p([], [VisuallyHidden.view({}, ['Only available to assistive technology'], h)])])) })
export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => {
    if (request.component !== 'AccessibleIcon') return VisuallyHidden.view({}, [], h)
    const icon = h.svg([h.Attribute('viewBox', '0 0 24 24')], [
      h.path([h.Attribute('d', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v6m0 4h.01'), h.Attribute('fill', 'none'), h.Attribute('stroke', 'currentColor'), h.Attribute('stroke-width', '2')], []),
    ])
    return AccessibleIcon.view({ label: 'Information' }, [icon], h)
  })
}

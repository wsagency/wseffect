import '@wsagency/wseffect-themes/css/container.css'
import '@wsagency/wseffect-themes/css/inset.css'
import '@wsagency/wseffect-themes/css/section.css'
import type { CaptureRequest } from '../capture.js'
import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as AspectRatio from '@wsagency/wseffect-themes/components/aspect-ratio'
import * as Container from '@wsagency/wseffect-themes/components/container'
import * as Inset from '@wsagency/wseffect-themes/components/inset'
import * as Section from '@wsagency/wseffect-themes/components/section'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
const demo = <M>(h: HtmlBuilder<M>, component: string, props: Record<string, unknown> = {}) => component === 'AspectRatio' ? AspectRatio.view(props as AspectRatio.ViewProps, [h.div([], ['Aspect ratio content'])], h) : component === 'Container' ? Container.view(props as Container.ViewProps, [h.div([], ['Container content'])], h) : component === 'Inset' ? Inset.view(props as Inset.ViewProps, [h.div([], ['Inset content'])], h) : Section.view(props as Section.ViewProps, [h.h2([], ['Section content'])], h)
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_m, _i, h) => h.div([], [Heading.view({ as: 'h1' }, ['Layout extras'], h), demo(h, 'AspectRatio', { ratio: 16 / 9 }), demo(h, 'Container', { size: '2' }), demo(h, 'Inset', { px: 'current' }), demo(h, 'Section', { size: '2' })])) })
export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => {
    const props = request.props
    if (request.component === 'AspectRatio') return AspectRatio.view(props as AspectRatio.ViewProps, [], h)
    if (request.component === 'Container') return Container.view(props as Container.ViewProps, [], h)
    if (request.component === 'Inset') return Inset.view(props as Inset.ViewProps, [], h)
    return Section.view(props as Section.ViewProps, [], h)
  })
}

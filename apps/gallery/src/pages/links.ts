import '@wsagency/wseffect-themes/css/link.css'
import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Link from '@wsagency/wseffect-themes/components/link'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, label = 'Read the guide') => Link.view({ href: '/guide', ...(props as Partial<Link.ViewProps>) }, [label], h)
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_m, _i, h) => h.div([], [Heading.view({ as: 'h1' }, ['Links'], h), draw(h, { underline: 'always' })])) })
export function renderCapture(root: HTMLElement, request: CaptureRequest): void { renderCaptureView(root, request, h => draw(h, { ...request.props, href: '#details' }, 'View details')) }

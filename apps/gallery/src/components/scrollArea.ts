import '@wsagency/wseffect-themes/css/scroll-area.css'
import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as ScrollArea from '@wsagency/wseffect-themes/components/scroll-area'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, includeRows = true) => ScrollArea.view(props as ScrollArea.ViewProps, includeRows ? Array.from({ length: 8 }, (_, i) => h.p([], [`Scrollable item ${i + 1}`])) : [], h)
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_m, _i, h) => h.div([], [Heading.view({ as: 'h1' }, ['Scroll area'], h), draw(h, { size: '2', scrollbars: 'vertical' })])) })

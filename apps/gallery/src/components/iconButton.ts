import '@wsagency/wseffect-themes/css/icon-button.css'
import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as IconButton from '@wsagency/wseffect-themes/components/icon-button'
import * as AccessibleIcon from '@wsagency/wseffect-themes/components/accessible-icon'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
import type { HtmlBuilder } from 'foldkit/html'
export const Model = Schema.Struct({ clicks: Schema.Number })
export const Message = defineMessageUnion({ Add: {} })
type Model = typeof Model.Type; type Message = typeof Message.Type
const draw = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, onClick?: M, label = 'Add', symbol = '+') => IconButton.view<M>({ ...props, onClick } as IconButton.ViewProps<M>, [AccessibleIcon.view<M>({ label }, [h.span([], [symbol])], h)], h)
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: { clicks: 0 } }), update: (model: Model, message: Message) => Message.match(message, { Add: () => ({ model: { clicks: model.clicks + 1 } }) }), view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [Heading.view({ as: 'h1' }, ['Icon buttons'], h), draw<Message>(h, { variant: 'outline' }, { _tag: 'Add' }), h.p([], [`Added: ${model.clicks}`])])) })

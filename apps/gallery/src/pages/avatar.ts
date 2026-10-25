import { Schema } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Avatar from '@wsagency/wseffect-themes/components/avatar'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const avatarView = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}) => Avatar.view({ fallback: 'JD', ...(props as Partial<Avatar.ViewProps>) }, [], h)
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([], [Heading.view({ as: 'h1' }, ['Avatars'], h), avatarView(h), avatarView(h, { fallback: 'ML', variant: 'solid' }), avatarView(h, { fallback: 'RK', variant: 'soft' })])) })

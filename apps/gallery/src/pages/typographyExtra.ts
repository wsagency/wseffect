import { Schema } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Blockquote from '@wsagency/wseffect-themes/components/blockquote'
import * as Quote from '@wsagency/wseffect-themes/components/quote'
import * as Em from '@wsagency/wseffect-themes/components/em'
import * as Strong from '@wsagency/wseffect-themes/components/strong'
import * as Code from '@wsagency/wseffect-themes/components/code'
import * as Kbd from '@wsagency/wseffect-themes/components/kbd'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const draw = <M>(h: HtmlBuilder<M>, name: string, props: Record<string, unknown> = {}) => {
  if (name === 'Blockquote') return Blockquote.view(props as Blockquote.ViewProps, ['A thoughtful quotation'], h)
  if (name === 'Quote') return Quote.view(props as Quote.ViewProps, ['A thoughtful quotation'], h)
  if (name === 'Em') return Em.view(props as Em.ViewProps, ['Emphasized text'], h)
  if (name === 'Strong') return Strong.view(props as Strong.ViewProps, ['Important text'], h)
  if (name === 'Code') return Code.view(props as Code.ViewProps, ['const answer = 42'], h)
  return Kbd.view(props as Kbd.ViewProps, ['Ctrl'], h)
}
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_m, _i, h) => h.div([], [Heading.view({ as: 'h1' }, ['Typography extras'], h), ...(['Blockquote', 'Quote', 'Em', 'Strong', 'Code', 'Kbd'].map(name => draw(h, name))), draw(h, 'Code', { variant: 'solid' }), draw(h, 'Kbd', { variant: 'soft' })])) })

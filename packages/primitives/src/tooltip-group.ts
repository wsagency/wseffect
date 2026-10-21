import { Schema } from 'effect'
import type * as Update from 'foldkit/update'

export type Config = { openDelay: 700; skipDelay: 300 }
export const Model = Schema.Struct({ isSkipping: Schema.Boolean, expiryVersion: Schema.Number })
export type Model = typeof Model.Type
export const Message = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('TooltipOpened'), now: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('TooltipClosed'), now: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('SkipExpired'), version: Schema.Number }),
])
export type Message = typeof Message.Type
export type OutMessage = never
export declare function init(config?: Config): Model
export declare function update(model: Model, message: Message): Update.Return<Model, Message>
export declare function reflectShowDelay(model: Model): number

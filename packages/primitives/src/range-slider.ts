import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type * as Update from 'foldkit/update'

export type Thumb = { id: string; value: number; min?: number; max?: number; step?: number }
export type Config = {
  min: number
  max: number
  step: number
  orientation: 'horizontal' | 'vertical'
  thumbs: ReadonlyArray<Thumb>
  isDisabled?: boolean
}
export const Model = Schema.Struct({
  activeThumbId: Schema.NullOr(Schema.String),
  dragStartValues: Schema.NullOr(Schema.Array(Schema.Struct({
    id: Schema.String,
    value: Schema.Number,
    min: Schema.optional(Schema.Number),
    max: Schema.optional(Schema.Number),
    step: Schema.optional(Schema.Number),
  }))),
})
export type Model = typeof Model.Type
export const Message = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('FocusThumb'), id: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('Step'), id: Schema.String, delta: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('Page'), id: Schema.String, direction: Schema.Literals([-1, 1]) }),
  Schema.Struct({ _tag: Schema.Literal('SetBoundary'), id: Schema.String, boundary: Schema.Literals(['min', 'max']) }),
  Schema.Struct({ _tag: Schema.Literal('DragStart'), id: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('DragValue'), id: Schema.String, value: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('DragEnd') }),
  Schema.Struct({ _tag: Schema.Literal('CancelDrag') }),
])
export type Message = typeof Message.Type
export const OutMessage = Schema.Struct({
  _tag: Schema.Literal('ValuesChanged'),
  thumbs: Schema.Array(Schema.Struct({
    id: Schema.String,
    value: Schema.Number,
    min: Schema.optional(Schema.Number),
    max: Schema.optional(Schema.Number),
    step: Schema.optional(Schema.Number),
  })),
})
export type OutMessage = typeof OutMessage.Type
export declare function init(config: Config): Model
export declare function update(model: Model, config: Config, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage>
export declare function view(model: Model, config: Config, h: HtmlBuilder<Message>): Html

import { Option, Schema } from 'effect'
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
export const init = (_config: Config): Model => ({ activeThumbId: null, dragStartValues: null })

const limit = (thumb: Thumb, index: number, config: Config): { min: number; max: number; step: number } => ({
  min: Math.max(config.min, thumb.min ?? config.min, index > 0 ? config.thumbs[index - 1]!.value : config.min),
  max: Math.min(config.max, thumb.max ?? config.max, index < config.thumbs.length - 1 ? config.thumbs[index + 1]!.value : config.max),
  step: thumb.step ?? config.step,
})

const valuesChanged = (thumbs: ReadonlyArray<Thumb>): Update.ReturnWithOutMessage<Model, Message, OutMessage>['outMessage'] =>
  ({ _tag: 'ValuesChanged', thumbs })

export const update = (model: Model, config: Config, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage> => {
  switch (message._tag) {
    case 'FocusThumb':
      return { model: { ...model, activeThumbId: message.id } }
    case 'Step':
    case 'Page':
    case 'SetBoundary': {
      if (config.isDisabled) return { model }
      const index = config.thumbs.findIndex(thumb => thumb.id === message.id)
      if (index < 0) return { model }
      const thumb = config.thumbs[index]!
      const bounds = limit(thumb, index, config)
      const next = message._tag === 'SetBoundary'
        ? message.boundary === 'min' ? bounds.min : bounds.max
        : message._tag === 'Page'
          ? thumb.value + message.direction * bounds.step * 10
          : thumb.value + message.delta * bounds.step
      const value = message._tag === 'SetBoundary'
        ? next
        : Math.max(bounds.min, Math.min(bounds.max, bounds.min + Math.round((next - bounds.min) / bounds.step) * bounds.step))
      const thumbs = config.thumbs.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item)
      return { model: { ...model, activeThumbId: message.id }, outMessage: valuesChanged(thumbs) }
    }
    case 'DragStart':
      return { model: { ...model, activeThumbId: message.id, dragStartValues: config.thumbs } }
    case 'DragValue': {
      if (config.isDisabled) return { model }
      const index = config.thumbs.findIndex(thumb => thumb.id === message.id)
      if (index < 0) return { model }
      const thumb = config.thumbs[index]!
      const bounds = limit(thumb, index, config)
      const value = Math.max(bounds.min, Math.min(bounds.max, message.value))
      const thumbs = config.thumbs.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item)
      return { model: { ...model, activeThumbId: message.id }, outMessage: valuesChanged(thumbs) }
    }
    case 'DragEnd':
      return { model: { ...model, dragStartValues: null } }
    case 'CancelDrag':
      return model.dragStartValues === null
        ? { model }
        : { model: { ...model, dragStartValues: null }, outMessage: valuesChanged(model.dragStartValues) }
  }
}

export const view = (model: Model, config: Config, h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Role('group'),
    h.AriaLabel(`${config.orientation} range`),
    h.Attribute('data-disabled', String(config.isDisabled === true)),
  ], config.thumbs.map((thumb, index) => {
    const bounds = limit(thumb, index, config)
    const messageForKey = (key: string): Message | undefined => {
      if (key === 'Home') return { _tag: 'SetBoundary', id: thumb.id, boundary: 'min' }
      if (key === 'End') return { _tag: 'SetBoundary', id: thumb.id, boundary: 'max' }
      if (key === 'PageUp') return { _tag: 'Page', id: thumb.id, direction: 1 }
      if (key === 'PageDown') return { _tag: 'Page', id: thumb.id, direction: -1 }
      if (key === 'ArrowRight' || key === 'ArrowUp') return { _tag: 'Step', id: thumb.id, delta: 1 }
      if (key === 'ArrowLeft' || key === 'ArrowDown') return { _tag: 'Step', id: thumb.id, delta: -1 }
      return undefined
    }
    return h.input([
      h.Attribute('type', 'range'),
      h.Attribute('data-thumb-id', thumb.id),
      h.AriaLabel(thumb.id),
      h.AriaOrientation(config.orientation),
      h.Min(String(bounds.min)),
      h.Max(String(bounds.max)),
      h.Step(String(bounds.step)),
      h.Value(String(thumb.value)),
      h.Disabled(config.isDisabled === true),
      h.OnFocus({ _tag: 'FocusThumb', id: thumb.id }),
      h.OnInput(value => ({ _tag: 'DragValue', id: thumb.id, value: Number(value) })),
      h.OnPointerDown(() => Option.some({ _tag: 'DragStart', id: thumb.id })),
      h.OnPointerUp(() => Option.some({ _tag: 'DragEnd' })),
      h.OnKeyDownPreventDefault(key => {
        const message = messageForKey(key)
        return message === undefined ? Option.none() : Option.some(message)
      }),
    ])
  }))

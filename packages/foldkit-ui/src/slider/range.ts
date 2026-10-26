import { Effect, Option, Queue, Schema, Stream } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import type * as Update from '@wsagency/wseffect-foldkit/update'

export type Thumb = Readonly<{ id: string; value: number; min?: number; max?: number; step?: number }>
export type RangeConfig = Readonly<{
  min: number
  max: number
  step: number
  orientation: 'horizontal' | 'vertical'
  thumbs: ReadonlyArray<Thumb>
  isDisabled?: boolean
}>
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
export type RangeModel = typeof Model.Type
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
export type RangeMessage = typeof Message.Type
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
export type RangeOutMessage = typeof OutMessage.Type
export const init = (_config: RangeConfig): RangeModel => ({ activeThumbId: null, dragStartValues: null })

const boundsFor = (thumb: Thumb, index: number, config: RangeConfig) => ({
  min: Math.max(config.min, thumb.min ?? config.min, index > 0 ? config.thumbs[index - 1]!.value : config.min),
  max: Math.min(config.max, thumb.max ?? config.max, index < config.thumbs.length - 1 ? config.thumbs[index + 1]!.value : config.max),
  step: thumb.step ?? config.step,
})
const snap = (value: number, min: number, max: number, step: number): number =>
  Math.max(min, Math.min(max, min + Math.round((value - min) / step) * step))
const changed = (thumbs: RangeOutMessage['thumbs']): RangeOutMessage => ({ _tag: 'ValuesChanged', thumbs })
type UpdateResult = Update.ReturnWithOutMessage<RangeModel, RangeMessage, RangeOutMessage>
export const update = (model: RangeModel, config: RangeConfig, message: RangeMessage): UpdateResult => {
  switch (message._tag) {
    case 'FocusThumb': return { model: { ...model, activeThumbId: message.id } }
    case 'Step':
    case 'Page':
    case 'SetBoundary':
    case 'DragValue': {
      if (config.isDisabled) return { model }
      const index = config.thumbs.findIndex(thumb => thumb.id === message.id)
      if (index < 0) return { model }
      const thumb = config.thumbs[index]!
      const bounds = boundsFor(thumb, index, config)
      const next = message._tag === 'SetBoundary'
        ? message.boundary === 'min' ? bounds.min : bounds.max
        : message._tag === 'DragValue'
          ? message.value
          : thumb.value + (message._tag === 'Page' ? message.direction * 10 : message.delta) * bounds.step
      const value = message._tag === 'SetBoundary' ? next : snap(next, bounds.min, bounds.max, bounds.step)
      const thumbs = config.thumbs.map((entry, itemIndex) => itemIndex === index ? { ...entry, value } : entry)
      return { model: { ...model, activeThumbId: message.id }, outMessage: changed(thumbs) }
    }
    case 'DragStart': return { model: { ...model, activeThumbId: message.id, dragStartValues: config.thumbs } }
    case 'DragEnd': return { model: { ...model, dragStartValues: null } }
    case 'CancelDrag': return model.dragStartValues === null
      ? { model }
      : { model: { ...model, dragStartValues: null }, outMessage: changed(model.dragStartValues) }
  }
}

const pointerMount = (config: RangeConfig): Mount.MountAction<RangeMessage> => ({
  name: 'RangeSliderPointer',
  f: element => Stream.callback<RangeMessage>(queue => Effect.gen(function* () {
    const host = element as HTMLElement
    const root = host.closest<HTMLElement>('[data-range-slider-root]') ?? host
    const document = host.ownerDocument
    let active: { id: string; pointerId: number } | undefined
    const position = (event: PointerEvent): number | undefined => {
      const rect = root.getBoundingClientRect()
      const extent = config.orientation === 'horizontal' ? rect.width : rect.height
      if (extent <= 0) return undefined
      const offset = config.orientation === 'horizontal' ? event.clientX - rect.left : rect.bottom - event.clientY
      return config.min + Math.max(0, Math.min(1, offset / extent)) * (config.max - config.min)
    }
    const release = () => {
      if (active && host.hasPointerCapture?.(active.pointerId)) host.releasePointerCapture?.(active.pointerId)
      active = undefined
    }
    const down = (event: Event) => {
      const pointer = event as PointerEvent
      if (pointer.button !== 0 || root.getAttribute('data-disabled') === 'true') return
      const value = position(pointer)
      if (value === undefined) return
      const inputs = Array.from(host.querySelectorAll<HTMLInputElement>('input[data-thumb-id]'))
      let nearest: HTMLInputElement | undefined
      let distance = Number.POSITIVE_INFINITY
      for (const input of inputs) {
        const nextDistance = Math.abs(Number(input.value) - value)
        if (nextDistance <= distance) { nearest = input; distance = nextDistance }
      }
      const id = nearest?.dataset['thumbId']
      if (nearest === undefined || id === undefined) return
      event.preventDefault()
      nearest.focus({ preventScroll: true })
      active = { id, pointerId: pointer.pointerId }
      host.setPointerCapture?.(pointer.pointerId)
      Queue.offerUnsafe(queue, { _tag: 'DragStart', id })
      Queue.offerUnsafe(queue, { _tag: 'DragValue', id, value })
    }
    const move = (event: Event) => {
      const pointer = event as PointerEvent
      if (active?.pointerId !== pointer.pointerId) return
      const value = position(pointer)
      if (value !== undefined) Queue.offerUnsafe(queue, { _tag: 'DragValue', id: active.id, value })
    }
    const up = (event: Event) => {
      if (active?.pointerId !== (event as PointerEvent).pointerId) return
      release()
      Queue.offerUnsafe(queue, { _tag: 'DragEnd' })
    }
    const cancel = (event: Event) => {
      if (active?.pointerId !== (event as PointerEvent).pointerId) return
      release()
      Queue.offerUnsafe(queue, { _tag: 'CancelDrag' })
    }
    const keydown = (event: Event) => {
      if ((event as KeyboardEvent).key !== 'Escape' || active === undefined) return
      release()
      if (!event.defaultPrevented) { event.preventDefault(); Queue.offerUnsafe(queue, { _tag: 'CancelDrag' }) }
    }
    host.addEventListener('pointerdown', down)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', cancel)
    document.addEventListener('keydown', keydown)
    yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => {
      host.removeEventListener('pointerdown', down)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', cancel)
      document.removeEventListener('keydown', keydown)
    }))
    return yield* Effect.never
  })),
})

export const view = (_model: RangeModel, config: RangeConfig, h: HtmlBuilder<RangeMessage>): Html => {
  const percent = (value: number) => config.max === config.min ? 0 : (value - config.min) / (config.max - config.min) * 100
  const horizontal = config.orientation === 'horizontal'
  const first = config.thumbs.length === 1 ? config.min : config.thumbs[0]?.value ?? config.min
  const last = config.thumbs[config.thumbs.length - 1]?.value ?? first
  const rangeStyle = horizontal
    ? `left:${percent(first)}%;top:0;width:${percent(last) - percent(first)}%;height:100%`
    : `left:0;bottom:${percent(first)}%;width:100%;height:${percent(last) - percent(first)}%`
  return h.div([
    h.Role('group'), h.AriaLabel(`${config.orientation} range`), h.DataAttribute('slider-slot', 'group'),
    h.Attribute('data-disabled', String(config.isDisabled === true)), h.OnMount(pointerMount(config)),
  ], [
    h.div([h.DataAttribute('slider-slot', 'track'), ...(config.isDisabled ? [h.DataAttribute('disabled', '')] : [])], [
      h.div([h.DataAttribute('slider-slot', 'range'), h.Attribute('style', rangeStyle)], []),
    ]),
    ...config.thumbs.map((thumb, index) => {
      const bounds = boundsFor(thumb, index, config)
      const position = percent(thumb.value)
      const offset = 0.5 - position / 100
      const style = horizontal ? `left:calc(${position}% + var(--slider-thumb-size) * ${offset})` : `bottom:calc(${position}% + var(--slider-thumb-size) * ${offset})`
      const keyMessage = (key: string): Option.Option<RangeMessage> => {
        if (key === 'Home') return Option.some({ _tag: 'SetBoundary', id: thumb.id, boundary: 'min' })
        if (key === 'End') return Option.some({ _tag: 'SetBoundary', id: thumb.id, boundary: 'max' })
        if (key === 'PageUp') return Option.some({ _tag: 'Page', id: thumb.id, direction: 1 })
        if (key === 'PageDown') return Option.some({ _tag: 'Page', id: thumb.id, direction: -1 })
        if (key === 'ArrowRight' || key === 'ArrowUp') return Option.some({ _tag: 'Step', id: thumb.id, delta: 1 })
        if (key === 'ArrowLeft' || key === 'ArrowDown') return Option.some({ _tag: 'Step', id: thumb.id, delta: -1 })
        return key === 'Escape' && _model.dragStartValues !== null
          ? Option.some({ _tag: 'CancelDrag' })
          : Option.none()
      }
      return h.div([h.DataAttribute('slider-slot', 'thumb-container')], [
        h.input([
          h.Attribute('type', 'range'), h.Attribute('data-thumb-id', thumb.id), h.AriaLabel(thumb.id), h.AriaOrientation(config.orientation),
          h.Min(String(bounds.min)), h.Max(String(bounds.max)), h.Step(String(bounds.step)), h.Value(String(thumb.value)), h.Disabled(config.isDisabled === true),
          h.OnFocus({ _tag: 'FocusThumb', id: thumb.id }),
          h.OnInput(value => ({ _tag: 'DragValue', id: thumb.id, value: Number(value) })),
          h.OnKeyDownPreventDefault(keyMessage),
        ]),
        h.div([h.DataAttribute('slider-slot', 'thumb'), h.Attribute('data-thumb-id', thumb.id), h.Attribute('style', style)], []),
      ])
    }),
  ])
}

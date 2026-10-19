import { Schema } from 'effect'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Button from '../src/components/button.js'
import * as TextField from '../src/components/text-field.js'

const Message = defineMessageUnion({ Clicked: {}, Changed: { value: Schema.String }, Tick: {} })
type Message = typeof Message.Type
type Model = Readonly<{ value: string; clicks: number; ticks: number }>
const update = (model: Model, message: Message) => Message.match(message, {
  Clicked: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
  Changed: ({ value }) => ({ model: { ...model, value } }),
  Tick: () => ({ model: { ...model, ticks: model.ticks + 1 } }),
})
const buttonView = (_model: Model, h: HtmlBuilder<Message>) => Button.view({ size: '2', variant: 'solid', onClick: Message.Clicked() }, ['Save'], h)
const fieldView = (model: Model, h: HtmlBuilder<Message>) => TextField.view({ id: 'email', label: 'Email', size: '2', variant: 'surface', value: model.value, onInput: value => Message.Changed({ value }) }, [], h)

describe('themed controls', () => {
  it('renders a labeled Button with precomputed theme classes', () => {
    Scene.scene(
      { update, view: buttonView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button'),
      Scene.click(Scene.role('button', { name: 'Save' })),
      Scene.expect(Scene.text('Save')).toExist(),
    )
  })

  it('dispatches Button clicks and emits accent only when supplied', () => {
    Scene.scene(
      { update, view: buttonView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Save' })).not.toHaveAttr('data-accent-color'),
      Scene.click(Scene.role('button', { name: 'Save' })),
      Scene.expect(Scene.role('button', { name: 'Save' })).toExist(),
    )
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ color: 'crimson' }, ['Accent'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Accent' })).toHaveAttr('data-accent-color', 'crimson'),
    )
  })

  it('keeps disabled and loading behavior from Foldkit UI', () => {
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ disabled: true, loading: true }, ['Saving'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Saving' })).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(Scene.selector('.rt-Spinner')).toExist(),
      Scene.expect(Scene.selector('.rt-ButtonLabel')).toExist(),
    )
  })

  it('labels TextField and dispatches typed values with themed classes', () => {
    Scene.scene(
      { update, view: fieldView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.role('textbox')).toHaveAttr('class', 'rt-reset rt-TextFieldInput'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-2 rt-variant-surface'),
      Scene.type(Scene.role('textbox'), 'person@example.test'),
      Scene.expect(Scene.role('textbox')).toHaveValue('person@example.test'),
    )
  })

  it('keeps the Button and TextField view helper lazy for equal primitive arguments', () => {
    const buttonLazy = createLazy()
    const fieldLazy = createLazy()
    const renderButton = vi.fn((builder: HtmlBuilder<Message>) => Button.view({ size: '2' }, ['Save'], builder))
    const renderField = vi.fn((builder: HtmlBuilder<Message>) => TextField.view({ id: 'email', label: 'Email', size: '2' }, [], builder))
    const view = (_model: Model, h: HtmlBuilder<Message>) => h.div([], [
      buttonLazy(renderButton, [h]),
      fieldLazy(renderField, [h]),
      h.button([h.OnClick(Message.Tick())], ['tick']),
    ])
    Scene.scene(
      { update, view },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.click(Scene.role('button', { name: 'tick' })),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toExist(),
    )
    expect(renderButton).toHaveBeenCalledTimes(1)
    expect(renderField).toHaveBeenCalledTimes(1)
  })

  it('validates supported control sizes', () => {
    expect(Schema.decodeUnknownSync(Button.Props)({ size: '2', variant: 'solid' })).toBeDefined()
    expect(Schema.decodeUnknownSync(TextField.Props)({ id: 'email', label: 'Email', size: '2', variant: 'surface' })).toBeDefined()
    expect(() => Schema.decodeUnknownSync(Button.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(TextField.Props)({ size: '99' })).toThrow()
  })
})

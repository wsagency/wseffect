import { Schema } from 'effect'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Button from '../src/components/button.js'
import * as TextField from '../src/components/text-field.js'

const Message = defineMessageUnion({
  Clicked: {},
  Changed: { value: Schema.String },
  SizeChanged: { size: Schema.Literals(['1', '2', '3']) },
  FieldSizeChanged: { size: Schema.Literals(['1', '2', '3']) },
  Tick: {},
})
type Message = typeof Message.Type
type Model = Readonly<{ value: string; clicks: number; ticks: number; buttonSize?: '1' | '2' | '3'; fieldSize?: '1' | '2' | '3' }>
const update = (model: Model, message: Message) => Message.match(message, {
  Clicked: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
  Changed: ({ value }) => ({ model: { ...model, value } }),
  SizeChanged: ({ size }) => ({ model: { ...model, buttonSize: size } }),
  FieldSizeChanged: ({ size }) => ({ model: { ...model, fieldSize: size } }),
  Tick: () => ({ model: { ...model, ticks: model.ticks + 1 } }),
})
const buttonView = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  Button.view({ size: model.buttonSize ?? '2', variant: 'solid', onClick: Message.Clicked() }, ['Save'], h),
  h.span([], [`Clicks: ${model.clicks}`]),
])
const fieldView = (model: Model, h: HtmlBuilder<Message>) => TextField.view({ id: 'email', label: 'Email', size: model.fieldSize ?? '2', variant: 'surface', radius: 'full', value: model.value, onInput: value => Message.Changed({ value }) }, [], h)

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
      Scene.expect(Scene.text('Clicks: 1')).toExist(),
    )
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ color: 'crimson' }, ['Accent'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Accent' })).toHaveAttr('data-accent-color', 'crimson'),
    )
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ radius: 'full', highContrast: true }, ['Emphasis'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Emphasis' })).toHaveAttr('data-radius', 'full'),
      Scene.expect(Scene.role('button', { name: 'Emphasis' })).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button rt-high-contrast'),
    )
  })

  it('loading and disabled buttons do not dispatch clicks', () => {
    Scene.scene(
      { update, view: (model: Model, h: HtmlBuilder<Message>) => h.div([], [
        Button.view({ loading: true, onClick: Message.Clicked() }, ['Saving'], h),
        h.span([], [`Clicks: ${model.clicks}`]),
      ]) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Saving' })).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(Scene.selector('.rt-loading .rt-ButtonContent')).toExist(),
      Scene.expect(Scene.selector('.rt-ButtonContent')).toHaveStyle('display', 'contents'),
      Scene.click(Scene.role('button', { name: 'Saving' })),
      Scene.expect(Scene.text('Clicks: 0')).toExist(),
      Scene.expect(Scene.selector('.rt-Spinner')).toExist(),
    )
    Scene.scene(
      { update, view: (model: Model, h: HtmlBuilder<Message>) => h.div([], [
        Button.view({ disabled: true, onClick: Message.Clicked() }, ['Disabled'], h),
        h.span([], [`Clicks: ${model.clicks}`]),
      ]) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.click(Scene.role('button', { name: 'Disabled' })),
      Scene.expect(Scene.text('Clicks: 0')).toExist(),
    )
  })

  it('labels TextField and dispatches typed values with themed classes', () => {
    Scene.scene(
      { update, view: fieldView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.role('textbox')).toHaveAttr('class', 'rt-reset rt-TextFieldInput'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-2 rt-variant-surface'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('data-radius', 'full'),
      Scene.expect(Scene.role('textbox')).toHaveValue('person@example.test'),
    )
  })

  it('memoizes control views by their primitive props', () => {
    const buttonLazy = createLazy()
    const fieldLazy = createLazy()
    const renderButton = vi.fn((size: '1' | '2' | '3', variant: 'solid', builder: HtmlBuilder<Message>) => Button.view({ size, variant }, ['Save'], builder))
    const renderField = vi.fn((id: 'email', label: 'Email', size: '1' | '2' | '3', variant: 'surface', builder: HtmlBuilder<Message>) => TextField.view({ id, label, size, variant }, [], builder))
    const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
      buttonLazy(renderButton, [model.buttonSize ?? '2', 'solid', h]),
      fieldLazy(renderField, ['email', 'Email', model.fieldSize ?? '2', 'surface', h]),
      h.button([h.OnClick(Message.Tick())], ['tick']),
      h.button([h.OnClick(Message.SizeChanged({ size: '3' }))], ['resize button']),
      h.button([h.OnClick(Message.FieldSizeChanged({ size: '3' }))], ['resize field']),
    ])
    Scene.scene(
      { update, view },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.click(Scene.role('button', { name: 'tick' })),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toExist(),
      Scene.expect(Scene.selector('.rt-Button')).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button'),
      Scene.click(Scene.role('button', { name: 'resize button' })),
      Scene.expect(Scene.selector('.rt-Button')).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-3 rt-variant-solid rt-Button'),
      Scene.click(Scene.role('button', { name: 'resize field' })),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-3 rt-variant-surface'),
    )
    expect(renderButton).toHaveBeenCalledTimes(2)
    expect(renderField).toHaveBeenCalledTimes(2)
  })

  it('validates supported control sizes', () => {
    expect(Schema.decodeUnknownSync(Button.Props)({ size: '2', variant: 'solid' })).toBeDefined()
    expect(Schema.decodeUnknownSync(TextField.Props)({ id: 'email', label: 'Email', size: '2', variant: 'surface' })).toBeDefined()
    expect(() => Schema.decodeUnknownSync(Button.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(TextField.Props)({ size: '99' })).toThrow()
  })
})

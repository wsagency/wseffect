import { Schema } from 'effect'
import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
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

  it('dispatches Button clicks and emits the pinned default or explicit accent', () => {
    Scene.scene(
      { update, view: buttonView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('data-accent-color', ''),
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
  it('forwards native data-state to Button', () => Scene.scene(
    { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ 'data-state': 'open' } as Button.ViewProps<Message>, ['Open'], h) },
    Scene.given({ value: '', clicks: 0, ticks: 0 }),
    Scene.expect(Scene.role('button', { name: 'Open' })).toHaveAttr('data-state', 'open'),
    Scene.expect(Scene.role('button', { name: 'Open' })).toHaveAttr('data-accent-color', ''),
  ))

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
      Scene.expect(Scene.role('button', { name: 'Saving' })).not.toHaveHandler('click'),
      Scene.expect(Scene.text('Clicks: 0')).toExist(),
      Scene.expect(Scene.selector('.rt-Spinner')).toHaveAttr('class', 'rt-Spinner rt-r-size-2'),
    )
    Scene.scene(
      { update, view: (model: Model, h: HtmlBuilder<Message>) => h.div([], [
        Button.view({ disabled: true, onClick: Message.Clicked() }, ['Disabled'], h),
        h.span([], [`Clicks: ${model.clicks}`]),
      ]) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.role('button', { name: 'Disabled' })).not.toHaveHandler('click'),
      Scene.expect(Scene.text('Clicks: 0')).toExist(),
    )
  })
  it('maps button sizes to spinner sizes at each breakpoint', () => {
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ size: '4', loading: true }, ['Large'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.selector('.rt-Spinner')).toHaveAttr('class', 'rt-Spinner rt-r-size-3'),
    )
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => Button.view({ size: { initial: '1', md: '4' }, loading: true }, ['Responsive'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.selector('.rt-Spinner')).toHaveAttr('class', 'rt-Spinner rt-r-size-1 md:rt-r-size-3'),
    )
  })

  it('keeps the TextField root limited to its input and associates outer label and description', () => {
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => TextField.view({ id: 'profile-email', label: 'Email address' }, ['Used for account updates.'], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.selector('.rt-TextFieldRoot .rt-TextFieldInput')).toExist(),
      Scene.expect(Scene.selector('.rt-TextFieldRoot :not(.rt-TextFieldInput)')).not.toExist(),
      Scene.expect(Scene.selector('label')).toHaveAttr('htmlFor', 'profile-email'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot label')).not.toExist(),
      Scene.expect(Scene.selector('#profile-email')).toHaveAttr('aria-describedby', 'profile-email-description'),
      Scene.expect(Scene.selector('#profile-email-description')).toExist(),
    )
  })

  it('preserves TextField states, native events, and all class/attribute variants', () => {
    Scene.scene(
      { update, view: (_model: Model, h: HtmlBuilder<Message>) => TextField.view({
        id: 'settings-email',
        label: 'Email',
        size: { initial: '1', md: '3' },
        variant: 'classic',
        color: 'iris',
        radius: 'small',
        disabled: true,
        readOnly: true,
        invalid: true,
        onInput: value => Message.Changed({ value }),
      }, [], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-1 md:rt-r-size-3 rt-variant-classic'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('data-accent-color', 'iris'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('data-radius', 'small'),
      Scene.expect(Scene.role('textbox')).toHaveAttr('data-disabled', ''),
      Scene.expect(Scene.role('textbox')).toHaveAttr('data-readonly', ''),
      Scene.expect(Scene.role('textbox')).toHaveAttr('aria-invalid', 'true'),
    )
    Scene.scene(
      { update, view: (model: Model, h: HtmlBuilder<Message>) => TextField.view({
        id: 'editable-email',
        value: model.value,
        label: 'Editable',
        size: '3',
        variant: 'soft',
        onInput: value => Message.Changed({ value }),
      }, [], h) },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-3 rt-variant-soft'),
      Scene.type(Scene.role('textbox'), 'edited@example.test'),
      Scene.expect(Scene.role('textbox')).toHaveValue('edited@example.test'),
    )
  })

  it('labels TextField and dispatches typed values with themed classes', () => {
    Scene.scene(
      { update, view: fieldView },
      Scene.given({ value: '', clicks: 0, ticks: 0 }),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.selector('#email')).not.toHaveAttr('aria-describedby'),
      Scene.expect(Scene.selector('#email-description')).not.toExist(),
      Scene.expect(Scene.role('textbox')).toHaveAttr('class', 'rt-reset rt-TextFieldInput'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('class', 'rt-TextFieldRoot rt-r-size-2 rt-variant-surface'),
      Scene.expect(Scene.selector('.rt-TextFieldRoot')).toHaveAttr('data-radius', 'full'),
      Scene.type(Scene.role('textbox'), 'person@example.test'),
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

  it('validates supported control sizes and accent colors', () => {
    expect(Schema.decodeUnknownSync(Button.Props)({ size: '2', variant: 'solid', color: 'crimson' })).toBeDefined()
    expect(Schema.decodeUnknownSync(TextField.Props)({ id: 'email', label: 'Email', size: '2', variant: 'surface', color: 'crimson' })).toBeDefined()
    expect(() => Schema.decodeUnknownSync(Button.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(TextField.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Button.Props)({ color: 'not-a-radix-color' })).toThrow()
    expect(() => Schema.decodeUnknownSync(TextField.Props)({ id: 'email', label: 'Email', color: 'not-a-radix-color' })).toThrow()
  })
})

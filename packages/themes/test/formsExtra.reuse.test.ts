import { Option } from 'effect'
import { createLazy, type Html, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, expect, it, vi } from 'vitest'
import * as CheckboxGroup from '../src/components/checkbox-group.js'
import * as CheckboxCards from '../src/components/checkbox-cards.js'
import * as RadioGroup from '../src/components/radio-group.js'
import * as RadioCards from '../src/components/radio-cards.js'
import * as SegmentedControl from '../src/components/segmented-control.js'
import * as TextArea from '../src/components/text-area.js'

const Message = defineMessageUnion({ Tick: {}, Resize: {} })
type Message = typeof Message.Type
type Model = Readonly<{ size: '1' | '2'; ticks: number }>
const update = (model: Model, message: Message) => ({ model: message._tag === 'Tick' ? { ...model, ticks: model.ticks + 1 } : { ...model, size: '1' as const } })

const checkReuse = (render: (size: Model['size'], h: HtmlBuilder<Message>) => Html): void => {
  const lazy = createLazy()
  const countedRender = vi.fn(render)
  const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy(countedRender, [model.size, h]),
    h.button([h.OnClick(Message.Tick())], ['tick']),
    h.button([h.OnClick(Message.Resize())], ['resize']),
    h.span([], [`Ticks: ${model.ticks}`]),
  ])
  Scene.scene(
    { update, view },
    Scene.given({ size: '2', ticks: 0 }),
    Scene.click(Scene.role('button', { name: 'tick' })),
    Scene.expect(Scene.text('Ticks: 1')).toExist(),
    Scene.click(Scene.role('button', { name: 'resize' })),
    Scene.expect(Scene.selector('.rt-r-size-1')).toExist(),
  )
  expect(countedRender).toHaveBeenCalledTimes(2)
}

describe('forms-extra view reuse', () => {
  it('reuses CheckboxGroup until its size changes', () => checkReuse((size, h) => CheckboxGroup.view({
    id: 'group', label: h.span([], ['Group']), size,
    options: [{ value: 'one', label: h.span([], ['One']) }], selected: new Set<string>(),
    toggleMessage: () => Message.Tick(),
  }, h)))

  it('reuses CheckboxCards until its size changes', () => checkReuse((size, h) => CheckboxCards.view({
    id: 'cards', label: 'Cards', size,
    options: [{ value: 'one', label: ['One'] }], selected: new Set<string>(),
    toggleMessage: () => Message.Tick(),
  }, h)))

  it('reuses RadioGroup until its size changes', () => {
    const group = RadioGroup.create<string>()
    const model = group.init({ id: 'radio-group' })
    checkReuse((size, h) => group.view(model, {
      options: [{ value: 'one', label: h.span([], ['One']) }],
      selectedValue: Option.some('one'), ariaLabel: 'Choices', name: 'choices', props: { size },
    }, h as unknown as HtmlBuilder<RadioGroup.Message>))
  })

  it('reuses RadioCards until its size changes', () => {
    const cards = RadioCards.create<string>()
    const model = cards.init({ id: 'radio-cards' })
    checkReuse((size, h) => cards.view(model, {
      options: [{ value: 'one', label: h.span([], ['One']) }],
      selectedValue: Option.some('one'), ariaLabel: 'Choices', name: 'choices', props: { size },
    }, h as unknown as HtmlBuilder<RadioCards.Message>))
  })

  it('reuses SegmentedControl until its size changes', () => {
    const control = SegmentedControl.create<string>()
    const model = control.init({ id: 'segments' })
    checkReuse((size, h) => control.view(model, {
      options: [{ value: 'one', label: h.span([], ['One']) }],
      selectedValue: Option.some('one'), ariaLabel: 'Segments', name: 'segments', props: { size },
    }, h as unknown as HtmlBuilder<SegmentedControl.Message>))
  })

  it('reuses TextArea until its size changes', () => checkReuse((size, h) => TextArea.view({
    id: 'notes', label: 'Notes', size, value: '',
  }, [], h)))
})

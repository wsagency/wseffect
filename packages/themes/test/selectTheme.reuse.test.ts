import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import { Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import * as Select from '../src/components/select.js'
const SelectBox = Select.create<'yes'>()
const Message = defineMessageUnion({ Tick: {}, Resize: {} })
type Message = typeof Message.Type
const update = (model: Readonly<{ select: Select.Model; size: '1' | '2'; ticks: number }>, message: Message | Select.Message) => message._tag === 'Tick' ? { model: { ...model, ticks: model.ticks + 1 } } : message._tag === 'Resize' ? { model: { ...model, size: '1' as const } } : { model: { ...model, select: SelectBox.update(model.select, message).model } }
describe('Select view reuse', () => {
  it('unrelated update reuses view; changed arg re-executes once', () => {
    const lazy = createLazy()
    const render = vi.fn((size: '1' | '2', h: HtmlBuilder<Message | Select.Message>) => SelectBox.view(SelectBox.init({ id: 'reuse', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false }), { id: 'reuse', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false, props: { size } }, h as HtmlBuilder<Select.Message>))
    const view = (model: Readonly<{ select: Select.Model; size: '1' | '2'; ticks: number }>, h: HtmlBuilder<Message | Select.Message>) => h.div([], [lazy(render, [model.size, h]), h.button([h.OnClick({ _tag: 'Tick' })], ['tick']), h.button([h.OnClick({ _tag: 'Resize' })], ['resize'])])
    const select = SelectBox.init({ id: 'reuse', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false })
    Scene.scene({ update, view }, Scene.given({ select, size: '2', ticks: 0 }), Scene.click(Scene.role('button', { name: 'tick' })), Scene.click(Scene.role('button', { name: 'resize' })))
    expect(render).toHaveBeenCalledTimes(2)
  })
})

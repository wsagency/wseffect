import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Checkbox from '../src/components/checkbox.js'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Tick: {}, Resize: {} })
type Message = typeof Message.Type
const update = (model: Readonly<{ size: '1' | '2'; ticks: number }>, message: Message) => ({ model: message._tag === 'Tick' ? { ...model, ticks: model.ticks + 1 } : { ...model, size: '1' as const } })
describe('Checkbox view reuse', () => {
  it('unrelated update reuses view; changed arg re-executes once', () => {
    const lazy = createLazy()
    const render = vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Checkbox.view({ id: 'x', size, checked: false }, ['Choice'], h))
    const view = (model: Readonly<{ size: '1' | '2'; ticks: number }>, h: HtmlBuilder<Message>) => h.div([], [lazy(render, [model.size, h]), h.button([h.OnClick(Message.Tick())], ['tick']), h.button([h.OnClick(Message.Resize())], ['resize'])])
    Scene.scene({ update, view }, Scene.given({ size: '2', ticks: 0 }), Scene.click(Scene.role('button', { name: 'tick' })), Scene.click(Scene.role('button', { name: 'resize' })))
    expect(render).toHaveBeenCalledTimes(2)
  })
})

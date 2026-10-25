import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Radio from '../src/components/radio.js'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
const Message = defineMessageUnion({ Tick: {}, Resize: {} })
type Message = typeof Message.Type
const update = (model: Readonly<{ size: '1' | '2'; ticks: number }>, message: Message) => ({ model: message._tag === 'Tick' ? { ...model, ticks: model.ticks + 1 } : { ...model, size: '1' as const } })
describe('Radio view reuse', () => {
  it('unrelated update reuses view; changed arg re-executes once', () => {
    const lazy = createLazy()
    const render = vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Radio.view({ id: 'x', value: 'yes', checked: true, size }, ['Choice'], h))
    const view = (model: Readonly<{ size: '1' | '2'; ticks: number }>, h: HtmlBuilder<Message>) => h.div([], [lazy(render, [model.size, h]), h.button([h.OnClick(Message.Tick())], ['tick']), h.button([h.OnClick(Message.Resize())], ['resize'])])
    Scene.scene({ update, view }, Scene.given({ size: '2', ticks: 0 }), Scene.click(Scene.role('button', { name: 'tick' })), Scene.click(Scene.role('button', { name: 'resize' })))
    expect(render).toHaveBeenCalledTimes(2)
  })
})

import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Container from '../src/components/container.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Container.view({ size: { initial: '1', md: '3' } }, ['content'], h)
describe('themed Container', () => {
  it('keeps responsive size', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('.rt-Container')).toHaveAttr('class', 'rt-Container rt-r-size-1 md:rt-r-size-3')))
  it('applies responsive layout properties to their upstream element', () => {
    const layoutView = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
      Container.view({ align: 'center', display: 'initial', overflow: 'auto', width: '100%' }, ['layout'], h)
    Scene.scene({ update, view: layoutView }, Scene.given({}),
      Scene.expect(Scene.selector('.rt-Container')).toHaveClass('rt-r-display-flex'),
      Scene.expect(Scene.selector('.rt-Container')).toHaveClass('rt-r-ai-center'),
      Scene.expect(Scene.selector('.rt-Container')).toHaveClass('rt-r-overflow-auto'),
      Scene.expect(Scene.selector('.rt-ContainerInner')).toHaveStyle('--width', '100%'))
  })
})

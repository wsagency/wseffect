import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Badge from '../src/components/badge.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Badge.view({ role: 'status' }, ['Online'], h)
describe('themed Badge', () => it('uses native status content', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('span[role="status"].rt-Badge')).toExist(), Scene.expect(Scene.text('Online')).toExist())))
it('wires every non-default Badge prop to the R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => Badge.view({ role: 'status', size: '2', variant: 'outline', color: 'crimson', highContrast: true, radius: 'full', m: '2' }, ['Online'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Badge')).toHaveAttr('class', 'rt-Badge rt-r-size-2 rt-variant-outline rt-high-contrast rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-Badge')).toHaveAttr('role', 'status'),
  Scene.expect(Scene.selector('.rt-Badge')).toHaveAttr('data-accent-color', 'crimson'),
  Scene.expect(Scene.selector('.rt-Badge')).toHaveAttr('data-radius', 'full'),
))

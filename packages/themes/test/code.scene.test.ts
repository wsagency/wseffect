import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Code from '../src/components/code.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Code.view({}, ['const x = 1'], h)
describe('themed Code', () => it('uses expected native semantic element', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('code.rt-Code')).toExist())))
it('emits the pinned default accent marker for non-ghost Code', () => Scene.scene(
  { update, view: (_model, h) => Code.view({}, ['code'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('code.rt-Code')).toHaveAttr('data-accent-color', ''),
))
it('omits the default accent marker for ghost Code', () => Scene.scene(
  { update, view: (_model, h) => Code.view({ variant: 'ghost' }, ['code'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('code.rt-Code')).not.toHaveAttr('data-accent-color', ''),
))

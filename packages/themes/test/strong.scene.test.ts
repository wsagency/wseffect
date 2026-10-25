import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Strong from '../src/components/strong.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Strong.view({}, ['important'], h)
describe('themed Strong', () => it('uses expected native semantic element', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('strong.rt-Strong')).toExist())))

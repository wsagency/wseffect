import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Blockquote from '../src/components/blockquote.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Blockquote.view({}, ['A quotation'], h)
describe('themed Blockquote', () => it('uses expected native semantic element', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('blockquote.rt-Blockquote')).toExist())))

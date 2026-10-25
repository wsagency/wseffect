import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Quote from '../src/components/quote.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Quote.view({}, ['quoted text'], h)
describe('themed Quote', () => it('uses expected native semantic element', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('q.rt-Quote')).toExist())))

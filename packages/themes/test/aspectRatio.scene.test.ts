import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as AspectRatio from '../src/components/aspect-ratio.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => AspectRatio.view({ ratio: 2 }, ['content'], h)
describe('themed AspectRatio', () => it('applies ratio', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('[data-radix-aspect-ratio-wrapper]')).toExist())))

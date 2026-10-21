import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as IconButton from '../src/components/icon-button.js'
const MessageSchema = defineMessageUnion({ Tick: {} })
type Message = typeof MessageSchema.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => IconButton.view({ 'aria-label': 'Add item', onClick: MessageSchema.Tick() }, [h.svg([h.AriaHidden(true)], [])], h)
describe('themed IconButton', () => it('requires accessible name and keeps button semantics', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.role('button', { name: 'Add item' })).toExist(), Scene.expect(Scene.selector('button.rt-IconButton')).toExist())))

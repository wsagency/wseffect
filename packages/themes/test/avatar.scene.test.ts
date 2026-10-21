import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Avatar from '../src/components/avatar.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Avatar.view({ src: '/avatar.png', alt: 'A person', fallback: 'AP' }, [], h)
describe('themed Avatar', () => it('preserves image alternative semantics', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('img.rt-AvatarImage')).toHaveAttr('alt', 'A person'))))

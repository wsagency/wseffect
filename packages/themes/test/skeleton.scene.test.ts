import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Skeleton from '../src/components/skeleton.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Skeleton.view({}, ['placeholder'], h)
describe('themed Skeleton', () => {
  it('does not create an implicit live region', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[aria-live]')).not.toExist(),
    Scene.expect(Scene.selector('.rt-Skeleton')).toExist()))
})

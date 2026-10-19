import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Card from '../src/components/card.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  Card.view({ size: '2', variant: 'surface' }, ['Card content'], h)

describe('themed Card', () => {
  it('renders the upstream reset and BaseCard surface classes', () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.expect(Scene.selector('.rt-Card')).toHaveAttr('class', 'rt-reset rt-BaseCard rt-Card rt-r-size-2 rt-variant-surface'),
      Scene.expect(Scene.text('Card content')).toExist(),
    )
  })
})

import { Schema } from 'effect'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Box from '../src/components/box.js'
import * as Card from '../src/components/card.js'
import * as Flex from '../src/components/flex.js'
import * as Grid from '../src/components/grid.js'
import * as Heading from '../src/components/heading.js'
import * as Text from '../src/components/text.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = Readonly<{ tick: number }>
const update = (model: Model, _message: Message) => ({ model: { tick: model.tick + 1 } })
const flexView = (_model: Model, h: HtmlBuilder<Message>) => Flex.view({ direction: { initial: 'column', md: 'row' }, gap: '3' }, ['flex'], h)
const gridView = (_model: Model, h: HtmlBuilder<Message>) => Grid.view({ columns: '3' }, ['grid'], h)
const headingView = (_model: Model, h: HtmlBuilder<Message>) => Heading.view({ as: 'h2', size: '6' }, ['Title'], h)
const cardView = (_model: Model, h: HtmlBuilder<Message>) => Card.view({ variant: 'surface' }, ['Card'], h)

describe('layout and typography views', () => {
  it('maps responsive Flex direction and gap classes', () => {
    Scene.scene(
      { update, view: flexView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Flex')).toHaveAttr('class', 'rt-Flex rt-r-fd-column md:rt-r-fd-row rt-r-gap-3'),
    )
  })

  it('maps Grid columns to the Radix grid-template class', () => {
    Scene.scene(
      { update, view: gridView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-r-gtc-3')).toExist(),
    )
  })

  it('renders Heading as the requested semantic level', () => {
    Scene.scene(
      { update, view: headingView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.role('heading', { level: 2 })).toHaveAttr('class', 'rt-Heading rt-r-size-6'),
    )
  })

  it('maps Card variant to a precomputed variant class', () => {
    Scene.scene(
      { update, view: cardView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Card')).toHaveAttr('class', 'rt-Card rt-variant-surface'),
    )
  })

  it('accepts responsive props and rejects unsupported size literals', () => {
    expect(Schema.decodeUnknownSync(Box.Props)({ display: { md: 'block' } })).toBeDefined()
    expect(Schema.decodeUnknownSync(Flex.Props)({ direction: { initial: 'column', md: 'row' }, gap: '3' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Grid.Props)({ columns: '3' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Text.Props)({ as: 'p', size: '4' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Heading.Props)({ as: 'h2', size: '6' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Card.Props)({ variant: 'surface', size: '2' })).toBeDefined()
    expect(() => Schema.decodeUnknownSync(Text.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Heading.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Card.Props)({ size: '99' })).toThrow()
  })

  it('allows callers to memoize all six stateless component views', () => {
    const lazy = createLazy()
    const componentView = vi.fn((_tick: number, builder: HtmlBuilder<Message>) => builder.div([], [
      Box.view({ display: 'block' }, ['box'], builder),
      Flex.view({ direction: 'row' }, ['flex'], builder),
      Grid.view({ columns: '2' }, ['grid'], builder),
      Text.view({ as: 'p', size: '2' }, ['text'], builder),
      Heading.view({ as: 'h3', size: '3' }, ['heading'], builder),
      Card.view({ variant: 'surface' }, ['card'], builder),
    ]))
    const memoized = (_model: Model, h: HtmlBuilder<Message>) => h.div([], [
      lazy(componentView, [0, h]),
      h.button([h.OnClick(Message.Tick())], ['update']),
    ])
    Scene.scene(
      { update, view: memoized },
      Scene.given({ tick: 0 }),
      Scene.click(Scene.role('button')),
      Scene.expect(Scene.selector('.rt-Card')).toExist(),
    )
    expect(componentView).toHaveBeenCalledTimes(1)
  })
})

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

const Message = defineMessageUnion({ Tick: {}, ChangeDisplay: {} })
type Message = typeof Message.Type
type Model = Readonly<{ tick: number; boxDisplay?: 'block' | 'flex' }>
const update = (model: Model, message: Message) => Message.match(message, {
  Tick: () => ({ model: { ...model, tick: model.tick + 1 } }),
  ChangeDisplay: () => ({ model: { ...model, boxDisplay: 'flex' as const } }),
})
const boxView = (_model: Model, h: HtmlBuilder<Message>) => Box.view({ width: '200px', height: '50px', p: '3', mx: { md: '2' } }, ['box'], h)
const flexView = (_model: Model, h: HtmlBuilder<Message>) => Flex.view({ direction: { initial: 'column', md: 'row' }, justify: 'between', gap: '3' }, ['flex'], h)
const gridView = (_model: Model, h: HtmlBuilder<Message>) => Grid.view({ columns: '12', alignContent: 'between', justifyItems: 'center' }, ['grid'], h)
const headingView = (_model: Model, h: HtmlBuilder<Message>) => Heading.view({ as: 'h2', color: 'crimson' }, ['Title'], h)
const cardView = (_model: Model, h: HtmlBuilder<Message>) => Card.view({ variant: 'surface' }, ['Card'], h)

describe('layout and typography views', () => {
  it('maps Box sizing and spacing props to upstream utilities', () => {
    Scene.scene(
      { update, view: boxView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Box')).toHaveAttr('class', 'rt-Box rt-r-w rt-r-h rt-r-p-3 md:rt-r-mx-2'),
      Scene.expect(Scene.selector('.rt-Box')).toHaveStyle('--width', '200px'),
      Scene.expect(Scene.selector('.rt-Box')).toHaveStyle('--height', '50px'),
    )
  })
  it('maps responsive Flex direction and gap classes', () => {
    Scene.scene(
      { update, view: flexView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Flex')).toHaveAttr('class', 'rt-Flex rt-r-fd-column md:rt-r-fd-row rt-r-jc-space-between rt-r-gap-3'),
    )
  })

  it('maps Grid columns to the Radix grid-template class', () => {
    Scene.scene(
      { update, view: gridView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Grid')).toHaveAttr('class', 'rt-Grid rt-r-gtc rt-r-ac-space-between rt-r-ji-center'),
      Scene.expect(Scene.selector('.rt-Grid')).toHaveStyle('--grid-template-columns', 'repeat(12, minmax(0, 1fr))'),
    )
  })

  it('renders Heading as the requested semantic level', () => {
    Scene.scene(
      { update, view: headingView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.role('heading', { level: 2 })).toHaveAttr('class', 'rt-Heading rt-r-size-6'),
      Scene.expect(Scene.role('heading', { level: 2 })).toHaveAttr('data-accent-color', 'crimson'),
    )
  })

  it('maps Card variant to a precomputed variant class', () => {
    Scene.scene(
      { update, view: cardView },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Card')).toHaveAttr('class', 'rt-reset rt-BaseCard rt-Card rt-r-size-1 rt-variant-surface'),
    )
  })

  it('accepts responsive props and rejects unsupported size literals', () => {
    expect(Schema.decodeUnknownSync(Box.Props)({ display: { md: 'block' } })).toBeDefined()
    expect(Schema.decodeUnknownSync(Flex.Props)({ direction: { initial: 'column', md: 'row' }, gap: '3' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Grid.Props)({ columns: '3' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Text.Props)({ as: 'p', size: '4' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Heading.Props)({ as: 'h2', size: '6', color: 'crimson' })).toBeDefined()
    expect(Schema.decodeUnknownSync(Card.Props)({ variant: 'surface', size: '2' })).toBeDefined()
    expect(() => Schema.decodeUnknownSync(Text.Props)({ color: 'not-a-radix-color' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Heading.Props)({ color: 'not-a-radix-color' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Text.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Heading.Props)({ size: '99' })).toThrow()
    expect(() => Schema.decodeUnknownSync(Card.Props)({ size: '99' })).toThrow()
  })

  it('memoizes six component views by primitive props', () => {
    const lazy = createLazy()
    const componentView = vi.fn((
      boxDisplay: 'block' | 'flex',
      direction: 'row',
      columns: '2',
      textSize: '2',
      headingSize: '3',
      cardSize: '1',
      builder: HtmlBuilder<Message>,
    ) => builder.div([], [
      Box.view({ display: boxDisplay }, ['box'], builder),
      Flex.view({ direction }, ['flex'], builder),
      Grid.view({ columns }, ['grid'], builder),
      Text.view({ as: 'p', size: textSize }, ['text'], builder),
      Heading.view({ as: 'h3', size: headingSize }, ['heading'], builder),
      Card.view({ size: cardSize }, ['card'], builder),
    ]))
    const memoized = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
      lazy(componentView, [model.boxDisplay ?? 'block', 'row', '2', '2', '3', '1', h]),
      h.button([h.OnClick(Message.Tick())], ['update']),
      h.button([h.OnClick(Message.ChangeDisplay())], ['change display']),
    ])
    Scene.scene(
      { update, view: memoized },
      Scene.given({ tick: 0 }),
      Scene.expect(Scene.selector('.rt-Box')).toHaveAttr('class', 'rt-Box rt-r-display-block'),
      Scene.click(Scene.role('button', { name: 'update' })),
      Scene.expect(Scene.selector('.rt-Box')).toHaveAttr('class', 'rt-Box rt-r-display-block'),
      Scene.click(Scene.role('button', { name: 'change display' })),
      Scene.expect(Scene.selector('.rt-Box')).toHaveAttr('class', 'rt-Box rt-r-display-flex'),
    )
    expect(componentView).toHaveBeenCalledTimes(2)
  })
})

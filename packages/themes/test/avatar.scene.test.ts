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
it('adds the pinned one-letter fallback class', () => Scene.scene(
  { update, view: (_model, h) => Avatar.view({ fallback: 'A' }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-AvatarFallback')).toHaveClass('rt-one-letter'),
))
it('adds the pinned two-letters fallback class', () => Scene.scene(
  { update, view: (_model, h) => Avatar.view({ fallback: 'AB' }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-AvatarFallback')).toHaveClass('rt-two-letters'),
))
it('renders rich Html fallback content without a letter-count class', () => Scene.scene(
  { update, view: (_model, h) => Avatar.view({ fallback: h.strong([], ['Rich']) }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-AvatarFallback strong')).toExist(),
  Scene.expect(Scene.selector('.rt-AvatarFallback')).not.toHaveClass('rt-one-letter'),
  Scene.expect(Scene.selector('.rt-AvatarFallback')).not.toHaveClass('rt-two-letters'),
))
it('wires non-default Avatar props to the R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => Avatar.view({ fallback: 'AB', size: '4', variant: 'solid', color: 'crimson', highContrast: true, radius: 'full', m: '2', src: '/custom.png', alt: 'Custom avatar' }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-AvatarRoot')).toHaveAttr('class', 'rt-reset rt-AvatarRoot rt-r-size-4 rt-variant-solid rt-high-contrast rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-AvatarRoot')).toHaveAttr('data-accent-color', 'crimson'),
  Scene.expect(Scene.selector('.rt-AvatarRoot')).toHaveAttr('data-radius', 'full'),
  Scene.expect(Scene.selector('.rt-AvatarImage')).toHaveAttr('src', '/custom.png'),
  Scene.expect(Scene.selector('.rt-AvatarImage')).toHaveAttr('alt', 'Custom avatar'),
))

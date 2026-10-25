import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as DataList from '../src/components/data-list.js'
const Messages = defineMessageUnion({ Tick: {} })
type Message = typeof Messages.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => DataList.Root.view({}, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h)
describe('DataList', () => it('renders description list parts', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('dl.rt-DataListRoot')).toExist(), Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveText('Name'), Scene.expect(Scene.selector('dd.rt-DataListValue')).toHaveText('Ada'))))
it('wires non-default DataList.Root props to the R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => DataList.Root.view({ orientation: 'vertical', size: '3', trim: 'both', m: '2' }, ['Name'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveAttr('class', 'rt-reset rt-Text rt-DataListRoot rt-r-orientation-vertical rt-r-size-3 rt-r-trim-both rt-r-m-2'),
))
it('keeps pinned initial defaults when responsive root props omit initial', () => Scene.scene(
  { update, view: (_model, h) => DataList.Root.view({ orientation: { md: 'vertical' }, size: { md: '3' } }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveClass('rt-Text'),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveClass('rt-r-orientation-horizontal'),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveClass('rt-r-size-2'),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveClass('md:rt-r-orientation-vertical'),
  Scene.expect(Scene.selector('.rt-DataListRoot')).toHaveClass('md:rt-r-size-3'),
))
it('supports responsive width constraints on labels', () => Scene.scene(
  { update, view: (_model, h) => DataList.Label.view({ width: { md: '20rem' }, minWidth: '0px', maxWidth: '40rem' }, ['Label'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveClass('md:rt-r-w'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveClass('rt-r-min-w'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveClass('rt-r-max-w'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveStyle('--min-width', '0px'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveStyle('--max-width', '40rem'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveStyle('--width-md', '20rem'),
))
it('wires non-default DataList.Item props to the R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => DataList.Item.view({ align: 'baseline' }, ['Detail'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-DataListItem')).toHaveClass('rt-r-ai-baseline'),
))
it('wires non-default DataList.Label props to the R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => DataList.Root.view({}, [DataList.Label.view({ width: '240px', color: 'crimson', highContrast: true }, ['Name'], h)], h) },
  Scene.given({}),
  Scene.expect(Scene.text('Name')).toExist(),
  Scene.expect(Scene.selector('dt')).toHaveClass('rt-DataListLabel'),
  Scene.expect(Scene.selector('dt')).toHaveClass('rt-r-w'),
  Scene.expect(Scene.selector('dt')).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveStyle('--width', '240px'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveAttr('data-accent-color', 'crimson'),
  Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveClass('rt-high-contrast'),
))
it('keeps DataList.Value structural props empty and applies its semantic class', () => Scene.scene(
  { update, view: (_model, h) => DataList.Root.view({}, [DataList.Value.view({}, ['Ada'], h)], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('dd.rt-DataListValue')).toHaveClass('rt-DataListValue'),
))

import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Table from '../src/components/table.js'
const Messages = defineMessageUnion({ Tick: {} })
type Message = typeof Messages.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Table.Root.view({}, [Table.Header.view({}, [Table.Row.view({}, [Table.ColumnHeaderCell.view({}, ['Name'], h)], h)], h), Table.Body.view({}, [Table.Row.view({}, [Table.RowHeaderCell.view({}, ['Ada'], h), Table.Cell.view({}, ['42'], h)], h)], h)], h)
describe('Table', () => it('renders native table structure', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('table.rt-TableRootTable')).toExist(), Scene.expect(Scene.role('columnheader', { name: 'Name' })).toExist(), Scene.expect(Scene.role('rowheader', { name: 'Ada' })).toExist(), Scene.expect(Scene.role('cell', { name: '42' })).toExist())))
it('wires non-default Table part props to their R2S-equivalent output', () => Scene.scene(
  { update, view: (_model, h) => Table.Root.view({ size: '3', variant: 'surface', layout: 'fixed', m: '2' }, [
    Table.Header.view({}, [Table.Row.view({ align: 'baseline' }, [Table.ColumnHeaderCell.view({ justify: 'end', width: '240px', px: '3' }, ['Name'], h)], h)], h),
    Table.Body.view({}, [Table.Row.view({ align: 'center' }, [
      Table.RowHeaderCell.view({ justify: 'center', width: '180px', px: '2' }, ['Ada'], h),
      Table.Cell.view({ justify: 'end', width: '240px', px: '3' }, ['42'], h),
    ], h)], h),
  ], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-TableRoot')).toHaveClass('rt-TableRoot'),
  Scene.expect(Scene.selector('.rt-TableRoot')).toHaveClass('rt-r-size-3'),
  Scene.expect(Scene.selector('.rt-TableRoot')).toHaveClass('rt-variant-surface'),
  Scene.expect(Scene.selector('.rt-TableRoot')).toHaveClass('rt-r-m-2'),
  Scene.expect(Scene.selector('table.rt-TableRootTable')).toHaveClass('rt-r-tl-fixed'),
  Scene.expect(Scene.selector('.rt-TableHeader')).toHaveClass('rt-TableHeader'),
  Scene.expect(Scene.selector('.rt-TableBody')).toHaveClass('rt-TableBody'),
  Scene.expect(Scene.selector('.rt-TableRow')).toHaveClass('rt-r-va-baseline'),
  Scene.expect(Scene.selector('.rt-TableCell')).toHaveClass('rt-r-ta-right'),
  Scene.expect(Scene.selector('.rt-TableCell')).toHaveClass('rt-r-w'),
  Scene.expect(Scene.selector('.rt-TableCell')).toHaveStyle('--width', '240px'),
  Scene.expect(Scene.selector('.rt-TableCell')).toHaveClass('rt-r-px-3'),
  Scene.expect(Scene.selector('.rt-TableColumnHeaderCell')).toHaveAttr('scope', 'col'),
  Scene.expect(Scene.selector('.rt-TableRowHeaderCell')).toHaveAttr('scope', 'row'),
))

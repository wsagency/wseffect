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

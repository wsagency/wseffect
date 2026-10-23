import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Table from '@wsagency/wseffect-themes/components/table'
import * as DataList from '@wsagency/wseffect-themes/components/data-list'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const exampleRows = [
  { name: 'Ada Lovelace', status: 'Programmer' },
  { name: 'Grace Hopper', status: 'Computer scientist' },
]
const table = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, rows: ReadonlyArray<Record<string, unknown>> = exampleRows, valueHeading = 'Role') => Table.Root.view(props as typeof Table.Root.Props.Type, [
  Table.Header.view({}, [Table.Row.view({}, [Table.ColumnHeaderCell.view({}, ['Name'], h), Table.ColumnHeaderCell.view({}, [valueHeading], h)], h)], h),
  Table.Body.view({}, rows.map(row => Table.Row.view({}, [Table.RowHeaderCell.view({}, [String(row.name ?? '')], h), Table.Cell.view({}, [String(row.status ?? '')], h)], h)), h),
], h)
const list = <M>(h: HtmlBuilder<M>, entries: ReadonlyArray<readonly [string, string]> = [['Name', 'Ada Lovelace'], ['Role', 'Programmer']], props: Record<string, unknown> = {}) => DataList.Root.view(props as typeof DataList.Root.Props.Type, entries.map(([label, value]) => DataList.Item.view({}, [DataList.Label.view({}, [label], h), DataList.Value.view({}, [value], h)], h)), h)
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([], [Heading.view({ as: 'h1' }, ['Data'], h), table(h, { variant: 'ghost' }), list(h, undefined, { orientation: 'vertical', size: '3' })])) })

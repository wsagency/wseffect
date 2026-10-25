import { Schema } from 'effect'
import { Command, Submodel } from '@wsagency/wseffect-foldkit'
import { inertHtml, type Html, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as DataTable from '@wsagency/wseffect-themes/components/data-table'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

const RowSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.Literals(['Active', 'Pending']),
})
type Row = typeof RowSchema.Type

const initialRows: ReadonlyArray<Row> = Array.from({ length: 10_000 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `Record ${String(index + 1).padStart(2, '0')}`,
  status: index % 2 === 0 ? 'Active' : 'Pending',
}))

const getRowId = (row: Row): string => row.id
const nameAccessor = (row: Row): string => row.name
const statusAccessor = (row: Row): string => row.status
let baseColumnsCache: ReadonlyArray<DataTable.Column<Row>> | undefined
const baseColumns = (): ReadonlyArray<DataTable.Column<Row>> => baseColumnsCache ??= [
  { id: 'name', header: inertHtml.span([inertHtml.DataAttribute('perf', 'data-table-sort')], ['Name']), accessor: nameAccessor, isSortable: true, searchText: nameAccessor },
  { id: 'status', header: inertHtml.span([], ['Status']), accessor: statusAccessor, isSortable: true, searchText: statusAccessor },
]

type TableViewInputs = Pick<Model, 'rows' | 'selectedRowIds'> & { caption: Html }
type TableDecorations = TableViewInputs['caption']
const decorationsByBuilder = new WeakMap<object, TableDecorations>()

function tableDecorations<BuilderMessage>(h: HtmlBuilder<BuilderMessage>): TableDecorations {
  const cached = decorationsByBuilder.get(h)
  if (cached) return cached
  const caption = h.span([], [`Records (${initialRows.length} total)`])
  decorationsByBuilder.set(h, caption)
  return caption
}



const tableConfig = (
  model: Pick<Model, 'rows' | 'selectedRowIds'>,
  columns: ReadonlyArray<DataTable.Column<Row>> = baseColumns(),
  caption: Html = null,
  rowHeight = 36,
): DataTable.Config<Row> => ({
  id: 'gallery-data-table',
  rows: model.rows,
  getRowId,
  columns,
  caption,
  selectedRowIds: new Set(model.selectedRowIds),
  isGrid: true,
  rowHeight,
  viewportHeight: 360,
  overscanRows: 4,
})

const tableView = Submodel.defineView<DataTable.Model, DataTable.Message, TableViewInputs>(
  (model, inputs, h) => DataTable.view(
    model,
    tableConfig(inputs, baseColumns(), inputs.caption),
    h,
  ),
)

const FocusedCell = Schema.NullOr(Schema.Struct({ rowId: Schema.String, columnId: Schema.String }))
export const Model = Schema.Struct({
  rows: Schema.Array(RowSchema),
  table: DataTable.Model,
  selectedRowIds: Schema.Array(Schema.String),
  focusedCell: FocusedCell,
})
export const Message = defineMessageUnion({
  UpdateCell: {},
  TableEvent: { message: DataTable.Message },
})
type Model = typeof Model.Type
type Message = typeof Message.Type
function applyTableMessage(model: Model, tableMessage: DataTable.Message, rows = model.rows) {
  const result = DataTable.update(
    model.table,
    tableConfig({ rows, selectedRowIds: model.selectedRowIds }, baseColumns()),
    tableMessage,
  )
  const selectedRowIds = result.outMessage?._tag === 'SelectionChanged'
    ? result.outMessage.ids
    : model.selectedRowIds
  const focusedCell = result.model.activeCell
  return {
    model: { ...model, rows, table: result.model, selectedRowIds, focusedCell },
    commands: result.commands?.map(command => Command.mapMessage(command, childMessage => Message.TableEvent({ message: childMessage }))) ?? [],
  }
}



export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => {
    const model = { rows: initialRows, selectedRowIds: [] as ReadonlyArray<string> }
    const table = DataTable.init(tableConfig(model))
    return { model: { ...model, table, focusedCell: table.activeCell } }
  },
  update: (model: Model, message: Message) => Message.match(message, {
    UpdateCell: () => {
      const first = model.rows[0]
      if (first === undefined) return { model }
      const name = first.name.endsWith('*') ? first.name.slice(0, -1) : `${first.name}*`
      const rows = [{ ...first, name }, ...model.rows.slice(1)]
      return applyTableMessage(model, DataTable.Message.RowsChanged(), rows)
    },
    TableEvent: ({ message: tableMessage }) => applyTableMessage(model, tableMessage),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => {
    const caption = tableDecorations(h)
    return h.div([], [
      Heading.view({ as: 'h1' }, ['Data table'], h),
      h.p([], ['A virtualized, filterable 10,000-record table with stable row identities and keyboard grid navigation.']),
      h.button([
        h.Type('button'),
        h.DataAttribute('perf', 'data-table-update'),
        h.OnClick(Message.UpdateCell()),
      ], ['Update first cell']),
      h.label([], [
        h.span([], ['Filter rows']),
        h.input([
          h.Type('search'),
          h.Id('data-table-filter'),
          h.DataAttribute('perf', 'data-table-filter'),
          h.AriaLabel('Filter rows'),
          h.Value(model.table.filter),
          h.OnInput(value => Message.TableEvent({ message: DataTable.Message.FilterChanged({ value }) })),
        ]),
      ]),
      h.output([h.Id('data-table-row-count')], [`${model.table.orderedRowIds.length} rows shown`]),
      h.div([h.DataAttribute('perf', 'data-table-select')], [h.submodel({
        slotId: 'data-table',
        model: model.table,
        view: tableView,
        viewInputs: { rows: model.rows, selectedRowIds: model.selectedRowIds, caption },
        toParentMessage: childMessage => Message.TableEvent({ message: childMessage }),
      })]),
      h.output([h.Id('data-table-selection')], [`${model.selectedRowIds.length} rows selected`]),
      h.output([h.Id('data-table-active-cell')], [model.focusedCell
        ? `Focused ${model.focusedCell.rowId} / ${model.focusedCell.columnId}`
        : 'No active grid cell']),
    ])
  }),
})

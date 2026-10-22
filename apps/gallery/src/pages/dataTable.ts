import '@wsagency/wseffect-themes/css/data-table.css'
import { Schema } from 'effect'
import { Command, Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as DataTable from '@wsagency/wseffect-themes/components/data-table'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
import type { CaptureRequest } from '../capture.js'

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
const baseColumns: ReadonlyArray<DataTable.Column<Row>> = [
  { id: 'name', header: null, accessor: nameAccessor, isSortable: true, searchText: nameAccessor },
  { id: 'status', header: null, accessor: statusAccessor, isSortable: true, searchText: statusAccessor },
]

type TableViewInputs = Pick<Model, 'rows' | 'selectedRowIds'> & {
  nameHeader: Html
  statusHeader: Html
  caption: Html
}
type TableDecorations = Pick<TableViewInputs, 'nameHeader' | 'statusHeader' | 'caption'>
const decorationsByBuilder = new WeakMap<object, TableDecorations>()
const columnsByNameHeader = new WeakMap<object, WeakMap<object, ReadonlyArray<DataTable.Column<Row>>>>()
const columnsByModel = new WeakMap<object, ReadonlyArray<DataTable.Column<Row>>>()

function tableDecorations(h: HtmlBuilder<Message>): TableDecorations {
  const cached = decorationsByBuilder.get(h)
  if (cached) return cached
  const decorations = {
    nameHeader: h.span([], ['Name']),
    statusHeader: h.span([], ['Status']),
    caption: h.span([], [`Records (${initialRows.length} total)`]),
  }
  decorationsByBuilder.set(h, decorations)
  return decorations
}

function tableColumns(nameHeader: Html, statusHeader: Html): ReadonlyArray<DataTable.Column<Row>> {
  if (nameHeader === null || statusHeader === null) return baseColumns
  let byStatusHeader = columnsByNameHeader.get(nameHeader)
  if (!byStatusHeader) {
    byStatusHeader = new WeakMap()
    columnsByNameHeader.set(nameHeader, byStatusHeader)
  }
  const cached = byStatusHeader.get(statusHeader)
  if (cached) return cached
  const columns: ReadonlyArray<DataTable.Column<Row>> = [
    { id: 'name', header: nameHeader, accessor: nameAccessor, isSortable: true, searchText: nameAccessor },
    { id: 'status', header: statusHeader, accessor: statusAccessor, isSortable: true, searchText: statusAccessor },
  ]
  byStatusHeader.set(statusHeader, columns)
  return columns
}

const tableConfig = (
  model: Pick<Model, 'rows' | 'selectedRowIds'>,
  columns: ReadonlyArray<DataTable.Column<Row>> = baseColumns,
  caption: Html = null,
): DataTable.Config<Row> => ({
  id: 'gallery-data-table',
  rows: model.rows,
  getRowId,
  columns,
  caption,
  selectedRowIds: new Set(model.selectedRowIds),
  isGrid: true,
  rowHeight: 36,
  overscanRows: 4,
})

const tableView = Submodel.defineView<DataTable.Model, DataTable.Message, TableViewInputs>(
  (model, inputs, h) => DataTable.view(
    model,
    tableConfig(inputs, tableColumns(inputs.nameHeader, inputs.statusHeader), inputs.caption),
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
  TableEvent: { message: DataTable.Message },
})
type Model = typeof Model.Type
type Message = typeof Message.Type


export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => {
    const model = { rows: initialRows, selectedRowIds: [] as ReadonlyArray<string> }
    const table = DataTable.init(tableConfig(model))
    return { model: { ...model, table, focusedCell: table.activeCell } }
  },
  update: (model: Model, message: Message) => Message.match(message, {
    TableEvent: ({ message: tableMessage }) => {
      const result = DataTable.update(model.table, tableConfig(model, columnsByModel.get(model) ?? baseColumns), tableMessage)
      let selectedRowIds = model.selectedRowIds
      let focusedCell = model.focusedCell
      if (result.outMessage?._tag === 'SelectionChanged') selectedRowIds = result.outMessage.ids
      if (result.outMessage?._tag === 'FocusCell') focusedCell = result.outMessage
      return {
        model: { ...model, table: result.model, selectedRowIds, focusedCell },
        commands: result.commands?.map(command => Command.mapMessage(command, childMessage => Message.TableEvent({ message: childMessage }))) ?? [],
      }
    },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => {
    const decorations = tableDecorations(h)
    const columns = tableColumns(decorations.nameHeader, decorations.statusHeader)
    columnsByModel.set(model, columns)
    return h.div([], [
      Heading.view({ as: 'h1' }, ['Data table'], h),
      h.p([], ['A virtualized, filterable 10,000-record table with stable row identities and keyboard grid navigation.']),
      h.label([], [
        h.span([], ['Filter rows']),
        h.input([
          h.Type('search'),
          h.Id('data-table-filter'),
          h.AriaLabel('Filter rows'),
          h.Value(model.table.filter),
          h.OnInput(value => Message.TableEvent({ message: DataTable.Message.FilterChanged({ value }) })),
        ]),
      ]),
      h.output([h.Id('data-table-row-count')], [`${model.table.orderedRowIds.length} rows shown`]),
      h.submodel({
        slotId: 'data-table',
        model: model.table,
        view: tableView,
        viewInputs: { rows: model.rows, selectedRowIds: model.selectedRowIds, ...decorations },
        toParentMessage: childMessage => Message.TableEvent({ message: childMessage }),
      }),
      h.output([h.Id('data-table-selection')], [`${model.selectedRowIds.length} rows selected`]),
      h.output([h.Id('data-table-active-cell')], [model.focusedCell
        ? `Focused ${model.focusedCell.rowId} / ${model.focusedCell.columnId}`
        : 'No active grid cell']),
    ])
  }),
})

function captureRows(request: CaptureRequest): ReadonlyArray<Row> {
  if (request.component !== 'DataTable' || request.fixtureId !== 'sp2-data-table' || request.visualReference !== 'Table') {
    throw new Error('DataTable capture requires the sp2-data-table fixture and Table visual reference')
  }
  if (request.fixture === null || typeof request.props.rows !== 'number' || request.fixture.length !== request.props.rows) {
    throw new Error('DataTable capture fixture does not match the requested row count')
  }
  return request.fixture.map(row => {
    const { id, name, status } = row
    if (typeof id !== 'string' || typeof name !== 'string' || (status !== 'Active' && status !== 'Pending')) {
      throw new Error('DataTable capture fixture contains an invalid row')
    }
    return { id, name, status }
  })
}

function captureCell(tag: 'td' | 'th', text: string): HTMLTableCellElement {
  const cell = document.createElement(tag)
  cell.textContent = text
  return cell
}

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  const rows = captureRows(request)
  const theme = document.createElement('div')
  theme.className = `radix-themes ${request.theme}`
  theme.dataset.isRootTheme = 'true'
  theme.dataset.accentColor = 'indigo'
  theme.dataset.grayColor = 'slate'
  theme.dataset.radius = 'medium'
  theme.dataset.scaling = '100%'
  theme.dataset.hasBackground = 'true'
  theme.dataset.panelBackground = 'translucent'
  const portal = document.createElement('div')
  portal.id = 'foldkit-portal-root'
  theme.append(portal)

  const scroll = document.createElement('div')
  scroll.className = 'wse-data-table__scroll'
  scroll.style.overflow = 'auto'
  scroll.style.maxHeight = '360px'
  const table = document.createElement('table')
  table.className = 'wse-data-table'
  table.dataset.size = String(request.props.size)
  table.dataset.variant = String(request.props.variant)
  const head = document.createElement('thead')
  const headerRow = document.createElement('tr')
  const selectionHeader = document.createElement('th')
  const selectAll = document.createElement('input')
  selectAll.type = 'checkbox'
  selectAll.setAttribute('aria-label', 'Select all visible rows')
  selectAll.tabIndex = -1
  selectionHeader.append(selectAll)
  headerRow.append(selectionHeader, captureCell('th', 'Name'), captureCell('th', 'Status'))
  head.append(headerRow)
  const body = document.createElement('tbody')
  const appendSpacer = (position: 'top' | 'bottom') => {
    const spacer = document.createElement('tr')
    spacer.setAttribute('aria-hidden', 'true')
    spacer.dataset.virtualListSpacer = position
    const cell = document.createElement('td')
    cell.colSpan = 3
    cell.style.height = '0px'
    cell.style.padding = '0'
    cell.style.border = '0'
    spacer.append(cell)
    body.append(spacer)
  }
  appendSpacer('top')
  rows.forEach((row, index) => {
    const tr = document.createElement('tr')
    tr.dataset.virtualListItemKey = row.id
    tr.dataset.virtualListItemIndex = String(index)
    tr.style.height = '36px'
    const selectionCell = document.createElement('td')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.setAttribute('aria-label', `Select row ${row.id}`)
    selectionCell.append(checkbox)
    tr.append(selectionCell, captureCell('td', row.name), captureCell('td', row.status))
    body.append(tr)
  })
  appendSpacer('bottom')
  table.append(head, body)
  scroll.append(table)
  theme.append(scroll)
  root.replaceChildren(theme)
}

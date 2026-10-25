import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as DataTable from '@wsagency/wseffect-themes/components/data-table'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const RowSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.Literals(['Active', 'Pending']),
})
type Row = typeof RowSchema.Type

const getRowId = (row: Row): string => row.id
const nameAccessor = (row: Row): string => row.name
const statusAccessor = (row: Row): string => row.status
const baseColumns: ReadonlyArray<DataTable.Column<Row>> = [
  { id: 'name', header: null, accessor: nameAccessor, isSortable: true, searchText: nameAccessor },
  { id: 'status', header: null, accessor: statusAccessor, isSortable: true, searchText: statusAccessor },
]
type TableDecorations = { nameHeader: Html; statusHeader: Html; caption: Html }
const decorationsByBuilder = new WeakMap<object, TableDecorations>()
const columnsByNameHeader = new WeakMap<object, WeakMap<object, ReadonlyArray<DataTable.Column<Row>>>>()

function tableDecorations<BuilderMessage>(h: HtmlBuilder<BuilderMessage>): TableDecorations {
  const cached = decorationsByBuilder.get(h)
  if (cached) return cached
  const decorations = {
    nameHeader: h.span([h.DataAttribute('perf', 'data-table-sort')], ['Name']),
    statusHeader: h.span([], ['Status']),
    caption: h.span([], [`Records (10000 total)`]),
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

export async function renderCapture(root: HTMLElement, request: CaptureRequest): Promise<void> {
  const rows = captureRows(request)
  const rowHeight = request.props.rowHeight
  const viewportHeight = request.props.viewportHeight
  const size = request.props.size
  const variant = request.props.variant
  if (typeof rowHeight !== 'number' || typeof viewportHeight !== 'number') {
    throw new Error('DataTable capture requires matching rowHeight and viewportHeight props')
  }
  if ((size !== '1' && size !== '2' && size !== '3') || (variant !== 'surface' && variant !== 'ghost')) {
    throw new Error('DataTable capture requires matching Table size and variant props')
  }
  await renderCaptureView(root, request, (h) => {
    const tableBuilder = h as unknown as HtmlBuilder<DataTable.Message>
    const decorations = tableDecorations(tableBuilder)
    const modelInputs = { rows, selectedRowIds: [] as ReadonlyArray<string> }
    const captureColumns = tableColumns(decorations.nameHeader, decorations.statusHeader).map(column => ({
      ...column,
      isSortable: false,
    }))
    const config: DataTable.Config<Row> = {
      id: 'gallery-data-table',
      rows: modelInputs.rows,
      getRowId,
      columns: captureColumns,
      caption: null,
      selectedRowIds: new Set(modelInputs.selectedRowIds),
      isGrid: false,
      rowHeight,
      overscanRows: 4,
      showSelection: false,
      tableStyle: { size, variant },
    }
    return DataTable.view(DataTable.init(config), config, tableBuilder)
  })
  const scroll = root.querySelector<HTMLElement>('.wse-data-table__scroll')
  if (!scroll) throw new Error('DataTable capture scroll viewport is missing')
  scroll.style.height = `${viewportHeight}px`
  scroll.style.maxHeight = `${viewportHeight}px`
}

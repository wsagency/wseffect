import { Option, Schema } from 'effect'
import * as VirtualList from '@foldkit/ui/virtualList'
import { Command, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { createLazy } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { brandViewResult } from 'foldkit/brand'
import type { Column, Config } from './data-table.props.js'
import { makeDataTableMounts } from './data-table.mount.js'
 
export type { Column, Config } from './data-table.props.js'
 
const Sort = Schema.NullOr(Schema.Struct({
  columnId: Schema.String,
  direction: Schema.Literals(['ascending', 'descending']),
}))
const ActiveCell = Schema.NullOr(Schema.Struct({ rowId: Schema.String, columnId: Schema.String }))
export const Model = Schema.Struct({
  filter: Schema.String,
  sort: Sort,
  orderedRowIds: Schema.Array(Schema.String),
  activeCell: ActiveCell,
  virtualList: VirtualList.Model,
})
export type Model = typeof Model.Type
 
export const Message = defineMessageUnion({
  RowsChanged: {},
  FilterChanged: { value: Schema.String },
  SortChanged: { columnId: Schema.String },
  ToggleRow: { rowId: Schema.String },
  SelectVisible: { selected: Schema.Boolean },
  ActiveCellChanged: { rowId: Schema.String, columnId: Schema.String },
  GridKey: { key: Schema.String, ctrlKey: Schema.Boolean },
  VirtualList: { message: VirtualList.Message },
})
export type Message = typeof Message.Type
 
export const OutMessage = defineMessageUnion({
  SelectionChanged: { ids: Schema.Array(Schema.String) },
  FocusCell: { rowId: Schema.String, columnId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
 
const tableStates = new Map<string, TableState<unknown>>()
const { observeDataTable, scrollToRow, focusHeaderCell } = makeDataTableMounts(Message, tableStates)
const FIXED_VIEWPORT_HEIGHT = 360
const selectionColumnId = '$selection'
const gridHeaderRowId = '$header'
const sortValueCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
type RowCacheEntry = ReturnType<typeof createLazy>
type TableState<Row> = {
  rows: ReadonlyArray<Row>
  columns: ReadonlyArray<Column<Row>>
  visibleColumns: ReadonlyArray<Column<Row>>
  rowById: Map<string, Row>
  sourceOrdinalById: Map<string, number>
  searchKeyById: Map<string, string>
  sortValuesById: Map<string, ReadonlyArray<string>>
  sortColumnIndexById: Map<string, number>
  rowViews: Map<string, RowCacheEntry>
}

function buildTableState<Row>(
  config: Config<Row>,
  rowViews: Map<string, RowCacheEntry> = new Map(),
  visibleColumnsCache?: ReadonlyArray<Column<Row>>,
): TableState<Row> {
  const rowById = new Map<string, Row>()
  const sourceOrdinalById = new Map<string, number>()
  const searchKeyById = new Map<string, string>()
  const sortValuesById = new Map<string, ReadonlyArray<string>>()
  const sortColumnIndexById = new Map<string, number>()
  for (let columnIndex = 0; columnIndex < config.columns.length; columnIndex++) {
    sortColumnIndexById.set(config.columns[columnIndex]!.id, columnIndex)
  }
  for (let index = 0; index < config.rows.length; index++) {
    const row = config.rows[index]!
    const rowId = config.getRowId(row)
    rowById.set(rowId, row)
    sourceOrdinalById.set(rowId, index)
    const values: string[] = []
    let searchable = ''
    for (const column of config.columns) {
      const value = column.accessor(row)
      values.push(value)
      searchable += `${(column.searchText?.(row) ?? value).toLocaleLowerCase()}\u0000`
    }
    sortValuesById.set(rowId, values)
    searchKeyById.set(rowId, searchable)
  }
  return { rows: config.rows, columns: config.columns, visibleColumns: visibleColumnsCache ?? visibleColumns(config.columns), rowById, sourceOrdinalById, searchKeyById, sortValuesById, sortColumnIndexById, rowViews }
}

function stateFor<Row>(config: Config<Row>): TableState<Row> {
  const existing = tableStates.get(config.id) as TableState<Row> | undefined
  if (existing && existing.rows === config.rows && existing.columns === config.columns) return existing
  const next = buildTableState(config)
  tableStates.set(config.id, next as TableState<unknown>)
  return next
}

function computeOrder<Row>(config: Config<Row>, state: TableState<Row>, filter: string, sort: Model['sort']): ReadonlyArray<string> {
  const ids: string[] = []
  const needle = filter.toLocaleLowerCase()
  for (let index = 0; index < config.rows.length; index++) {
    const rowId = config.getRowId(config.rows[index]!)
    if ((state.searchKeyById.get(rowId) ?? '').includes(needle)) ids.push(rowId)
  }
  if (sort === null) return ids
  const columnIndex = state.sortColumnIndexById.get(sort.columnId)
  if (columnIndex === undefined) return ids
  ids.sort((leftId, rightId) => {
    const left = state.sortValuesById.get(leftId)?.[columnIndex] ?? ''
    const right = state.sortValuesById.get(rightId)?.[columnIndex] ?? ''
    const comparison = sortValueCollator.compare(left, right)
    return (sort.direction === 'ascending' ? comparison : -comparison) || state.sourceOrdinalById.get(leftId)! - state.sourceOrdinalById.get(rightId)!
  })
  return ids
}

function mapChildCommands(commands: Update.Commands<VirtualList.Message> | undefined): Update.Commands<Message> | undefined {
  return commands?.map(command => Command.mapMessage(command, childMessage => Message.VirtualList({ message: childMessage })))
}

function informRowsChanged(model: Model, ids: ReadonlyArray<string>, reset: boolean, rowHeight: number) {
  const informed = VirtualList.informItemsChanged(model.virtualList, ids)
  if (!reset && !informed.commands?.length) return informed
  const next = reset ? VirtualList.scrollToIndex(informed.model, 0) : informed
  const viewportHeight = next.model.measurement._tag === 'Measured'
    ? next.model.measurement.containerHeight
    : FIXED_VIEWPORT_HEIGHT
  const nextModel = { ...model, orderedRowIds: ids, virtualList: next.model }
  const scrollTop = reset ? 0 : effectiveScrollTop(nextModel, rowHeight, viewportHeight)
  const rowIndex = ids.length === 0 ? 0 : Math.min(Math.floor(scrollTop / rowHeight), ids.length - 1)
  return {
    model: next.model,
    commands: [scrollToRow({
      containerId: model.virtualList.id,
      rowIndex,
      rowHeight,
      rowId: ids[rowIndex] ?? null,
      scrollTop,
      columnIndex: 0,
      shouldFocus: false,
    })],
  }
}

function invokeTableScroll(
  model: VirtualList.Model,
  rowId: string,
  rowIndex: number,
  rowHeight: number,
  columnIndex: number,
  shouldFocus: boolean,
): Update.Return<VirtualList.Model, VirtualList.Message> {
  const result = VirtualList.scrollToKey(model, rowId)
  return {
    model: result.model,
    commands: [scrollToRow({
      containerId: model.id,
      rowIndex,
      rowHeight,
      rowId,
      scrollTop: rowIndex * rowHeight,
      columnIndex,
      shouldFocus,
    })],
  }
}

export function init<Row>(config: Config<Row>): Model {
  const state = buildTableState(config)
  tableStates.set(config.id, state as TableState<unknown>)
  return {
    filter: '',
    sort: null,
    orderedRowIds: computeOrder(config, state, '', null),
    activeCell: config.isGrid && config.rows.length > 0 && config.columns.length > 0
      ? { rowId: config.getRowId(config.rows[0]!), columnId: selectionColumnId }
      : null,
    virtualList: VirtualList.init({ id: `${config.id}-virtual-list`, rowHeightPx: config.rowHeight }),
  }
}

export function update<Row>(model: Model, config: Config<Row>, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage> {
  return Message.match(message, {
    RowsChanged: () => {
      const previous = tableStates.get(config.id) as TableState<Row> | undefined
      const state = buildTableState(
        config,
        previous?.rowViews,
        previous?.columns === config.columns ? previous.visibleColumns : undefined,
      )
      for (const rowId of state.rowViews.keys()) {
        if (!state.rowById.has(rowId)) state.rowViews.delete(rowId)
      }
      tableStates.set(config.id, state as TableState<unknown>)
      const orderedRowIds = computeOrder(config, state, model.filter, model.sort)
      const list = informRowsChanged(model, orderedRowIds, false, config.rowHeight)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      return {
        model: { ...model, orderedRowIds, activeCell, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: focusOutMessage(model, activeCell, config.isGrid),
      }
    },
    FilterChanged: ({ value }) => {
      const state = stateFor(config)
      const orderedRowIds = computeOrder(config, state, value, model.sort)
      const list = informRowsChanged(model, orderedRowIds, true, config.rowHeight)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      return {
        model: { ...model, filter: value, orderedRowIds, activeCell, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: focusOutMessage(model, activeCell, config.isGrid),
      }
    },
    SortChanged: ({ columnId }) => {
      const column = config.columns.find(candidate => candidate.id === columnId)
      if (!column?.isSortable) return { model }
      const direction: 'ascending' | 'descending' = model.sort?.columnId === columnId && model.sort.direction === 'ascending' ? 'descending' : 'ascending'
      const sort = { columnId, direction }
      const state = stateFor(config)
      const orderedRowIds = computeOrder(config, state, model.filter, sort)
      const list = informRowsChanged(model, orderedRowIds, false, config.rowHeight)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      return {
        model: { ...model, sort, orderedRowIds, activeCell, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: focusOutMessage(model, activeCell, config.isGrid),
      }
    },
    ToggleRow: ({ rowId }) => {
      const selected = new Set(config.selectedRowIds)
      if (selected.has(rowId)) selected.delete(rowId)
      else selected.add(rowId)
      return { model, outMessage: OutMessage.SelectionChanged({ ids: [...selected] }) }
    },
    SelectVisible: ({ selected }) => {
      const selectedIds = new Set(config.selectedRowIds)
      for (const rowId of model.orderedRowIds) {
        if (selected) selectedIds.add(rowId)
        else selectedIds.delete(rowId)
      }
      return { model, outMessage: OutMessage.SelectionChanged({ ids: [...selectedIds] }) }
    },
    ActiveCellChanged: ({ rowId, columnId }) => {
      if (!config.isGrid) return { model }
      if (model.activeCell?.rowId === rowId && model.activeCell.columnId === columnId) return { model }
      const columns = [selectionColumnId, ...visibleColumns(config.columns).map(column => column.id)]
      const isHeader = rowId === gridHeaderRowId
      const rowIndex = isHeader ? -1 : model.orderedRowIds.indexOf(rowId)
      const columnIndex = columns.indexOf(columnId)
      if ((!isHeader && rowIndex < 0) || columnIndex < 0) return { model }
      const activeCell = { rowId, columnId }
      const list = isHeader
        ? { model: model.virtualList, commands: undefined }
        : invokeTableScroll(model.virtualList, rowId, rowIndex, config.rowHeight, columnIndex, false)
      return {
        model: { ...model, activeCell, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: OutMessage.FocusCell(activeCell),
      }
    },
    GridKey: ({ key, ctrlKey }) => handleGridKey(model, config, key, ctrlKey),
    VirtualList: ({ message: childMessage }) => {
      const result = VirtualList.update(model.virtualList, childMessage)
      return {
        model: { ...model, virtualList: result.model },
        commands: mapChildCommands(result.commands),
      }
    },
  })
}

function visibleColumns<Row>(columns: ReadonlyArray<Column<Row>>): ReadonlyArray<Column<Row>> {
  return columns.filter(column => column.isVisible !== false)
}

function recoverActiveCell<Row>(model: Model, config: Config<Row>, ids: ReadonlyArray<string>) {
  if (!config.isGrid || model.activeCell === null) return model.activeCell
  const columns = [selectionColumnId, ...visibleColumns(config.columns).map(column => column.id)]
  if (model.activeCell.rowId === gridHeaderRowId) {
    const columnId = columns.includes(model.activeCell.columnId) ? model.activeCell.columnId : selectionColumnId
    return columnId === model.activeCell.columnId ? model.activeCell : { rowId: gridHeaderRowId, columnId }
  }
  const previousRowOrdinal = model.orderedRowIds.indexOf(model.activeCell.rowId)
  const rowId = ids.includes(model.activeCell.rowId)
    ? model.activeCell.rowId
    : ids[Math.min(Math.max(previousRowOrdinal, 0), ids.length - 1)]
  if (rowId === undefined) return null
  const previousColumnOrdinal = columns.indexOf(model.activeCell.columnId)
  const columnId = columns.includes(model.activeCell.columnId)
    ? model.activeCell.columnId
    : columns[Math.min(Math.max(previousColumnOrdinal, 0), columns.length - 1)]!
  if (rowId === model.activeCell.rowId && columnId === model.activeCell.columnId) return model.activeCell
  return { rowId, columnId }
}

function focusOutMessage(model: Model, activeCell: Model['activeCell'], isGrid: boolean) {
  if (!isGrid || activeCell === null || (model.activeCell?.rowId === activeCell.rowId && model.activeCell.columnId === activeCell.columnId)) return undefined
  return OutMessage.FocusCell(activeCell)
}

function handleGridKey<Row>(model: Model, config: Config<Row>, key: string, ctrlKey: boolean): Update.ReturnWithOutMessage<Model, Message, OutMessage> {
  if (!config.isGrid || model.activeCell === null || key === 'Tab') return { model }
  const visible = visibleColumns(config.columns)
  const columns = [selectionColumnId, ...visible.map(column => column.id)]
  const isHeader = model.activeCell.rowId === gridHeaderRowId
  const rowOrdinal = isHeader ? 0 : model.orderedRowIds.indexOf(model.activeCell.rowId) + 1
  const columnOrdinal = columns.indexOf(model.activeCell.columnId)
  if (rowOrdinal < (isHeader ? 0 : 1) || columnOrdinal < 0) return { model }
  if (isHeader && (key === 'Enter' || key === ' ')) {
    const column = visible.find(candidate => candidate.id === model.activeCell!.columnId)
    return column?.isSortable
      ? update(model, config, Message.SortChanged({ columnId: column.id }))
      : { model }
  }
  let nextRow = rowOrdinal
  let nextColumn = columnOrdinal
  if (key === 'ArrowUp') nextRow = Math.max(0, rowOrdinal - 1)
  else if (key === 'ArrowDown') nextRow = Math.min(model.orderedRowIds.length, rowOrdinal + 1)
  else if (key === 'ArrowLeft') nextColumn = Math.max(0, columnOrdinal - 1)
  else if (key === 'ArrowRight') nextColumn = Math.min(columns.length - 1, columnOrdinal + 1)
  else if (key === 'Home') nextColumn = 0
  else if (key === 'End') nextColumn = columns.length - 1
  else if (key === ' ') {
    if (model.activeCell.columnId !== selectionColumnId) return { model }
    const selected = new Set(config.selectedRowIds)
    const rowId = model.activeCell.rowId
    if (selected.has(rowId)) selected.delete(rowId)
    else selected.add(rowId)
    return { model, outMessage: OutMessage.SelectionChanged({ ids: [...selected] }) }
  } else return { model }
  if (ctrlKey && key === 'Home') {
    nextRow = 0
    nextColumn = 0
  } else if (ctrlKey && key === 'End') {
    nextRow = model.orderedRowIds.length
    nextColumn = columns.length - 1
  }
  const rowId = nextRow === 0 ? gridHeaderRowId : model.orderedRowIds[nextRow - 1]
  const columnId = columns[nextColumn]
  if (rowId === undefined || columnId === undefined) return { model }
  const activeCell = { rowId, columnId }
  if (rowId === gridHeaderRowId) return {
    model: { ...model, activeCell },
    commands: mapChildCommands([focusHeaderCell({ containerId: model.virtualList.id, columnIndex: nextColumn })]),
    outMessage: OutMessage.FocusCell(activeCell),
  }
  const rowIndex = nextRow - 1
  const list = invokeTableScroll(model.virtualList, rowId, rowIndex, config.rowHeight, nextColumn, true)
  return {
    model: { ...model, activeCell, virtualList: list.model },
    commands: mapChildCommands(list.commands),
    outMessage: OutMessage.FocusCell(activeCell),
  }
}

function cellContent<Row>(row: Row, column: Column<Row>): Html | string {
  return column.render ? column.render(row) : column.accessor(row)
}

function rowVNode<Row>(
  rowId: string,
  row: Row,
  columns: ReadonlyArray<Column<Row>>,
  selected: boolean,
  rowIndex: number,
  rowHeight: number,
  grid: boolean,
  activeCell: Model['activeCell'],
  h: HtmlBuilder<Message>,
): Html {
  const activeColumnId = activeCell?.rowId === rowId ? activeCell.columnId : null
  const rowAttributes = [
    ...(grid ? [h.Role('row'), h.AriaRowindex(rowIndex + 2)] : []),
    h.DataAttribute('virtual-list-item-key', rowId),
    h.DataAttribute('virtual-list-item-index', String(rowIndex)),
    h.Style({ height: `${rowHeight}px` }),
  ]
  const cells = columns.map((column, index) => {
    const attributes = grid ? [
      h.Role('gridcell'),
      h.AriaColindex(index + 2),
      h.Tabindex(activeColumnId === column.id ? 0 : -1),
      h.Autofocus(activeColumnId === column.id),
      h.OnFocus(Message.ActiveCellChanged({ rowId, columnId: column.id })),
    ] : []
    return h.td(attributes, [cellContent(row, column)])
  })
  const selectionCell = h.td(grid ? [
    h.Role('gridcell'),
    h.AriaColindex(1),
    h.Tabindex(activeColumnId === selectionColumnId ? 0 : -1),
    h.OnFocus(Message.ActiveCellChanged({ rowId, columnId: selectionColumnId })),
  ] : [], [h.input([
    h.Type('checkbox'),
    h.AriaLabel(`Select row ${rowId}`),
    h.Checked(selected),
    ...(grid ? [h.Tabindex(-1)] : []),
    h.OnClick(Message.ToggleRow({ rowId })),
  ])])
  return h.tr(rowAttributes, [selectionCell, ...cells])
}

function rowRenderer<Row>(
  rowId: string,
  row: Row,
  columns: ReadonlyArray<Column<Row>>,
  selected: boolean,
  rowIndex: number,
  rowHeight: number,
  grid: boolean,
  activeCell: Model['activeCell'],
  h: HtmlBuilder<Message>,
): Html {
  return rowVNode(rowId, row, columns, selected, rowIndex, rowHeight, grid, activeCell, h)
}

function rangeFor(model: Model, config: Config<unknown>): Readonly<{ start: number; end: number; top: number; bottom: number }> {
  const rowHeight = config.rowHeight
  const viewportHeight = model.virtualList.measurement._tag === 'Measured'
    ? model.virtualList.measurement.containerHeight
    : FIXED_VIEWPORT_HEIGHT
  const scrollTop = effectiveScrollTop(model, rowHeight, viewportHeight)
  const firstVisible = Math.floor(scrollTop / rowHeight)
  const lastVisible = Math.ceil((scrollTop + viewportHeight) / rowHeight)
  const start = Math.max(0, firstVisible - config.overscanRows)
  const end = Math.min(model.orderedRowIds.length, lastVisible + config.overscanRows)
  return {
    start,
    end,
    top: start * rowHeight,
    bottom: Math.max(0, (model.orderedRowIds.length - end) * rowHeight),
  }
}

function effectiveScrollTop(model: Model, rowHeight: number, viewportHeight: number): number {
  const pending = model.virtualList.pendingScroll
  if (pending._tag !== 'Pending') return model.virtualList.scrollTop
  if (pending.request._tag === 'Target') {
    const target = pending.request.target
    if (target._tag === 'Index') return target.index * rowHeight
    if (target._tag === 'Key') return Math.max(0, model.orderedRowIds.indexOf(target.key)) * rowHeight
    if (target._tag === 'Offset') return target.offset
    return Math.max(0, model.orderedRowIds.length * rowHeight - viewportHeight)
  }
  const anchor = pending.request.anchor
  if (anchor._tag === 'Offset') return anchor.scrollTop
  if (anchor._tag === 'Row') return Math.max(0, anchor.index * rowHeight - anchor.viewportOffset)
  return Math.max(0, model.orderedRowIds.length * rowHeight - viewportHeight)
}

function cacheCapacity(model: Model, config: Config<unknown>): number {
  const height = model.virtualList.measurement._tag === 'Measured'
    ? model.virtualList.measurement.containerHeight
    : FIXED_VIEWPORT_HEIGHT
  return Math.max(1, Math.ceil(height / config.rowHeight)) + 2 * config.overscanRows
}

export function view<Row>(model: Model, config: Config<Row>, h: HtmlBuilder<Message>): Html {
  const state = stateFor(config)
  const columns = state.visibleColumns
  const range = rangeFor(model, config as Config<unknown>)
  const capacity = cacheCapacity(model, config as Config<unknown>)
  const renderedRows: Html[] = []
  for (let index = range.start; index < range.end; index++) {
    const rowId = model.orderedRowIds[index]!
    const row = state.rowById.get(rowId)
    if (row === undefined) continue
    let rowView = state.rowViews.get(rowId)
    if (!rowView) {
      rowView = createLazy()
      state.rowViews.set(rowId, rowView)
    }
    const selected = config.selectedRowIds.has(rowId)
    const vnode = rowView(rowRenderer, [rowId, row, columns, selected, index, config.rowHeight, config.isGrid, model.activeCell, h]) as Html
    state.rowViews.delete(rowId)
    state.rowViews.set(rowId, rowView)
    renderedRows.push(vnode)
  }
  while (state.rowViews.size > capacity) state.rowViews.delete(state.rowViews.keys().next().value!)

  const headerCells = columns.map((column, index) => h.th([
    ...(config.isGrid ? [
      h.Role('columnheader'),
      h.AriaColindex(index + 2),
      h.Tabindex(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === column.id ? 0 : -1),
      h.Autofocus(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === column.id),
      h.OnFocus(Message.ActiveCellChanged({ rowId: gridHeaderRowId, columnId: column.id })),
    ] : []),
    ...(column.width ? [h.Style({ width: column.width })] : []),
    ...(column.minWidth ? [h.Style({ minWidth: column.minWidth })] : []),
    ...(column.align ? [h.Style({ textAlign: column.align })] : []),
    ...(model.sort?.columnId === column.id ? [h.AriaSort(model.sort.direction)] : []),
    ...(column.isSortable && config.isGrid ? [h.OnClick(Message.SortChanged({ columnId: column.id }))] : []),
  ], column.isSortable && !config.isGrid
    ? [h.button([h.Type('button'), h.OnClick(Message.SortChanged({ columnId: column.id }))], [column.header])]
    : [column.header]))
  const selectionHeader = h.th(config.isGrid ? [
    h.Role('columnheader'),
    h.AriaColindex(1),
    h.Tabindex(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === selectionColumnId ? 0 : -1),
    h.Autofocus(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === selectionColumnId),
    h.OnFocus(Message.ActiveCellChanged({ rowId: gridHeaderRowId, columnId: selectionColumnId })),
  ] : [], [h.input([
    h.Type('checkbox'),
    h.AriaLabel('Select all visible rows'),
    h.Tabindex(-1),
    h.Checked(model.orderedRowIds.length > 0 && model.orderedRowIds.every(rowId => config.selectedRowIds.has(rowId))),
    h.OnClick(Message.SelectVisible({ selected: !model.orderedRowIds.every(rowId => config.selectedRowIds.has(rowId)) })),
  ])])
  const header = h.thead([], [h.tr(config.isGrid ? [h.Role('row'), h.AriaRowindex(1)] : [], [selectionHeader, ...headerCells])])
  const topSpacer = h.tr([h.AriaHidden(true), h.DataAttribute('virtual-list-spacer', 'top')], [h.td([
    h.Colspan(columns.length + 1),
    h.Style({ height: `${range.top}px`, padding: '0', border: '0' }),
  ])])
  const bottomSpacer = h.tr([h.AriaHidden(true), h.DataAttribute('virtual-list-spacer', 'bottom')], [h.td([
    h.Colspan(columns.length + 1),
    h.Style({ height: `${range.bottom}px`, padding: '0', border: '0' }),
  ])])
  const table = h.table([h.Class('wse-data-table'), ...(config.isGrid ? [
    h.Role('grid'),
    h.AriaRowcount(model.orderedRowIds.length + 1),
    h.AriaColcount(columns.length + 1),
    h.OnKeyDownPreventDefault((key, modifiers) => {
      if (key === 'Tab') return Option.none()
      const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(key)
      return handled ? Option.some(Message.GridKey({ key, ctrlKey: modifiers.ctrlKey || modifiers.metaKey })) : Option.none()
    }),
  ] : [])], [
    h.caption([], [config.caption]),
    header,
    h.tbody([], [topSpacer, ...renderedRows, bottomSpacer]),
  ])
  const containerId = model.virtualList.id
  return brandViewResult(h.div([
    h.Id(containerId),
    h.Class('wse-data-table__scroll'),
    h.Style({ overflow: 'auto', maxHeight: `${FIXED_VIEWPORT_HEIGHT}px` }),
    h.DataAttribute('virtual-list-scroll-version', String(model.virtualList.pendingScrollVersion)),
    h.OnMount(observeDataTable({ id: containerId, tableId: config.id })),
  ], [table]), 'wseffect/DataTable')
}

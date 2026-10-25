import { Option, Schema } from 'effect'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import { Command, Update } from '@wsagency/wseffect-foldkit'
import { childAttributes, createLazy } from '@wsagency/wseffect-foldkit/html'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
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
  pendingFocus: ActiveCell,
  virtualList: VirtualList.Model,
})
export type Model = typeof Model.Type

const FocusAnchor = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('None') }),
  Schema.Struct({
    _tag: Schema.Literal('Row'),
    key: Schema.String,
    index: Schema.Number,
    viewportOffset: Schema.Number,
  }),
])

export const Message = defineMessageUnion({
  RowsChanged: {},
  FilterChanged: { value: Schema.String },
  SortChanged: { columnId: Schema.String },
  ToggleRow: { rowId: Schema.String },
  SelectVisible: { selected: Schema.Boolean },
  ActiveCellChanged: { rowId: Schema.String, columnId: Schema.String },
  GridKey: { key: Schema.String, ctrlKey: Schema.Boolean },
  VirtualList: { message: VirtualList.Message },
  TableUnmounted: { tableId: Schema.String },
  FocusTargetCompleted: {
    rowId: Schema.String,
    columnId: Schema.String,
    scrollTop: Schema.Number,
    scrollHeight: Schema.Number,
    containerHeight: Schema.Number,
    anchor: FocusAnchor,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectionChanged: { ids: Schema.Array(Schema.String) },
  FocusCell: { rowId: Schema.String, columnId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

const tableStates = new Map<string, TableState<unknown>>()
const { focusDataTableCell, focusHeaderCell } = makeDataTableMounts(Message)
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

function computeOrder<Row>(state: TableState<Row>, filter: string, sort: Model['sort']): ReadonlyArray<string> {
  const ids: string[] = []
  const needle = filter.toLocaleLowerCase()
  for (const rowId of state.rowById.keys()) {
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

function informRowsChanged(
  model: Model,
  ids: ReadonlyArray<string>,
  reset: boolean,
  focusTarget?: Model['activeCell'],
) {
  const informed = VirtualList.informItemsChanged(model.virtualList, ids)
  const list = focusTarget === undefined
    ? reset
      ? VirtualList.scrollToIndex(informed.model, 0)
      : informed
    : focusTarget === null
      ? VirtualList.scrollToIndex(informed.model, 0)
      : VirtualList.scrollToKey(informed.model, focusTarget.rowId, { alignment: 'Nearest' })
  return {
    model: list.model,
    focusTarget,
    commands: list.commands,
  }
}

function invokeTableScroll(
  model: VirtualList.Model,
  rowId: string,
): Update.Return<VirtualList.Model, VirtualList.Message> {
  return VirtualList.scrollToKey(model, rowId, { alignment: 'Nearest' })
}

export function init<Row>(config: Config<Row>): Model {
  const state = buildTableState(config)
  const firstRowId = state.rowById.keys().next().value
  const firstGridColumnId = config.showSelection === false ? state.visibleColumns[0]?.id : selectionColumnId
  tableStates.set(config.id, state as TableState<unknown>)
  return {
    filter: '',
    sort: null,
    orderedRowIds: computeOrder(state, '', null),
    activeCell: config.isGrid && firstRowId !== undefined && firstGridColumnId !== undefined
      ? { rowId: firstRowId, columnId: firstGridColumnId }
      : null,
    pendingFocus: null,
    virtualList: VirtualList.init({ id: `${config.id}-virtual-list`, rowHeightPx: config.rowHeight }),
  }
}

function recoveredFocusTarget(model: Model, activeCell: Model['activeCell']): Model['activeCell'] | undefined {
  if (model.activeCell === null ||
    (activeCell !== null && model.activeCell.rowId === activeCell.rowId && model.activeCell.columnId === activeCell.columnId) ||
    activeCell?.rowId === gridHeaderRowId) return undefined
  return activeCell
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
      const orderedRowIds = computeOrder(state, model.filter, model.sort)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      const focusTarget = recoveredFocusTarget(model, activeCell)
      const list = informRowsChanged(model, orderedRowIds, false, focusTarget)
      return {
        model: { ...model, orderedRowIds, activeCell, pendingFocus: list.focusTarget === null ? { rowId: '$grid-root', columnId: '$grid-root' } : list.focusTarget ?? null, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: focusOutMessage(model, activeCell, config.isGrid),
      }
    },
    FilterChanged: ({ value }) => {
      const state = stateFor(config)
      const orderedRowIds = computeOrder(state, value, model.sort)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      const recoveredFocus = recoveredFocusTarget(model, activeCell)
      const focusTarget = recoveredFocus === undefined
        ? activeCell !== null && activeCell.rowId !== gridHeaderRowId ? activeCell : undefined
        : recoveredFocus
      const list = informRowsChanged(model, orderedRowIds, true, focusTarget)
      return {
        model: { ...model, filter: value, orderedRowIds, activeCell, pendingFocus: list.focusTarget === null ? { rowId: '$grid-root', columnId: '$grid-root' } : list.focusTarget ?? null, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: focusOutMessage(model, activeCell, config.isGrid),
      }
    },
    SortChanged: ({ columnId }) => {
      const column = config.columns.find(candidate => candidate.id === columnId)
      if (!column?.isSortable) return { model }
      const direction: 'ascending' | 'descending' =
        model.sort?.columnId === columnId && model.sort.direction === 'ascending'
          ? 'descending'
          : 'ascending'
      const sort = { columnId, direction }
      const state = stateFor(config)
      const orderedRowIds = computeOrder(state, model.filter, sort)
      const activeCell = recoverActiveCell(model, config, orderedRowIds)
      const focusTarget = recoveredFocusTarget(model, activeCell)
      const list = informRowsChanged(model, orderedRowIds, false, focusTarget)
      return {
        model: {
          ...model,
          sort,
          orderedRowIds,
          activeCell,
          pendingFocus: list.focusTarget === null
            ? { rowId: '$grid-root', columnId: '$grid-root' }
            : list.focusTarget ?? null,
          virtualList: list.model,
        },
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
      const columns = gridColumnIds(config)
      const isHeader = rowId === gridHeaderRowId
      const rowIndex = isHeader ? -1 : model.orderedRowIds.indexOf(rowId)
      const columnIndex = columns.indexOf(columnId)
      if ((!isHeader && rowIndex < 0) || columnIndex < 0) return { model }
      const activeCell = { rowId, columnId }
      const list = isHeader
        ? { model: model.virtualList, commands: undefined }
        : invokeTableScroll(model.virtualList, rowId)
      return {
        model: { ...model, activeCell, pendingFocus: null, virtualList: list.model },
        commands: mapChildCommands(list.commands),
        outMessage: OutMessage.FocusCell(activeCell),
      }
    },
    GridKey: ({ key, ctrlKey }) => handleGridKey(model, config, key, ctrlKey),
    VirtualList: ({ message: childMessage }) => {
      const result = VirtualList.update(model.virtualList, childMessage)
      const shouldFocusAfterCommit =
        childMessage._tag === 'CompletedApplyScroll' &&
        childMessage.outcome._tag === 'Applied' &&
        model.pendingFocus !== null
      const commands = mapChildCommands(result.commands) ?? []
      if (!shouldFocusAfterCommit || model.pendingFocus === null) {
        return {
          model: { ...model, virtualList: result.model },
          commands,
        }
      }
      const focusTarget = model.pendingFocus
      const isRoot = focusTarget.rowId === '$grid-root'
      const rowIndex = isRoot ? -1 : model.orderedRowIds.indexOf(focusTarget.rowId)
      const columnIndex = isRoot
        ? -1
        : gridColumnIds(config).indexOf(focusTarget.columnId)
      if (!isRoot && (rowIndex < 0 || columnIndex < 0)) {
        return { model: { ...model, virtualList: result.model }, commands }
      }
      return {
        model: { ...model, virtualList: result.model },
        commands: [
          ...commands,
          focusDataTableCell({
            containerId: model.virtualList.id,
            rowId: focusTarget.rowId,
            columnId: focusTarget.columnId,
            rowIndex,
            columnIndex,
          }),
        ],
      }
    },
    TableUnmounted: ({ tableId }) => {
      tableStates.delete(tableId)
      return { model }
    },
    FocusTargetCompleted: ({
      rowId,
      columnId,
      scrollTop,
      scrollHeight,
      containerHeight,
      anchor,
    }) => {
      if (model.pendingFocus === null || model.pendingFocus.rowId !== rowId || model.pendingFocus.columnId !== columnId) return { model }
      const observed = VirtualList.update(model.virtualList, VirtualList.Message.ObservedContainerScroll({
        scrollTop,
        scrollHeight,
        containerHeight,
        anchor,
      }))
      return {
        model: { ...model, pendingFocus: null, virtualList: observed.model },
        commands: mapChildCommands(observed.commands),
      }
    },
  })
}

function visibleColumns<Row>(columns: ReadonlyArray<Column<Row>>): ReadonlyArray<Column<Row>> {
  return columns.filter(column => column.isVisible !== false)
}

function gridColumnIds<Row>(config: Config<Row>): ReadonlyArray<string> {
  const columns = visibleColumns(config.columns).map(column => column.id)
  return config.showSelection === false ? columns : [selectionColumnId, ...columns]
}

function recoverActiveCell<Row>(model: Model, config: Config<Row>, ids: ReadonlyArray<string>) {
  if (!config.isGrid || model.activeCell === null) return model.activeCell
  const columns = gridColumnIds(config)
  if (columns.length === 0) return null
  if (model.activeCell.rowId === gridHeaderRowId) {
    const columnId = columns.includes(model.activeCell.columnId) ? model.activeCell.columnId : columns[0]!
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
  const columnIds = visible.map(column => column.id)
  const columns = config.showSelection === false ? columnIds : [selectionColumnId, ...columnIds]
  const isHeader = model.activeCell.rowId === gridHeaderRowId
  const rowOrdinal = isHeader ? 0 : model.orderedRowIds.indexOf(model.activeCell.rowId) + 1
  const columnOrdinal = columns.indexOf(model.activeCell.columnId)
  if (rowOrdinal < (isHeader ? 0 : 1) || columnOrdinal < 0) return { model }
  if (isHeader && key === ' ' && model.activeCell.columnId === selectionColumnId) {
    const allSelected = model.orderedRowIds.length > 0 && model.orderedRowIds.every(rowId => config.selectedRowIds.has(rowId))
    return update(model, config, Message.SelectVisible({ selected: !allSelected }))
  }
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
    nextRow = 1
    nextColumn = columns.length > 1 ? 1 : 0
  } else if (ctrlKey && key === 'End') {
    nextRow = model.orderedRowIds.length
    nextColumn = columns.length - 1
  }
  const rowId = nextRow === 0 ? gridHeaderRowId : model.orderedRowIds[nextRow - 1]
  const columnId = columns[nextColumn]
  if (rowId === undefined || columnId === undefined) return { model }
  const activeCell = { rowId, columnId }
  if (rowId === gridHeaderRowId) return {
    model: { ...model, activeCell, pendingFocus: null },
    commands: mapChildCommands([focusHeaderCell({ containerId: model.virtualList.id, columnIndex: nextColumn })]),
    outMessage: OutMessage.FocusCell(activeCell),
  }
  const rowIndex = nextRow - 1
  const list = invokeTableScroll(model.virtualList, rowId)
  return {
    model: { ...model, activeCell, pendingFocus: activeCell, virtualList: list.model },
    commands: mapChildCommands(list.commands),
    outMessage: OutMessage.FocusCell(activeCell),
  }
}

function cellContent<Row>(row: Row, column: Column<Row>): Html | string {
  return column.render ? column.render(row) : column.accessor(row)
}

function rowRenderer<Row>(
  rowId: string,
  rowIndex: number,
  key: string,
  row: Row,
  columns: ReadonlyArray<Column<Row>>,
  selected: boolean,
  rowHeight: number,
  grid: boolean,
  showSelection: boolean,
  hasTableStyle: boolean,
  activeCell: Model['activeCell'],
  h: HtmlBuilder<Message>,
): Html {
  const activeColumnId = activeCell?.rowId === rowId ? activeCell.columnId : null
  const cells = columns.map((column, index) => h.td([
    ...(hasTableStyle ? [h.Class(index === 0 ? 'rt-TableRowHeaderCell rt-TableCell' : 'rt-TableCell')] : []),
    ...(grid ? [
      h.Role('gridcell'),
      h.AriaColindex(index + (showSelection ? 2 : 1)),
      h.Tabindex(activeColumnId === column.id ? 0 : -1),
      h.Autofocus(activeColumnId === column.id),
      h.OnFocus(Message.ActiveCellChanged({ rowId, columnId: column.id })),
    ] : []),
  ], [cellContent(row, column)]))
  const selectionCells = showSelection ? [h.td([
    ...(hasTableStyle ? [h.Class('rt-TableCell')] : []),
    ...(grid ? [
      h.Role('gridcell'),
      h.AriaColindex(1),
      h.Tabindex(activeColumnId === selectionColumnId ? 0 : -1),
      h.OnFocus(Message.ActiveCellChanged({ rowId, columnId: selectionColumnId })),
    ] : []),
  ], [h.input([
    h.Type('checkbox'),
    h.AriaLabel(`Select row ${rowId}`),
    h.Checked(selected),
    ...(grid ? [h.Tabindex(-1)] : []),
    h.OnClick(Message.ToggleRow({ rowId })),
  ])])] : []
  return h.keyed('tr')(key, [
    h.Role('row'),
    h.DataAttribute('virtual-list-item-key', key),
    h.DataAttribute('virtual-list-item-index', String(rowIndex)),
    h.Style({ height: `${rowHeight}px` }),
    ...(hasTableStyle ? [h.Class('rt-TableRow')] : []),
    ...(grid ? [h.AriaRowindex(rowIndex + 2)] : []),
  ], [...selectionCells, ...cells])
}


export function view<Row>(model: Model, config: Config<Row>, h: HtmlBuilder<Message>): Html {
  const state = stateFor(config)
  const columns = state.visibleColumns
  const showSelection = config.showSelection !== false
  const tableStyle = config.tableStyle
  const hasTableStyle = tableStyle !== undefined
  const headerCells = columns.map((column, index) => h.th([
    ...(hasTableStyle ? [h.Class('rt-TableColumnHeaderCell rt-TableCell')] : []),
    ...(config.isGrid ? [
      h.Role('columnheader'),
      h.AriaColindex(index + (showSelection ? 2 : 1)),
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
  const selectionHeader = showSelection ? h.th([
    ...(hasTableStyle ? [h.Class('rt-TableCell')] : []),
    ...(config.isGrid ? [
      h.Role('columnheader'),
      h.AriaColindex(1),
      h.Tabindex(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === selectionColumnId ? 0 : -1),
      h.Autofocus(model.activeCell?.rowId === gridHeaderRowId && model.activeCell.columnId === selectionColumnId),
      h.OnFocus(Message.ActiveCellChanged({ rowId: gridHeaderRowId, columnId: selectionColumnId })),
    ] : []),
  ], [h.input([
    h.Type('checkbox'),
    h.AriaLabel('Select all visible rows'),
    h.Tabindex(-1),
    h.Checked(model.orderedRowIds.length > 0 && model.orderedRowIds.every(rowId => config.selectedRowIds.has(rowId))),
    h.OnClick(Message.SelectVisible({ selected: !model.orderedRowIds.every(rowId => config.selectedRowIds.has(rowId)) })),
  ])]) : null
  const header = h.thead(
    hasTableStyle ? [h.Class('rt-TableHeader')] : [],
    [h.tr([
      ...(hasTableStyle ? [h.Class('rt-TableRow')] : []),
      ...(config.isGrid ? [h.Role('row'), h.AriaRowindex(1)] : []),
    ], [...(selectionHeader === null ? [] : [selectionHeader]), ...headerCells])],
  )
  const columnCount = columns.length + (showSelection ? 1 : 0)
  const tableAttributes = [
    h.Class(hasTableStyle
      ? 'wse-data-table rt-TableRootTable wse-data-table--table-style'
      : 'wse-data-table'),
    ...(config.isGrid ? [
      h.Role('grid'),
      h.AriaRowcount(model.orderedRowIds.length + 1),
      h.AriaColcount(columnCount),
      h.Tabindex(model.activeCell === null ? 0 : -1),
      h.OnKeyDownPreventDefault((key, modifiers) => {
        if (key === 'Tab') return Option.none()
        const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(key)
        return handled ? Option.some(Message.GridKey({ key, ctrlKey: modifiers.ctrlKey || modifiers.metaKey })) : Option.none()
      }),
    ] : []),
  ]
  const containerId = model.virtualList.id
  const rootClasses = tableStyle === undefined
    ? 'wse-data-table__scroll'
    : `wse-data-table__scroll rt-TableRoot rt-r-size-${tableStyle.size} rt-variant-${tableStyle.variant}`
  const renderVirtualList = VirtualList.view<string>()
  const tableView = h.submodel({
    slotId: 'data-table-virtual-list',
    view: renderVirtualList,
    model: model.virtualList,
    toParentMessage: message => Message.VirtualList({ message }),
    viewInputs: {
      items: model.orderedRowIds,
      itemToKey: rowId => rowId,
      itemToView: () => null,
      itemToRowHeightPx: () => config.rowHeight,
      overscan: config.overscanRows,
      containerElement: 'div',
      containerRole: null,
      containerAttributes: childAttributes([
        h.Class(rootClasses),
        h.Style({ maxHeight: '360px' }),
        h.OnUnmount(Message.TableUnmounted({ tableId: config.id })),
      ]),
      rowElement: 'tr',
      rowRole: 'row',
      rowToView: (rowId, rowIndex, key) => {
        const row = state.rowById.get(rowId)
        if (row === undefined) return null
        let rowView = state.rowViews.get(rowId)
        if (!rowView) {
          rowView = createLazy()
          state.rowViews.set(rowId, rowView)
        }
        const renderedRow = rowView(rowRenderer, [
          rowId,
          rowIndex,
          key,
          row,
          columns,
          config.selectedRowIds.has(rowId),
          config.rowHeight,
          config.isGrid,
          showSelection,
          hasTableStyle,
          model.activeCell,
          h,
        ]) as Html
        state.rowViews.delete(rowId)
        state.rowViews.set(rowId, rowView)
        return renderedRow
      },
      spacerToView: (edge, heightPx) =>
        h.keyed('tr')(`${containerId}-${edge}-spacer`, [
          h.AriaHidden(true),
          h.DataAttribute('virtual-list-spacer', edge),
        ], [h.td([
          h.Colspan(columnCount),
          h.Style({ height: `${heightPx}px`, padding: '0', border: '0' }),
        ])]),
      windowToView: ({ topSpacer, rows, bottomSpacer }) => {
        while (state.rowViews.size > rows.length) {
          state.rowViews.delete(state.rowViews.keys().next().value!)
        }
        return h.table(tableAttributes, [
          h.caption([], [config.caption]),
          header,
          h.tbody(hasTableStyle ? [h.Class('rt-TableBody')] : [], [
            topSpacer,
            ...rows,
            bottomSpacer,
          ]),
        ])
      },
    },
  })
  return brandViewResult(tableView, 'wseffect/DataTable')
}

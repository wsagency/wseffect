import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; label: string; rank: number }
const rows: ReadonlyArray<Row> = [
  { id: 'a', label: 'Alpha', rank: 1 },
  { id: 'b', label: 'Beta', rank: 3 },
  { id: 'c', label: 'Gamma', rank: 2 },
]

function config(overrides: Partial<DataTable.Config<Row>> = {}): DataTable.Config<Row> {
  return {
    id: 'data-table-grid-story',
    rows,
    getRowId: row => row.id,
    columns: [
      { id: 'label', header: null, accessor: row => row.label, isSortable: true },
      { id: 'rank', header: null, accessor: row => String(row.rank), isSortable: true },
    ],
    caption: null,
    selectedRowIds: new Set(),
    isGrid: true,
    rowHeight: 36,
    overscanRows: 1,
    ...overrides,
  }
}

const update = (model: DataTable.Model, cfg: DataTable.Config<Row>, message: DataTable.Message) => DataTable.update(model, cfg, message)
const setCell = (model: DataTable.Model, cfg: DataTable.Config<Row>, rowId: string, columnId: string) =>
  update(model, cfg, DataTable.Message.ActiveCellChanged({ rowId, columnId })).model

describe('DataTable Grid model', () => {
  it('clamps arrow movement at boundaries and leaves Tab to the browser', () => {
    const cfg = config()
    let model = DataTable.init(cfg)
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowLeft', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: '$selection' })
    model = setCell(model, cfg, 'a', 'label')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowUp', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: '$header', columnId: 'label' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: 'label' })
    expect(update(model, cfg, DataTable.Message.GridKey({ key: 'Tab', ctrlKey: false })).model).toEqual(model)
  })

  it('moves Home and End within a row and Ctrl+Home/Ctrl+End across the grid', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'Home', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'b', columnId: '$selection' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'End', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'b', columnId: 'rank' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'Home', ctrlKey: true })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: 'label' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'End', ctrlKey: true })).model
    expect(model.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
  })
  it('navigates from a header into data and sorts sortable header cells with Enter or Space', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, 'a', 'label')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowUp', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: '$header', columnId: 'label' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: 'label' })

    model = setCell(model, cfg, '$header', 'rank')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'Enter', ctrlKey: false })).model
    expect(model.sort).toEqual({ columnId: 'rank', direction: 'ascending' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: ' ', ctrlKey: false })).model
    expect(model.sort).toEqual({ columnId: 'rank', direction: 'descending' })
  })

  it('preserves active row and column identity through sort and filtering', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, 'b', 'label')
    model = update(model, cfg, DataTable.Message.SortChanged({ columnId: 'rank' })).model
    expect(model.orderedRowIds).toEqual(['a', 'c', 'b'])
    expect(model.activeCell).toEqual({ rowId: 'b', columnId: 'label' })
    model = update(model, cfg, DataTable.Message.FilterChanged({ value: 'be' })).model
    expect(model.orderedRowIds).toEqual(['b'])
    expect(model.activeCell).toEqual({ rowId: 'b', columnId: 'label' })
  })

  it('recovers removed active rows to the nearest surviving ordinal', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const rowsAfterRemoval = rows.filter(row => row.id !== 'b')
    const changed = config({ rows: rowsAfterRemoval })
    const result = update(model, changed, DataTable.Message.RowsChanged())
    const recovered = result.model
    expect(recovered.orderedRowIds).toEqual(['a', 'c'])
    expect(recovered.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ScrollDataTableRow')?.args).toMatchObject({
      rowId: 'c',
      rowIndex: 1,
      columnIndex: 2,
      shouldFocus: true,
    })
  })

  it('focuses the grid root when filtering removes every active row', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'no matches' }))
    expect(result.model.activeCell).toBeNull()
    expect(result.commands?.find(command => command.name === 'ScrollDataTableRow')?.args).toMatchObject({
      rowId: null,
      shouldFocus: true,
    })
  })

  it('scrolls to a stable VirtualList key before restoring focus after row remount', () => {
    const cfg = config()
    const result = update(DataTable.init(cfg), cfg, DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false }))
    expect(result.model.activeCell).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(result.model.virtualList.pendingScroll).toMatchObject({
      _tag: 'Pending',
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'b' } },
    })
    expect(result.commands?.find(command => command.name === 'ScrollDataTableRow')?.args).toMatchObject({
      rowId: 'b',
      rowIndex: 1,
      columnIndex: 0,
      shouldFocus: true,
    })
  })

  it('toggles selection on Space only from the selection cell', () => {
    const cfg = config()
    const selection = update(DataTable.init(cfg), cfg, DataTable.Message.GridKey({ key: ' ', ctrlKey: false }))
    expect(selection.outMessage).toEqual(DataTable.OutMessage.SelectionChanged({ ids: ['a'] }))
    const dataCell = setCell(selection.model, cfg, 'a', 'label')
    const ignored = update(dataCell, cfg, DataTable.Message.GridKey({ key: ' ', ctrlKey: false }))
    expect(ignored.outMessage).toBeUndefined()
  })
  it('moves from the first data row into the header and back in the same column', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, 'a', 'rank')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowUp', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: '$header', columnId: 'rank' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: 'rank' })
  })

  it('uses the first data cell for Ctrl+Home and the last data cell for Ctrl+End', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'Home', ctrlKey: true })).model
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: 'label' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'End', ctrlKey: true })).model
    expect(model.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
  })

  it('selects all visible rows when Space is pressed on the header selection cell', () => {
    const cfg = config()
    const headerSelection = setCell(DataTable.init(cfg), cfg, '$header', '$selection')
    const result = update(headerSelection, cfg, DataTable.Message.GridKey({ key: ' ', ctrlKey: false }))
    expect(result.outMessage).toEqual(DataTable.OutMessage.SelectionChanged({ ids: ['a', 'b', 'c'] }))
  })

  it('sorts the active header on Enter and Space while retaining header focus', () => {
    const cfg = config()
    let model = setCell(DataTable.init(cfg), cfg, '$header', 'rank')
    let result = update(model, cfg, DataTable.Message.GridKey({ key: 'Enter', ctrlKey: false }))
    expect(result.model.sort).toEqual({ columnId: 'rank', direction: 'ascending' })
    expect(result.model.activeCell).toEqual({ rowId: '$header', columnId: 'rank' })
    model = result.model
    result = update(model, cfg, DataTable.Message.GridKey({ key: ' ', ctrlKey: false }))
    expect(result.model.sort).toEqual({ columnId: 'rank', direction: 'descending' })
    expect(result.model.activeCell).toEqual({ rowId: '$header', columnId: 'rank' })
  })
})

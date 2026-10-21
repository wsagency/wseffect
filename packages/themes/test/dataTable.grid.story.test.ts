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
    expect(model.activeCell).toEqual({ rowId: 'a', columnId: '$selection' })
    model = update(model, cfg, DataTable.Message.GridKey({ key: 'End', ctrlKey: true })).model
    expect(model.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
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
    const recovered = update(model, changed, DataTable.Message.RowsChanged()).model
    expect(recovered.orderedRowIds).toEqual(['a', 'c'])
    expect(recovered.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
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
})

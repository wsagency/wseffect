import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; name: string; score: number }
const rows: ReadonlyArray<Row> = [
  { id: 'a', name: 'Alpha', score: 2 },
  { id: 'b', name: 'Beta', score: 1 },
  { id: 'c', name: 'Alpine', score: 1 },
  { id: 'd', name: 'Delta', score: 4 },
]

function config(overrides: Partial<DataTable.Config<Row>> = {}): DataTable.Config<Row> {
  return {
    id: 'table-test',
    rows,
    getRowId: row => row.id,
    columns: [
      { id: 'name', header: null, accessor: row => row.name, isSortable: true, searchText: row => row.name },
      { id: 'score', header: null, accessor: row => String(row.score), isSortable: true },
    ],
    caption: null,
    selectedRowIds: new Set(),
    isGrid: false,
    rowHeight: 36,
    overscanRows: 2,
    ...overrides,
  }
}

describe('DataTable model', () => {
  it('keeps source order for sort ties', () => {
    const cfg = config()
    let model = DataTable.init(cfg)
    model = DataTable.update(model, cfg, DataTable.Message.SortChanged({ columnId: 'score' })).model
    expect(model.orderedRowIds).toEqual(['b', 'c', 'a', 'd'])
  })

  it('updates IDs without copying row records', () => {
    const cfg = config()
    const model = DataTable.init(cfg)
    const updated = DataTable.update(model, cfg, DataTable.Message.RowsChanged()).model
    expect(updated.orderedRowIds).toEqual(['a', 'b', 'c', 'd'])
    expect(cfg.rows[0]).toBe(rows[0])
    expect(updated.orderedRowIds.every(id => typeof id === 'string')).toBe(true)
  })

  it('select-all and deselect-all affect visible IDs only', () => {
    const cfg = config({ selectedRowIds: new Set(['hidden', 'a']) })
    let model = DataTable.update(DataTable.init(cfg), cfg, DataTable.Message.FilterChanged({ value: 'al' })).model
    const selected = DataTable.update(model, cfg, DataTable.Message.SelectVisible({ selected: true }))
    expect(selected.outMessage).toEqual(DataTable.OutMessage.SelectionChanged({ ids: ['hidden', 'a', 'c'] }))
    model = selected.model
    const deselected = DataTable.update(model, cfg, DataTable.Message.SelectVisible({ selected: false }))
    expect(deselected.outMessage).toEqual(DataTable.OutMessage.SelectionChanged({ ids: ['hidden'] }))
  })

  it('recomputes order on RowsChanged FilterChanged and SortChanged', () => {
    let model = DataTable.init(config())
    model = DataTable.update(model, config(), DataTable.Message.FilterChanged({ value: 'al' })).model
    expect(model.orderedRowIds).toEqual(['a', 'c'])
    model = DataTable.update(model, config(), DataTable.Message.SortChanged({ columnId: 'score' })).model
    expect(model.orderedRowIds).toEqual(['c', 'a'])
    const changedRows = [...rows, { id: 'e', name: 'Albatross', score: 3 }]
    model = DataTable.update(model, config({ rows: changedRows }), DataTable.Message.RowsChanged()).model
    expect(model.orderedRowIds).toEqual(['c', 'a', 'e'])
  })

  it('emits parent-controlled selection when toggling a row', () => {
    const cfg = config()
    const result = DataTable.update(DataTable.init(cfg), cfg, DataTable.Message.ToggleRow({ rowId: 'b' }))
    expect(result.model).toEqual(DataTable.init(cfg))
    expect(result.outMessage).toEqual(DataTable.OutMessage.SelectionChanged({ ids: ['b'] }))
  })

  it('folds scroll and resize messages into VirtualList.Model', () => {
    const cfg = config()
    const initial = DataTable.init(cfg)
    const scrolled = DataTable.update(initial, cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.ObservedContainerScroll({
        scrollTop: 108,
        scrollHeight: 500,
        containerHeight: 180,
        anchor: { _tag: 'None' },
      }),
    }))
    expect(scrolled.model.virtualList.scrollTop).toBe(108)
    const resized = DataTable.update(scrolled.model, cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.ResizedContainer({ containerWidth: 420, containerHeight: 220 }),
    }))
    expect(resized.model.virtualList.measurement).toEqual({ _tag: 'Measured', containerWidth: 420, containerHeight: 220 })
  })
  it('records pending focus until the target row commits', () => {
    const cfg = config({ isGrid: true })
    const result = DataTable.update(
      DataTable.init(cfg),
      cfg,
      DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false }),
    )
    expect(result.model.activeCell).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(result.model.pendingFocus).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(result.model.virtualList.pendingScroll).toMatchObject({
      _tag: 'Pending',
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'b' } },
    })
    expect(result.commands?.find(command => command.name === 'ScrollDataTableRow')?.args).toMatchObject({
      rowId: 'b',
      columnIndex: 0,
      shouldFocus: false,
    })
  })

  it('filter resets virtual range through the local scroll command', () => {
    const cfg = config()
    const scrolled = DataTable.update(DataTable.init(cfg), cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.ObservedContainerScroll({
        scrollTop: 108,
        scrollHeight: 500,
        containerHeight: 180,
        anchor: { _tag: 'None' },
      }),
    })).model
    const result = DataTable.update(scrolled, cfg, DataTable.Message.FilterChanged({ value: 'al' }))
    expect(result.model.virtualList.pendingScroll).toMatchObject({
      _tag: 'Pending',
      request: { _tag: 'Target', target: { _tag: 'Index', index: 0 } },
    })
    expect(result.commands?.find(command => command.name === 'ScrollDataTableRow')?.args).toEqual({
      containerId: `${cfg.id}-virtual-list`,
      rowIndex: 0,
      rowHeight: cfg.rowHeight,
      rowId: 'a',
      scrollTop: 0,
      columnIndex: 0,
      shouldFocus: false,
    })
  })

  it('Model and Message schemas round-trip through the page-model codec', () => {
    const cfg = config()
    const model = DataTable.init(cfg)
    expect(Schema.decodeUnknownSync(DataTable.Model)(Schema.encodeSync(DataTable.Model)(model))).toEqual(model)
    const message = DataTable.Message.FilterChanged({ value: 'al' })
    expect(Schema.decodeUnknownSync(DataTable.Message)(Schema.encodeSync(DataTable.Message)(message))).toEqual(message)
  })
})

import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'

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
const appliedScroll = (version: number, scrollHeight: number, containerHeight: number) =>
  DataTable.Message.VirtualList({
    message: VirtualList.Message.CompletedApplyScroll({
      version,
      outcome: { _tag: 'Applied', scrollTop: 0, scrollHeight, containerHeight, anchor: { _tag: 'None' } },
    }),
  })
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
  it('targets a retained cell outside the filtered rendered range for focus recovery', () => {
    const cfg = config({
      rows: [...rows, { id: 'd', label: 'Delta', rank: 4 }],
      overscanRows: 0,
      viewportHeight: 36,
    })
    let model = setCell(DataTable.init(cfg), cfg, 'd', 'label')
    model = update(model, cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 36 }),
    })).model
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'a' }))
    expect(result.model.orderedRowIds).toEqual(['a', 'b', 'c', 'd'])
    expect(result.model.pendingFocus).toEqual({ rowId: 'd', columnId: 'label' })
  })

  it('recovers removed active rows and focuses after the replacement row commits', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const rowsAfterRemoval = rows.filter(row => row.id !== 'b')
    const changed = config({ rows: rowsAfterRemoval })
    const result = update(model, changed, DataTable.Message.RowsChanged())
    const recovered = result.model
    expect(recovered.orderedRowIds).toEqual(['a', 'c'])
    expect(recovered.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(recovered.pendingFocus).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'c' } },
    })
    const committed = update(recovered, changed, appliedScroll(
      recovered.virtualList.pendingScrollVersion,
      rowsAfterRemoval.length * cfg.rowHeight,
      cfg.rowHeight,
    ))
    expect(committed.model.pendingFocus).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(committed.commands?.find(command => command.name === 'FocusDataTableCell')?.args).toMatchObject({
      rowId: 'c',
      rowIndex: 1,
      columnIndex: 2,
    })
    const focused = update(committed.model, changed, DataTable.Message.FocusTargetCompleted({
      rowId: 'c',
      columnId: 'rank',
      scrollTop: cfg.rowHeight,
      scrollHeight: rowsAfterRemoval.length * cfg.rowHeight,
      containerHeight: cfg.rowHeight,
      anchor: { _tag: 'Row', key: 'c', index: 1, viewportOffset: 0 },
    }))
    expect(focused.model.pendingFocus).toBeNull()
  })

  it('restores filter-recovered focus after the replacement row commits', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'ga' }))
    expect(result.model.orderedRowIds).toEqual(['c'])
    expect(result.model.activeCell).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(result.model.pendingFocus).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'c' } },
    })
    const committed = update(result.model, cfg, appliedScroll(
      result.model.virtualList.pendingScrollVersion,
      cfg.rowHeight,
      cfg.rowHeight,
    ))
    expect(committed.model.pendingFocus).toEqual({ rowId: 'c', columnId: 'rank' })
    expect(committed.commands?.find(command => command.name === 'FocusDataTableCell')?.args).toMatchObject({
      rowId: 'c',
      rowIndex: 0,
      columnIndex: 2,
    })
  })
  it('restores focus to a surviving active row outside the reset rendered range', () => {
    const manyRows = Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index}`,
      label: `Record ${index}`,
      rank: index,
    }))
    const cfg = config({ rows: manyRows, overscanRows: 1 })
    const model = setCell(DataTable.init(cfg), cfg, 'row-19', 'rank')
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'Record' }))
    expect(result.model.activeCell).toEqual({ rowId: 'row-19', columnId: 'rank' })
    expect(result.model.pendingFocus).toEqual({ rowId: 'row-19', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'row-19' } },
    })
    const committed = update(result.model, cfg, appliedScroll(
      result.model.virtualList.pendingScrollVersion,
      manyRows.length * cfg.rowHeight,
      cfg.rowHeight,
    ))
    expect(committed.model.pendingFocus).toEqual({ rowId: 'row-19', columnId: 'rank' })
    expect(committed.commands?.find(command => command.name === 'FocusDataTableCell')?.args).toMatchObject({
      rowId: 'row-19',
      rowIndex: 19,
      columnIndex: 2,
    })
  })

  it('focuses the grid root when filtering removes every active row', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'no matches' }))
    expect(result.model.activeCell).toBeNull()
    expect(result.model.pendingFocus).toEqual({ rowId: '$grid-root', columnId: '$grid-root' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')).toBeDefined()
    const committed = update(result.model, cfg, appliedScroll(
      result.model.virtualList.pendingScrollVersion,
      0,
      cfg.rowHeight,
    ))
    expect(committed.commands?.find(command => command.name === 'FocusDataTableCell')?.args).toMatchObject({
      rowId: '$grid-root',
    })
  })

  it('does not refocus the grid when filtering leaves the active cell mounted', () => {
    const cfg = config({ viewportHeight: 120, overscanRows: 0 })
    const model = setCell(DataTable.init(cfg), cfg, 'a', 'rank')
    const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'a' }))
    expect(result.model.activeCell).toEqual({ rowId: 'a', columnId: 'rank' })
    expect(result.model.pendingFocus).toBeNull()
    expect(result.commands?.some(command => command.name === 'FocusDataTableCell')).toBe(false)
  })

  it('retargets a surviving cell that moves outside the window after rows change', () => {
    const manyRows = Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index}`,
      label: `Record ${index}`,
      rank: index,
    }))
    const cfg = config({ rows: manyRows, viewportHeight: 72, overscanRows: 0 })
    const model = {
      ...DataTable.init(cfg),
      activeCell: { rowId: 'row-1', columnId: 'rank' },
    }
    const changed = config({ ...cfg, rows: [...manyRows].reverse() })
    const result = update(model, changed, DataTable.Message.RowsChanged())
    expect(result.model.activeCell).toEqual({ rowId: 'row-1', columnId: 'rank' })
    expect(result.model.pendingFocus).toEqual({ rowId: 'row-1', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'row-1' } },
    })
  })
  it('uses VirtualList leading offsets when checking the reordered focus window', () => {
    const manyRows = Array.from({ length: 5 }, (_, index) => ({
      id: `row-${index}`,
      label: `Record ${index}`,
      rank: index,
    }))
    const cfg = config({ rows: manyRows, viewportHeight: 36, overscanRows: 0 })
    const initial = DataTable.init(cfg)
    const model = {
      ...initial,
      activeCell: { rowId: 'row-0', columnId: 'rank' },
      virtualList: VirtualList.update(initial.virtualList, VirtualList.Message.ResizedContainer({
        containerWidth: 400,
        containerHeight: 36,
        leadingOffsetPx: 36,
      })).model,
    }
    const reordered = config({ ...cfg, rows: [manyRows[0]!, ...manyRows.slice(2), manyRows[1]!] })
    const result = update(model, reordered, DataTable.Message.RowsChanged())
    expect(result.model.pendingFocus).toEqual({ rowId: 'row-0', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'row-0' } },
    })
  })
  it('uses the reconciled viewport anchor before recovering a reordered active row', () => {
    const manyRows = Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index}`,
      label: `Record ${index}`,
      rank: index,
    }))
    const cfg = config({ rows: manyRows, viewportHeight: 72, overscanRows: 0 })
    let model = DataTable.init(cfg)
    model = update(model, cfg, DataTable.Message.SortChanged({ columnId: 'rank' })).model
    model = {
      ...model,
      activeCell: { rowId: 'row-13', columnId: 'rank' },
      virtualList: VirtualList.update(model.virtualList, VirtualList.Message.ObservedContainerScroll({
        scrollTop: 5 * cfg.rowHeight,
        scrollHeight: manyRows.length * cfg.rowHeight,
        containerHeight: 72,
        anchor: { _tag: 'Row', key: 'row-5', index: 5, viewportOffset: 0 },
      })).model,
    }

    const result = update(model, cfg, DataTable.Message.SortChanged({ columnId: 'rank' }))
    expect(result.model.orderedRowIds).toEqual([...manyRows].reverse().map(row => row.id))
    expect(result.model.pendingFocus).toEqual({ rowId: 'row-13', columnId: 'rank' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'row-13' } },
    })
  })

  it('checks filter focus recovery at the reset viewport with a measured leading offset', () => {
    const manyRows = Array.from({ length: 5 }, (_, index) => ({
      id: `row-${index}`,
      label: `Record ${index}`,
      rank: index,
    }))
    for (const { viewportHeight, shouldRecover } of [
      { viewportHeight: 72, shouldRecover: false },
      { viewportHeight: 36, shouldRecover: true },
    ]) {
      const cfg = config({
        id: `data-table-filter-offset-${viewportHeight}`,
        rows: manyRows,
        viewportHeight,
        overscanRows: 0,
      })
      const initial = DataTable.init(cfg)
      const model = {
        ...initial,
        activeCell: { rowId: 'row-1', columnId: 'rank' },
        virtualList: VirtualList.update(initial.virtualList, VirtualList.Message.ResizedContainer({
          containerWidth: 400,
          containerHeight: viewportHeight,
          leadingOffsetPx: 36,
        })).model,
      }
      const result = update(model, cfg, DataTable.Message.FilterChanged({ value: 'Record' }))

      if (shouldRecover) {
        expect(result.model.pendingFocus).toEqual({ rowId: 'row-1', columnId: 'rank' })
        expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
          request: { _tag: 'Target', target: { _tag: 'Key', key: 'row-1' } },
        })
      } else {
        expect(result.model.pendingFocus).toBeNull()
        expect(result.commands?.some(command => command.name === 'FocusDataTableCell')).toBe(false)
      }
    }
  })

  it('does not retry a skipped row scroll after a user scroll supersedes it', () => {
    const cfg = config()
    const requested = update(DataTable.init(cfg), cfg, DataTable.Message.GridKey({
      key: 'ArrowDown',
      ctrlKey: false,
    }))
    const requestVersion = requested.model.virtualList.pendingScrollVersion
    const scrolled = update(requested.model, cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.ObservedContainerScroll({
        scrollTop: 0,
        scrollHeight: 108,
        containerHeight: 72,
        anchor: { _tag: 'None' },
      }),
    }))
    const staleCompletion = update(scrolled.model, cfg, DataTable.Message.VirtualList({
      message: VirtualList.Message.CompletedApplyScroll({
        version: requestVersion,
        outcome: { _tag: 'Skipped' },
      }),
    }))
    expect(staleCompletion.commands?.find(command => command.name === 'ApplyScroll')).toBeUndefined()
  })
  it('focuses an emptied grid root when the row-targeted scroll is skipped', () => {
    const cfg = config()
    const model = setCell(DataTable.init(cfg), cfg, 'b', 'rank')
    const emptied = config({ rows: [] })
    const result = update(model, emptied, DataTable.Message.RowsChanged())
    const completed = update(result.model, emptied, DataTable.Message.VirtualList({
      message: VirtualList.Message.CompletedApplyScroll({
        version: result.model.virtualList.pendingScrollVersion,
        outcome: { _tag: 'Skipped' },
      }),
    }))
    expect(result.model.pendingFocus).toEqual({ rowId: '$grid-root', columnId: '$grid-root' })
    expect(result.commands?.some(command => command.name === 'FocusDataTableCell')).toBe(true)
    expect(completed.commands?.some(command => command.name === 'FocusDataTableCell')).toBe(false)
  })

  it('scrolls the target into the committed range before focusing it', () => {
    const cfg = config()
    const result = update(DataTable.init(cfg), cfg, DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false }))
    expect(result.model.activeCell).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(result.model.pendingFocus).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(result.commands?.find(command => command.name === 'ApplyScroll')?.args).toMatchObject({
      request: { _tag: 'Target', target: { _tag: 'Key', key: 'b' } },
    })
    const committed = update(result.model, cfg, appliedScroll(
      result.model.virtualList.pendingScrollVersion,
      rows.length * cfg.rowHeight,
      cfg.rowHeight,
    ))
    expect(committed.model.pendingFocus).toEqual({ rowId: 'b', columnId: '$selection' })
    expect(committed.commands?.find(command => command.name === 'FocusDataTableCell')?.args).toMatchObject({
      rowId: 'b',
      columnIndex: 0,
      rowIndex: 1,
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

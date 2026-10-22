import type { Html, HtmlBuilder } from 'foldkit/html'
import * as VirtualList from '@foldkit/ui/virtualList'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; name: string; score: number }
const rows: ReadonlyArray<Row> = [
  { id: 'a', name: 'Alpha', score: 2 },
  { id: 'b', name: 'Beta', score: 1 },
]
type VNode = Exclude<Html, null>

function isVNode(node: string | VNode): node is VNode {
  return typeof node !== 'string'
}

function config(isGrid = false, selectedRowIds: ReadonlySet<string> = new Set()): DataTable.Config<Row> {
  return {
    id: `table-scene-${isGrid ? 'grid' : 'native'}`,
    rows,
    getRowId: row => row.id,
    columns: [
      { id: 'name', header: null, accessor: row => row.name, isSortable: true },
      { id: 'score', header: null, accessor: row => String(row.score), isSortable: true },
    ],
    caption: null,
    selectedRowIds,
    isGrid,
    rowHeight: 36,
    overscanRows: 2,
  }
}

function updateFor(cfg: DataTable.Config<Row>) {
  return (model: DataTable.Model, message: DataTable.Message) => DataTable.update(model, cfg, message)
}

function viewFor(cfg: DataTable.Config<Row>) {
  let renderedConfig: DataTable.Config<Row> | undefined
  return (model: DataTable.Model, h: HtmlBuilder<DataTable.Message>) => {
    renderedConfig ??= {
      ...cfg,
      caption: h.span([], ['People']),
      columns: cfg.columns.map((column, index) => ({
        ...column,
        header: h.span([], [index === 0 ? 'Name' : 'Score']),
      })),
    }
    return DataTable.view(model, renderedConfig, h)
  }
}

describe('DataTable view semantics', () => {
  it('renders a native table caption, headers, and aria-sort', () => {
    const cfg = config()
    const model = DataTable.update(DataTable.init(cfg), cfg, DataTable.Message.SortChanged({ columnId: 'name' })).model
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(model),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      Scene.expect(Scene.role('table')).toExist(),
      Scene.expect(Scene.text('People')).toExist(),
      Scene.expect(Scene.text('Name')).toExist(),
      Scene.expect(Scene.selector('th[aria-sort="ascending"]')).toExist(),
      Scene.expect(Scene.text('Alpha')).toExist(),
    )
  })
  it('sorts native table headers through buttons while keeping aria-sort on the header cell', () => {
    const cfg = config()
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(DataTable.init(cfg)),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      Scene.click(Scene.role('button', { name: 'Name' })),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const command = simulation.commands.find(candidate => candidate.name === 'ScrollDataTableRow')
        return command === undefined
          ? simulation
          : Scene.Command.resolve(command as never, VirtualList.Message.ObservedContainerScroll({
            scrollTop: 0,
            scrollHeight: 180,
            containerHeight: 180,
            anchor: { _tag: 'None' },
          }))(simulation)
      },
      Scene.expect(Scene.selector('th[aria-sort="ascending"] button')).toExist(),
    )
  })

  it('selects visible rows when Space is pressed on the header selection cell', () => {
    const cfg = config(true)
    const initial = DataTable.init(cfg)
    const model = { ...initial, activeCell: { rowId: '$header', columnId: '$selection' } }
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(model),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      Scene.keydown(Scene.role('grid'), ' '),
      Scene.expectOutMessage(DataTable.OutMessage.SelectionChanged({ ids: ['a', 'b'] })),
    )
  })

  it('keeps the grid root tabbable when there is no active data cell', () => {
    const cfg = config(true)
    const model = { ...DataTable.init(cfg), activeCell: null }
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(model),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const root = simulation.html
        if (root === undefined || !isVNode(root)) return simulation
        expect(root.data?.props?.tabIndex).toBe(0)
        return simulation
      },
    )
  })

  it('gives Grid one tabbable cell and a labelled non-tabbable selection checkbox', () => {
    const cfg = config(true)
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(DataTable.init(cfg)),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const table = simulation.html.children?.[0]
        if (table === undefined || !isVNode(table)) return simulation
        const body = table.children?.[2]
        if (!body || !isVNode(body)) return simulation
        const rows = (body.children ?? []).filter((row): row is VNode =>
          isVNode(row) && row.data?.attrs?.['data-virtual-list-item-key'] !== undefined)
        const cells = rows.flatMap(row => (row.children ?? []).filter((cell): cell is VNode =>
          isVNode(cell) && cell.data?.attrs?.role === 'gridcell'))
        expect(cells.filter(cell => cell.data?.props?.tabIndex === 0)).toHaveLength(1)
        const rowACheckbox = rows.find(row => row.data?.attrs?.['data-virtual-list-item-key'] === 'a')?.children?.[0]
        const checkbox = rowACheckbox && isVNode(rowACheckbox) ? rowACheckbox.children?.[0] : undefined
        expect(checkbox && isVNode(checkbox) ? checkbox.data?.attrs?.['aria-label'] : undefined).toBe('Select row a')
        expect(checkbox && isVNode(checkbox) ? checkbox.data?.props?.tabIndex : undefined).toBe(-1)
        return simulation
      },
      Scene.expect(Scene.role('grid')).toHaveAttr('aria-rowcount', '3'),
      Scene.expect(Scene.role('grid')).toHaveAttr('aria-colcount', '3'),
      Scene.expect(Scene.selector('[role="row"][aria-rowindex="1"]')).toExist(),
      Scene.expect(Scene.selector('[role="row"][aria-rowindex="2"]')).toExist(),
      Scene.keydown(Scene.role('grid'), ' '),
      Scene.expectOutMessage(DataTable.OutMessage.SelectionChanged({ ids: ['a'] })),
      Scene.keydown(Scene.role('grid'), 'Tab'),
      Scene.expectIgnored(),
    )
  })
  it('puts active Grid header cells in the header row with the correct column indices', () => {
    const cfg = config(true)
    const model = { ...DataTable.init(cfg), activeCell: { rowId: '$header', columnId: 'name' } }
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(model),
      Scene.Mount.resolve(
        { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
        DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const table = simulation.html.children?.[0]
        const head = table && isVNode(table) ? table.children?.[1] : undefined
        const row = head && isVNode(head) ? head.children?.[0] : undefined
        const cells = row && isVNode(row) ? row.children ?? [] : []
        expect(row && isVNode(row) ? row.data?.attrs?.['aria-rowindex'] : undefined).toBe('1')
        expect(cells[1] && isVNode(cells[1]) ? cells[1].data?.attrs?.['aria-colindex'] : undefined).toBe('2')
        expect(cells[1] && isVNode(cells[1]) ? cells[1].data?.props?.tabIndex : undefined).toBe(0)
        expect(cells[2] && isVNode(cells[2]) ? cells[2].data?.props?.tabIndex : undefined).toBe(-1)
        return simulation
      },
    )
  })
})

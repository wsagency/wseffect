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
})

import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; name: string; score: number }
const rows: ReadonlyArray<Row> = [
  { id: 'a', name: 'Alpha', score: 2 },
  { id: 'b', name: 'Beta', score: 1 },
]
type VNode = Exclude<Html, string | null>

function isVNode(node: string | VNode | null): node is VNode {
  return node !== null && typeof node !== 'string'
}
function findVNode(
  html: Html | undefined,
  predicate: (node: VNode) => boolean,
): VNode | undefined {
  if (html === undefined || !isVNode(html)) return undefined
  if (predicate(html)) return html
  for (const child of html.children ?? []) {
    if (child === null || typeof child === 'string') continue
    const match = findVNode(child, predicate)
    if (match !== undefined) return match
  }
  return undefined
}

function findVNodes(
  html: Html | undefined,
  predicate: (node: VNode) => boolean,
): ReadonlyArray<VNode> {
  if (html === undefined || !isVNode(html)) return []
  const matches: VNode[] = predicate(html) ? [html] : []
  for (const child of html.children ?? []) {
    if (child === null || typeof child === 'string') continue
    matches.push(...findVNodes(child, predicate))
  }
  return matches
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
  it('renders its configured initial viewport before the browser measures it', () => {
    const cfg = {
      ...config(),
      viewportHeight: 36,
    }
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(DataTable.init(cfg)),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.expect(Scene.selector('tr[data-virtual-list-item-key="a"]')).toExist(),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.MeasuredRows({ measurements: [] }),
      ),
    )
  })
  it('renders a native table caption, headers, and aria-sort', () => {
    const cfg = config()
    const model = DataTable.update(DataTable.init(cfg), cfg, DataTable.Message.SortChanged({ columnId: 'name' })).model
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(model),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      Scene.expect(Scene.role('table')).toExist(),
      Scene.expect(Scene.text('People')).toExist(),
      Scene.expect(Scene.text('Name')).toExist(),
      Scene.expect(Scene.selector('th[aria-sort="ascending"]')).toExist(),
      Scene.expect(Scene.text('Alpha')).toExist(),
    )
  })

  it('renders a matching Table-style capture without the selection column', () => {
    const cfg = Object.assign(config(), {
      rowHeight: 44,
      showSelection: false,
      tableStyle: { size: '2' as const, variant: 'surface' as const },
    })
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(DataTable.init(cfg)),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const rows = findVNodes(simulation.html, node =>
          node.data?.attrs?.['data-virtual-list-item-key'] !== undefined)
        expect(rows).toHaveLength(2)
        expect(rows[0]?.children).toHaveLength(2)
        return simulation
      },
      Scene.expect(Scene.selector('.rt-TableRoot.rt-r-size-2.rt-variant-surface')).toExist(),
      Scene.expect(Scene.selector('.rt-TableRootTable')).toExist(),
      Scene.expect(Scene.selector('.rt-TableColumnHeaderCell')).toExist(),
      Scene.expect(Scene.selector('input[type="checkbox"]')).not.toExist(),
      Scene.expect(Scene.selector('tr[data-virtual-list-item-key="a"]')).toHaveStyle('height', '44px'),
    )
  })
  it('sorts native table headers through buttons while keeping aria-sort on the header cell', () => {
    const cfg = config()
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(DataTable.init(cfg)),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      Scene.click(Scene.role('button', { name: 'Name' })),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const command = simulation.commands.find(candidate => candidate.name === 'ApplyScroll')
        return command === undefined
          ? simulation
          : Scene.Command.resolve(command as never, VirtualList.Message.CompletedApplyScroll({
            version: 'args' in command && typeof command.args === 'object' && command.args !== null && 'version' in command.args && typeof command.args.version === 'number'
              ? command.args.version
              : 1,
            outcome: { _tag: 'Skipped' },
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
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
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
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const grid = findVNode(simulation.html, node => node.data?.attrs?.role === 'grid')
        expect(grid?.data?.props?.tabIndex).toBe(0)
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
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const rows = findVNodes(simulation.html, node =>
          node.data?.attrs?.['data-virtual-list-item-key'] !== undefined)
        expect(rows).toHaveLength(2)
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
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const headerRow = findVNode(simulation.html, node =>
          node.data?.attrs?.role === 'row' &&
          node.data.attrs['aria-rowindex'] === '1',
        )
        const nameHeader = findVNode(simulation.html, node =>
          node.data?.attrs?.role === 'columnheader' &&
          node.data.attrs['aria-colindex'] === '2',
        )
        const scoreHeader = findVNode(simulation.html, node =>
          node.data?.attrs?.role === 'columnheader' &&
          node.data.attrs['aria-colindex'] === '3',
        )
        expect(headerRow).toBeDefined()
        expect(nameHeader?.data?.props?.tabIndex).toBe(0)
        expect(scoreHeader?.data?.props?.tabIndex).toBe(-1)
        return simulation
      },
    )
  })
  it('moves from the first mounted row to the sticky header with overscan disabled', () => {
    const cfg: DataTable.Config<Row> = {
      ...config(true),
      id: 'table-scene-keyboard-boundary',
      viewportHeight: 36,
      overscanRows: 0,
      tableStyle: { size: '2', variant: 'surface' },
    }
    const active = DataTable.update(
      DataTable.init(cfg),
      cfg,
      DataTable.Message.ActiveCellChanged({ rowId: 'a', columnId: 'name' }),
    ).model
    const moved = DataTable.update(
      active,
      cfg,
      DataTable.Message.GridKey({ key: 'ArrowUp', ctrlKey: false }),
    )
    expect(moved.model.activeCell).toEqual({ rowId: '$header', columnId: 'name' })

    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(moved.model),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({
          containerWidth: 400,
          containerHeight: cfg.viewportHeight!,
        }),
      ),
      Scene.expect(Scene.selector('.rt-TableHeader')).toExist(),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const activeHeader = findVNode(simulation.html, node =>
          node.data?.attrs?.role === 'columnheader' &&
          node.data.attrs['aria-colindex'] === '2',
        )
        expect(activeHeader?.data?.props?.tabIndex).toBe(0)
        return simulation
      },
    )
  })
  it('updates the VirtualList window from the model scroll position', () => {
    const cfg: DataTable.Config<Row> = {
      ...config(),
      id: 'table-scene-scroll-window',
      rows: [
        ...rows,
        { id: 'c', name: 'Charlie', score: 3 },
        { id: 'd', name: 'Delta', score: 4 },
      ],
      overscanRows: 0,
    }
    const measured = DataTable.update(
      DataTable.init(cfg),
      cfg,
      DataTable.Message.VirtualList({
        message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: cfg.rowHeight }),
      }),
    ).model
    const scrolled = DataTable.update(
      measured,
      cfg,
      DataTable.Message.VirtualList({
        message: VirtualList.Message.ObservedContainerScroll({
          scrollTop: cfg.rowHeight * 3,
          scrollHeight: cfg.rows.length * cfg.rowHeight,
          containerHeight: cfg.rowHeight,
          anchor: { _tag: 'None' },
        }),
      }),
    ).model
    Scene.scene(
      { update: updateFor(cfg), view: viewFor(cfg) },
      Scene.given(scrolled),
      Scene.Mount.resolve(
        { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
        DataTable.Message.VirtualList({
          message: VirtualList.Message.CompletedApplyScroll({
            version: -1,
            outcome: { _tag: 'Skipped' },
          }),
        }),
      ),
      Scene.Mount.resolve(
        { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
        VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: cfg.rowHeight }),
      ),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const command = simulation.commands.find(candidate => candidate.name === 'ApplyScroll')
        return command === undefined
          ? simulation
          : Scene.Command.resolve(command as never, VirtualList.Message.CompletedApplyScroll({
            version: 1,
            outcome: { _tag: 'Skipped' },
          }))(simulation)
      },
      Scene.expect(Scene.selector('tr[data-virtual-list-item-key="d"]')).toExist(),
      Scene.expect(Scene.selector('tr[data-virtual-list-item-key="a"]')).not.toExist(),
    )
  })
})

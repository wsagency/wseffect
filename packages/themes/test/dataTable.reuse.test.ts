import type { HtmlBuilder } from 'foldkit/html'
import * as VirtualList from '@foldkit/ui/virtualList'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; label: string }
const originalRows: ReadonlyArray<Row> = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
]

function makeConfig(rows: ReadonlyArray<Row>, columns: ReadonlyArray<DataTable.Column<Row>>): DataTable.Config<Row> {
  return {
    id: 'data-table-reuse',
    rows,
    getRowId: row => row.id,
    columns,
    caption: null,
    selectedRowIds: new Set(),
    isGrid: false,
    rowHeight: 36,
    overscanRows: 2,
  }
}

function tableScene(renderCount: Map<string, number>, changeRows: boolean) {
  const columns: ReadonlyArray<DataTable.Column<Row>> = [{
    id: 'label',
    header: null,
    isSortable: false,
    accessor: row => row.label,
    render: row => {
      renderCount.set(row.id, (renderCount.get(row.id) ?? 0) + 1)
      return null
    },
  }]
  let currentConfig = makeConfig(originalRows, columns)
  const update = (model: DataTable.Model, message: DataTable.Message) => {
    if (changeRows && message._tag === 'RowsChanged') {
      currentConfig = makeConfig(originalRows.map(row => row.id === 'a' ? { ...row, label: 'Alpha updated' } : row), columns)
    }
    return DataTable.update(model, currentConfig, message)
  }
  const view = (model: DataTable.Model, h: HtmlBuilder<DataTable.Message>) => h.div([], [
    ...(changeRows ? [h.button([h.OnClick(DataTable.Message.RowsChanged())], ['Change row'])] : []),
    DataTable.view(model, currentConfig, h),
  ])
  const cfg = currentConfig
  return {
    update,
    view,
    initialModel: DataTable.init(cfg),
    resolveMeasurement: Scene.Mount.resolve(
      { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
      DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }) }),
    ),
  }
}


describe('DataTable row view cache reuse', () => {
  it('unrelated update executes 0 row views', () => {
    const renderCount = new Map<string, number>()
    const scene = tableScene(renderCount, false)
    Scene.scene(
      { update: scene.update, view: scene.view },
      Scene.given(scene.initialModel),
      scene.resolveMeasurement,
      Scene.tap(() => {
        expect([...renderCount.values()]).toEqual([1, 1, 1])
      }),
      Scene.click('input[aria-label="Select all visible rows"]'),
      Scene.expectOutMessage(DataTable.OutMessage.SelectionChanged({ ids: ['a', 'b', 'c'] })),
      Scene.tap(() => {
        expect([...renderCount.values()]).toEqual([1, 1, 1])
      }),
    )
  })
  it('bounds and evicts render cache while scrolling 10k rows', () => {
    const renderCount = new Map<string, number>()
    const data = Array.from({ length: 10_000 }, (_, index) => ({ id: `row-${index}`, label: `Row ${index}` }))
    const cfg: DataTable.Config<Row> = {
      id: 'data-table-reuse-10k',
      rows: data,
      getRowId: row => row.id,
      columns: [{
        id: 'label',
        header: null,
        isSortable: false,
        accessor: row => row.label,
        render: row => {
          renderCount.set(row.id, (renderCount.get(row.id) ?? 0) + 1)
          return null
        },
      }],
      caption: null,
      selectedRowIds: new Set(),
      isGrid: false,
      rowHeight: 360,
      overscanRows: 0,
    }
    const view = (model: DataTable.Model, h: HtmlBuilder<DataTable.Message>) => DataTable.view(model, cfg, h)
    const update = (model: DataTable.Model, message: DataTable.Message) => DataTable.update(model, cfg, message)
    const resize = Scene.Mount.resolve(
      { name: 'ObserveDataTable', args: { id: `${cfg.id}-virtual-list`, tableId: cfg.id } },
      DataTable.Message.VirtualList({ message: VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 1 }) }),
    )
    const scrollSteps = Array.from({ length: data.length }, (_, offset) => {
      const index = offset === data.length - 1 ? 0 : offset + 1
      return Scene.Subscription.emit(DataTable.Message.VirtualList({
        message: VirtualList.Message.ObservedContainerScroll({
          scrollTop: index * cfg.rowHeight,
          scrollHeight: data.length * cfg.rowHeight,
          containerHeight: 1,
          anchor: { _tag: 'None' },
        }),
      }))
    })
    Scene.scene(
      { update, view },
      Scene.given(DataTable.init(cfg)),
      resize,
      Scene.tap(() => expect(renderCount.size).toBe(1)),
      ...scrollSteps,
      Scene.tap(() => {
        expect(renderCount.get('row-0')).toBe(2)
        expect(renderCount.get('row-9999')).toBe(1)
      }),
    )
  })

  it('changed row memo arg executes exactly 1 affected view', () => {
    const renderCount = new Map<string, number>()
    const scene = tableScene(renderCount, true)
    Scene.scene(
      { update: scene.update, view: scene.view },
      Scene.given(scene.initialModel),
      scene.resolveMeasurement,
      Scene.tap(() => {
        expect([...renderCount.values()]).toEqual([1, 1, 1])
      }),
      Scene.click(Scene.role('button', { name: 'Change row' })),
      (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
        const scrollCommand = simulation.commands.find(command => command.name === 'ScrollDataTableRow')
        return scrollCommand === undefined
          ? simulation
          : Scene.Command.resolve(scrollCommand as never, VirtualList.Message.ObservedContainerScroll({
            scrollTop: 0,
            scrollHeight: 180,
            containerHeight: 180,
            anchor: { _tag: 'None' },
          }))(simulation)
      },
      Scene.tap(() => {
        expect(renderCount.get('a')).toBe(2)
        expect(renderCount.get('b')).toBe(1)
        expect(renderCount.get('c')).toBe(1)
      }),
    )
  })
})

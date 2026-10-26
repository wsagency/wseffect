import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as DataTable from '../src/components/data-table.js'

type Row = { id: string; label: string }
const rows: ReadonlyArray<Row> = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
]

function gridScene(renderCount: Map<string, number>, changeRows: boolean) {
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
  const makeConfig = (sourceRows: ReadonlyArray<Row>): DataTable.Config<Row> => ({
    id: 'data-table-grid-reuse',
    rows: sourceRows,
    getRowId: row => row.id,
    columns,
    caption: null,
    selectedRowIds: new Set(),
    isGrid: true,
    rowHeight: 36,
    overscanRows: 1,
  })
  let currentConfig = makeConfig(rows)
  const update = (model: DataTable.Model, message: DataTable.Message) => {
    if (changeRows && message._tag === 'RowsChanged') {
      currentConfig = makeConfig(rows.map(row => row.id === 'a' ? { ...row, label: 'Alpha updated' } : row))
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
    resolveLifetime: Scene.Mount.resolve(
      { name: 'DataTableStateLifetime', args: { tableId: cfg.id } },
      DataTable.Message.VirtualList({
        message: VirtualList.Message.CompletedApplyScroll({
          version: -1,
          outcome: { _tag: 'Skipped' },
        }),
      }),
    ),
    resize: Scene.Mount.resolve(
      { name: 'ObserveVirtualList', args: { id: `${cfg.id}-virtual-list` } },
      VirtualList.Message.ResizedContainer({ containerWidth: 400, containerHeight: 180 }),
    ),
  }
}

const resolveScrollCommand = (simulation: Scene.SceneSimulation<DataTable.Model, DataTable.Message, DataTable.OutMessage>) => {
  const command = simulation.commands.find(candidate => candidate.name === 'ApplyScroll')
  return command === undefined
    ? simulation
    : Scene.Command.resolve(command as never, VirtualList.Message.CompletedApplyScroll({
      version: 'args' in command && typeof command.args === 'object' && command.args !== null && 'version' in command.args && typeof command.args.version === 'number'
        ? command.args.version
        : 1,
      outcome: { _tag: 'Skipped' },
    }))(simulation)
}

describe('DataTable Grid row view cache reuse', () => {
  it('unrelated grid update executes 0 row views', () => {
    const renderCount = new Map<string, number>()
    const scene = gridScene(renderCount, false)
    Scene.scene(
      { update: scene.update, view: scene.view },
      Scene.given(scene.initialModel),
      scene.resolveLifetime,
      scene.resize,
      Scene.tap(() => expect([...renderCount.values()]).toEqual([1, 1, 1])),
      Scene.click('input[aria-label="Select row a"]'),
      Scene.expectOutMessage(DataTable.OutMessage.SelectionChanged({ ids: ['a'] })),
      Scene.tap(() => expect([...renderCount.values()]).toEqual([1, 1, 1])),
    )
  })

  it('changed grid memo arg executes exactly 1 affected view', () => {
    const renderCount = new Map<string, number>()
    const scene = gridScene(renderCount, true)
    Scene.scene(
      { update: scene.update, view: scene.view },
      Scene.given(scene.initialModel),
      scene.resolveLifetime,
      scene.resize,
      Scene.tap(() => expect([...renderCount.values()]).toEqual([1, 1, 1])),
      Scene.click(Scene.role('button', { name: 'Change row' })),
      resolveScrollCommand,
      Scene.tap(() => {
        expect(renderCount.get('a')).toBe(2)
        expect(renderCount.get('b')).toBe(1)
        expect(renderCount.get('c')).toBe(1)
      }),
    )
  })
})

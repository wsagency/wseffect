import { makeElement, run } from 'foldkit/runtime'
import * as DataTable from '../../../themes/src/components/data-table.js'
import '../../../themes/src/css-components/data-table.css'

const rows = [
  { id: 'b', name: 'Beta', score: 2 },
  { id: 'a', name: 'Alpha', score: 1 },
]
const config = {
  id: 'grid-focus-browser-test',
  rows,
  getRowId: row => row.id,
  columns: [
    { id: 'name', header: null, accessor: row => row.name, isSortable: true },
    { id: 'score', header: null, accessor: row => String(row.score), isSortable: true },
  ],
  caption: null,
  selectedRowIds: new Set(),
  isGrid: true,
  rowHeight: 36,
  overscanRows: 2,
}
let renderedConfig

const app = makeElement({
  Model: DataTable.Model,
  init: () => ({ model: DataTable.init(config) }),
  update: (model, message) => DataTable.update(model, config, message),
  view: (model, h) => {
    renderedConfig ??= {
      ...config,
      caption: h.span([], ['People']),
      columns: config.columns.map((column, index) => ({
        ...column,
        header: h.span([], [index === 0 ? 'Name' : 'Score']),
      })),
    }
    return DataTable.view(model, renderedConfig, h)
  },
  container: document.getElementById('app'),
})

run(app)

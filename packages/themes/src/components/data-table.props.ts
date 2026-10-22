import type { Html } from 'foldkit/html'

export type Column<Row> = Readonly<{
  id: string
  header: Html
  accessor: (row: Row) => string
  render?: (row: Row) => Html
  isSortable: boolean
  width?: string
  minWidth?: string
  align?: 'start' | 'center' | 'end'
  isVisible?: boolean
  searchText?: (row: Row) => string
}>

export type Config<Row> = Readonly<{
  id: string
  rows: ReadonlyArray<Row>
  getRowId: (row: Row) => string
  columns: ReadonlyArray<Column<Row>>
  caption: Html
  selectedRowIds: ReadonlySet<string>
  isGrid: boolean
  /**
   * Fixed pixel height for each virtualized data row. Cell content is kept to one line and truncated with an ellipsis.
   */
  rowHeight: number
  overscanRows: number
}>

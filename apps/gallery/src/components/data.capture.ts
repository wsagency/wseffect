import type { HtmlBuilder } from 'foldkit/html'
import * as Table from '@wsagency/wseffect-themes/components/table'
import * as DataList from '@wsagency/wseffect-themes/components/data-list'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const table = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}, rows: ReadonlyArray<Record<string, unknown>> = [
  { name: 'Ada Lovelace', status: 'Programmer' },
  { name: 'Grace Hopper', status: 'Computer scientist' },
], valueHeading = 'Role') => Table.Root.view(props as typeof Table.Root.Props.Type, [
  Table.Header.view({}, [Table.Row.view({}, [Table.ColumnHeaderCell.view({}, ['Name'], h), Table.ColumnHeaderCell.view({}, [valueHeading], h)], h)], h),
  Table.Body.view({}, rows.map(row => Table.Row.view({}, [Table.RowHeaderCell.view({}, [String(row.name ?? '')], h), Table.Cell.view({}, [String(row.status ?? '')], h)], h)), h),
], h)
const list = <M>(h: HtmlBuilder<M>, entries: ReadonlyArray<readonly [string, string]> = [['Name', 'Ada Lovelace'], ['Role', 'Programmer']], props: Record<string, unknown> = {}) => DataList.Root.view(props as typeof DataList.Root.Props.Type, entries.map(([label, value]) => DataList.Item.view({}, [DataList.Label.view({}, [label], h), DataList.Value.view({}, [value], h)], h)), h)

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => request.component === 'Table'
    ? table(h, request.props, request.fixture ?? [], 'Status')
    : list(h, [['Owner', 'Radix2Solid'], ['Status', 'Active']], request.props))
}

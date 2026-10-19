import type { PageView } from '../main'

interface Row {
  readonly id: number
  readonly name: string
  readonly account: string
  readonly region: string
  readonly amount: number
}

let cachedRows: Row[] | undefined

function getRows(): Row[] {
  return (cachedRows ??= Array.from({ length: 15_000 }, (_, index) => ({
    id: index + 1,
    name: `Record ${String(index + 1).padStart(5, '0')}`,
    account: `Account ${index % 117}`,
    region: ['North', 'South', 'East', 'West'][index % 4]!,
    amount: ((index * 379) % 100_000) / 100,
  })))
}

const VISIBLE_ROWS = 15

export const view: PageView = (model, h, messages) => {
  const filter = model.filter.trim().toLowerCase()
  const filtered = getRows().filter((row) => `${row.name} ${row.account} ${row.region}`.toLowerCase().includes(filter))
  if (model.descending) filtered.sort((left, right) => right.amount - left.amount)
  const visible = filtered.slice(0, VISIBLE_ROWS)

  return {
    title: 'VirtualList performance fixture',
    body: h.div([h.Class('page-shell')], [
      h.nav([h.Class('page-nav')], [
        h.a([h.Attribute('href', '/virtual-list')], ['Virtual list']),
        h.a([h.Attribute('href', '/form')], ['Form']),
        h.a([h.Attribute('href', '/menus')], ['Menus']),
      ]),
      h.main([h.Class('virtual-list-page')], [
        h.h1([], ['Virtual list']),
        h.div([h.Class('table-toolbar')], [
          h.input([
            h.Attribute('type', 'text'),
            h.Attribute('aria-label', 'Filter rows'),
            h.Attribute('value', model.filter),
            h.Attribute('data-perf', 'vl-filter'),
            h.OnInput((value) => messages.ChangedFilter({ value })),
          ]),
          h.button([h.Attribute('data-perf', 'vl-sort'), h.OnClick(messages.ClickedSort())], [model.descending ? 'Sort ascending' : 'Sort descending']),
          h.span([h.Attribute('aria-live', 'polite')], [`${filtered.length} records`]),
        ]),
        h.div([h.Class('virtual-scroll'), h.Attribute('data-testid', 'table-viewport')], [
          h.div([
            h.Class('virtual-spacer'),
            h.Attribute('style', `height: ${filtered.length * 32}px`),
          ], visible.map((row, visibleIndex) => h.div([
            h.Key(String(row.id)),
            h.Class('virtual-row'),
            h.Attribute('data-perf', 'vl-row'),
            h.Attribute('data-row-id', String(row.id)),
            h.Attribute('style', `transform: translateY(${visibleIndex * 32}px)`),
          ], [
            h.span([h.Class('virtual-cell')], [String(row.id)]),
            h.input([
              h.Class('virtual-cell'),
              h.Attribute('type', 'text'),
              h.Attribute('aria-label', `Record ${row.id}`),
              h.Attribute('value', visibleIndex === 0 ? model.cellValue : row.name),
              ...(visibleIndex === 0 ? [h.Attribute('data-perf', 'vl-cell-input')] : []),
              h.OnInput((value) => messages.ChangedCell({ value })),
            ]),
            h.span([h.Class('virtual-cell')], [row.account]),
            h.span([h.Class('virtual-cell')], [row.region]),
            h.span([h.Class('virtual-cell')], [row.amount.toFixed(2)]),
            h.button([
              h.Attribute('type', 'button'),
              h.Attribute('aria-pressed', String(model.selected === row.id)),
              ...(visibleIndex === 0 ? [h.Attribute('data-perf', 'vl-select')] : []),
              h.OnClick(messages.ClickedSelect({ index: row.id })),
            ], [model.selected === row.id ? 'Selected' : 'Select']),
          ]))),
        ]),
      ]),
    ]),
  }
}

import type { PageView } from '../main'

const rows = Array.from({ length: 10_000 }, (_, index) => ({
  index,
  name: `Record ${String(index + 1).padStart(5, '0')}`,
}))
const VISIBLE_ROWS = 15

export const view: PageView = (model, h, messages) => {
  const filter = model.filter.toLowerCase()
  const filtered = rows.filter((row) => row.name.toLowerCase().includes(filter))
  if (model.descending) filtered.reverse()
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
          h.button([h.OnClick(messages.ClickedSort())], [model.descending ? 'Sort ascending' : 'Sort descending']),
          h.span([h.Attribute('aria-live', 'polite')], [`${filtered.length} records`]),
        ]),
        h.table([h.Class('virtual-table')], [
          h.thead([], [h.tr([], [
            h.th([], ['Record']),
            h.th([], ['Value']),
            h.th([], ['Selection']),
          ])]),
          h.tbody([], visible.map((row, visibleIndex) => h.tr([h.Key(String(row.index)), h.Class('virtual-row')], [
            h.td([], [row.name]),
            h.td([], [h.input([
              h.Attribute('type', 'text'),
              h.Attribute('aria-label', `Value for ${row.name}`),
              h.Attribute('value', visibleIndex === 0 ? model.cellValue : row.name),
              ...(visibleIndex === 0 ? [h.Attribute('data-perf', 'vl-cell-input')] : []),
              h.OnInput((value) => messages.ChangedCell({ value })),
            ])]),
            h.td([], [h.button([
              h.Attribute('type', 'button'),
              h.Attribute('aria-pressed', String(model.selected === row.index)),
              ...(visibleIndex === 0 ? [h.Attribute('data-perf', 'vl-select')] : []),
              h.OnClick(messages.ClickedSelect({ index: row.index })),
            ], [model.selected === row.index ? 'Selected' : 'Select'])]),
          ]))),
        ]),
      ]),
    ]),
  }
}

import type { PageView } from '../main'

export const view: PageView = (model, h, messages) => ({
  title: 'Form performance fixture',
  body: h.div([h.Class('page-shell')], [
    h.nav([h.Class('page-nav')], [
      h.a([h.Attribute('href', '/virtual-list')], ['Virtual list']),
      h.a([h.Attribute('href', '/form')], ['Form']),
      h.a([h.Attribute('href', '/menus')], ['Menus']),
    ]),
    h.main([h.Class('form-page')], [
      h.h1([], ['Form']),
      h.div([h.Class('form-grid')], model.fields.map((value, index) => h.input([
        h.Key(String(index)),
        h.Attribute('type', 'text'),
        h.Attribute('aria-label', `Field ${index + 1}`),
        h.Attribute('value', value),
        ...(index === 0 ? [h.Attribute('data-perf', 'form-field-0')] : []),
        h.OnInput((nextValue) => messages.ChangedFormField({ index, value: nextValue })),
      ]))),
    ]),
  ]),
})

import type { PageView } from '../main'

let menuIndexes: readonly number[] | undefined

function getMenuIndexes(): readonly number[] {
  return (menuIndexes ??= Array.from({ length: 200 }, (_, index) => index))
}

export const view: PageView = (model, h, messages) => ({
  title: 'Menus performance fixture',
  body: h.div([h.Class('page-shell')], [
    h.nav([h.Class('page-nav')], [
      h.a([h.Attribute('href', '/virtual-list')], ['Virtual list']),
      h.a([h.Attribute('href', '/form')], ['Form']),
      h.a([h.Attribute('href', '/menus')], ['Menus']),
    ]),
    h.main([h.Class('menus-page')], [
      h.h1([], ['Menus']),
      h.button([h.Attribute('data-perf', 'menus-tick'), h.OnClick(messages.ClickedMenusTick())], [`Unrelated update ${model.menuTicks}`]),
      h.div([h.Class('menu-grid')], getMenuIndexes().map((index) => h.button([
        h.Key(String(index)),
        h.Attribute('type', 'button'),
        h.Attribute('aria-haspopup', 'menu'),
        h.Attribute('data-menu-index', String(index)),
      ], [`Menu ${index + 1}`]))),
    ]),
  ]),
})

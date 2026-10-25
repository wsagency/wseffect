import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as TextField from '@wsagency/wseffect-themes/components/text-field'
import { Message as VirtualListMessage, page as virtualListPage } from '../src/pages/virtualList.js'
import { page as formPage } from '../src/pages/form.js'
import { Menu, page as menusPage } from '../src/pages/menus.js'

const inputs = {
  path: '/virtual-list',
  date: '2026-10-19',
  accentColor: 'indigo',
  grayColor: 'auto',
  radius: 'medium',
  scaling: '100%',
  appearance: 'inherit',
  panelBackground: 'translucent',
} as const

describe('gallery performance pages', () => {
  it('virtualizes 10,000 filterable, sortable rows in either direction', () => {
    const initial = virtualListPage.init()
    expect(initial.model.items).toHaveLength(10_000)
    expect(initial.model.items[0]).toBe('item-0')
    expect(virtualListPage.update(initial.model, VirtualListMessage.FilterChanged({ value: '9999' })).model.items)
      .toEqual(['item-9999'])
    const descending = virtualListPage.update(initial.model, VirtualListMessage.ToggleSort()).model
    expect(descending.items[0]).toBe('item-9999')
    const descendingFiltered = virtualListPage.update(descending, VirtualListMessage.FilterChanged({ value: 'item 99' })).model.items
    expect(descendingFiltered[0]).toBe('item-9999')
    expect(descendingFiltered.at(-1)).toBe('item-99')
    const ascending = virtualListPage.update(descending, VirtualListMessage.ToggleSort()).model
    expect(ascending.items[0]).toBe('item-0')
    Scene.scene(
      { update: virtualListPage.update, view: (model, h) => virtualListPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'ObserveVirtualList' }, { _tag: 'ResizedContainer', containerHeight: 360, containerWidth: 640 }),
      Scene.expect(Scene.selector('#vl-filter')).toExist(),
      Scene.expect(Scene.selector('#vl-sort')).toExist(),
      Scene.expect(Scene.selector('[data-perf="vl-cell-input"]')).toExist(),
      Scene.expect(Scene.selector('[data-perf="vl-select"]')).toExist(),
      Scene.expect(Scene.selector('#vl-row-20')).toBeAbsent(),
    )
  })

  it('keeps normalized search text in sync with edited values', () => {
    const initial = virtualListPage.init()
    const changed = virtualListPage.update(initial.model, VirtualListMessage.CellChanged({
      id: 'item-0',
      value: 'Changed value',
    })).model
    expect(virtualListPage.update(changed, VirtualListMessage.FilterChanged({ value: 'CHANGED' })).model.items)
      .toEqual(['item-0'])
  })

  it('reuses the other 199 field views when field zero changes', () => {
    const view = vi.spyOn(TextField, 'view')
    const initial = formPage.init()
    Scene.scene(
      { update: formPage.update, view: (model, h) => formPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.type('#form-field-0', 'changed'),
      Scene.expect(Scene.selector('#form-field-0')).toHaveAttr('value', 'changed'),
      Scene.expect(Scene.selector('[data-perf="form-field-0"]')).toExist(),
    )
    expect(view).toHaveBeenCalledTimes(201)
  })

  it('renders 200 memoized menus and no menu views for an unrelated tick', () => {
    const embed = vi.spyOn(Menu, 'embed')
    const initial = menusPage.init()
    Scene.scene(
      { update: menusPage.update, view: (model, h) => menusPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.click(Scene.selector('#menus-tick')),
      Scene.expect(Scene.selector('#menus-tick')).toExist(),
    )
    expect(embed).toHaveBeenCalledTimes(200)
  })
})

import { describe, expect, it } from 'vitest'
import { pageKeysForRoute } from '../src/routes.js'

describe('gallery route page keys', () => {
  it.each([
    ['/', []],
    ['/layout', ['layout']],
    ['/typography', ['typography']],
    ['/buttons', ['buttons']],
    ['/cards', ['cards']],
    ['/text-field', ['textField']],
    ['/dialog', ['dialog']],
    ['/dropdown-menu', ['dropdownMenu']],
    ['/tabs', ['tabs']],
    ['/theme', ['theme']],
    ['/shared', ['sharedA', 'sharedB']],
    ['/shared-a', ['sharedA']],
    ['/virtual-list', ['virtualList']],
    ['/form', ['form']],
    ['/menus', ['menus']],
  ] as const)('maps %s to its lazy pages', (route, keys) => {
    expect(pageKeysForRoute(route)).toEqual(keys)
  })
})

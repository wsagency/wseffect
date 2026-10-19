import type { Page } from '@playwright/test'

export interface PerfScenario {
  readonly id: 'vl-cell' | 'vl-filter' | 'vl-sort' | 'vl-select' | 'form-field' | 'menus-tick'
  readonly route: string
  readonly inputEventType: 'click' | 'keydown'
  readonly act: (page: Page) => Promise<void>
  readonly ceilingMs: 50 | 30
}

export const SCENARIOS: ReadonlyArray<PerfScenario> = [
  {
    id: 'vl-cell',
    route: '/virtual-list',
    inputEventType: 'keydown',
    act: async (page) => {
      const input = page.locator('[data-perf="vl-cell-input"]')
      await input.fill('')
      await input.pressSequentially('Updated cell', { delay: 50 })
    },
    ceilingMs: 50,
  },
  {
    id: 'vl-filter',
    route: '/virtual-list',
    inputEventType: 'keydown',
    act: async (page) => {
      const input = page.locator('[data-perf="vl-filter"]')
      await input.fill('')
      await input.pressSequentially('row 9', { delay: 50 })
    },
    ceilingMs: 50,
  },
  {
    id: 'vl-sort',
    route: '/virtual-list',
    inputEventType: 'click',
    act: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'vl-select',
    route: '/virtual-list',
    inputEventType: 'click',
    act: async (page) => page.locator('[data-perf="vl-select"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'form-field',
    route: '/form',
    inputEventType: 'keydown',
    act: async (page) => {
      const input = page.locator('[data-perf="form-field-0"]')
      await input.fill('')
      await input.pressSequentially('Updated field', { delay: 50 })
    },
    ceilingMs: 30,
  },
  {
    id: 'menus-tick',
    route: '/menus',
    inputEventType: 'click',
    act: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    ceilingMs: 30,
  },
]

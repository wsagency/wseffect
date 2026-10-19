import type { Page } from '@playwright/test'

export interface PerfScenario {
  readonly id: 'vl-cell' | 'vl-filter' | 'vl-sort' | 'vl-select' | 'form-field' | 'menus-tick'
  readonly route: string
  readonly act: (page: Page) => Promise<void>
  readonly ceilingMs: 50 | 30
}

export const SCENARIOS: ReadonlyArray<PerfScenario> = [
  {
    id: 'vl-cell',
    route: '/virtual-list',
    act: async (page) => page.locator('[data-perf="vl-cell-input"]').fill('Updated cell'),
    ceilingMs: 50,
  },
  {
    id: 'vl-filter',
    route: '/virtual-list',
    act: async (page) => page.locator('[data-perf="vl-filter"]').fill('row 9'),
    ceilingMs: 50,
  },
  {
    id: 'vl-sort',
    route: '/virtual-list',
    act: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'vl-select',
    route: '/virtual-list',
    act: async (page) => page.locator('[data-perf="vl-select"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'form-field',
    route: '/form',
    act: async (page) => page.locator('[data-perf="form-field-0"]').fill('Updated field'),
    ceilingMs: 30,
  },
  {
    id: 'menus-tick',
    route: '/menus',
    act: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    ceilingMs: 30,
  },
]

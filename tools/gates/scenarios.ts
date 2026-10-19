import type { Page } from '@playwright/test'

export interface PerfScenario {
  readonly id: 'vl-cell' | 'vl-filter' | 'vl-sort' | 'vl-select' | 'form-field' | 'menus-tick'
  readonly route: string
  readonly inputEventType: 'click' | 'keydown'
  readonly prepare: (page: Page) => Promise<void>
  readonly warmup: (page: Page) => Promise<void>
  readonly reset: (page: Page) => Promise<void>
  readonly act: (page: Page) => Promise<void>
  readonly ceilingMs: 50 | 30
}

export const SCENARIOS: ReadonlyArray<PerfScenario> = [
  {
    id: 'vl-cell',
    route: '/virtual-list',
    inputEventType: 'keydown',
    prepare: async (page) => page.locator('[data-perf="vl-cell-input"]').fill(''),
    warmup: async (page) => page.locator('[data-perf="vl-cell-input"]').press('x'),
    reset: async (page) => page.locator('[data-perf="vl-cell-input"]').fill(''),
    act: async (page) => page.locator('[data-perf="vl-cell-input"]').press('u'),
    ceilingMs: 50,
  },
  {
    id: 'vl-filter',
    route: '/virtual-list',
    inputEventType: 'keydown',
    prepare: async (page) => page.locator('[data-perf="vl-filter"]').fill(''),
    warmup: async (page) => page.locator('[data-perf="vl-filter"]').press('x'),
    reset: async (page) => page.locator('[data-perf="vl-filter"]').fill(''),
    act: async (page) => page.locator('[data-perf="vl-filter"]').press('9'),
    ceilingMs: 50,
  },
  {
    id: 'vl-sort',
    route: '/virtual-list',
    inputEventType: 'click',
    warmup: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    reset: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    act: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'vl-select',
    route: '/virtual-list',
    inputEventType: 'click',
    warmup: async (page) => page.locator('[data-perf="vl-select"]').click(),
    reset: async (page) => {
      await page.reload({ waitUntil: 'networkidle' })
    },
    act: async (page) => page.locator('[data-perf="vl-select"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'form-field',
    route: '/form',
    inputEventType: 'keydown',
    prepare: async (page) => page.locator('[data-perf="form-field-0"]').fill(''),
    warmup: async (page) => page.locator('[data-perf="form-field-0"]').press('x'),
    reset: async (page) => page.locator('[data-perf="form-field-0"]').fill(''),
    act: async (page) => page.locator('[data-perf="form-field-0"]').press('u'),
    ceilingMs: 30,
  },
  {
    id: 'menus-tick',
    route: '/menus',
    inputEventType: 'click',
    warmup: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    reset: async (page) => {
      await page.reload({ waitUntil: 'networkidle' })
    },
    act: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    ceilingMs: 30,
  },
]

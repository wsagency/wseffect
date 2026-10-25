import type { Page } from '@playwright/test'

export interface PerfScenario {
  readonly id:
    | 'vl-cell' | 'vl-filter' | 'vl-sort' | 'vl-select' | 'form-field' | 'shared-date' | 'menus-tick'
    | 'dt-update' | 'dt-filter' | 'dt-sort' | 'dt-select'
    | 'select-open' | 'select-choose' | 'tooltip-open' | 'tooltip-close' | 'slider-drag'
  readonly route: string
  readonly inputEventType: 'click' | 'keydown'
  readonly prepare: (page: Page) => Promise<void>
  readonly warmup: (page: Page) => Promise<void>
  readonly reset: (page: Page) => Promise<void>
  readonly act: (page: Page) => Promise<void>
  readonly ceilingMs: 50 | 30
  readonly hook?: string
  readonly ceilingStatus?: 'proposed-not-runner-validated'
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
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    reset: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    act: async (page) => page.locator('[data-perf="vl-sort"]').click(),
    ceilingMs: 50,
  },
  {
    id: 'vl-select',
    route: '/virtual-list',
    inputEventType: 'click',
    prepare: async () => {},
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
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    reset: async (page) => {
      await page.reload({ waitUntil: 'networkidle' })
    },
    act: async (page) => page.locator('[data-perf="menus-tick"]').click(),
    ceilingMs: 30,
  },
  {
    id: 'dt-update',
    route: '/components/data-table',
    inputEventType: 'click',
    hook: 'data-table-update',
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="data-table-update"]').click(),
    reset: async (page) => page.locator('[data-perf="data-table-update"]').click(),
    act: async (page) => page.locator('[data-perf="data-table-update"]').click(),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'dt-filter',
    route: '/components/data-table',
    inputEventType: 'keydown',
    hook: 'data-table-filter',
    prepare: async (page) => page.locator('[data-perf="data-table-filter"]').fill(''),
    warmup: async (page) => page.locator('[data-perf="data-table-filter"]').press('x'),
    reset: async (page) => page.locator('[data-perf="data-table-filter"]').fill(''),
    act: async (page) => page.locator('[data-perf="data-table-filter"]').press('9'),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'dt-sort',
    route: '/components/data-table',
    inputEventType: 'click',
    hook: 'data-table-sort',
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="data-table-sort"]').click(),
    reset: async (page) => page.locator('[data-perf="data-table-sort"]').click(),
    act: async (page) => page.locator('[data-perf="data-table-sort"]').click(),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'dt-select',
    route: '/components/data-table',
    inputEventType: 'click',
    hook: 'data-table-select',
    prepare: async () => {},
    warmup: async (page) => page.getByRole('checkbox', { name: 'Select row row-1', exact: true }).click(),
    reset: async (page) => page.getByRole('checkbox', { name: 'Select row row-1', exact: true }).click(),
    act: async (page) => page.getByRole('checkbox', { name: 'Select row row-1', exact: true }).click(),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'select-open',
    route: '/components/select',
    inputEventType: 'click',
    hook: 'select-open',
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="select-open"] button').click(),
    reset: async (page) => page.locator('[data-perf="select-open"] button').click(),
    act: async (page) => page.locator('[data-perf="select-open"] button').click(),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'select-choose',
    route: '/components/select',
    inputEventType: 'click',
    hook: 'select-open',
    prepare: async () => {},
    warmup: async (page) => page.locator('[data-perf="select-open"] button').click(),
    reset: async () => {},
    act: async (page) => page.locator('[data-perf="select-choose"]').click(),
    ceilingMs: 50,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'tooltip-open',
    route: '/components/tooltip',
    inputEventType: 'keydown',
    hook: 'tooltip-open',
    prepare: async (page) => page.locator('[data-perf="tooltip-open"]').focus(),
    warmup: async (page) => page.locator('[data-perf="tooltip-open"]').press('Tab'),
    reset: async (page) => page.locator('[data-perf="tooltip-open"]').focus(),
    act: async (page) => page.locator('[data-perf="tooltip-open"]').press('Tab'),
    ceilingMs: 30,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'tooltip-close',
    route: '/components/tooltip',
    inputEventType: 'keydown',
    hook: 'tooltip-close',
    prepare: async (page) => page.locator('[data-perf="tooltip-open"]').focus(),
    warmup: async (page) => page.locator('[data-perf="tooltip-open"]').press('Tab'),
    reset: async (page) => {
      await page.locator('[data-perf="tooltip-open"]').focus()
      await page.locator('[data-perf="tooltip-open"]').press('Tab')
    },
    act: async (page) => page.locator('[data-perf="tooltip-close"] button').press('Tab'),
    ceilingMs: 30,
    ceilingStatus: 'proposed-not-runner-validated',
  },
  {
    id: 'slider-drag',
    route: '/components/range-slider',
    inputEventType: 'click',
    hook: 'slider-drag',
    prepare: async () => {},
    warmup: async (page) => {
      const box = await page.locator('[data-perf="slider-drag"] input[data-thumb-id="Minimum value"]').boundingBox()
      if (!box) throw new Error('RangeSlider perf thumb is not visible')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2)
      await page.mouse.up()
    },
    reset: async () => {},
    act: async (page) => {
      const box = await page.locator('[data-perf="slider-drag"] input[data-thumb-id="Minimum value"]').boundingBox()
      if (!box) throw new Error('RangeSlider perf thumb is not visible')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2)
      await page.mouse.up()
    },
    ceilingMs: 30,
    ceilingStatus: 'proposed-not-runner-validated',
  },
]
export const SHARED_DATE_SCENARIO: PerfScenario = {
  id: 'shared-date',
  route: '/shared',
  inputEventType: 'keydown',
  hook: 'shared-date',
  prepare: async (page) =>
    page.locator('[data-perf="shared-date"]').fill('2026-01-01'),
  warmup: async (page) =>
    page.locator('[data-perf="shared-date"]').press('ArrowUp'),
  reset: async (page) =>
    page.locator('[data-perf="shared-date"]').fill('2026-01-01'),
  act: async (page) =>
    page.locator('[data-perf="shared-date"]').press('ArrowUp'),
  ceilingMs: 30,
}

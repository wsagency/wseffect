import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderSummary } from './report.ts'

const scenarios = ['vl-cell', 'vl-filter', 'vl-sort', 'vl-select', 'form-field', 'menus-tick'] as const
type ScenarioId = typeof scenarios[number]
type ScenarioMetrics = { eventMs: number[]; scriptMs: number[] }
const perf = (event: number, script: number): Record<ScenarioId, ScenarioMetrics> => Object.fromEntries(
  scenarios.map((id) => [id, { eventMs: [event - 8, event, event + 8], scriptMs: [script - 1, script, script + 1] }]),
) as Record<ScenarioId, ScenarioMetrics>

const report = {
  methodology: 'The six shared data-perf hooks use 10 sessions per app, 4× CPU throttling, Event Timing and CDP ScriptDuration from the same harness.',
  wseffect: {
    size: { shell: 100, firstVisit: { bytes: 200, requests: 5 }, pages: { form: 30, menus: 40 } },
    perf: perf(24, 6),
  },
  radix2solid: {
    size: { shell: 110, firstVisit: { bytes: 220, requests: 5 }, pages: { form: 35, menus: 45 } },
    perf: perf(32, 8),
  },
  differences: ['The mini-app uses native menu buttons; radix2solid uses Radix2Solid DropdownMenu triggers.'],
}

test('BENCH-2 renders one reporting-only side-by-side table and verified differences', () => {
  const summary = renderSummary(report)
  assert.ok(summary.startsWith('Reporting only; not a gate.'))
  assert.match(summary, /10 sessions per app, 4× CPU throttling/)
  assert.match(summary, /^\| Measure \| wseffect \| radix2solid \|$/m)
  assert.match(summary, /^\| shell \(Brotli-q11\) \| 100 B \| 110 B \|$/m)
  assert.match(summary, /^\| first-visit \(Brotli-q11\) \| 200 B \| 220 B \|$/m)
  assert.match(summary, /^\| vl-cell Event Timing median \(ms\) \| 24 \| 32 \|$/m)
  assert.match(summary, /^\| vl-cell ScriptDuration median \(ms\) \| 6 \| 8 \|$/m)
  assert.match(summary, /^\| menus-tick ScriptDuration median \(ms\) \| 6 \| 8 \|$/m)
  assert.match(summary, /## Verified differences\n- The mini-app uses native menu buttons; radix2solid uses Radix2Solid DropdownMenu triggers\./)
  assert.equal((summary.match(/^\|/gm) ?? []).length, 16, 'one table contains header, separator, two size rows and twelve metric rows')
})

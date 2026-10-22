import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderSummary } from './report.ts'

const scenarios = ['vl-cell', 'vl-filter', 'vl-sort', 'vl-select', 'dt-update', 'dt-filter', 'dt-sort', 'dt-select', 'form-field', 'menus-tick'] as const
type ScenarioId = typeof scenarios[number]
type ScenarioMetrics = { eventMs: number[]; scriptMs: number[]; eventEntryCounts: number[][]; animationFrameCounts: number[] }
const perf = (event: number, script: number): Record<ScenarioId, ScenarioMetrics> => Object.fromEntries(
  scenarios.map((id) => [id, { eventMs: [event - 8, event, event + 8], scriptMs: [script - 1, script, script + 1], eventEntryCounts: [[1], [1], [1]], animationFrameCounts: [0, 1, 2] }]),
) as Record<ScenarioId, ScenarioMetrics>

const report = {
  methodology: 'Six matched data-perf hooks; 10 sessions per app; 4× CPU throttle verified by an in-page fixed loop; Event Timing captured by PerformanceObserver after paint and observer flush; scripting is the trace-event interval union from trusted click/keydown dispatch to the next Paint/Commit.',
  wseffect: {
    size: { shell: 100, shellRaw: 1_000, firstVisit: { bytes: 200, requests: 5 }, speculativePrefetch: { bytes: 50, requests: 2 }, requestTable: [], pages: { form: 30, menus: 40 } },
    perf: perf(24, 6),
  },
  radix2solid: {
    size: { shell: 110, shellRaw: 1_100, firstVisit: { bytes: 220, requests: 5 }, speculativePrefetch: { bytes: 60, requests: 3 }, requestTable: [], pages: { form: 35, menus: 45 } },
    perf: perf(32, 8),
  },
  differences: ['The Gallery and radix2solid share the bench hooks.'],
}

test('BENCH-2 renders one reporting-only side-by-side table and verified differences', () => {
  const summary = renderSummary(report)
  assert.ok(summary.startsWith('Reporting only; not a gate.'))
  assert.match(summary, /10 sessions per app; 4× CPU throttle verified/)
  assert.match(summary, /^\| Measure \| wseffect \| radix2solid \|$/m)
  assert.match(summary, /^\| shell \(Brotli-q11\) \| 100 B \| 110 B \|$/m)
  assert.match(summary, /^\| shell raw \(entry \+ framework\/vendor\) \| 1,000 B \| 1,100 B \|$/m)
  assert.match(summary, /^\| first-visit \(GATE-S2, Brotli-q11\) \| 200 B \| 220 B \|$/m)
  assert.match(summary, /^\| speculative prefetch \(GATE-S4, Brotli-q11\) \| 50 B \| 60 B \|$/m)
  assert.match(summary, /^\| vl-cell Event Timing median \(ms\) \| 24 \| 32 \|$/m)
  assert.match(summary, /^\| vl-cell trace scripting median \(ms\) \| 6 \| 8 \|$/m)
  assert.match(summary, /^\| vl-cell qualified Event Timing entries \(median\/interaction\) \| 1 \| 1 \|$/m)
  assert.match(summary, /^\| vl-cell trace rAF callbacks \(median\/interaction\) \| 1 \| 1 \|$/m)
  assert.match(summary, /^\| dt-filter Event Timing median \(ms\) \| 24 \| 32 \|$/m)
  assert.match(summary, /^\| menus-tick trace scripting median \(ms\) \| 6 \| 8 \|$/m)
  assert.match(summary, /## Verified differences\n- The Gallery and radix2solid share the bench hooks\./)
  assert.equal((summary.match(/^\|/gm) ?? []).length, 46, 'one table contains header, separator, four size rows and forty metric rows')
})

test('BENCH-2 summary counts missing qualified entries as zero', () => {
  const noEntries = {
    ...report,
    wseffect: {
      ...report.wseffect,
      perf: {
        ...report.wseffect.perf,
        'vl-cell': { ...report.wseffect.perf['vl-cell'], eventEntryCounts: [[], [], []] },
      },
    },
  }
  assert.match(renderSummary(noEntries), /^\| vl-cell qualified Event Timing entries \(median\/interaction\) \| 0 \| 1 \|$/m)
})

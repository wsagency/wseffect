# DataTable 10k directional timings

**Status:** local directional evidence only; not a gate and not runner-validated. The proposed ceiling for each operation is a 50 ms Event Timing median at 4× CPU throttle. The proposal remains unvalidated because this run was on the development workstation, and the update-cell A/A band is especially noisy.

Measured 2026-10-22 with Node v24.22.0 and Chromium 156.0.8078.4. The run used the existing `runScenario` Playwright harness against the built Gallery `/data-table` page, its 10,000-row fixture, and real trusted browser input. CPU throttle rates were 1× and 4× via CDP. Each rate has 10 fresh-context samples per scenario. The 4× samples also form five adjacent same-build A/A pairs; the A/A band is p95 absolute Event Timing delta and its signed min/max. No baseline build or CI perf gate was run.

| Scenario / operation | Event Timing median 1× | Event Timing median 4× | Script median 1× / 4× | 4× A/A Event Timing band (p95 abs; min…max) |
|---|---:|---:|---:|---:|
| `dt-update` — update first row's Name cell | 16 ms | 40 ms | 8.43 / 32.85 ms | 48 ms; −48…+8 ms |
| `dt-filter` — filter with `9` | 16 ms | 32 ms | 8.74 / 24.37 ms | 8 ms; −8…+8 ms |
| `dt-sort` — sort by Name | 16 ms | 32 ms | 6.89 / 30.32 ms | 8 ms; −8…+8 ms |
| `dt-select` — select visible `row-1` | 16 ms | 24 ms | 1.34 / 10.17 ms | 8 ms; −8…0 ms |

The `dt-update` 4× samples included an 80 ms outlier; its median is below the proposal, but the 48 ms A/A p95 absolute delta makes that result too noisy to validate the ceiling. The other three medians are below 50 ms in this local run, but none establishes runner acceptance.

## SP2 interaction A/A diagnostics

On 2026-10-22, the same local 4×-throttled `runScenario` harness ran 20 fresh-context samples per SP2 scenario (10 adjacent same-build A/A pairs), using Node v24.21.0 and Chromium 156.0.8078.4. These are A/A noise diagnostics, not candidate-vs-baseline ABAB timings or a performance gate. The proposed ceilings remain unvalidated.

| Scenario / operation | Script A/A band (p95 abs delta) | Event Timing A/A band (p95 abs delta; min…max) |
|---|---:|---:|
| `select-open` | 36.972 ms | 40 ms; −32…+40 ms |
| `select-choose` | 30.136 ms | 24 ms; −24…+8 ms |
| `tooltip-open` | 14.439 ms | 16 ms; −16…+16 ms |
| `tooltip-close` | 2.826 ms | 8 ms; 0…+8 ms |
| `slider-drag` | 0.929 ms | 8 ms; −8…+8 ms |

The Select open/choose A/A bands are comparatively noisy on this development workstation; they must not be interpreted as regression or ceiling results. No runner noise baseline was written.

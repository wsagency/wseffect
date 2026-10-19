# Current main vs `perf/virtual-list`

**Baseline:** `5d15798` (current main). **Candidate app source:** `e058591` (`perf/virtual-list`). The older WSEffect/Radix comparison remains historical at `5cde4de`; it is not a measurement of current main.

## Method and environment

Node `v24.21.0` and pnpm `11.5.0`; Chromium `156.0.8078.4`; AMD Ryzen 9 9955HX 16-Core Processor. The run used one CPU-throttled browser context per action at 1× and 4×, with no DevTools CPU profile. The existing `PerformanceObserver` and CDP timeline helpers measured Event Timing and scripting duration. Each scenario/rate used five A/B/A/B blocks (10 sessions per build) and ten adjacent A/A pairs per build. Load averages were sampled before and after each ABAB session. The data JSON retains each ABAB session's load readings, the A/A p95 bands, and the full size reports.

`Event Timing / trace scripting` values below are medians in milliseconds. A/A bands are p95 absolute paired deltas in `Event Timing / scripting` milliseconds, shown as main / candidate. Event Timing is quantized in 8 ms steps and has a 16 ms observation floor. Detailed runs, load samples, A/A signed ranges, and sizes: [`data/current-main-vs-perf-virtual-list.json`](data/current-main-vs-perf-virtual-list.json).

Load at run start was `17.47 / 17.13 / 17.87` and at end `12.67 / 16.75 / 17.63` (1/5/15-minute averages). Across ABAB samples, the load ranges were 1-minute `13.17–20.92`, 5-minute `16.18–19.10`, and 15-minute `17.11–18.30`.

## Results at 1×

| Scenario | Main ET / script | Candidate ET / script | Δ candidate − main | A/A p95 absolute Δ (main ET/script; candidate ET/script) |
|---|---:|---:|---:|---:|
| `vl-cell` | 16 / 7.79 | 16 / 4.27 | 0 / -3.51 | 0 / 8.80; 0 / 1.33 |
| `vl-filter` | 16 / 10.61 | 16 / 9.42 | 0 / -1.19 | 8 / 2.95; 8 / 2.25 |
| `vl-sort` | 24 / 10.82 | 24 / 8.28 | 0 / -2.54 | 0 / 3.14; 0 / 2.28 |
| `vl-select` | 24 / 6.03 | 16 / 0.00 | -8 / -6.03 | 8 / 6.11; 0 / 2.79 |
| `form-field` | 16 / 2.08 | 16 / 2.27 | 0 / +0.19 | 0 / 0.69; 0 / 0.93 |
| `menus-tick` | 16 / 2.05 | 16 / 1.92 | 0 / -0.13 | 0 / 0.44; 0 / 0.59 |
| `theme-appearance` | 16 / 1.49 | 16 / 1.37 | 0 / -0.11 | 0 / 0.47; 0 / 1.58 |
| `theme-accent` | 16 / 1.42 | 16 / 1.60 | 0 / +0.18 | 0 / 1.45; 8 / 3.35 |
| `shared-date` | 16 / 0.00 | 16 / 0.00 | 0 / 0.00 | 0 / 0.00; 0 / 1.81 |
| `dialog-open` | 24 / 5.08 | 24 / 5.04 | 0 / -0.04 | 0 / 0.96; 0 / 0.67 |
| `dropdown-open` | 24 / 6.46 | 24 / 6.49 | 0 / +0.04 | 0 / 1.53; 0 / 1.49 |
| `nav-cold` | 48 / 25.94 | 52 / 27.08 | +4 / +1.15 | 8 / 5.42; 8 / 3.78 |
| `nav-prefetch` | 24 / 4.29 | 24 / 4.24 | 0 / -0.06 | 0 / 0.91; 0 / 1.32 |

## Results at 4×

| Scenario | Main ET / script | Candidate ET / script | Δ candidate − main | A/A p95 absolute Δ (main ET/script; candidate ET/script) |
|---|---:|---:|---:|---:|
| `vl-cell` | 24 / 20.04 | 16 / 12.03 | -8 / -8.01 | 8 / 7.51; 8 / 6.83 |
| `vl-filter` | 48 / 39.85 | 40 / 32.67 | -8 / -7.18 | 8 / 7.72; 8 / 8.24 |
| `vl-sort` | 56 / 48.61 | 48 / 35.90 | -8 / -12.72 | 16 / 10.67; 16 / 10.14 |
| `vl-select` | 32 / 20.75 | 24 / 10.51 | -8 / -10.24 | 8 / 8.35; 8 / 4.52 |
| `form-field` | 16 / 7.62 | 16 / 8.11 | 0 / +0.49 | 8 / 3.11; 0 / 1.43 |
| `menus-tick` | 16 / 6.59 | 16 / 6.21 | 0 / -0.38 | 8 / 1.84; 8 / 3.09 |
| `theme-appearance` | 16 / 5.52 | 16 / 5.46 | 0 / -0.06 | 8 / 1.44; 8 / 1.81 |
| `theme-accent` | 16 / 5.99 | 16 / 5.69 | 0 / -0.30 | 8 / 1.63; 8 / 1.34 |
| `shared-date` | 24 / 7.28 | 24 / 6.54 | 0 / -0.74 | 8 / 3.79; 0 / 1.48 |
| `dialog-open` | 32 / 18.89 | 32 / 21.44 | 0 / +2.56 | 8 / 11.35; 8 / 7.92 |
| `dropdown-open` | 40 / 27.38 | 44 / 25.57 | +4 / -1.81 | 16 / 12.17; 8 / 11.21 |
| `nav-cold` | 152 / 108.40 | 144 / 100.49 | -8 / -7.91 | 24 / 21.67; 24 / 19.12 |
| `nav-prefetch` | 40 / 17.17 | 40 / 15.91 | 0 / -1.26 | 8 / 3.59; 80 / 59.12 |

The 4× `nav-prefetch` candidate A/A band is unusually wide (80 ms Event Timing / 59.12 ms scripting); treat that row as noisy. The full JSON provides each scenario's A/A signed minimum/maximum as well as these p95 bands.

## VirtualList 50 ms target

Both candidate medians are below 50 ms for filter and sort at both rates: 1× filter `16 ms`, sort `24 ms`; 4× filter `40 ms`, sort `48 ms`. Main's 4× sort median is `56 ms`, above 50 ms. The candidate's 4× filter and sort medians are each 8 ms lower than main, but those changes do not exceed their within-build A/A p95 Event Timing bands (8 ms for filter, 16 ms for sort). Thus the candidate meets the median target in this run; the ABAB data does not establish a reliable timing improvement beyond the measured noise. No gate threshold changed.

## Build-size comparison

Measured with the repository's Brotli-q11 size tool on Node 24.21.0 builds.

| Artifact | Main | Candidate | Δ candidate − main |
|---|---:|---:|---:|
| Shell | 98,807 B | 98,881 B | +74 B |
| First visit (16 requests each) | 156,360 B | 156,484 B | +124 B |
| Speculative prefetch (12 requests each) | 28,954 B | 29,070 B | +116 B |
| VirtualList page chunk | 6,024 B | 6,077 B | +53 B |

## Verification

- `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check` passed.
- `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm e2e` passed 70 tests across Chromium, Firefox, WebKit, and dev-server configurations.
- E2E logged one non-failing 13.7 ms Foldkit slow-patch warning during application initialization; it did not fail the suite.

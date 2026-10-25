# WSEffect main vs Radix2Solid

> Superseded by [the 2026-10-25 comparison](2026-10-25-wseffect-vs-radix2solid-main.md), which reruns the benchmark with the fixed measurement harness and current main.

## Scope and method

This comparison measures WSEffect main at `9446806602435889908c147e0b08b9c13ab22563` against the pinned Radix2Solid fixture at `383676172abb84b4a1d2e54a087d290437ee8848`. It covers `vl-cell`, `vl-filter`, `vl-sort`, `vl-select`, `form-field`, `menus-tick`, `theme-appearance`, `theme-accent`, `shared-date`, `dialog-open`, `dropdown-open`, `nav-cold`, and `nav-prefetch` at 1× and 4× CPU throttle. Each app/scenario/rate cell uses five ABAB blocks (10 measured sessions per app); each A/A band uses 10 adjacent same-app pairs. Event Timing and trace scripting medians follow [GATE-P1 §12.1](../superpowers/specs/2026-10-19-wseffect-foundation-design.md#121-perf-gate-p1). Event Timing is quantized at a 16ms observation threshold; scripting is the shared CDP timeline's scripting duration.

Noise-screen bands are the larger of the two apps' nearest-rank p95 absolute A/A deltas for each metric. A winner is named only if the absolute median gap is greater than that band; `—` means neither app clears the screen. This is an empirical noise screen, not a formal significance test. Results show `Event Timing / scripting` in milliseconds; the A/A column is `ET / scripting` band in milliseconds. The ~31-minute run may overlap concurrent builds from other workstreams near its end; per-session host load is recorded in the JSON.

The prior run's zero trace-scripting samples are invalid captures, not evidence of zero scripting cost. Root cause: when an Event Timing bound existed, the old trace helper could choose a `Paint`/`Commit` timestamp before the matched input as the window end, leaving no overlapping script intervals. The current runner invalidates missing `EventDispatch` matches, flush boundaries before input, and empty/nonpositive scripting windows; it retries an invalid trace once, and per-scenario rejected-attempt counts are recorded in the JSON and results.

Environment: Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. The throttle self-test measured `4.022×`; it passed without retry. The linked JSON contains the full raw per-session ABAB/A-A samples, invalid trace rejection counts, request classifications, navigation traces, load readings, and environment.

Host load averages (1/5/15 minutes) were `5.82 / 6.24 / 6.09` at start and `14.38 / 10.22 / 8.14` at finish. Across measured ABAB sessions, the min–max load ranges were `4.37–12.52 / 5.47–9.24 / 5.80–7.63`. The table below gives each scenario's mean before/after load across both apps' 10 measured sessions at that rate, in 1/5/15-minute order. Captured load remained below 15–25; treat results as directional. Individual session readings are retained in the JSON.

## Timing results

### 1× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script | Rejected traces W/R (ABAB; A/A) |
|---|---:|---:|---:|---|---:|
| `vl-cell` | 16 / 2.460 | 16 / 0.465 | 8 / 0.690 | — / radix2solid | 0/0; 0/0 |
| `vl-filter` | 16 / 5.784 | 16 / 5.013 | 8 / 6.706 | — / — | 0/0; 0/0 |
| `vl-sort` | 24 / 5.708 | 16 / 1.949 | 8 / 2.891 | — / radix2solid | 0/0; 0/0 |
| `vl-select` | 16 / 1.929 | 16 / 0.181 | 0 / 0.861 | — / radix2solid | 0/0; 0/0 |
| `form-field` | 16 / 1.621 | 16 / 0.501 | 0 / 0.954 | — / radix2solid | 0/0; 0/0 |
| `menus-tick` | 16 / 1.705 | 16 / 0.255 | 8 / 2.993 | — / — | 0/0; 0/0 |
| `theme-appearance` | 32 / 2.111 | 20 / 2.431 | 16 / 2.432 | — / — | 0/0; 0/0 |
| `theme-accent` | 24 / 2.137 | 16 / 1.833 | 16 / 2.001 | — / — | 0/0; 0/0 |
| `shared-date` | 16 / 1.538 | 24 / 0.257 | 8 / 0.579 | — / radix2solid | 0/0; 0/0 |
| `dialog-open` | 24 / 5.359 | 16 / 3.774 | 8 / 1.750 | — / — | 0/0; 0/0 |
| `dropdown-open` | 16 / 7.177 | 16 / 7.636 | 16 / 7.173 | — / — | 0/0; 0/0 |
| `nav-cold` | 16 / 2.092 | 16 / 1.835 | 0 / 1.554 | — / — | 0/0; 0/0 |
| `nav-prefetch` | 16 / 2.079 | 16 / 1.956 | 0 / 1.018 | — / — | 0/0; 0/0 |

### 4× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script | Rejected traces W/R (ABAB; A/A) |
|---|---:|---:|---:|---|---:|
| `vl-cell` | 16 / 8.486 | 16 / 1.875 | 8 / 3.642 | — / radix2solid | 0/0; 0/0 |
| `vl-filter` | 32 / 24.679 | 32 / 21.025 | 104 / 73.953 | — / — | 0/0; 0/0 |
| `vl-sort` | 32 / 25.181 | 24 / 8.980 | 8 / 3.443 | — / radix2solid | 0/0; 0/0 |
| `vl-select` | 24 / 7.555 | 16 / 0.787 | 8 / 3.271 | — / radix2solid | 0/0; 0/0 |
| `form-field` | 16 / 6.207 | 16 / 2.545 | 48 / 16.815 | — / — | 0/0; 0/0 |
| `menus-tick` | 16 / 5.926 | 16 / 1.182 | 56 / 6.957 | — / — | 0/0; 0/0 |
| `theme-appearance` | 32 / 8.496 | 16 / 9.704 | 32 / 14.479 | — / — | 0/0; 0/0 |
| `theme-accent` | 24 / 8.247 | 16 / 7.983 | 16 / 15.411 | — / — | 0/0; 0/0 |
| `shared-date` | 16 / 4.042 | 24 / 0.912 | 16 / 1.560 | — / radix2solid | 0/0; 0/0 |
| `dialog-open` | 32 / 18.665 | 32 / 18.432 | 72 / 42.759 | — / — | 0/0; 0/0 |
| `dropdown-open` | 32 / 22.414 | 40 / 32.992 | 128 / 77.107 | — / — | 0/0; 0/0 |
| `nav-cold` | 32 / 8.865 | 16 / 8.258 | 48 / 21.192 | — / — | 0/0; 0/0 |
| `nav-prefetch` | 24 / 7.470 | 16 / 7.666 | 64 / 31.923 | — / — | 0/0; 0/0 |

### Per-interaction host load averages

Each value is the mean of all measured ABAB session before/after samples for both apps, expressed as 1-minute / 5-minute / 15-minute load average. The machine-wide session samples are preserved in the JSON artifact.

| Scenario | 1× load | 4× load |
|---|---:|---:|
| `vl-cell` | 5.93 / 6.25 / 6.10 | 4.84 / 5.55 / 5.81 |
| `vl-filter` | 5.13 / 6.01 / 6.02 | 5.44 / 5.60 / 5.82 |
| `vl-sort` | 4.58 / 5.75 / 5.94 | 11.55 / 7.37 / 6.41 |
| `vl-select` | 4.50 / 5.55 / 5.86 | 8.65 / 7.28 / 6.45 |
| `form-field` | 5.29 / 5.54 / 5.83 | 6.29 / 6.91 / 6.39 |
| `menus-tick` | 5.69 / 5.66 / 5.86 | 6.31 / 6.81 / 6.39 |
| `theme-appearance` | 5.76 / 5.66 / 5.84 | 7.23 / 7.08 / 6.53 |
| `theme-accent` | 8.49 / 6.44 / 6.09 | 7.55 / 7.23 / 6.64 |
| `shared-date` | 6.31 / 6.14 / 6.01 | 6.96 / 7.12 / 6.65 |
| `dialog-open` | 5.82 / 6.08 / 5.99 | 6.58 / 6.91 / 6.61 |
| `dropdown-open` | 7.10 / 6.25 / 6.05 | 7.68 / 7.55 / 6.90 |
| `nav-cold` | 5.67 / 6.06 / 6.00 | 9.82 / 8.23 / 7.20 |
| `nav-prefetch` | 5.93 / 5.99 / 5.98 | 10.14 / 8.94 / 7.57 |

## Sizes

Sizes are transferred bytes by the repository's `pnpm gate:report` classifiers. First-visit and speculative rows include request counts; shell raw bytes are uncompressed totals. Page-chunk bytes come from the same build manifests and size-gate classification.

| Gate / asset | Wseffect | Radix2Solid |
|---|---:|---:|
| GATE-S1 shell (transfer; raw) | 72,582 B; 259,654 B | 33,205 B; 100,037 B |
| GATE-S2 first visit (bytes; requests) | 160,104 B; 16 | 87,006 B; 8 |
| GATE-S4 speculative prefetch (bytes; requests) | 0 B; 0 | 0 B; 0 |
| `styles.css` | 41,520 B | 50,595 B |

### Wseffect page chunks

| Page chunk | Bytes |
|---|---:|
| `browser` | 2,600 |
| `buttons` | 344 |
| `capabilities` | 586 |
| `cards` | 331 |
| `dialog` | 612 |
| `dropdownMenu` | 651 |
| `form` | 522 |
| `island` | 1,895 |
| `layout` | 388 |
| `menus` | 744 |
| `persistence` | 2,115 |
| `sharedA` | 537 |
| `sharedB` | 382 |
| `signals` | 2,121 |
| `tabs` | 593 |
| `textField` | 353 |
| `theme` | 1,105 |
| `typography` | 329 |
| `validation` | 1,205 |
| `virtualList` | 6,101 |

### Radix2Solid page chunks

| Page chunk | Bytes |
|---|---:|
| `buttons` | 282 |
| `cards` | 230 |
| `dialog` | 2,349 |
| `dropdown-menu` | 373 |
| `form` | 147 |
| `layout` | 1,338 |
| `menus` | 149 |
| `shared-a` | 150 |
| `shared` | 416 |
| `tabs` | 1,808 |
| `text-field` | 326 |
| `theme` | 642 |
| `typography` | 255 |
| `virtual-list` | 153 |

## Changes since the 2026-10-20 comparison

The previous report covered merge result `0687682` plus partial follow-ups. This run uses current main `9446806602435889908c147e0b08b9c13ab22563`. Changes since the earlier baseline include `ba11911`'s intent-only persistent-navigation prefetch (speculative requests now yield to route loads and user input), `ffd69d7`'s framework boot runtime via `@wsagency/wseffect-app/runtime` with helpers left lazy, app capabilities, the persistent-state fix, and lazy gallery capability pages.

Navigation is now a normal intent-prefetch user flow, not an isolated cold-cache benchmark. The older report found Wseffect's `/menus` route chunk had already been fetched before the measured `nav-cold` click, making that result non-cold and unlike Radix. In this run both apps' 1× navigation Event Timing medians are at the 16ms floor; at 4× Wseffect is 32ms / 8.865ms (`nav-cold`) and 24ms / 7.470ms (`nav-prefetch`), compared with Radix2Solid's 16ms / 8.258ms and 16ms / 7.666ms. These are descriptive of the current navigation policy and do not establish a causal effect of one commit.

Compared with the prior report's Wseffect first-visit `156,484 B / 16 requests`, first visit is now `160,104 B / 16 requests` (+3,620 B). The runtime split makes `framework-BegffQB6.js` a mandatory boot request (67,138 B) while component helpers stay lazy; shell is now 72,582 B transferred (259,654 B raw), down from the previous 98,881 B transfer. Speculative transfer fell from `29,070 B / 12 requests` to zero, consistent with intent-only prefetch. Radix2Solid's pinned sizes remain measured at fixture commit `383676172`.

## Conclusion and cautions

Only differences clearing the A/A noise screen are scripting: at 1× Radix2Solid for `vl-cell`, `vl-sort`, `vl-select`, `form-field`, and `shared-date`; at 4× Radix2Solid for `vl-cell`, `vl-sort`, `vl-select`, and `shared-date`. No Event Timing difference clears the screen; every other displayed metric is within its measured band.

The Event Timing floor is 16ms, so many apparent ties are not useful for ranking. The earlier 40ms Event Timing band for 1× `menus-tick` and 30.690ms scripting band for 4× `dropdown-open` came from the prior run whose trace-scripting zeros were invalid; they are superseded, not reused. In this run all 26 scenario/rate cells recorded zero rejected traces across both apps and ABAB/A-A sessions, and no trace-scripting sample is zero (minimum 0.004ms). Current broad bands include 8ms Event Timing for 1× `menus-tick` and 77.107ms scripting for 4× `dropdown-open`. Captured one-minute session load ranged up to 12.52 (end-of-run summary 14.38), below 15–25; treat results as directional, do not over-interpret small gaps or treat the screen as a significance test.

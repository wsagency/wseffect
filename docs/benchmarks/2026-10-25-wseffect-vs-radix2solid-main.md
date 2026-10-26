# WSEffect main vs Radix2Solid

## Scope and method

This comparison measures Wseffect main at `cfc7af83001f303398f28d21b3f053b077928baa` against Radix2Solid pinned at `383676172abb84b4a1d2e54a087d290437ee8848`. It covers all 18 comparable scenarios supported by the comparison tool at 1× and 4× CPU throttle. DataTable's four scenarios are excluded because Radix2Solid has no counterpart. The SP2 head-to-head includes `select-open`, `select-choose`, `tooltip-open`, `tooltip-close`, and `slider-drag`; the Solid fixture now provides corresponding routes/hooks and like-for-like content, including the same 1,000 Select options and two-slider values. The `select-choose` interaction is a shared pointer click; the trace starts at `pointerdown`, since the pinned Radix2Solid Select commits through pointer events without a `click` EventDispatch.

Each scenario/rate uses five ABAB blocks (10 measured sessions per app) plus 10 adjacent A/A pairs per app. Event Timing is observed with `PerformanceObserver`; scripting is measured from the shared CDP trace. After warmup and reset, `runScenario` waits for two animation frames and 50 ms idle (bounded at 2 s) before tracing, so reset work is outside the measured interaction. Invalid captures are retried once. The noise-screen band is the larger of the apps' nearest-rank p95 absolute A/A pair deltas; a winner is named only if the median gap exceeds that band. `—` means neither app clears the screen. Times are `Event Timing / scripting` in milliseconds, and bands are `Event Timing / scripting` milliseconds. This empirical screen is not a significance test.

Environment: Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. The throttle self-test measured `4.025×` and passed without retry. Full raw ABAB and A/A samples, request classifications, per-session load, trace retries, and size data are in [the JSON artifact](data/2026-10-25-wseffect-vs-radix2solid-main.json).

Host load averages (1/5/15 minutes) were `3.86 / 3.77 / 4.00` at start and `4.70 / 4.38 / 4.34` at finish. Across measured ABAB sessions, the min–max ranges were `3.37–5.40 / 3.77–4.76 / 3.91–4.41`; one-minute load stayed below 15, so no cells were rerun for load. Per-scenario table values below are mean before/after host load across both apps' measured ABAB sessions at each rate, in 1/5/15-minute order.

## Timing results

### 1× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script | Rejected traces W/R (ABAB; A/A) |
|---|---:|---:|---:|---|---:|
| `vl-cell` | 16 / 2.577 | 16 / 0.695 | 0 / 0.570 | — / radix2solid | 0/0; 0/0 |
| `vl-filter` | 16 / 4.893 | 16 / 5.700 | 0 / 0.682 | — / wseffect | 0/0; 0/0 |
| `vl-sort` | 24 / 4.425 | 16 / 2.092 | 0 / 1.278 | radix2solid / radix2solid | 0/0; 0/0 |
| `vl-select` | 16 / 1.934 | 16 / 0.190 | 0 / 0.526 | — / radix2solid | 0/0; 0/0 |
| `form-field` | 16 / 2.077 | 16 / 0.760 | 0 / 0.742 | — / radix2solid | 0/0; 0/0 |
| `menus-tick` | 16 / 2.026 | 16 / 0.281 | 0 / 0.630 | — / radix2solid | 0/0; 0/0 |
| `select-open` | 72 / 47.005 | 96 / 16.442 | 16 / 3.687 | wseffect / radix2solid | 0/0; 0/0 |
| `select-choose` | 24 / 13.152 | 68 / 63.679 | 16 / 9.205 | wseffect / wseffect | 0/0; 0/0 |
| `tooltip-open` | 16 / 3.519 | 16 / 2.640 | 0 / 2.127 | — / — | 0/0; 0/0 |
| `tooltip-close` | 16 / 2.362 | 16 / 1.313 | 0 / 0.607 | — / radix2solid | 0/0; 0/0 |
| `slider-drag` | 16 / 1.202 | 16 / 0.025 | 0 / 0.780 | — / radix2solid | 0/0; 0/0 |
| `theme-appearance` | 32 / 2.261 | 32 / 2.600 | 8 / 0.577 | — / — | 0/0; 0/0 |
| `theme-accent` | 24 / 2.490 | 32 / 1.956 | 8 / 2.420 | — / — | 0/0; 0/0 |
| `shared-date` | 16 / 1.758 | 24 / 0.252 | 0 / 0.524 | wseffect / radix2solid | 0/0; 0/0 |
| `dialog-open` | 24 / 4.693 | 16 / 3.951 | 8 / 1.383 | — / — | 0/0; 0/0 |
| `dropdown-open` | 16 / 5.591 | 16 / 7.308 | 16 / 2.143 | — / — | 0/0; 0/0 |
| `nav-cold` | 16 / 2.736 | 16 / 1.825 | 0 / 2.709 | — / — | 0/0; 0/0 |
| `nav-prefetch` | 16 / 2.312 | 16 / 2.039 | 0 / 0.707 | — / — | 0/0; 0/0 |

### 4× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script | Rejected traces W/R (ABAB; A/A) |
|---|---:|---:|---:|---|---:|
| `vl-cell` | 16 / 10.026 | 16 / 2.609 | 0 / 3.302 | — / radix2solid | 0/0; 0/0 |
| `vl-filter` | 24 / 18.873 | 32 / 21.545 | 8 / 7.794 | — / — | 0/0; 0/0 |
| `vl-sort` | 32 / 16.990 | 24 / 8.613 | 8 / 4.447 | — / radix2solid | 0/0; 0/0 |
| `vl-select` | 20 / 7.032 | 16 / 0.607 | 8 / 1.349 | — / radix2solid | 0/0; 0/0 |
| `form-field` | 16 / 7.772 | 16 / 3.053 | 0 / 1.839 | — / radix2solid | 0/0; 0/0 |
| `menus-tick` | 16 / 7.506 | 16 / 1.173 | 8 / 1.913 | — / radix2solid | 0/0; 0/0 |
| `select-open` | 240 / 190.134 | 384 / 69.611 | 16 / 14.092 | wseffect / radix2solid | 0/0; 0/0 |
| `select-choose` | 64 / 50.260 | 264 / 251.167 | 32 / 32.087 | wseffect / wseffect | 0/0; 0/0 |
| `tooltip-open` | 16 / 13.834 | 16 / 0.977 | 8 / 10.446 | — / radix2solid | 0/0; 0/0 |
| `tooltip-close` | 16 / 8.455 | 16 / 5.963 | 0 / 3.266 | — / — | 0/0; 0/0 |
| `slider-drag` | 16 / 2.788 | 16 / 0.027 | 8 / 2.475 | — / radix2solid | 0/0; 0/0 |
| `theme-appearance` | 32 / 8.872 | 16 / 10.172 | 16 / 5.893 | — / — | 0/0; 0/0 |
| `theme-accent` | 24 / 8.975 | 16 / 7.954 | 8 / 1.791 | — / — | 0/0; 0/0 |
| `shared-date` | 16 / 6.204 | 16 / 0.766 | 8 / 2.511 | — / radix2solid | 0/0; 0/0 |
| `dialog-open` | 32 / 21.398 | 24 / 16.471 | 16 / 18.818 | — / — | 0/0; 0/0 |
| `dropdown-open` | 32 / 22.345 | 40 / 32.549 | 8 / 4.107 | — / wseffect | 0/0; 0/0 |
| `nav-cold` | 32 / 9.581 | 16 / 7.297 | 8 / 4.709 | radix2solid / — | 0/0; 0/0 |
| `nav-prefetch` | 24 / 8.850 | 16 / 8.373 | 8 / 8.323 | — / — | 0/0; 0/0 |

### Per-interaction host load averages

Each value is the mean of all measured ABAB session before/after samples for both apps, as 1-minute / 5-minute / 15-minute load average.

| Scenario | 1× load | 4× load |
|---|---:|---:|
| `vl-cell` | 4.47 / 3.93 / 4.04 | 3.53 / 3.88 / 3.96 |
| `vl-filter` | 4.37 / 3.97 / 4.06 | 4.68 / 4.12 / 4.04 |
| `vl-sort` | 3.98 / 3.94 / 4.04 | 4.37 / 4.13 / 4.04 |
| `vl-select` | 4.44 / 4.04 / 4.06 | 5.15 / 4.37 / 4.13 |
| `form-field` | 3.74 / 3.90 / 4.00 | 4.19 / 4.30 / 4.14 |
| `menus-tick` | 3.48 / 3.81 / 3.97 | 4.56 / 4.37 / 4.16 |
| `select-open` | 3.99 / 3.89 / 3.98 | 4.54 / 4.39 / 4.19 |
| `select-choose` | 4.16 / 3.95 / 4.00 | 4.57 / 4.49 / 4.26 |
| `tooltip-open` | 3.66 / 3.87 / 3.97 | 5.00 / 4.73 / 4.38 |
| `tooltip-close` | 3.49 / 3.79 / 3.93 | 4.47 / 4.62 / 4.36 |
| `slider-drag` | 3.86 / 3.84 / 3.94 | 4.31 / 4.53 / 4.35 |
| `theme-appearance` | 3.74 / 3.81 / 3.92 | 4.14 / 4.41 / 4.32 |
| `theme-accent` | 4.38 / 4.02 / 3.99 | 4.61 / 4.50 / 4.36 |
| `shared-date` | 4.05 / 3.99 / 3.98 | 4.53 / 4.51 / 4.37 |
| `dialog-open` | 4.05 / 4.00 / 3.99 | 4.58 / 4.56 / 4.40 |
| `dropdown-open` | 4.02 / 4.05 / 4.01 | 4.19 / 4.43 / 4.37 |
| `nav-cold` | 4.52 / 4.17 / 4.05 | 4.00 / 4.31 / 4.33 |
| `nav-prefetch` | 3.73 / 4.03 / 4.01 | 4.10 / 4.24 / 4.30 |

## Sizes

Sizes are transferred bytes by the repository's size classifier. First-visit and speculative rows include request counts; shell raw bytes are uncompressed totals. Page-chunk bytes come from the same build manifests.

| Gate / asset | Wseffect | Radix2Solid |
|---|---:|---:|
| GATE-S1 shell (transfer; raw) | 74,832 B; 270,406 B | 41,899 B; 134,117 B |
| GATE-S2 first visit (bytes; requests) | 163,442 B; 21 | 92,797 B; 5 |
| GATE-S4 speculative prefetch (bytes; requests) | 0 B; 0 | 0 B; 0 |
| `styles.css` | 53,157 B | 50,676 B |

### Wseffect page chunks

| Page chunk | Bytes | Page chunk | Bytes |
|---|---:|---|---:|
| `accessibility` | 367 | `alertDialog` | 589 |
| `avatar` | 357 | `browser` | 2,621 |
| `buttons` | 321 | `capabilities` | 601 |
| `cards` | 343 | `components` | 658 |
| `contextMenu` | 748 | `data` | 573 |
| `dataTable` | 1,430 | `dialog` | 641 |
| `dropdownMenu` | 663 | `feedback` | 495 |
| `form` | 523 | `formsExtra` | 1,055 |
| `hoverCard` | 527 | `iconButton` | 429 |
| `island` | 1,901 | `layout` | 376 |
| `layoutExtra` | 448 | `links` | 351 |
| `menus` | 775 | `persistence` | 2,106 |
| `popover` | 535 | `rangeSlider` | 692 |
| `scrollArea` | 396 | `select` | 854 |
| `sharedA` | 540 | `sharedB` | 383 |
| `signals` | 2,114 | `tabNav` | 467 |
| `tabs` | 2,130 | `textField` | 357 |
| `theme` | 1,134 | `themePanel` | 649 |
| `tooltip` | 564 | `typography` | 323 |
| `typographyExtra` | 486 | `validation` | 1,208 |
| `virtualList` | 1,489 |  |  |

### Radix2Solid page chunks

| Page chunk | Bytes |
|---|---:|
| `buttons` | 285 |
| `cards` | 234 |
| `dialog` | 823 |
| `dropdown-menu` | 368 |
| `form` | 168 |
| `layout` | 345 |
| `menus` | 173 |
| `perf-select` | 459 |
| `perf-slider` | 338 |
| `perf-tooltip` | 341 |
| `shared-a` | 150 |
| `shared` | 414 |
| `sp2` | 21,317 |
| `tabs` | 1,679 |
| `text-field` | 323 |
| `theme` | 643 |
| `typography` | 257 |
| `virtual-list` | 154 |

## Changes since 2026-10-22

- The measurement runner now waits for two animation frames plus 50 ms idle after warmup and reset, bounded at 2 s, preventing reset-render work from leaking into the measured window.
- SP2 is merged: new Themes components, updated chunking, per-family `/components/<family>` routes, and the eager full components stylesheet.
- Foldkit is now vendored as `@wsagency/wseffect-foldkit*`; its internal performance work includes validation-walk/key-set reductions, corrected cache boundaries, deferred callsite formatting, and fixed-height key pruning.
- The Solid comparison fixture now includes dedicated Select, Tooltip, and Slider interaction pages with matching hooks/content. DataTable comparisons remain intentionally excluded because there is no Radix2Solid counterpart.
- The gallery build's prebuild selects transitive workspace dependencies, required for clean builds of the vendored Foldkit packages.
- `select-open` resets with Escape rather than a trigger click, which closes both implementations consistently before measuring the matched open interaction.
- `select-choose` is measured on `pointerdown` and resets by reloading the page and reopening the select, because Radix Select's selection is dispatched on pointer down and closes the menu after choosing.
- `slider-drag` locates the first `getByRole('slider')` rather than a Wseffect-specific selector, because both apps expose the same semantic slider role for this matched interaction.

## Conclusion and cautions

Scripting differences clearing the A/A noise screen are Radix2Solid for `vl-cell`, `vl-sort`, `vl-select`, `form-field`, `menus-tick`, `select-open`, `tooltip-close`, `slider-drag`, and `shared-date` at 1×; Wseffect for `vl-filter` and `select-choose` at 1×; Radix2Solid for `vl-cell`, `vl-sort`, `vl-select`, `form-field`, `menus-tick`, `select-open`, `tooltip-open`, `slider-drag`, and `shared-date` at 4×; Wseffect for `select-choose` and `dropdown-open` at 4×. Event Timing differences clear the screen for Radix2Solid on `vl-sort` and Wseffect on `select-open`, `select-choose`, and `shared-date` at 1×; at 4× they clear for Wseffect on `select-open` and `select-choose`, and Radix2Solid on `nav-cold`. All other displayed metrics do not clear their measured bands.
“No difference beyond the noise screen” is not proof of equality; the bands are an empirical screen, not a formal significance test. Event Timing has 16 ms observation granularity, so quantized ties cannot rank the apps. The new Select scenarios are especially costly at 4× and differ substantially; they measure the supplied 1,000-option content and should not be generalized to smaller selects. Captured one-minute load ranged only `3.37–5.40`, below 15, but results remain directional; do not over-interpret small gaps. The Radix2Solid shell size is the benchmark app's shell, which grew with the added SP2 pages, so it is not a pure library comparison.

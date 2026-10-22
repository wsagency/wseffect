> **Superseded by:** [2026-10-22-wseffect-vs-radix2solid-main.md](2026-10-22-wseffect-vs-radix2solid-main.md), which measures current `main` and replaces the stale comparison below.

# WSEffect main vs Radix2Solid

## Scope and method

This comparison measures WSEffect merge result `06876822ff4fbd62b1fd7bf497560f1cdc763de0` against the pinned Radix2Solid fixture `383676172abb84b4a1d2e54a087d290437ee8848`. It covers 13 scenarios at 1× and 4× CPU throttle. Each cell is the median from five A/B/A/B blocks (10 sessions per app); A/A noise bands use 10 adjacent pairs per app (20 individual sessions). The complete per-run results, A/A measurements, load samples, sizes, and navigation trace are in [`data/2026-10-20-wseffect-vs-radix2solid-main.json`](data/2026-10-20-wseffect-vs-radix2solid-main.json).

Runtime: Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. CPU-throttle self-test measured 4.020×. Event Timing values are quantized with a 16ms observation threshold. Scripting is the trace's scripting duration in ms.

Noise screen: a winner is reported only when the absolute median gap exceeds the larger of the two apps' p95 A/A absolute-delta bands for that metric. `—` means no clear winner; this is an empirical noise screen, not a formal significance test. In each table, A/A values are `Wseffect ET/script; Radix ET/script` in ms, and winner is `ET / script` (`W` = Wseffect, `R` = Radix).

Load averages at start were `15.88 / 17.21 / 17.71` (1/5/15 minutes) and at end `16.35 / 17.83 / 18.05`. Across ABAB and A/A runs, per-session before/after samples ranged `15.05–30.19` (1-minute), `16.94–21.03` (5-minute), and `17.65–18.99` (15-minute). The data contains 1,560 individual session load records (3,120 before/after values for each averaging interval).

## Results

Medians are `Event Timing / scripting` in ms; both apps' values are shown in `Wseffect vs Radix` order.

### 1×

| Scenario | Wseffect ET/script | Radix ET/script | A/A p95 bands (W ET/script; R ET/script) | Noise-screen winner (ET / script) |
|---|---:|---:|---:|---|
| `vl-cell` | 16 / 4.649 | 16 / 0.999 | 8 / 1.542; 0 / 0.302 | — / R |
| `vl-filter` | 16 / 9.645 | 16 / 8.320 | 8 / 10.344; 8 / 7.728 | — / — |
| `vl-sort` | 24 / 8.945 | 16 / 2.998 | 0 / 1.339; 0 / 1.172 | R / R |
| `vl-select` | 16 / 0.000 | 16 / 0.256 | 8 / 3.299; 0 / 0.345 | — / — |
| `form-field` | 16 / 2.311 | 16 / 0.754 | 0 / 0.721; 0 / 0.264 | — / R |
| `menus-tick` | 16 / 2.008 | 16 / 0.369 | 0 / 0.475; 0 / 1.005 | — / R |
| `theme-appearance` | 16 / 1.475 | 16 / 0.607 | 0 / 0.403; 0 / 0.346 | — / R |
| `theme-accent` | 16 / 1.513 | 16 / 0.669 | 0 / 0.408; 0 / 0.389 | — / R |
| `shared-date` | 16 / 0.000 | 32 / 0.534 | 0 / 2.018; 8 / 0.121 | W / — |
| `dialog-open` | 24 / 4.921 | 16 / 4.015 | 0 / 0.521; 0 / 0.588 | R / R |
| `dropdown-open` | 24 / 6.329 | 16 / 1.407 | 0 / 1.466; 8 / 2.335 | — / R |
| `nav-cold` | 48 / 26.893 | 16 / 4.582 | 8 / 4.658; 0 / 0.740 | R / R |
| `nav-prefetch` | 24 / 4.539 | 16 / 4.329 | 0 / 1.357; 0 / 0.709 | R / — |

### 4×

| Scenario | Wseffect ET/script | Radix ET/script | A/A p95 bands (W ET/script; R ET/script) | Noise-screen winner (ET / script) |
|---|---:|---:|---:|---|
| `vl-cell` | 16 / 12.515 | 16 / 3.045 | 8 / 5.115; 8 / 1.783 | — / R |
| `vl-filter` | 40 / 31.916 | 44 / 31.342 | 8 / 8.472; 8 / 9.437 | — / — |
| `vl-sort` | 44 / 35.026 | 32 / 12.282 | 8 / 9.250; 8 / 2.616 | R / R |
| `vl-select` | 24 / 10.091 | 16 / 1.034 | 8 / 3.541; 24 / 20.994 | — / — |
| `form-field` | 16 / 9.104 | 16 / 3.590 | 8 / 3.053; 0 / 1.184 | — / R |
| `menus-tick` | 16 / 6.895 | 16 / 1.456 | 8 / 2.703; 8 / 0.840 | — / R |
| `theme-appearance` | 16 / 5.669 | 24 / 1.909 | 8 / 2.503; 8 / 2.197 | — / R |
| `theme-accent` | 16 / 5.005 | 24 / 2.586 | 0 / 0.960; 16 / 1.155 | — / R |
| `shared-date` | 24 / 6.670 | 32 / 1.996 | 8 / 6.566; 8 / 0.585 | — / — |
| `dialog-open` | 32 / 18.017 | 28 / 16.572 | 8 / 7.069; 8 / 3.173 | — / — |
| `dropdown-open` | 44 / 28.039 | 52 / 12.079 | 8 / 14.296; 16 / 3.625 | — / R |
| `nav-cold` | 156 / 109.392 | 32 / 19.016 | 16 / 14.777; 0 / 3.739 | R / R |
| `nav-prefetch` | 40 / 15.919 | 32 / 16.848 | 8 / 4.614; 8 / 2.475 | — / — |

The 4× virtual-list filter/sort Event Timing medians are 40ms and 44ms on Wseffect main (Radix: 44ms and 32ms). The noise screen finds no filter winner; sort favors Radix on both metrics. Across all scenarios, several scripting rows favor Radix, but most Event Timing rows have no clear winner because values sit within the per-app A/A bands and/or on the 16ms quantization floor.

## `nav-cold` trace: not cold on Wseffect

The 4× `nav-cold` medians are 156ms Event Timing / 109.392ms scripting for Wseffect and 32ms / 19.016ms for Radix. The historical Wseffect run at `5cde4de` recorded 32ms / 11.00ms. A fresh request trace confirms that the Wseffect route chunk was already fetched before the measured click: `/assets/menus-DPiY7VAS.js` was requested twice before click (about 1,430ms and 658ms earlier); both responses were HTTP 200 from the service worker. The Radix menu chunk request, `/assets/menus-CTONnMsC.js`, occurred about 22ms after click and was not served from a service worker. Thus `nav-cold` is not a truly cold Wseffect navigation now; prefetch was not suppressed. This also means the cross-app row is not a like-for-like cold-navigation comparison.

The high Wseffect median is not explained by fetching its route chunk during the interaction: the trace shows that chunk was warm before click, while the measured scripting median is 109.392ms. The result is a real slowdown against the historical measurement, not a reliable effect of the VirtualList candidate (the separate main-vs-candidate comparison found no `nav-cold` change beyond its A/A band). This trace has aggregate scripting/request timing, not function-level CPU attribution; it does not isolate the exact source of the added render work. The historical report also noted that Wseffect's visible-link and hover/focus prefetch differ from Radix's navigation behavior.

## First-visit sizes

Benchmark-reported sizes are bytes. Wseffect's shell is `98,881 B` (`354,835 B` raw); first visit is `156,484 B` across 16 requests, with `29,070 B` across 12 speculative-prefetch requests. Radix's shell is `33,205 B` (`100,037 B` raw); first visit is `87,006 B` across 8 requests, with no speculative-prefetch requests. The JSON artifact includes the complete request classifications and page-chunk size table.

## Provenance

The historical comparison at [`2026-10-20-wseffect-vs-radix2solid.md`](2026-10-20-wseffect-vs-radix2solid.md) describes commit `5cde4de` and should not be substituted for the merged-main baseline. The original report and JSON describe merge result `06876822ff4fbd62b1fd7bf497560f1cdc763de0`; the appended shell follow-up measures current main `38b2fd4` against the fix branch separately.

## Earlier menus-mount-cost branch measurements (2026-10-20)

This earlier run compares `origin/main` with the menus-mount-cost branch, then that pre-fix branch with the pinned Radix fixture (`383676172`). It measured `nav-cold`, `menus-tick`, `dropdown-open`, and `dialog-open` at 1× and 4× using five ABAB blocks (10 sessions per app/scenario/rate) plus ten adjacent A/A pairs per app/scenario/rate. Entries below are medians in ms (`Event Timing / trace scripting`). A/A values are the larger of the two apps' p95 absolute-delta bands (`Event Timing / scripting`). `noise` means the median gap does not exceed that band; otherwise the winner is named. This is an empirical noise screen, not a formal significance test. Detailed per-run samples and per-interaction load averages are in [`data/menus-mount-abab.json`](data/menus-mount-abab.json).
The run used Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. Host load averages were `39.73/22.95/19.07` at start and `31.93/21.86/19.76` at end. `nav-cold` retains gallery intent/visible prefetch behavior; navigation is descriptive, not an isolated renderer comparison.

| Comparison | Rate | Scenario | Before / candidate (ET / script) | A/A band (ET / script) | Noise screen (ET / script) |
|---|---:|---|---:|---:|---|
| origin/main → branch | 1× | `nav-cold` | 56 / 33.92 → 56 / 27.79 | 8 / 5.02 | noise / branch |
| origin/main → branch | 1× | `menus-tick` | 16 / 2.03 → 16 / 1.95 | 0 / 0.68 | noise / noise |
| origin/main → branch | 1× | `dropdown-open` | 24 / 6.02 → 24 / 5.99 | 0 / 1.96 | noise / noise |
| origin/main → branch | 1× | `dialog-open` | 24 / 4.59 → 24 / 4.73 | 0 / 1.15 | noise / noise |
| origin/main → branch | 4× | `nav-cold` | 152 / 105.67 → 136 / 92.92 | 40 / 37.20 | noise / noise |
| origin/main → branch | 4× | `menus-tick` | 16 / 6.89 → 16 / 6.60 | 8 / 2.88 | noise / noise |
| origin/main → branch | 4× | `dropdown-open` | 40 / 25.96 → 40 / 24.57 | 8 / 13.38 | noise / noise |
| origin/main → branch | 4× | `dialog-open` | 32 / 18.25 → 32 / 17.67 | 8 / 6.34 | noise / noise |
| branch → Radix | 1× | `nav-cold` | 48 / 24.23 → 16 / 4.98 | 8 / 7.18 | Radix / Radix |
| branch → Radix | 1× | `menus-tick` | 16 / 1.88 → 16 / 0.38 | 0 / 0.51 | noise / Radix |
| branch → Radix | 1× | `dropdown-open` | 24 / 5.57 → 16 / 1.61 | 0 / 2.48 | noise / Radix |
| branch → Radix | 1× | `dialog-open` | 24 / 4.75 → 16 / 3.94 | 8 / 1.09 | noise / noise |
| branch → Radix | 4× | `nav-cold` | 132 / 90.66 → 32 / 20.98 | 24 / 16.45 | Radix / Radix |
| branch → Radix | 4× | `menus-tick` | 16 / 6.47 → 16 / 1.50 | 8 / 2.78 | noise / Radix |
| branch → Radix | 4× | `dropdown-open` | 40 / 23.19 → 48 / 13.28 | 16 / 11.90 | noise / noise |
| branch → Radix | 4× | `dialog-open` | 36 / 20.61 → 32 / 17.56 | 16 / 14.22 | noise / noise |

Against `origin/main`, the branch's only beyond-band result is lower scripting for `nav-cold` at 1×; other metrics/scenarios do not exceed the measured A/A bands. Against Radix, scripting is lower beyond the band for `nav-cold` and `menus-tick` at both rates and `dropdown-open` at 1×. Other displayed gaps do not exceed their A/A band.


## Follow-up: shell regression diagnosis and fix

Reversing the post-`5cde4de` gallery-shell view composition is the only controlled code-group reversion that clears the remaining `nav-cold` slowdown. CSS-only, `Box`-wrapper-only, header-only, navigation-`Flex`-only, and outer-shell-wrapper-only reversions left the 4× median in the 136–148ms range; the simple semantic HTML shell restored it to the 5cde/Radix range. The menu component parity changes are untouched. This localizes the regression to the gallery-shell composition hunk as a group; the tested sub-hunks did not isolate a smaller individual cause.

At 4×, the current-main baseline (`38b2fd4`) measured 140ms Event Timing / 95.426ms scripting; the shell-view fix measured 32ms / 10.6985ms. A/A p95 absolute-delta bands were 24 / 15.295ms (baseline) and 8 / 3.683ms (fix); both metrics clear the noise screen. The fixed result matches the historical `5cde4de` measurement (32ms / 11.00ms) and Radix (32ms / 19.016ms). Detailed per-run samples and load averages are in [`data/menus-mount-shell-fix-abab.json`](data/menus-mount-shell-fix-abab.json).

The `/menus` DOM probe counted `document.querySelectorAll('*').length`: 654 nodes at `5cde4de` and 658 at current main, with 200 closed-menu triggers in each. The scene probe counted 805 VNodes total, including exactly four VNodes per closed menu (200 × 4); it found no hidden `role=menu` portal panels. Thus the extra 4 DOM nodes and no VNode growth do not explain the ×200-scale timing jump.

Both navigation benchmarks retain gallery intent/visible prefetch behavior and describe user flows, not isolated cold fetches. The follow-up ABAB samples use Node `v24.21.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor, five alternating blocks (10 sessions per side), and fourfold CPU throttling.

## Menus-mount regression branch comparison (2026-10-20)

This final comparison measures `origin/main` (`349f8fa`) against the menus-mount-regression branch, and the branch against the pinned Radix2Solid fixture (`383676172`). It covers `nav-cold`, `menus-tick`, `dropdown-open`, and `dialog-open` at 1× and 4× CPU throttling. Each cell is the median in milliseconds (`Event Timing / trace scripting`) from five ABAB blocks (10 sessions per app); A/A noise bands are the larger of each app's p95 absolute delta over ten adjacent pairs. `noise` means the median gap did not exceed that band; this is a noise screen, not a significance test. Full samples and per-interaction load averages are in [`data/menus-mount-regression-abab.json`](data/menus-mount-regression-abab.json).

Runtime: Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. Host load averages were `16.96 / 16.76 / 17.61` at start and `23.68 / 20.84 / 19.00` at end (1/5/15 minutes). Event Timing values are quantized with a 16ms observation threshold. Both navigation scenarios retain the gallery's intent/visible prefetch behavior, so these are user-flow comparisons rather than isolated cold-fetch measurements.

| Comparison | Rate | Scenario | Before → candidate (ET / script) | A/A band (ET / script) | Noise screen (ET / script) |
|---|---:|---|---:|---:|---|
| origin/main → branch | 1× | `nav-cold` | 48 / 24.57 → 16 / 3.34 | 40 / 21.42 | noise / noise |
| origin/main → branch | 1× | `menus-tick` | 16 / 1.96 → 16 / 2.06 | 0 / 0.45 | noise / noise |
| origin/main → branch | 1× | `dropdown-open` | 24 / 5.83 → 24 / 5.48 | 0 / 1.32 | noise / noise |
| origin/main → branch | 1× | `dialog-open` | 24 / 4.92 → 24 / 4.67 | 0 / 0.94 | noise / noise |
| origin/main → branch | 4× | `nav-cold` | 136 / 91.38 → 40 / 12.05 | 24 / 22.05 | branch / branch |
| origin/main → branch | 4× | `menus-tick` | 16 / 6.09 → 16 / 7.29 | 8 / 2.12 | noise / noise |
| origin/main → branch | 4× | `dropdown-open` | 40 / 25.00 → 40 / 25.31 | 8 / 12.21 | noise / noise |
| origin/main → branch | 4× | `dialog-open` | 32 / 18.89 → 32 / 20.07 | 8 / 8.39 | noise / noise |
| branch → Radix | 1× | `nav-cold` | 16 / 3.42 → 16 / 4.88 | 0 / 0.84 | noise / branch |
| branch → Radix | 1× | `menus-tick` | 16 / 2.06 → 16 / 0.36 | 0 / 0.27 | noise / radix2solid |
| branch → Radix | 1× | `dropdown-open` | 24 / 5.25 → 16 / 1.43 | 8 / 1.66 | noise / radix2solid |
| branch → Radix | 1× | `dialog-open` | 24 / 4.61 → 16 / 3.75 | 0 / 1.52 | radix2solid / noise |
| branch → Radix | 4× | `nav-cold` | 40 / 12.50 → 32 / 21.84 | 16 / 15.33 | noise / noise |
| branch → Radix | 4× | `menus-tick` | 16 / 7.66 → 16 / 1.66 | 8 / 2.33 | noise / radix2solid |
| branch → Radix | 4× | `dropdown-open` | 40 / 21.68 → 48 / 11.68 | 32 / 26.48 | noise / noise |
| branch → Radix | 4× | `dialog-open` | 40 / 28.87 → 40 / 26.26 | 64 / 54.46 | noise / noise |

Against `origin/main`, only 4× `nav-cold` clears the A/A bands in both Event Timing and scripting. The other three scenarios are within their bands at both rates. Against Radix, 1× scripting favors the branch for `nav-cold` and Radix for `menus-tick` and `dropdown-open`; Radix Event Timing is lower for `dialog-open`. At 4×, only `menus-tick` scripting clears its band in Radix's favor; all other metrics/scenarios are within their A/A bands.

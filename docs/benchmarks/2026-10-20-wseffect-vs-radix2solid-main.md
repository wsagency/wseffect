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

The historical comparison at [`2026-10-20-wseffect-vs-radix2solid.md`](2026-10-20-wseffect-vs-radix2solid.md) describes commit `5cde4de` and should not be substituted for these merged-main measurements. This report and its JSON artifact describe merge result `06876822ff4fbd62b1fd7bf497560f1cdc763de0` only.

# WSEffect vs Radix gallery QA
> **Historical benchmark:** measured at commit `5cde4de`; results describe that tree, not current `origin/main`.

## Scope and method

Measured source: `5cde4de89666903be9e0e45c3ae971c9645e7e76`; Radix fixture pin `383676172`. Runtime: Node `v24.21.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. Main ABAB comparison used five A/B/A/B blocks (10 sessions per app per scenario and throttle), with A/A ten adjacent pairs per app/scenario/throttle. CPU-throttle self-test measured 3.935x in the main run and 3.960x in the additional run. Data files are in `data/`; they retain per-run load averages and detailed measurements.

The additional run measured theme appearance, theme accent, shared date input, dialog open, dropdown open, `/menus` navigation (`nav-cold` hook), and `/dialog` navigation (`nav-prefetch` hook). It uses the same PerformanceObserver/CDP trace helpers (`interactionDuration`, `traceScriptingDuration`, `traceAnimationFrameCount`) as the core harness. Event Timing observes entries at the 16ms threshold; values below that are not distinguishable.

High host load was sustained and unrelated to these worktrees after the permitted 15-minute wait. Core run load averages were 24.48/26.81/24.69 at start and 19.27/22.08/22.96 at end; 720 per-run samples ranged 15.58–37.69. Additional run began at 22.83/19.74/20.43 and ended at 21.30/20.42/20.34; its recorded 1-minute load samples ranged 16.18–23.72 at 1x and 18.12–23.03 at 4x. This noise is accounted for with per-scenario A/A bands below and in the JSON artifacts.

## Core comparison

The six original scenarios are summarized in `data/measurements.json`; it contains the 1x/4x medians, p95s, A/A bands, every per-run load sample, build-size data, throttle commands, and exact method. Examples at 4x (Event Timing / scripting-duration medians, ms; Wseffect vs Radix):

| Scenario | Wseffect | Radix |
|---|---:|---:|
| `vl-cell` | 32 / 26.08 | 16 / 3.18 |
| `vl-filter` | 64 / 51.52 | 56 / 40.98 |
| `vl-sort` | 56 / 48.19 | 32 / 12.27 |
| `vl-select` | 36 / 24.91 | 16 / 1.27 |
| `form-field` | 16 / 8.61 | 16 / 4.34 |
| `menus-tick` | 16 / 6.47 | 16 / 1.73 |


## First-visit size and VirtualList profile

The first-visit classifier treated Radix document/parser assets (entry JS, CSS, framework JS, and parser-discovered dependencies) as speculative because it used Wseffect's page-manifest model. Radix has no such page model: requests made by the document/parser before the first idle with no navigation are mandatory. The regression test exercises an empty primary-page manifest and asserts these assets remain mandatory. After the fix, measured first visit is **87,006 B across 8 requests** (including 12,857 B entry, 50,595 B CSS, 20,348 B framework, 2,313 B parser dependency, and small document/service-worker assets), with **0 B speculative prefetch**. This replaces the misclassified 370 B first-visit figure. Wseffect remains **155,869 B / 16 requests** first visit and **20,667 B / 7 requests** speculative prefetch; shell compressed/raw sizes are 98,627 / 354,515 B. Radix shell compressed/raw sizes are 33,205 / 100,037 B. The size run's load averages were 18.94/20.48/20.98 at start and 19.19/20.51/20.99 at end.

At 4×, a source-mapped CDP precise-coverage run counted row-renderer calls in one interaction per case: `vl-cell` 1, `vl-filter` 14, `vl-sort` 28, `vl-select` 1. Thus row views are not being rerun for all 10,000 items. The gallery uses a module-stable `createKeyedLazy()` wrapper and stable `renderRow`; its cache arguments are the row's primitive fields, selected flag, index and builder. Fresh `viewInputs`, `itemToKey`/`itemToView` closures, and per-render container-attribute objects do not enter the keyed-row cache key, and the observed call counts support that they are not defeating row memoization. Filter/sort legitimately change the visible row set/order, and row index is a cache argument.

The page uses fixed 36px rows. Foldkit's height-callback path computes a per-item prefix-sum layout (mapping heights and scanning them) on each list view; when no callback is supplied it uses arithmetic fixed-height indexing. The prototype removes the redundant `itemToRowHeightPx: () => 36` option, selecting the existing fixed-height path without changing row semantics. The profiler runs were instrumented and used for counts only (their tracing durations are not comparable to the uninstrumented ABAB runs). Load around the before/after count runs was 20.36/21.98/21.22 → 19.12/21.66/21.12 and 19.85/20.74/21.07 → 18.74/20.50/20.99.

An uninstrumented 4× ABAB measured five A/B/A/B blocks and ten adjacent A/A pairs per build, with load averages recorded per run (overall 18.41–23.58). Values are medians in ms (`Event Timing / trace scripting`); delta is candidate minus before:

| Scenario | Before | Fixed-height candidate | Delta (ET / script) | A/A p95 absolute-delta bands (before / candidate; ET / script) |
|---|---:|---:|---:|---:|
| `vl-cell` | 40 / 33.14 | 32 / 29.39 | -8 / -3.75 | 16 / 11.26; 16 / 11.90 |
| `vl-filter` | 52 / 42.45 | 56 / 46.68 | +4 / +4.23 | 16 / 11.29; 16 / 19.09 |
| `vl-sort` | 56 / 49.28 | 56 / 50.59 | 0 / +1.31 | 64 / 46.44; 24 / 22.36 |
| `vl-select` | 32 / 22.42 | 32 / 22.08 | 0 / -0.34 | 8 / 9.91; 16 / 7.90 |

None of these deltas exceeds its scenario's within-build A/A band, so the fixed-height prototype has **no reliably measured timing benefit under this host load**. It removes needless O(n) layout work by construction, but does not resolve the reported interaction gap. `vl-filter` and `vl-sort` remain above the unchanged 50ms GATE-P2 Event Timing ceiling in this candidate run (both 56ms medians).

Concrete follow-ups ranked by expected impact:
1. **Use fixed-height arithmetic instead of per-item prefix sums (prototyped).** The callback path adds O(n) layout work whenever the list view updates, including cell and selection; removing the redundant 36px callback selects Foldkit's existing constant-height path. This is the broadest, lowest-risk candidate across all four interactions, though this ABAB run did not detect a reliable improvement.
2. **Avoid repeated full-list work on filter/sort/cell updates.** Filter and sort each normalize/search strings and build new arrays; sort also copies/reverses the full source. Cache normalized item values and derive filtered/sorted identities incrementally or in a stable precomputed index. Likely a higher-impact follow-up specifically for filter/sort, but needs a separate semantics-preserving prototype.
3. **Avoid rebuilding all list identity/layout metadata.** `informItemsChanged` receives `items.map(item => item.id)` on filter/sort; retain IDs with item records or update the virtual list's identity map only for changed rows.

Row-view execution remains bounded by visible/overscan rows; optimizing keyed row memoization further is not indicated by these counts. No gate ceilings were changed.

## Additional scenarios

Medians (ms), Wseffect vs Radix; each entry is `Event Timing / trace scripting`. `*` means the absolute median gap exceeds the larger of the two apps' measured p95 A/A absolute-delta bands for that metric; this is an empirical noise screen, not a formal significance test. Full p95 and A/A details are in `data/extra-measurements.json`.

| Scenario | 1x Wseffect vs Radix | 4x Wseffect vs Radix | Noise-screen result |
|---|---:|---:|---|
| Theme appearance | 24 / 2.57 vs 16 / 4.32 | 48 / 10.50 vs 28 / 18.62 | 1x Event Timing: no difference beyond noise; scripting: Wseffect lower*; 4x Event Timing: Radix lower*; scripting: Wseffect lower* |
| Theme accent | 24 / 2.59 vs 16 / 2.63 | 24 / 9.43 vs 16 / 10.46 | No difference beyond noise on either metric at 1x or 4x |
| Shared date | 16 / 1.90 vs 16 / 0.51 | 16 / 6.79 vs 16 / 2.50 | Event Timing: no difference at either rate; scripting: Radix lower* at 1x and 4x; 0 child-list mutations in either app at either rate |
| Dialog open | 32 / 7.64 vs 16 / 8.41 | 48 / 35.37 vs 56 / 41.86 | 1x Event Timing: Radix lower*; scripting: no difference beyond noise; 4x: no difference beyond noise on either metric |
| Dropdown open | 24 / 9.39 vs 24 / 3.68 | 68 / 50.77 vs 96 / 23.41 | 1x Event Timing: no difference beyond noise; scripting: Radix lower*; 4x Event Timing: Wseffect lower*; scripting: Radix lower* |
| `/menus` navigation (`nav-cold`) | 16 / 3.47 vs 16 / 6.42 | 32 / 11.00 vs 40 / 24.37 | 1x Event Timing: no difference beyond noise; scripting: Wseffect lower*; 4x: no difference beyond noise on either metric |
| `/dialog` navigation (`nav-prefetch`) | 24 / 4.87 vs 16 / 5.61 | 40 / 18.45 vs 32 / 19.88 | No difference beyond noise on either metric at 1x or 4x |

Caveat: `nav-cold` is not a truly cold Wseffect route. The gallery wires both `OnMouseEnter` and `OnFocus` to `requestedPrefetch`, so Playwright's click may prefetch while beginning the interaction. Its `prefetchOnVisible` mount behavior can also warm visible links. The Radix fixture has no matching prefetch implementation. The `/dialog` prefetch row therefore compares the two apps' actual but different navigation behavior, not an isolated renderer-only effect; treat both navigation rows as descriptive user-flow measurements, not like-for-like component comparisons. The existing `nav-prefetch` hook on Radix does not imply that it prefetches.

## Verification and visual review

- Frozen dependency installation passed previously.
- `pnpm check` passed after the classifier and VirtualList changes: build/codegen check, typecheck, lint, package tests (app 109, themes 48, gallery 36, Radix fixture 4), repository/Node tests (67), and packed-consumer E2E (17). Lint printed warnings; all gates passed. The fixture's injected missing-pin tests intentionally print git errors while passing.
- `pnpm e2e` passed 52 tests across Chromium, Firefox, WebKit, and dev-server configurations.
- Screenshots were reviewed separately; the image bundle is not included in this versioned report.
- Notable visual mismatches: Gallery shell is sparse with vertical links versus Radix's top horizontal navigation/cards; Gallery dialog is much wider; Gallery card is unframed; Gallery text field is underlined rather than boxed; Gallery tabs/details differ; the captured Gallery dropdown-open state shows its trigger but not the menu while Radix shows the menu.

## Orphan cleanup

Sent SIGTERM to Vite PIDs `2349280` and `3503914` from the specified Wseffect worktrees. No matching Chromium/Playwright processes under the specified Wseffect paths were found; no other-project or user browser processes were touched. The current benchmark's own preview servers/browser were allowed to exit normally.
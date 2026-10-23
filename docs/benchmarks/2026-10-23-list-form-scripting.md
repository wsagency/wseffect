# List and form scripting attribution

**Status:** directional local profiling and scratch-prototype evidence; not a performance gate. No Wseffect package code was changed.

## Method

Captured source-mapped Chrome DevTools CPU profiles from the production Gallery build using Node `v24.21.0`, Chromium `156.0.8078.4`, CDP CPU throttling at 4×, a 100 µs sampling interval, and three fresh-context captures per interaction. The scenario action was followed by an 80 ms settling interval. Sampled self-time was classified by original source-map path into the origin groups below; values are per-origin medians across the three captures. Top functions are likewise per-function medians. `GC/native/program` includes idle/program/native samples and is not app scripting. Since the profile spans the action plus settling and V8 sample totals are not trace-scripting durations, do not compare these numbers to Event Timing or harness trace scripting.

## Three-capture attribution (sampled self-time, ms)

Effect and Wseffect subgroups are shown in the cell order written in each header.

| Scenario | Foldkit | `@foldkit/ui` | Effect (runtime / Schema / data structures / other) | `@wsagency/*` (app / themes / primitives / other) | Gallery page | GC/native/program | Other JS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `vl-cell` | 9.775 | 0.022 | 0.632 / 0.084 / 0 / 1.238 | 0.156 / 0.911 / 0 / 0 | 2.417 | 283.118 | 0 |
| `vl-sort` | 12.315 | 5.068 | 0.913 / 0.526 / 9.251 / 3.991 | 1.147 / 0.918 / 0 / 0 | 1.310 | 302.003 | 0 |
| `vl-select` | 5.318 | 0.414 | 0.116 / 0.154 / 0 / 1.022 | 0.561 / 0 / 0 / 0 | 0.415 | 342.806 | 0 |
| `form-field` | 4.134 | 0.554 | 0.293 / 0.190 / 0 / 2.024 | 0.119 / 0.160 / 0 / 0 | 0.893 | 261.460 | 0 |
| `shared-date` | 9.439 | 0 | 1.386 / 0.655 / 0 / 0.625 | 0 / 0.537 / 0 / 0 | 0.715 | 278.576 | 0 |

### Top 10 sampled functions per scenario

Functions are listed as `origin — source :: function (median ms)`; GC/native/program entries are retained because they are part of the sampled profile.

- **`vl-cell`:** GC/native/program — (program) (194.232); GC/native/program — (idle) (85.635); GC/native/program — (garbage collector) (1.623); Foldkit — `html/submodel.js :: (anonymous)` (1.374); Foldkit — `html/index.js :: dd` (0.780); Foldkit — `html/boundary.js :: captureCallSite` (0.749); Foldkit — `html/index.js :: buildElement` (0.561); Gallery — `pages/virtualList.ts :: (anonymous)` (0.549); Effect runtime — `internal/effect.js :: ic` (0.513); Foldkit — `html/submodel.js :: walkForFunctions` (0.487).
- **`vl-sort`:** GC/native/program — (program) (194.858); GC/native/program — (idle) (98.241); Effect data structures — `internal/hashMap.js :: set` (8.237); GC/native/program — `getBoundingClientRect` (4.719); GC/native/program — (garbage collector) (3.009); `@foldkit/ui` — `virtualList/index.js :: informItemsChanged` (1.686); Foldkit — `html/submodel.js :: walkForFunctions` (1.592); GC/native/program — (anonymous) (1.507); Foldkit — `html/boundary.js :: captureCallSite` (1.398); Foldkit — `html/submodel.js :: (anonymous)` (1.308).
- **`vl-select`:** GC/native/program — (program) (229.294); GC/native/program — (idle) (97.509); GC/native/program — (anonymous) (6.581); GC/native/program — `InjectedScript` (2.694); GC/native/program — `elementsFromPoint` (1.643); GC/native/program — `query` (1.251); Foldkit — `html/submodel.js :: walkForFunctions` (0.901); Foldkit — `html/submodel.js :: (anonymous)` (0.816); GC/native/program — `previewNode` (0.777); GC/native/program — `get Temporal` (0.769).
- **`form-field`:** GC/native/program — (program) (174.657); GC/native/program — (idle) (82.923); GC/native/program — `querySelectorAll` (1.107); GC/native/program — (garbage collector) (0.921); Effect other — `PubSub.js :: loop` (0.822); Foldkit — `snabbdom/init.js :: updateChildren` (0.790); GC/native/program — (anonymous) (0.610); Effect other — `Equivalence.js :: (anonymous)` (0.603); GC/native/program — `query` (0.543); Foldkit — `html/boundary.js :: captureCallSite` (0.423).
- **`shared-date`:** GC/native/program — (program) (198.709); GC/native/program — (idle) (74.970); GC/native/program — `focus` (4.214); Foldkit — `html/boundary.js :: captureCallSite` (1.426); GC/native/program — (garbage collector) (0.905); Foldkit — `html/index.js :: dd` (0.731); Effect Schema — `SchemaAST.js :: (anonymous)` (0.655); Foldkit — `snabbdom/init.js :: (anonymous)` (0.535); Gallery — `shell.ts :: view` (0.451); Foldkit — `snabbdom/init.js :: patchVnode` (0.418).

### Wseffect-side conclusion

In this synchronized five-scenario capture set, the largest `@wsagency/app` group was **1.147 ms** (`vl-sort`); the largest total `@wsagency/*` group was **2.065 ms** (app plus themes in `vl-sort`, 5.8% of the 35.439 ms non-GC sampled source total). `form-field` attributed 0.119 ms to app and 0.160 ms to themes. A separate three-capture form-only profile had a noisy 1.132 ms app median (about 18% of that capture's non-GC source samples); it was not reproduced by the synchronized five-scenario capture. These values put app code below about 1.2 ms at 4×, with no stable named app hotspot.

I checked `packages/app/src/view/page.ts` once. `readyView` rebuilds and sorts `Object.entries(inputs)` on each ready render to produce the primitive lazy arguments. The generic `inputs` object can change key shape, and its stable sorted order is used for lazy argument identity; hoisting the keys safely requires shape-change tracking, not a direct constant hoist. The profiles do not show a stable, named `readyView` hotspot, so this is not enough evidence for a maintainable package change. No Wseffect optimization was made.

## Upstream potential: local prototype ABAB

A and B were production Gallery builds with identical Vite config, production mode, minification defaults, source-map settings, Node/Chromium versions, and the existing trusted-input `runScenario` harness. A used the published Foldkit/UI packages. B used scratch copies only: Foldkit's deep nested-function walk was guarded with `import.meta.env.DEV`, and `informItemsChanged` skipped building the full key `HashSet` when `measuredRowHeights` was empty. The scratch Vite aliases and bundles are outside the repository at `$HOME/.cache/wseffect-work/perf-lists/prototype`. Each 4× arm comprised two ten-session rounds (20 sessions per build per scenario), in A/B/A/B order. Reported A/A and B/B bands are p95 absolute pairwise deltas between the two same-build ten-session rounds. Load averages are 1-minute averages at each round/scenario boundary.

### 4× results

| Scenario | Published A Event / script median | Prototype B Event / script median | B−A Event / script delta | B−A script delta | A/A p95 Event / script | B/B p95 Event / script |
|---|---:|---:|---:|---:|---:|---:|
| `vl-cell` | 16 / 14.102 ms | 16 / 8.606 ms | 0 ms | −5.496 ms | 24 / 18.682 ms | 0 / 4.786 ms |
| `vl-sort` | 48 / 38.879 ms | 32 / 17.023 ms | −16 ms | −21.856 ms | 40 / 30.158 ms | 8 / 6.154 ms |
| `vl-select` | 24 / 8.029 ms | 24 / 7.165 ms | 0 ms | −0.864 ms | 8 / 2.038 ms | 8 / 7.258 ms |

The sort medians moved favorably, but its 16 ms Event Timing and 21.856 ms scripting deltas are both smaller than the published A/A bands (40 ms and 30.158 ms). Cell and select also do not clear their A/A bands. Event Timing is quantized in 8 ms increments. The measured 1-minute load average ranged **8.62–16.04** during these 4× rounds, so this does not demonstrate an end-user win or regression.

### 1× results

| Scenario | Published A Event / script median | Prototype B Event / script median | B−A Event / script delta | B−A script delta | A/A p95 Event / script | B/B p95 Event / script |
|---|---:|---:|---:|---:|---:|---:|
| `vl-cell` | 16 / 2.958 ms | 16 / 2.257 ms | 0 ms | −0.701 ms | 0 / 3.425 ms | 0 / 2.647 ms |
| `vl-sort` | 24 / 7.010 ms | 24 / 4.159 ms | 0 ms | −2.851 ms | 8 / 3.139 ms | 8 / 3.056 ms |
| `vl-select` | 16 / 2.124 ms | 16 / 2.237 ms | 0 ms | +0.113 ms | 0 / 0.805 ms | 0 / 1.246 ms |

No 1× delta clears its corresponding same-build A/A scripting band; Event Timing deltas are all 0 ms. Load average ranged **7.68–10.48**. Across both rates, the local prototype has not shown a result that clears the noise bands. The results are useful to prioritize upstream experiments, not to claim a shipped performance improvement.

The 61.437 ms isolated sort sample previously described as a prototype result was actually captured against the published A bundle (the scratch `baseline` directory). It was one sample with no contemporaneous load reading; the final A/B run's elevated, variable load and wide A/A band explain why that isolated point should not be compared to an earlier ~27 ms baseline or treated as a prototype effect. The final 4×/1× per-session values, round medians, and load arrays are in scratch `prototype-abab.json` and `prototype-abab-1x.json`.

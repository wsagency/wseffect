# Owned Foldkit performance results — 2026-10-25

Directional comparison of the local Foldkit changes against `origin/main` (`3060fad`). No result below is a release gate.

## Method

Production Gallery builds were measured with the trusted-input `runScenario` harness. Build A is the `origin/main` worktree at `http://127.0.0.1:4183`; build B is this branch at `http://127.0.0.1:4184`. Node was `v24.21.0`, Chromium `156.0.8078.4`. For each of `vl-cell`, `vl-sort`, `vl-select`, `form-field`, and `shared-date`, each rate had ten interleaved A/B pairs and ten A/A pairs for each build. Measurements covered 1× and 4× CPU throttling. The shared-date scenario definition was kept in the scratch runner, matching the existing benchmark scenario; no harness scenario/report edits remain in the repository. Load averages (1/5/15 minute) were `9.04 / 9.81 / 7.68` at measurement start and `6.31 / 6.37 / 6.88` at end.

Event Timing is quantized (8 ms steps); script timing is the trusted interaction trace interval. A/A bands are within-build p95 absolute pairwise deltas. AB bands are p95 absolute A/B pairwise deltas. Full paired observations and bands are in [`data/2026-10-25-owned-foldkit-perf-measurements.json`](data/2026-10-25-owned-foldkit-perf-measurements.json); the median summary is in [`data/2026-10-25-owned-foldkit-perf-summary.json`](data/2026-10-25-owned-foldkit-perf-summary.json).

## ABAB medians and noise bands

Times are milliseconds; each median is `Event Timing / scripting`. `A/A p95` gives baseline then candidate; `A/B p95` is the paired cross-build band.

| Rate | Scenario | Baseline median | Candidate median | Δ candidate−baseline | Baseline A/A p95 | Candidate A/A p95 | A/B p95 |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1× | `vl-cell` | 16 / 2.67 | 16 / 2.17 | 0 / −0.50 | 0 / 3.89 | 0 / 2.68 | 0 / 1.29 |
| 1× | `vl-sort` | 24 / 5.64 | 24 / 3.84 | 0 / −1.79 | 8 / 15.23 | 8 / 3.02 | 8 / 3.92 |
| 1× | `vl-select` | 16 / 2.15 | 16 / 2.16 | 0 / +0.01 | 8 / 3.08 | 0 / 6.40 | 0 / 0.78 |
| 1× | `form-field` | 16 / 1.59 | 16 / 1.54 | 0 / −0.05 | 0 / 0.65 | 0 / 0.51 | 0 / 1.43 |
| 1× | `shared-date` | 16 / 1.44 | 16 / 1.22 | 0 / −0.22 | 0 / 0.89 | 0 / 1.21 | 0 / 0.75 |
| 4× | `vl-cell` | 16 / 11.23 | 16 / 8.14 | 0 / −3.09 | 8 / 2.66 | 0 / 2.82 | 24 / 24.29 |
| 4× | `vl-sort` | 32 / 25.97 | 28 / 13.16 | −4 / −12.80 | 0 / 5.72 | 16 / 21.49 | 8 / 14.89 |
| 4× | `vl-select` | 24 / 10.20 | 20 / 7.91 | −4 / −2.29 | 48 / 17.02 | 8 / 2.44 | 40 / 24.23 |
| 4× | `form-field` | 16 / 5.70 | 16 / 6.01 | 0 / +0.31 | 8 / 7.08 | 8 / 8.77 | 0 / 1.19 |
| 4× | `shared-date` | 16 / 5.44 | 16 / 4.44 | 0 / −1.00 | 8 / 3.92 | 8 / 1.72 | 8 / 4.17 |

The observed 4× `vl-sort` scripting median fell by 12.80 ms, but its 14.89 ms A/B p95 band and 21.49 ms candidate A/A scripting band are broad. The 4× `vl-cell` and `vl-select` cross-build bands are also wide. Timing evidence is therefore directional, not conclusive. No Event Timing median exceeded 50 ms in these runs.

## Deterministic counters

Counters were collected separately at 1×, resetting after each scenario's preparation and warmup. Walk visits instrumented the mapped validation walker; HashSet constructions instrumented the mapped `VirtualList.informItemsChanged` call site. The DOM counters include node creation (`Document.createElement[NS]`, `createTextNode`, `createComment`, `cloneNode`), `Node.insertBefore`/`appendChild`/`removeChild`/`replaceChild`, and element/text/document-node `remove`, `before`, `after`, `replaceWith`, `replaceChildren`, `append`, and `prepend`. A `MutationObserver` independently checked added/removed node records. The earlier filter capture's 182/0 insertion/removal split was a counter artifact; the complete recapture found 169/13 on both builds. Instrumentation was scratch-only and the built assets were restored afterward. Raw complete observations: [`data/2026-10-25-owned-foldkit-perf-counters.json`](data/2026-10-25-owned-foldkit-perf-counters.json).

`Insertions` and `removals` below are wrapped native DOM method calls; `moves` are insertions of a node already parented by the target. Creation totals count the DOM factories. The keyed-list regression test checks exact DOM `data-key` order and child count after a shrinking filter and a subsequent reordering filter. In the Gallery filter interaction, both builds end with 14 visible rows. Shrinking-filter DOM work is equal except the candidate eliminates one move (baseline 1 move + 169 inserts + 13 removals; candidate 0 + 169 + 13); both create 104 elements and 65 text nodes. Sort performs more DOM work in the candidate: creation 182→364 nodes (112→224 elements, 70→140 text nodes), insertions 182→364, removals 14→28, with 13 moves unchanged. Including created nodes and DOM method calls, this is 391→769 total operations. The observed 4× scripting median was 12.80 ms lower, with validation visits 30,030→20,040, HashSet constructions 1→0, and formatted stacks 15→0. Despite doubled sort DOM work, the overall measured scripting median favors the candidate; timing bands are broad, so that net result is directional rather than conclusive.

| Interaction | Build | Walk visits | HashSet constructions | DOM moves | Insertions | Removals | Created elements | Created text nodes | Formatted stacks |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Filter | Baseline | 6,898 | 1 | 1 | 169 | 13 | 104 | 65 | 10 |
| Filter | Candidate | 3,459 | 0 | 0 | 169 | 13 | 104 | 65 | 0 |
| Sort | Baseline | 30,030 | 1 | 13 | 182 | 14 | 112 | 70 | 15 |
| Sort | Candidate | 20,040 | 0 | 13 | 364 | 28 | 224 | 140 | 0 |

## Candidate source-map profiles

The candidate was profiled at 4× with three source-mapped captures per scenario; raw captures and load averages are in [`data/2026-10-25-owned-foldkit-perf-profiles.json`](data/2026-10-25-owned-foldkit-perf-profiles.json). Native `program` and `idle` samples dominate the captures, so this list reports the largest mapped JavaScript origins averaged across the three captures, excluding native frames:

| Scenario | Remaining mapped hot spots (approx. mean sampled ms / capture) |
|---|---|
| `vl-cell` | Foldkit UI `input/index.js` (~1.03); Gallery `virtualList.ts` `CellChanged` (~0.68); Effect schema equivalence (~0.41); Foldkit Snabbdom init (~0.38). |
| `vl-sort` | Foldkit UI `virtualList/index.js` (~3.91); Effect `Function.js` (~1.30); Foldkit `html/index.js` (~1.28); Foldkit Snabbdom init (~1.02); Foldkit branding (~0.78). |
| `vl-select` | Foldkit `runtime/subscriptionFibers.js` (~0.54); Foldkit `propsModule.js` (~0.49); Gallery shell (~0.45); Effect schema equivalence (~0.32); app prefetch (~0.27). |
| `form-field` | Foldkit `html/index.js` (~0.61); Effect internal effect loop (~0.56); Foldkit `html/submodel.js` (~0.40); Effect `SchemaAST.js` (~0.30). |
| `shared-date` | Foldkit `runtime/documentMetadata.js` (~0.63); Foldkit `controlledDomState.js` (~0.48); Themes Box (~0.44); Themes Flex (~0.44); Gallery date picker (~0.34). |

## Implementation and verification

The two upstream issue drafts are marked **implemented locally**: validation redesign commits are `000602b`, `b1678da`, `36140da`, and `8c64324`; the separate deferred-callsite-formatting optimization is `a550ed1`. Fixed-height key pruning is implemented locally in `f82b085`. The repository benchmark harness was left unchanged; the shared-date scenario used by the scratch measurements matches the existing benchmark tooling.

Final verification command exit codes: clean build + `pnpm check` 0; one full `pnpm e2e` 0 (136/136); standalone `pnpm test:consumer` 0; `pnpm gate:size --app apps/gallery` 0; `compare-sp2` 0 (236/236 passed).

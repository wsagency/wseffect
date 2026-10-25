# Owned Foldkit performance results — 2026-10-25

Directional comparison of the local Foldkit changes against `origin/main` (`3060fad`). No result below is a release gate.

## Method

Production Gallery builds were measured with the trusted-input `runScenario` harness. Build A is the `origin/main` worktree at `http://127.0.0.1:4183`; build B is this branch at `http://127.0.0.1:4184`. Node was `v24.21.0`, Chromium `156.0.8078.4`. For each of `vl-cell`, `vl-sort`, `vl-select`, `form-field`, and `shared-date`, each rate had ten interleaved A/B pairs and ten A/A pairs for each build. Measurements covered 1× and 4× CPU throttling. Before tracing, the harness now waits after warmup and reset for two animation frames and a 50 ms idle period, bounded by a 2 s timeout. The shared-date scenario definition was kept in the scratch runner. Load averages (1/5/15 minute) were `3.72 / 3.92 / 4.54` at measurement start and `4.24 / 4.12 / 4.28` at end.

An earlier capture overlapped the reset update with the measured interaction and is discarded; its apparent double DOM work on sort was not a candidate regression. Earlier wseffect-vs-radix2solid scripting numbers, especially `vl-sort`, may likewise include reset work and must be re-measured in the deferred benchmark.

Event Timing is quantized (8 ms steps); script timing is the trusted interaction trace interval. A/A bands are within-build p95 absolute pairwise deltas. AB bands are p95 absolute A/B pairwise deltas. Full paired observations and bands are in [`data/2026-10-25-owned-foldkit-perf-measurements.json`](data/2026-10-25-owned-foldkit-perf-measurements.json); the median summary is in [`data/2026-10-25-owned-foldkit-perf-summary.json`](data/2026-10-25-owned-foldkit-perf-summary.json).

## ABAB medians and noise bands

Times are milliseconds; each median is `Event Timing / scripting`. `A/A p95` gives baseline then candidate; `A/B p95` is the paired cross-build band.

| Rate | Scenario | Baseline median | Candidate median | Δ candidate−baseline | Baseline A/A p95 | Candidate A/A p95 | A/B p95 |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1× | `vl-cell` | 16 / 3.15 | 16 / 3.04 | 0 / −0.11 | 0 / 0.31 | 0 / 0.87 | 0 / 0.76 |
| 1× | `vl-sort` | 24 / 5.95 | 24 / 6.20 | 0 / +0.25 | 0 / 0.55 | 0 / 1.11 | 0 / 0.91 |
| 1× | `vl-select` | 16 / 2.09 | 16 / 2.37 | 0 / +0.27 | 0 / 0.98 | 0 / 0.72 | 0 / 0.74 |
| 1× | `form-field` | 16 / 2.09 | 16 / 2.16 | 0 / +0.07 | 0 / 0.79 | 0 / 0.55 | 0 / 0.30 |
| 1× | `shared-date` | 16 / 1.75 | 16 / 1.64 | 0 / −0.11 | 0 / 0.56 | 0 / 0.43 | 0 / 0.58 |
| 4× | `vl-cell` | 16 / 12.13 | 16 / 11.71 | 0 / −0.42 | 0 / 3.03 | 0 / 3.24 | 0 / 3.96 |
| 4× | `vl-sort` | 32 / 24.18 | 32 / 25.82 | 0 / +1.64 | 0 / 3.22 | 0 / 4.03 | 8 / 10.95 |
| 4× | `vl-select` | 24 / 9.00 | 24 / 7.84 | 0 / −1.16 | 0 / 2.49 | 0 / 1.54 | 8 / 2.62 |
| 4× | `form-field` | 16 / 7.96 | 16 / 7.19 | 0 / −0.77 | 0 / 1.88 | 0 / 3.31 | 0 / 4.11 |
| 4× | `shared-date` | 16 / 6.26 | 16 / 6.00 | 0 / −0.26 | 0 / 1.84 | 0 / 1.69 | 0 / 2.66 |

After settling the reset update, the 4× `vl-sort` scripting median is 1.64 ms higher in the candidate; its 10.95 ms A/B p95 band is wide relative to that change. Other scripting deltas are also small compared with their A/B bands. Timing evidence is directional, not conclusive. No Event Timing median exceeded 50 ms in these runs.

## Deterministic counters

Counters were collected separately at 1× after each scenario's warmup and reset settled: the reset DOM state was observed, at least two animation frames passed, and a 50 ms idle period completed before counters were zeroed. The settlement wait is bounded at 2 s. Walk visits instrumented the mapped validation walker; HashSet constructions instrumented the mapped `VirtualList.informItemsChanged` call site. The DOM counters include node creation (`Document.createElement[NS]`, `createTextNode`, `createComment`, `cloneNode`), `Node.insertBefore`/`appendChild`/`removeChild`/`replaceChild`, and element/text/document-node `remove`, `before`, `after`, `replaceWith`, `replaceChildren`, `append`, and `prepend`. A `MutationObserver` independently checked added/removed node records. The earlier sort capture that reported 182→364 created nodes overlapped a reset render and is discarded. Instrumentation was scratch-only and the built assets were restored afterward. Raw complete observations: [`data/2026-10-25-owned-foldkit-perf-counters.json`](data/2026-10-25-owned-foldkit-perf-counters.json).

`Insertions` and `removals` below are wrapped native DOM method calls; `moves` are insertions of a node already parented by the target. Creation totals count the DOM factories. After settling, there is no measurable scripting change; these changes remove redundant work, as the counters show. The candidate walker was instrumented at the actual `walkValue` function and visits all 3,459 filtered IDs and 10,020 sorted IDs, versus 6,898 and 20,020 in the baseline; both candidate interactions avoid a HashSet construction and 10 stack formats. Filter and sort DOM counters match across builds: filtering ends with 14 visible rows, with 1 move, 169 insertions, and 13 removals, creating 104 elements and 65 text nodes; sort has 13 moves, 182 insertions, and 14 removals, creating 112 elements and 70 text nodes (391 total counted DOM operations per build).
These candidate validation counts predate the cache-boundary fix `1f1c5ba`; the corrected runtime still skips previously validated deep containers, but rechecks top-level `viewInputs` keys on every render so legal top-level callbacks can never poison the deep cache.

| Interaction | Build | Walk visits | HashSet constructions | DOM moves | Insertions | Removals | Created elements | Created text nodes | Formatted stacks |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Filter | Baseline | 6,898 | 1 | 1 | 169 | 13 | 104 | 65 | 10 |
| Filter | Candidate | 3,459 | 0 | 0 | 169 | 13 | 104 | 65 | 0 |
| Sort | Baseline | 20,020 | 1 | 13 | 182 | 14 | 112 | 70 | 10 |
| Sort | Candidate | 10,020 | 0 | 13 | 182 | 14 | 112 | 70 | 0 |
Earlier sampled attributions (including 6–9 ms attributed to `HashMap.set`) predated the settlement fix and overstated these costs, as the settled ABAB shows.

## Implementation and verification

The two upstream issue drafts are marked **implemented locally**: validation redesign commits are `000602b`, `b1678da`, `36140da`, and `8c64324`; the cache-boundary correctness fix is `1f1c5ba` (only deeply validated nested containers are cached; top-level `viewInputs` is checked each render). The separate deferred-callsite-formatting optimization is `a550ed1`. Fixed-height key pruning is implemented locally in `f82b085`. The benchmark harness settlement fix is `35efd55`, with its isolated local-HTTP test fixture correction in `ce31d25`. The shared-date scenario definition remains in the scratch runner.

Verification exit codes: `node --test tools/gates/perf.test.ts` 0 (28/28); `pnpm check` 0; one full `pnpm e2e` 0 (136/136); `compare-sp2` 0 (236/236 passed).

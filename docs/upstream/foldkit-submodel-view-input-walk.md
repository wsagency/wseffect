# Draft: avoid repeated deep validation of large `h.submodel` inputs

**Status:** local issue / PR draft only; not submitted upstream.
**Affected package:** `foldkit@0.168.0` (`apps/gallery/package.json`).

## Title

`h.submodel` rescans every nested record in `viewInputs` on each render

## Minimal reproduction

```ts
const items = Array.from({ length: 10_000 }, (_, index) => ({
  id: `item-${index}`,
  value: `Item ${index}`,
  account: `Account ${index % 117}`,
  region: ['North', 'South', 'East', 'West'][index % 4]!,
  amount: index,
}))

const viewInputs = {
  items,
  itemToKey: (item: (typeof items)[number]) => item.id,
  itemToView: (item: (typeof items)[number]) => renderRow(item),
}

// Embed this Submodel in a page whose model changes after a filter keystroke
// or sort click, rebuilding viewInputs while rendering only viewport rows.
h.submodel({ slotId: 'rows', model, view: listView, viewInputs, toParentMessage })
```

The current runtime's `wrapViewInputsForOuterBoundary` calls `assertNoNestedFunctions` for each submodel render. That loops over `viewInputs` keys; for an array value, `walkForFunctions` visits every element, then recursively enumerates every plain-object element's keys. This example therefore walks all 10,000 records (and their fields) even when the virtualized child renders only the visible window. The work is repeated on unrelated parent rerenders as well as filter/sort updates. The check is intended to reject functions nested below the top level, so this is measurable validation overhead rather than row rendering.

## Evidence

In the Gallery's 10,000-row VirtualList, a 4× CPU-throttled source-mapped CDP CPU profile captured 10 samples for each interaction. `foldkit/dist/html/submodel.js:63` (`walkForFunctions`) had median sampled self-time **3.83 ms** for filter (range **0.47–6.21 ms**) and **7.03 ms** for sort (range **1.74–15.01 ms**). The enclosing anonymous function at `submodel.js:80` had medians **4.36 ms** and **10.87 ms**, respectively. The app renders only viewport rows; prior precise-coverage counts were 14 row-renderer calls for filter and 28 for sort, not 10,000. These profiler sample times are attribution data, not Event Timing measurements; host-side interaction wall time was 67–85 ms in the filter samples, and raw V8 sample-delta totals should not be compared directly with wall time under emulated CPU throttling.

### Production-build follow-up: current five interactions

I checked the exact installed `foldkit@0.168.0` bundle used by Gallery, not a development build. `dist/html/submodel.js` has no environment or runtime-option guard: every plain-object `viewInputs` value is passed to `assertNoNestedFunctions`, and arrays and plain records recurse through `walkForFunctions`. Vite cannot dead-code-eliminate this unconditional call. The current Gallery passes stable IDs rather than records (`virtualList.ts`), but `viewInputs.items` remains an array of all 10,000 IDs, so the validation still visits the full list on each list render.

I used a source-mapped CDP CPU profile against a production Gallery build at 1× and 4×; each row below is one capture with a 100 µs sampling interval. Self-time values are sampled attribution, not trace-scripting or Event Timing, and the profile includes the post-action settling interval. The module columns group sampled self-time by source path; they are directional single-capture values, not stable medians.

| Scenario | Rate | Foldkit total | `foldkit/html` | `foldkit/snabbdom` | `foldkit/runtime` | `foldkit/domReflection` | Other Foldkit | `@foldkit/ui` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `vl-cell` | 1× | 2.29 ms | 1.38 ms | 0.31 ms | 0.15 ms | 0.15 ms | 0.15 ms | 0.15 ms |
| `vl-cell` | 4× | 5.28 ms | 4.29 ms | 0.57 ms | — | 0.05 ms | 0.37 ms | 0.09 ms |
| `vl-sort` | 1× | 7.53 ms | 3.54 ms | 1.23 ms | 0.31 ms | — | 0.61 ms | 1.84 ms |
| `vl-sort` | 4× | 14.89 ms | 7.17 ms | 2.62 ms | 1.00 ms | 1.23 ms | 2.88 ms | 1.85 ms |
| `vl-select` | 1× | 1.21 ms | 0.60 ms | 0.31 ms | — | — | 0.30 ms | — |
| `vl-select` | 4× | 6.24 ms | 2.85 ms | 1.81 ms | 0.06 ms | 0.82 ms | 0.70 ms | — |
| `form-field` | 1× | 1.08 ms | 0.47 ms | 0.31 ms | — | 0.16 ms | — | 0.15 ms |
| `form-field` | 4× | 2.71 ms | 1.65 ms | 0.58 ms | — | 0.49 ms | — | — |
| `shared-date` | 1× | 2.01 ms | 1.40 ms | 0.46 ms | — | — | 0.15 ms | — |
| `shared-date` | 4× | 5.97 ms | 2.95 ms | 1.23 ms | 1.01 ms | 0.15 ms | 0.63 ms | — |

The largest per-function samples at 4× were `walkForFunctions` 0.21 ms (`vl-cell`), 2.26 ms (`vl-sort`), 1.68 ms (`vl-select`), 0 ms (`form-field`), and 0 ms (`shared-date`); `captureCallSite` was 0.77, 0.82, 0.46, 0, and 0.50 ms respectively. In `vl-sort`, `informItemsChanged` sampled 0.31 ms, while Effect's `internal/hashMap.js:set` sampled 6.64 ms. `informItemsChanged` is called once by the Gallery's sort update with the full 10,000-ID list; the installed API exposes no separate pure-reorder operation. Filter uses the same one-call/full-list pattern. The fixed-height model has no measured row heights, but the list still needs its update/reconciliation command to preserve its stable-key scroll anchor.

The other three scenarios have no corresponding `informItemsChanged` call. DOM mutation counts from the same production interactions were: `vl-cell` 0 node additions/removals and 2 attribute mutations; `vl-select` 0 and 1 attribute + 1 character-data mutation; `form-field` 0 and 1 attribute mutation; `shared-date` 0 and 1 attribute + 4 character-data mutations at 4×. Sort changed 27 nodes each way and 65 attributes at 4× (41 each way and 80 attributes at 1×).

Row reuse is already in place and matches the documented guidance: `virtualList.ts` uses a module-lifetime `createKeyedLazy()` keyed by item ID with stable `renderRow` and primitive cache arguments. Existing source-mapped precise-coverage measurements counted `vl-cell` and `vl-select` at one row-renderer call each (filter 14, sort 28); this is not a render-all-visible-rows issue. The form page likewise keys each stable field ID, and its reuse assertion observes 200 initial TextField renders plus one changed-field render. The `createKeyedLazy` cache is not the hot path for cell/select; its key space is bounded by the 10,000 known IDs, though it does not evict.

The profile therefore shows two distinct upstream costs: `walkForFunctions` revalidates a 10,000-element primitive-ID array in list updates, and the Foldkit/Effect render/update path dominates sort and the three single-row/field edits. The current Gallery already uses the allowed ID-only inputs and keyed lazy row/field reuse; no safe Wseffect-only replacement for Foldkit validation or VirtualList anchor reconciliation was identified. The module breakdown immediately above is historical single-capture evidence; the five-scenario three-capture attribution and local-prototype ABAB results below supersede it.

### Scratch prototype measurement (supersedes the earlier `/tmp` prototype; not submitted upstream)

The earlier `/tmp/foldkit-upstream-prototype` directory was removed. The current local prototype is under `$HOME/.cache/wseffect-work/perf-lists/prototype`; nothing from it is committed. The published Foldkit and `@foldkit/ui` builds were copied to scratch, then the walk check was guarded with `import.meta.env.DEV` and fixed-height `informItemsChanged` was changed to skip building the full `HashSet` when `measuredRowHeights` is empty. Both A and B used the same Gallery production/minified Vite build settings, source maps, Node `v24.21.0`, Chromium `156.0.8078.4`, and the existing real-input `runScenario` harness. At 4×, each arm had two rounds of 10 fresh-context sessions per interaction (20 per arm); order was A/B/A/B. A/A and B/B p95 bands are the p95 absolute pairwise deltas between the two ten-session rounds of the same build. Load average (1-minute) ranged from **8.62 to 16.04** during the blocks.

| Interaction | Published A: Event / script median | Prototype B: Event / script median | A/B delta: Event / script | A/A p95 abs: published / prototype (Event / script) |
|---|---:|---:|---:|---:|
| `vl-cell` | 16 / 14.102 ms | 16 / 8.606 ms | 0 / −5.496 ms | 24 / 18.682 ms; 0 / 4.786 ms |
| `vl-sort` | 48 / 38.879 ms | 32 / 17.023 ms | −16 / −21.856 ms | 40 / 30.158 ms; 8 / 6.154 ms |
| `vl-select` | 24 / 8.029 ms | 24 / 7.165 ms | 0 / −0.864 ms | 8 / 2.038 ms; 8 / 7.258 ms |

Although sort moved in the favorable direction, none of the A/B deltas clears the published-build A/A noise band. The Event Timing values are quantized in 8 ms increments, and the load average was elevated and changing across blocks; this run does **not** establish a user-visible win or regression. Full per-session values and per-block load samples are in the local scratch file `prototype-abab.json`. The prototype builds successfully with production minification and its UI update path was smoke-checked after correcting the scratch-only updater to return a field-transform function expected by `Struct.evolve`; the earlier prototype draft that returned the field value crashed and was not used for these measurements.

See [`../benchmarks/2026-10-23-list-form-scripting.md`](../benchmarks/2026-10-23-list-form-scripting.md) for all five scenarios' source-mapped attribution and the A/A calculation details.

The relevant distributed code is in `foldkit@0.168.0/dist/html/submodel.js:48-87,88-120`: `wrapViewInputsForOuterBoundary` always invokes `assertNoNestedFunctions`, which recurses through arrays and plain objects.

## Local mitigation and desired upstream change

The Gallery now passes a `string[]` of stable item IDs rather than an array of item records as `viewInputs.items`. It uses the same IDs for `informItemsChanged` and resolves row data by stable index. This preserves nested-function validation while avoiding recursive traversal of every record field. It does not remove the linear scan over the list or array entries.

Please consider an explicit, safe way for callers to mark validated/opaque data-only inputs, or otherwise avoid repeating the recursive validation for immutable values. Any change must preserve the current guarantee that a nested callback cannot silently capture a child boundary; merely removing the check or skipping all arrays would weaken that contract. A useful regression benchmark would compare repeated submodel renders with 10,000-record and 10,000-primitive arrays while asserting that nested functions in ordinary unmarked inputs are still rejected.

## Separate `@foldkit/ui` issue draft: fixed-height item changes build an unused key set

**Affected package:** `@foldkit/ui@0.168.0` (`apps/gallery/package.json`).

### Title

`VirtualList.informItemsChanged` builds a full item-key `HashSet` when no measured heights can be pruned

### Minimal reproduction

```ts
const model = VirtualList.init({ id: 'rows', rowHeightPx: 36 })
const itemKeys = Array.from({ length: 10_000 }, (_, index) => `item-${index}`)

// Repeat for filter/sort changes in a fixed-height virtual list.
const result = VirtualList.informItemsChanged(model, itemKeys)
```

`informItemsChanged` (`dist/virtualList/index.js:478-488`) unconditionally calls `HashSet.fromIterable(itemKeys)`, then filters `model.measuredRowHeights` with that set. In the fixed-height mode selected above, row measurements are not collected, so the measured-height record is empty and there are no stale measured entries to remove; building a set for every item is redundant linear work and allocation on each list update. The Gallery's filter and sort paths both notify the list this way.

### Requested change

Avoid constructing `currentKeys` when `measuredRowHeights` is empty; retain the current filtering behavior when there are measurements to prune. Add a regression test covering empty and non-empty measurement records, and benchmark repeated fixed-height `informItemsChanged` calls with 10,000 keys. This is a source-derived optimization candidate; the profile attributes time to the notification/hash-map path but does not independently measure this set's exact cost.

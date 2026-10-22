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

### Scratch prototype measurement (not submitted upstream)

Built Foldkit `0.168.0` in `/tmp/foldkit-upstream-prototype` with the deep validation guarded by `import.meta.env.DEV` (dev builds still validate; the production Gallery bundle omits the validator). A was the `perf/virtual-list` Gallery build using the published package; B was the same app build with only the scratch Foldkit alias. The temporary Vite alias added no Foldkit patch to this repository. On Node `v24.21.0` / Chromium `156.0.8078.4`, five A/B/A/B blocks (10 samples per build) and ten adjacent A/A pairs per build at 4× produced:

| Interaction | Gallery Event Timing / trace scripting (ms) | Scratch prototype Event Timing / trace scripting (ms) | A/A p95 absolute delta: Gallery / prototype (Event / script, ms) |
|---|---:|---:|---:|
| Filter | 40 / 32.05 | 48 / 38.04 | 16 / 9.31; 8 / 9.51 |
| Sort | 48 / 37.70 | 48 / 37.53 | 16 / 10.02; 16 / 13.58 |

The deltas are within the measured A/A bands; this run does **not** demonstrate an end-user timing win from the dev-only guard. Event Timing medians are below 50 ms for both interactions, but the 8 ms Event Timing granularity and overlapping noise bands do not support claiming a regression or improvement. This is a local prototype to inform the upstream draft only.

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

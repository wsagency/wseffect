# Contributing to wseffect

Thanks for helping improve wseffect. Keep changes focused, preserve the upstream Foldkit behavior and the performance constraints below, and run the relevant checks before opening a pull request.

## Upstream Foldkit PRs

Changes intended for upstream Foldkit should be proposed there first when they belong in Foldkit. Keep upstream pull requests focused and include targeted tests that demonstrate the behavior change. Foldkit's test suite is memory-intensive; run it with bounded parallelism and the required Node heap:

```sh
pnpm test --workers=4
NODE_OPTIONS=--max-old-space-size=8192 pnpm test --workers=4
```

Use `--workers=4` for the Foldkit test command. Set `NODE_OPTIONS=--max-old-space-size=8192` when running the suite to avoid exhausting the default Node heap.

## Dependency upgrades

- **UP-1 — Own PR for Foldkit upgrades.** Keep `foldkit`, `@foldkit/ui`, and `@foldkit/vite-plugin` on their exact approved versions. A Foldkit version bump is its own PR and is never bundled with feature work.
- **UP-4 — Remove the interim Effect resolution together.** In the Foldkit upgrade PR that adopts peers accepting Effect 4.0.5, remove the `effect` and `@effect/platform-browser` overrides and obsolete `peerDependencyRules.allowedVersions` entries from the root `pnpm-workspace.yaml`. In that same PR, remove the UP-8 consumer snippet from the wseffect-app README and the packed-consumer TEST-7 fixture, or narrow the rules only to peer conflicts still required by the new Foldkit version. Keep the single-Effect-copy check in place.
- **UP-6 — Neutral-only size PRs.** Submit an upstream size reduction only when it is neutral for correctness and speed. Each PR must include targeted tests proving behavior is unchanged; a size reduction is not a reason to weaken correctness or performance.
- **UP-7 — No local Foldkit patches.** Do not use `patch-package`, `patchedDependencies`, rewrite Foldkit's `dist`, or vendor a Foldkit copy. Propose fixes upstream rather than maintaining a local fork.

## Performance rules

- **PERF-1 — Keyed memo by default.** Memoize rows, form fields, and stateful submodels with `createKeyedLazy`, using stable entity IDs as keys.
- **PERF-2 — Primitive `createLazy` arguments.** Pass primitives to `createLazy`; do not pass `viewInputs` or props objects created during a parent render.
- **PERF-3 — Virtualize large collections.** Render data-driven collections through VirtualList. As application guidance, virtualize by the time row counts reach the low thousands.
- **PERF-4 — Bound keyed caches.** Each `createKeyedLazy` cache must be scoped to a bounded component lifetime and bounded key space. The cache does not evict entries.
- **PERF-5 — Keep themed wrappers thin.** Themed wrappers should remain stateless and thin; do not add submodel or context machinery for styling.
- **PERF-6 — Memoize page views.** Since `h.submodel` does not memoize, wrap page views with `createLazy`, passing the slot model and primitive page-input fields as arguments.
- **TH-15 — DataTable.** When built in sub-project #2, DataTable must render through VirtualList, memoize rows with keyed memo, and keep its keyed cache bounded by its own lifetime.

## Commits

Use your own git identity for commits. Add `Co-authored-by` trailers only for real human contributors; do not add AI co-author trailers.

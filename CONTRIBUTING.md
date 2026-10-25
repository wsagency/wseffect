# Contributing to wseffect

Thanks for helping improve wseffect. Keep changes focused, preserve the upstream Foldkit behavior and the performance constraints below, and run the relevant checks before opening a pull request.

## Vendored Foldkit maintenance

The Foldkit core, UI, and Vite plugin sources are owned parts of wseffect under `packages/foldkit`, `packages/foldkit-ui`, and `packages/vite-plugin`. Make changes here and record local divergence in each package's `UPSTREAM.md`; preserve upstream formatting so later syncs stay reviewable. Build and run the vendored packages' unit tests through `pnpm check`.

Upstream PRs are optional. Propose a change upstream only when it is generally useful to Foldkit users and fits Foldkit's philosophy. A wseffect fix does not depend on upstream acceptance.

Keep any upstream proposal focused and include targeted tests. Foldkit's suite is memory-intensive; when running its full suite in an upstream checkout, use bounded parallelism and the required Node heap:

```sh
pnpm test --workers=4
NODE_OPTIONS=--max-old-space-size=8192 pnpm test --workers=4
```

## Dependency and size changes

- Keep vendored packages on their recorded source snapshots; update them intentionally with a reviewed source sync and updated provenance.
- Keep Effect and other workspace dependency pins exact. Do not add `patchedDependencies` or `packageExtensions`; make owned source changes in the vendored packages instead.
- Upstream size proposals are optional and should be neutral for correctness and speed, with targeted tests proving behavior is unchanged.

## Performance rules

- **PERF-1 — Keyed memo by default.** Memoize rows, form fields, and stateful submodels with `createKeyedLazy`, using stable entity IDs as keys.
- **PERF-2 — Stable `createLazy` arguments.** Pass primitives, `h`, or stable references from the Model; do not pass objects created during a parent render (including `viewInputs`, object literals, or spreads). Foldkit immutable updates preserve identity for unchanged submodel Models.
- **PERF-3 — Virtualize large collections.** Render data-driven collections through VirtualList. As application guidance, virtualize by the time row counts reach the low thousands.
- **PERF-4 — Bound keyed caches.** Each `createKeyedLazy` cache must be scoped to a bounded component lifetime and bounded key space. The cache does not evict entries.
- **PERF-5 — Keep themed wrappers thin.** Themed wrappers should remain stateless and thin; do not add submodel or context machinery for styling.
- **PERF-6 — Memoize page views.** Since `h.submodel` does not memoize, wrap page views with `createLazy`, passing the slot model and primitive page-input fields as arguments.
- **TH-15 — DataTable.** When built in sub-project #2, DataTable must render through VirtualList, memoize rows with keyed memo, and keep its keyed cache bounded by its own lifetime.

## Commits

Use your own git identity for commits. Add `Co-authored-by` trailers only for real human contributors; no AI co-author trailers.

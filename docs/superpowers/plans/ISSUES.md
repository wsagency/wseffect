# Implementation plan issues

## 2026-10-19 — Node test files included in the Vitest root run

- **Issue:** Lane 0.1 and 0.2 define `scripts/*.test.ts` using `node:test` and require `node --test scripts/*.test.ts`, while the root `pnpm test` script runs Vitest. Vitest's root discovery included these files and failed each with `No test suite found`, even though the required Node test commands passed.
- **Evidence:** `pnpm check` reached the test stage and reported `scripts/check-repo.test.ts`, `scripts/check-update-coverage.test.ts`, and `scripts/resolve-effect-latest.test.ts` as failed suites with `No test suite found`.
- **Proposed fix / applied:** Exclude `scripts/**/*.test.ts` from Vitest discovery, run them with `node --test` in the root `pnpm test` script, then run the plan's update-coverage checker. This preserves both test frameworks and runs the Node tests in CI.

## B1: CSS imports require nested internal sources

- **Evidence:** the pinned radix2solid `packages/themes/src/components/button.css` imports `./_internal/base-button.css`; `card.css`, `dialog.css`, `dropdown-menu.css`, and `tabs.css` also import `./_internal/*.css`. Copying only the plan's literal `src/components/*.css` into `src/css-components/` omits required files and makes PostCSS resolution fail.
- **Proposed fix:** copy only the `_internal/*.css` files imported by the foundation CSS closure into `src/css-components/_internal/` and preserve their relative paths. This is still CSS-only source copied from the pinned commit and adds no non-foundation component.

## B1: Pinned source defines 31 color token files

- **Evidence:** the pinned radix2solid `src/styles/tokens/index.css` imports 31 distinct files under `colors/` (gray, mauve, slate, sage, olive, sand, plus 25 named accents); the copied build emits all 31 unchanged, and `@radix-ui/colors` 3.0.0 includes these imports.
- **Proposed fix:** amend the plan/spec's 30-file count to 31. Keep the full upstream set rather than silently dropping a color family used by the CSS.

## B3: Pinned Foldkit package does not export `Lazy.expectAllReused`

- **Evidence:** installed `foldkit@0.168.0` `dist/test/public.js` exports only `Story` and `Scene`; its `package.json` resolves `foldkit/test` to that file. The available `createLazy` API is present, and a changed-theme Scene test can assert a memoized child view executes only once.
- **Proposed fix:** replace the unavailable helper assertion with an execution-count assertion around `createLazy`. This preserves the required memoization behavior test without patching or vendoring Foldkit (UP-7).

## B8: Themes build must emit CSS before package checks

- **Evidence:** `css.test.ts` reads generated `dist/styles/**` files; a clean `pnpm check` fails with ENOENT when the package build only runs TypeScript compilation.
- **Proposed fix:** include `scripts/build-css.js` in the package build so checks and fresh installs produce the same distributable assets.

## B3: Amend frozen Tabs label/panel contract

- **Issue:** The original themed Tabs input contract accepted one `tabToContent` callback and reused its result for both the trigger label and panel body. The frozen contract did not provide independent label and panel content.
- **Amendment:** Replace `tabToContent` with `tabToLabel: (value) => Html` and `tabToPanel: (value) => ReadonlyArray<Html | string>`. The trigger renders only the label callback; the active tabpanel renders the panel callback.
- **Evidence:** `packages/themes/test/tabs.scene.test.ts` asserts label-only and panel-only text separately and confirms the panel changes when selection changes.
## 2026-10-19 — Root gate scripts omitted from C3/C4 file lists

- **Issue:** C3 and C4 require the commands `pnpm gate:size --app …` and `pnpm gate:perf --app …`, but their Files lists omit the root `package.json` that must expose those scripts.
- **Evidence:** Foundation plan lines 909–915 and 930–938 specify the two gate CLIs, while the C3/C4 Files lists name only gate modules, baselines, fixtures and tests. Lane 0's root `package.json` scripts (lines 8–15) contain no `gate:size` or `gate:perf`.
- **Smallest compliant fix:** Add `gate:size` and `gate:perf` root scripts in the corresponding C3/C4 commits, preserving the specified CLI invocations.

## 2026-10-19 — Benchmark service worker missing for GATE-S2 comparison

- **Issue:** BENCH-2 requires GATE-S1/S2-equivalent sizes measured the same way, and GATE-S2 first-visit measurement ends when a service worker controls the page, but C2 does not give the Solid app a service worker.
- **Evidence:** The spec defines the controller condition in §11 (lines 486–487) and requires GATE-S1/S2-equivalent sizes measured the same way in BENCH-2 (line 576). Plan C2's app files/dependencies (lines 886–904) omit PWA support; the clean baseline app has no `public/` directory or SW registration.
- **Smallest compliant fix:** Add a minimal `sw.js` that activates and claims clients, and register it in the Solid bench app so the shared size measurement can use the same service-worker-control boundary.

## 2026-10-19 — BENCH-2 report omits differences

- **Issue:** The current user request requires the side-by-side report to record remaining differences, but C5 specifies only size/performance results and a Markdown table.
- **Evidence:** Plan C5 lines 963–970 defines `report.json` as `{ wseffect: { size, perf }, radix2solid: { size, perf } }` and `renderSummary` as a table; the C2 clean baseline has no service worker, while the gallery's GATE-S2 boundary requires a controlling service worker.
- **Smallest compliant fix:** Add a `differences` note to the report JSON and Markdown summary, listing verified differences (including the bench's minimal controller-only worker if it remains).


## 2026-10-19 — C3 fixture requires unavailable wseffect API

- **Issue:** C3's original fixture requirement uses `wseffect()`, but the plan makes Lane C depend only on Lane 0 and this base has no `wseffect()` export.
- **Evidence:** Plan lines 86–87 list Lane C's dependency as Lane 0, while lines 909–915 require a C3 mini-app using `wseffect()`. At base `35640c5`, `packages/app/src/index.ts` contains only `export {}`. Spec APP-23 lines 335–337 defines the `framework` code-splitting group that the fixture must mirror.
- **Resolution:** Per user direction, do not wait for Lane A. Build a temporary plain Foldkit + Vite app with a manual framework chunk, three pages, the gallery `data-perf` hooks, and its PWA. Keep both gates dependent only on build output and those hooks. D2 later switches both gates to Gallery and removes the stand-in.
- **Smallest compliant fix:** Replace the `wseffect()` fixture with that standalone Foldkit/Vite fixture; no gate implementation may depend on wseffect internals.


## 2026-10-19 — D1 size attribution option missing from C3 task

- **Issue:** D1 requires a source-map attribution run using `tools/gates/size.ts --attribute`, but the C3 task does not specify that mode or how the build produces source maps.
- **Evidence:** Spec §11 GATE-S1 lines 484–485 requires attribution when the shell exceeds its budget; plan C3 lines 915–925 defines `size.ts` without `--attribute`, while D1 lines 1006–1008 invokes it.
- **Resolution:** C3 adds an attribute-only mode over the index/framework source maps and enables fixture maps with `SOURCEMAP=on`. It reports per-source Brotli-q11 weights from `sourcesContent` and labels them as indicative, not an additive decomposition of minified chunk bytes.
- **Smallest compliant fix:** Add the `--attribute` mode to C3's `size.ts` and honor `SOURCEMAP=on` in the fixture's Vite config so D1 can invoke the specified command.


## 2026-10-19 — C4 A/A noise-band control absent from task plan

- **Issue:** The user requires an A/A self-test mode and a reported noise band, but C4 specifies only baseline/candidate ABAB regression measurement.
- **Evidence:** Plan C4 lines 940–953 omits an A/A mode; spec GATE-P3 lines 522–525 cites the research A/A result but does not require the harness to measure and report one.
- **Resolution:** Add `--self-test` with ten ABAB pairs over identical builds and report per-scenario, per-metric empirical p95 absolute paired deltas plus the observed signed range. This is diagnostic only and does not gate.
- **Smallest compliant fix:** Extend C4 with an A/A measurement path and report its noise band.

## 2026-10-19 — C4 server choice is ambiguous against GATE-P1

- **Issue:** The C4 pre-flight notes expect C1 `startServer` reuse, while the performance spec requires the production build to be served by `vite preview`.
- **Evidence:** Plan C4 lines 947–951 assumes C1 production serving; spec GATE-P1 line 501 explicitly says `vite preview`.
- **Resolution:** Use `vite preview` for performance measurements so the harness follows the binding GATE-P1 method; retain C1 `startServer` for size accounting.
- **Smallest compliant fix:** Launch preview servers for the baseline and candidate builds from the shared performance harness.

## 2026-10-19 — C5 jobs target Gallery before Lane D

- **Issue:** The planned C5 jobs targeted Gallery before Lane D created it; the user directed the report/jobs against a temporary fixture in the interim.
- **Evidence:** Plan C5 lines 969–971 names `apps/gallery`; Lane D D1/D2 creates the Gallery and its performance pages; the user initially directed C4/C5 to use a temporary stand-in.
- **Resolution:** The temporary fixture was removed in D2; size/perf/report now target `apps/gallery`.
- **Smallest compliant fix:** Keep all gate job arguments pointed at the Gallery.

## 2026-10-19 — Root typecheck excludes tools source

- **Issue:** `pnpm typecheck` previously covered workspace packages but not `tools/gates` or `tools/serve`, leaving C1/C3/C4 code outside the repository typecheck.
- **Evidence:** Root `package.json` previously invoked only `pnpm --recursive --if-present typecheck`; root `tsconfig.json` references only `packages/app` and `packages/themes`.
- **Resolution:** Add `tools/tsconfig.json` covering tools TypeScript, including gates, server, tests, Vite config and fixture source; run it from the root `typecheck` script with ES2024, Bundler resolution, and Vite client types.
- **Smallest compliant fix:** Wire `tsc -p tools/tsconfig.json` into `pnpm typecheck` and fix diagnostics surfaced by that project.

## 2026-10-19 — Performance hooks matched the comparison bench

- **Issue:** The temporary gate app initially lacked `vl-sort`, used a three-child table row rather than the bench's six-child row, and filtered by name only.
- **Evidence:** C4 `SCENARIOS` requires `vl-sort`; `bench/radix2solid/src/fixtures/BenchFixtures.tsx` lines 31–45 has six row children and filters name/account/region. The first contract test failed with zero `data-perf="vl-row"` elements.
- **Resolution:** The Gallery exposes matching id/name/account/region/amount fields, six row children, 15 visible rows, text input types, sort/filter hooks, and 200 menu triggers; its integration contract test covers them.
- **Smallest compliant fix:** Match selectors, visible counts, text field type and row/cell structure while preserving the Foldkit/Vite implementation.

## A2-M6: Framework chunk detection must follow resolved package roots

- **Issue:** A path regex for `node_modules` misses linked `@wsagency/wseffect-*` packages whose real files are outside the consumer's `node_modules` tree.
- **Amendment:** Classify modules by `node_modules` paths or by real paths under resolved `@wsagency/wseffect-*` package roots. Test the classifier as a function over resolved package directories.

## 2026-10-19 — GATE-P3 needs a measured perf-runner noise file

- **Issue:** The performance gate cannot use a local or placeholder noise floor; the isolated runner has not yet been measured.
- **Evidence:** The user directed that `perf-noise.json` remain absent until the scheduled quiet-window measurement and required the gate to fail clearly while it is missing.
- **Resolution:** `pnpm perf:noise` runs only on the perf runner and writes the file after the harness self-test and A/A measurement; `gate:perf` reports the exact measurement command when the file is absent.
- **Smallest compliant fix:** Keep the noise baseline uncommitted until the isolated runner writes measured values.

## 2026-10-19 — GATE-S3 must compare the merge-base and candidate size baselines

- **Issue:** The previous size comparison skipped build artifacts missing from the baseline and accepted an explanation without requiring updated bytes.
- **Evidence:** The pre-change `bench/baselines/size.json` had an empty `entries` object; the comparator iterated only baseline entries and checked `reason` without requiring candidate-baseline changes.
- **Resolution:** Compare against `origin/main`'s merge-base baseline, require every current artifact in the candidate `size.json`, and require both changed bytes and a reason for explained growth.
- **Smallest compliant fix:** Seed the Gallery artifacts with observed measurements and reject missing or undersized candidate entries.

## 2026-10-19 — APP-23 framework group must contain boot runtime only; clarify GATE-S1

- **Issue:** APP-23's earlier "all `node_modules`" rule included page-only `@foldkit/ui` menu/dialog and Floating UI in the eager framework chunk. Lane D measured S1 at 117,469 B before narrowing the group and 98,306 B afterward.
- **Amendment:** APP-23 now groups only the resolved package roots for `foldkit`, `effect`, `@effect/platform-browser`, `@wsagency/wseffect-app` and `workbox-window`; all other modules use default splitting. Its build test must assert the framework excludes page-only dependencies, including `@foldkit/ui` menu/dialog and Floating UI. GATE-S1 counts the entry and framework JavaScript only; CSS counts in GATE-S2's first-visit transfer. The plan's A8 and C3 test requirements reflect this.

## 2026-10-19 — GATE-S2/S4 prefetch accounting, APP-13 idle scheduling, and PWA-3 cache scope

- **Issue:** Lane D measured 197,334 B on the first visit, including 45,621 B of viewport prefetch and 16,900 B of non-primary theme CSS wrongly precached. Counting all received bytes together obscures mandatory startup transfer and allows eager prefetch to compete with the first render.
- **Amendment:** GATE-S2 counts mandatory first-visit traffic, classifies speculative non-primary/non-current-route page assets through the Vite build manifest, and reports those bytes separately under GATE-S4 (≤65,536 B). APP-13 defers viewport imports until first-render idle (`requestIdleCallback`, with `setTimeout` fallback) and caps concurrent prefetches at 2. PWA-3 precaches only HTML, manifest/icons, entry/framework, primary-page chunks and their CSS; non-primary page CSS is runtime-cached only. The plan adds tests for idle scheduling/concurrency, manifest-based byte classification, and exact precache/runtime-cache membership.

- **APP-13 amendment:** Persistent Gallery navigation remains intent-only; viewport prefetch mounts belong to the below-fold “More pages” links after the long menus page. Visible imports require a usable `requestIdleCallback` deadline, wait until 300 ms after `pointerdown` or `keydown`, and are neither started nor continued while a route module is loading. The two-load concurrency cap remains. Coverage verifies visible prefetch on the content link and that `CompletedPrefetch` does not re-execute the active page view.
## APP-23: Keep page-only dependencies out of the framework chunk

- **Issue:** The original framework group classified every module under `node_modules` as framework code. This eagerly included page-only `@foldkit/ui` components and their Floating UI dependencies, defeating page lazy loading.
- **Amendment:** The `framework` group contains only resolved package roots for `foldkit`, `effect`, `@effect/platform-browser`, `@wsagency/wseffect-app`, and `workbox-window`. All other dependencies use default splitting. An integrator amends APP-23 accordingly.
- **Evidence:** Gallery build attribution identified `@foldkit/ui/menu` (20 KB), `@foldkit/ui/dialog` (9 KB), and Floating UI (13.5 KB) inside the framework chunk.
## D3: Theme accent changes from an open settings dialog

- **Issue:** The D3 theme e2e contract expects an accent change while a dialog is open, but the Gallery theme page has no themed settings dialog or accent control inside one, so the focus-preservation assertion has no realistic interaction path.
- **Amendment:** Add a themed Dialog to the Gallery theme page with trigger `#theme-dialog-open` and accent control `#theme-dialog-accent`. The control emits the existing `ChangedThemeSetting` OutMessage. The e2e opens the dialog and changes the accent there; the dialog stays open and focus remains on the control, while only root Theme attributes change (`data-accent-color`, plus `data-gray-color` when gray is `auto`) and no structural mutation occurs outside the dialog.
- **Gallery contract additions:** `#theme-dialog-open`, `#theme-dialog-accent`.

## D4: Server retention includes the current deployment

- **Issue:** The D4 skew test requires evicting the old build's assets, while the server's `retain` count includes the current deployment and rejects zero.
- **Evidence:** `tools/serve/server.ts` sets `DEFAULT_RETENTION = 4` and throws when `retain < 1`, so the default keeps the current deployment plus three predecessors; `retain: 1` keeps only the current deployment.
- **Resolution:** Use `server.deploy(v2, { retain: 1 })` for the zero-previous-deployments scenario, preserving the existing C1 API contract.
- **Smallest compliant fix:** Keep the retention test at `retain: 1`; do not alter the server API solely to allow a zero count.

## D4: Revision marker is environment-driven

- **Issue:** The PWA and skew tests need distinguishable Gallery builds without mutating shared source.
- **Resolution:** Use the Vite `GALLERY_REVISION` define in the tabs Overview panel, defaulting to `r1`; build fixtures set `GALLERY_REVISION=r2` for the new build.
- **Smallest compliant fix:** Keep revision variation in the build environment rather than editing Gallery source between builds.


## D-B1: Runtime cache omitted non-primary page CSS

- **Issue:** The reviewed service-worker route cached only page JavaScript, so a visited non-primary route could not rely on its stylesheet from `wseffect-pages` while offline.
- **Resolution:** Match both `.js` and `.css` assets with the existing `wseffect-pages` CacheFirst route. The PWA e2e verifies non-primary CSS is excluded from precache and appears in the runtime cache after visiting the page.

## D4: Primary-page precache needs shared chunk dependencies

- **Issue:** Pre-caching primary page entry chunks alone left transitive component chunks unavailable offline; the Layout route worked, but Dialog failed to import its chunk dependencies.
- **Evidence:** The Gallery manifest shows primary entries import shared `heading`, `text`, `button`, `dialog`, `selectors`, `keyboard`, and `update` chunks. The offline e2e failed on a Dialog dynamic import until these shared assets were pre-cached.
- **Resolution:** Include those shared chunks in Workbox's precache patterns while continuing to exclude non-primary page entry chunks and their CSS.


## APP-23 amendment: app-shared eligibility

- **Issue:** The first APP-23 amendment constrained the framework chunk but left app-shared eligibility too broad: a page-only dependency could enter a shared chunk through the module graph.
- **Amendment:** `app-shared` may contain only application modules statically reachable from both the entry and at least one page. The framework group remains limited to resolved roots for Foldkit, Effect, `@effect/platform-browser`, `@wsagency/wseffect-app`, and `workbox-window`; all other modules use Rolldown default splitting.
- **Guard:** Verify the static/modulepreload closure of `index.html` excludes page-only `@foldkit/ui/dialog`, menu, tabs, and Floating UI dependencies.

## SIZE-1 (signals) amendment

- **Amendment:** Increase the signals helper Brotli-q11 ceiling from 1,536 B to 1,600 B.
- **Reason:** Correct SSE framing for CR/CRLF and chunked UTF-8, multi-line JSON, and EventSource race fixes from review; correctness is PRI-1.
- **Before/after:** 1,534 → 1,551 B (Brotli-q11).

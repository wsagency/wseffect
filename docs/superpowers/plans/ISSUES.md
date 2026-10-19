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


## A2-M6: Framework chunk detection must follow resolved package roots

- **Issue:** A path regex for `node_modules` misses linked `@wsagency/wseffect-*` packages whose real files are outside the consumer's `node_modules` tree.
- **Amendment:** Classify modules by `node_modules` paths or by real paths under resolved `@wsagency/wseffect-*` package roots. Test the classifier as a function over resolved package directories.

# Foldkit UI Absorbs Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all six local adapter capabilities into owned Foldkit UI, migrate DataTable to VirtualList element overrides, and remove `@wsagency/wseffect-primitives` cleanly.

**Architecture:** Extend Menu, Slider, Tooltip, Listbox and VirtualList in their owning Foldkit UI modules, and add a stateless CheckboxGroup view plus thin Foldkit UI Select adapter. Migrate themed wrappers without changing their DOM/classes; delete the never-published primitives package after every consumer and test is moved.

**Tech Stack:** TypeScript, Effect Schema, Foldkit Model/Message/update/view/`create` patterns, pnpm workspace, Vitest, Playwright, packed consumer and Gallery size/visual gates.

**Spec:** `docs/superpowers/specs/2026-10-25-foldkit-ui-absorbs-primitives-design.md`

## Global Constraints

- Foldkit is owned by wseffect; local changes are allowed and all intentional divergences go in `packages/foldkit-ui/UPSTREAM.md`.
- Foldkit UI remains headless; every `rt-*` class and all pinned Radix2Solid parity remain in Themes.
- Preserve existing behavior, themed DOM/visual appearance and defaults; exact visual gate remains 236/236.
- Migrate all six primitives capabilities; if empty, delete `packages/primitives` and remove every manifest/test/docs reference. No compatibility aliases.
- Never let a benchmark interfere: do not run builds, test suites, e2e or dev servers during design; implementation gate runs are serialized by integrator after all lanes land.

## Review Focus

1. Context source replacement/unmount must never receive stale focus: Menu context invocation tests assert token identity and safe restore.
2. Range interactions must preserve ordering and restore all starting values on cancellation: slider Range Story tests cover crossing and cancel.
3. Listbox selected anchoring must not follow active keyboard focus or fail when selection is absent: Listbox positioning tests cover both plus fallback.
4. VirtualList must find/measure/scroll/focus rows nested below custom table elements: nested row ApplyScroll and dynamic measurement tests cover it.
5. Cutover must not leak removed package imports or eager module closure: workspace/consumer export manifest and packed consumer checks cover absence and closure.

---

## Ownership and parallel lanes

Three lanes may proceed after Task 0 freezes signatures. Each lane uses an isolated implementation worktree; no lane runs builds/tests mid-flight. Add failing tests first in the exact package before implementation. Lane owners commit their slice and provide focused commands; integrator merges in the order below and performs all verification once.

| Lane | Owns | Must not edit |
|---|---|---|
| **A — Foldkit UI interaction APIs** | `packages/foldkit-ui/src/menu/**`, `slider/**`, `tooltip/**`, new `checkboxGroup/**`, `listbox/**`, `packages/foldkit-ui/package.json` subpath exports, corresponding Foldkit UI tests and UPSTREAM divergence entries; mark Menu, slider, tooltip, Listbox and checkbox proposal drafts implemented. | Themes wrappers, workspace/package deletion, consumer manifest. |
| **B — VirtualList + DataTable** | `packages/foldkit-ui/src/virtualList/**` and its export declarations/tests; `packages/themes/src/components/data-table.ts`, `data-table.mount.ts`, DataTable tests; mark VirtualList proposal implemented. | `packages/foldkit-ui/package.json` exports (integrator-owned, shared); primitives deletion, consumer manifest. |
| **C — Themes migration and clean cutover** | Themes wrappers/tests for context-menu, slider/range, tooltip, select, checkbox-group, checkbox-cards; all `packages/primitives/**` removal; workspace/root/package manifests and lockfile; `tests/consumer/**` and README/doc inventories; six upstream proposal status edits and consumer tests. | Foldkit UI implementation source and DataTable. |

Package export ownership: Lane A exclusively edits `packages/foldkit-ui/package.json` for its entries; Lane B requests the VirtualList export from integrator (or adds only its isolated entry after A commits, coordinated before editing). Themes wrapper files belong to C, except DataTable exclusively belongs to B. Primitives deletion, workspace wiring and consumer manifest are C-only. Integrator owns collision resolution and all end-to-end verification.

## Tasks

### Task 0 — Freeze interfaces and baseline inventory (integrator)

**Files:** `docs/superpowers/specs/2026-10-25-foldkit-ui-absorbs-primitives-design.md`; `docs/superpowers/plans/2026-10-25-foldkit-ui-absorbs-primitives.md`; package export and test ownership as above.

- [ ] Confirm every lane uses the public signatures and fallback/default rules in the spec; settle View element tag typing against existing `HtmlBuilder` types before source edits.
- [ ] Capture existing test names/fixtures from primitive package and Themes, assigning each to new owning Foldkit UI or consumer/Theme suite; no behavior/API expansions beyond spec.
- [ ] Ensure each owner has isolated worktree and no shared file is edited concurrently.

### Lane A — Foldkit UI interaction adapters

#### Task A1 — Menu context invocation

**Files:** `packages/foldkit-ui/src/menu/index.ts`, `public.ts`, `story.test.ts`, new context invocation test/scene file; `packages/foldkit-ui/package.json`; `packages/foldkit-ui/UPSTREAM.md`; `docs/upstream/menu-context-invocation.md`.

- [ ] Add failing Story/Scene tests: right-click point + suppress native event; ContextMenu/Shift+F10 source anchor; 600ms touch and >8px movement/release cancellation; focus restored only to matching mounted token; existing button flow unchanged. Focused command: `pnpm --filter @wsagency/wseffect-foldkit-ui exec vitest run src/menu/contextInvocation.test.ts src/menu/contextInvocation.scene.test.ts` (expected failure).
- [ ] Add Schema-backed invocation model/messages and `openAt` / view configuration to Menu using the spec signatures; reuse Menu update/navigation and keep standard trigger defaults unchanged.
- [ ] Pass focused Story/Scene tests; confirm every new Message arm is covered. Record divergence; mark the proposal `Implemented locally in packages/foldkit-ui/src/menu` and note upstream PR optional.

#### Task A2 — Slider range API

**Files:** `packages/foldkit-ui/src/slider/index.ts`, `public.ts`, `index.test.ts`, `scene.test.ts`, new `range.story.test.ts`; `packages/foldkit-ui/UPSTREAM.md`; proposal `docs/upstream/multi-thumb-slider.md`.

- [ ] Add failing range Story/Scene tests for stable identified thumbs, individual ARIA values, effective per-thumb bounds/steps and non-crossing, orientation/key mapping, Page=10 steps, drag, disabled and full drag rollback; include scalar API regression. Run focused `vitest run src/slider/range.story.test.ts src/slider/range.scene.test.ts` (expected failure).
- [ ] Implement `Slider.Range` config, Schema-backed interaction Model/Message and update/view, sharing existing slider interaction/rendering helpers where applicable; keep scalar API unchanged.
- [ ] Pass focused tests and complete function coverage for range Message arms; record divergence and update proposal status.

#### Task A3 — Tooltip group coordination

**Files:** `packages/foldkit-ui/src/tooltip/**`, new `packages/foldkit-ui/src/tooltip/group.ts` and group tests; `packages/foldkit-ui/package.json`; UPSTREAM log and proposal `docs/upstream/tooltip-group-skip-delay.md`.

- [ ] Add failing tests for configured 700ms initial delay, 300ms shared skip window, focus immediate, expiration, stale timer version, simultaneous isolated groups and standalone Tooltip; run focused `vitest run src/tooltip/group.test.ts` (expected failure).
- [ ] Implement explicit group Model/update and effective show delay; timer expiry versioned; make Tooltip consume group delay without moving shared state into individual Tooltip Model.
- [ ] Pass tests and log divergence/proposal status.

#### Task A4 — Listbox selected anchor and Select

**Files:** `packages/foldkit-ui/src/listbox/shared.ts`, `single.ts`, public declarations and tests; new `packages/foldkit-ui/src/select/**`; `packages/foldkit-ui/package.json`; UPSTREAM and proposals `listbox-selected-item-anchor.md`.

- [ ] Add failing tests for existing trigger default, selected-item alignment at top/bottom with collision, stable selected anchor during keyboard navigation, missing/unmounted selection fallback, resize/scroll lifecycle and multiple item content children; run focused `vitest run src/listbox/selectedAnchor.test.ts src/select/select.test.ts` (expected failure).
- [ ] Implement selected-anchor inputs/lifecycle in Listbox, widen content to `Html | ReadonlyArray<Html>`, and add typed generic `createSelect<Value>()` adapter with no second Listbox renderer. Preserve legacy single-HTML content.
- [ ] Pass tests including item-aligned positioning cleanup/fallback; log divergence and proposal status.

#### Task A5 — Stateless checkbox group

**Files:** new `packages/foldkit-ui/src/checkboxGroup/index.ts`, public/test files and `packages/foldkit-ui/package.json`; UPSTREAM log and `docs/upstream/checkbox-group-composition.md`.

- [ ] Add failing Scene/reuse tests for group label/ARIA, parent-controlled checked values, global/option disabled state, typed change Message and view reuse; run focused `vitest run src/checkboxGroup/checkboxGroup.test.ts src/checkboxGroup/checkboxGroup.scene.test.ts` (expected failure).
- [ ] Implement typed `Option`, `Props`, and pure `view` exactly as spec; do not own values or add Model state.
- [ ] Pass tests and log divergence/proposal status.

### Lane B — VirtualList and DataTable migration

#### Task B1 — Generalize VirtualList view elements

**Files:** `packages/foldkit-ui/src/virtualList/index.ts`, `public.ts`, `index.test.ts`, `scene.test.ts`; `packages/foldkit-ui/UPSTREAM.md`; `docs/upstream/virtual-list-element-overrides.md`.

- [ ] Add failing tests: unchanged `ul/li` default; custom container/spacer/row output; keyed row nested under tbody is resolved for ApplyScroll, anchor restoration and focus; virtualized nested target, dynamic resize/measurement. Run focused `vitest run src/virtualList/index.test.ts src/virtualList/scene.test.ts` (expected failure).
- [ ] Add optional typed container/spacer element inputs (keep `rowElement`), update nested keyed row discovery and measurement/ApplyScroll paths, and preserve defaults.
- [ ] Pass focused tests; record divergence and mark proposal implemented locally.

#### Task B2 — DataTable uses VirtualList view

**Files:** `packages/themes/src/components/data-table.ts`, `data-table.mount.ts`, DataTable Story/Scene tests.

- [ ] Add failing DataTable Story/Scene test for native table-valid `<tbody>` rows/spacers, stable row keys, programmatic scroll-to-row through VirtualList, focus only after mounted target and unchanged selection/grid behavior. Run focused `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataTable.story.test.ts test/dataTable.scene.test.ts` (expected failure).
- [ ] Replace parallel table windowing output with `VirtualList.view` configured for native table elements. Replace custom after-commit scroll command with `VirtualList.scrollToKey`/`scrollToIndex` and standard `ApplyScroll`; retain DataTable model/order/LRU/grid logic and native table structure.
- [ ] Pass focused tests; ensure no custom row lookup/scroll implementation remains in `data-table.mount.ts`.

### Lane C — Themes migration and package deletion

#### Task C1 — Migrate all primitive-backed themed wrappers

**Files:** `packages/themes/src/components/context-menu.ts`; `slider.ts` and `slider/range.ts`; `tooltip.ts`; `select.ts`; `checkbox-group.ts`; `checkbox-cards.ts`; their Story/Scene/reuse tests.

- [ ] Add/update failing existing tests before swapping imports: preserve each public Theme behavior/DOM, Select popper/item-aligned content, ContextMenu invocation/focus, Tooltip skip timing, range multi-thumb and controlled CheckboxCards. Run relevant `pnpm --filter @wsagency/wseffect-themes exec vitest run ...` subset (expected failure for changed API imports).
- [ ] Switch wrappers to the Foldkit UI subpaths from spec; keep all `rt-*` classes, props and DOM structure in Themes. Delete adapter-specific wrapper/state/positioning rather than keeping aliases.
- [ ] Pass focused Theme Story/Scene/reuse tests and verify no wrapper imports `@wsagency/wseffect-primitives`.

#### Task C2 — Remove primitives and consumer references

**Files:** all `packages/primitives/**`; root `pnpm-workspace.yaml` and `package.json`; `pnpm-lock.yaml`; `tests/consumer/coverage-manifest.json`, `check-sp2.test.ts` and associated discovery/run checks; repository README/package lists and docs mentioning package; upstream proposals; `packages/foldkit-ui/UPSTREAM.md` (coordinated additions only).

- [ ] Add failing consumer assertions that Foldkit UI exports each API and that no package dependency/export/import mentions `@wsagency/wseffect-primitives`; add all new public Foldkit UI subpaths and declarations to consumer coverage manifest. Run focused `pnpm test:consumer` (expected failure until APIs/cutover land).
- [ ] Remove every primitives import and manifest/workspace entry, update lockfile, consumer coverage and docs; remove `packages/primitives` entirely if empty. For each of six proposals write `Implemented locally in packages/foldkit-ui/...; upstream PR optional, not a delivery dependency.`
- [ ] Pass targeted consumer check and ensure the packed consumer imports each subpath without importing unrelated subpaths.

## Integration order and verification gates

1. Integrator freezes Task 0 contract and coordinates collision-free exports. Land Lane A/B API implementations before C imports them. Lane B DataTable migration follows VirtualList override tests; Lane C wrapper migration follows its corresponding Lane A APIs; then C removes the package/manifests and consumer references.
2. Integrator resolves export-map and consumer-manifest changes, regenerates lockfile through the pinned toolchain, checks all callers/docs/exports have no old package path, and records final `UPSTREAM.md` divergence entries. No alias or temporary shim remains.
3. After all lanes are merged, run gates serially (one full verification pass, not during lane implementation):
   - Clean workspace build: `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build` — every package builds from clean state.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check` — all checks pass.
   - One full `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm e2e` — browser/e2e acceptance passes; do not repeat full suite.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm test:consumer` — packed consumer/export/coverage/closure passes and no old package remains.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm gate:size --app apps/gallery` — size and lazy closure pass.
   - Run compare-sp2 visual matrix; expected **236/236** unchanged.
4. Commit lane slices with conventional commits; integrate to `docs/absorb-primitives-design`, run all gates, then push this branch. Never merge to main or force-push.

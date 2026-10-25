# Foldkit UI Absorbs Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the six local adapter capabilities into owned Foldkit UI, migrate DataTable to VirtualList's window API, and delete the never-published `@wsagency/wseffect-primitives` package.

**Architecture:** Three vertical lanes own Foldkit UI implementation + its Themes wrapper + focused tests together. The integrator owns the union of Foldkit UI package exports, primitives/workspace deletion, consumer coverage and docs. DataTable uses VirtualList's scroll viewport plus a window-rendering callback to retain a valid native table with sticky header and keyed tbody rows.

**Tech Stack:** TypeScript, Effect Schema, Foldkit Model/Message/update/view/`create` APIs, pnpm, Vitest, Playwright, packed-consumer and Gallery gates.

**Spec:** `docs/superpowers/specs/2026-10-25-foldkit-ui-absorbs-primitives-design.md`

## Global Constraints

- Use dedicated integration branch `feat/absorb-primitives`; do not merge to main or force-push.
- Foldkit UI remains headless; all RT classes and Radix2Solid DOM/visual parity stay in Themes; expected visual result is 236/236.
- Keep existing defaults and behavior. `foldkit-ui/select` is already a native select helper; the Listbox popup adapter is `foldkit-ui/listboxSelect`, never an overwrite or alias.
- TDD: each lane writes focused failing tests first and, after benchmark clearance, runs them to confirm failure, implements, reruns to confirm pass, and runs focused tests plus package typechecks. While benchmark runs, do not run builds, test suites, e2e or dev servers; resume lane verification only after director notice. Integrator runs all full gates after lanes land.
- Remove the primitives package and every old import/manifest/docs/test reference; no migration alias or compatibility shim.

## Review Focus

1. Context source replacement, touch timer cancellation and native contextmenu `defaultPrevented` contract — Lane 1 ContextMenu tests.
2. Drag Escape/pointercancel rollback to the full thumb snapshot and exact effective bounds — Lane 2 Slider.Range tests.
3. Item-aligned Select tracks an active option when present, otherwise the selected option and trigger fallback; keyboard movement does not silently switch it to trigger anchoring. Multi-child item content retains one `.rt-SelectItemContent` wrapper with `display:contents` — Lane 2 tests.
4. Nested keyed table rows retain measured/scroll/focus behavior and valid spacer row height — Lane 3 VirtualList/DataTable tests.
5. Missing legacy serialized Model fields default safely and package export/removal does not leave stale imports — codec tests in Lanes 1/2 and integrator consumer checks.

---

## Branch and file ownership

Create/continue a single `feat/absorb-primitives` integration branch. Lanes work in isolated worktrees based on that branch and send commits to the integrator for ordered integration. No shared source files:

| Owner | Exact ownership | Unowned by lane |
|---|---|---|
| **Lane 1 — Menu / Tooltip / Checkbox** | `packages/foldkit-ui/src/menu/**`, `tooltip/**`, new `checkboxGroup/**`; their tests; `packages/themes/src/components/context-menu.ts`, `tooltip.ts`, `checkbox-group.ts`, `checkbox-cards.ts`; corresponding `packages/themes/test/contextMenu*`, `tooltip*`, `checkboxGroup.scene.test.ts`, `checkboxCards.scene.test.ts`. | Any package export manifest, consumer manifest, docs/UPSTREAM, workspace/package deletion, DataTable, slider/select. |
| **Lane 2 — Slider / Listbox / Popup Select** | `packages/foldkit-ui/src/slider/**`, `listbox/**`, new `listboxSelect/**`; their tests; `packages/themes/src/components/slider.ts`, `slider/range.ts`, `select.ts`; corresponding `slider*`, `select*` Themes tests. | Any package export manifest, consumer manifest, docs/UPSTREAM, workspace/package deletion, DataTable, Menu/Tooltip/Checkbox. |
| **Lane 3 — VirtualList / DataTable** | `packages/foldkit-ui/src/virtualList/**` and tests; `packages/themes/src/components/data-table.ts`, `data-table.mount.ts`; DataTable Story/Scene/reuse/grid tests. | Any package export manifest, consumer manifest, docs/UPSTREAM, workspace/package deletion, other wrappers. |
| **Integrator — package and cutover** | `packages/foldkit-ui/package.json` export-map union for all new entries; `packages/primitives/**` deletion; `pnpm-workspace.yaml`, root manifest/lockfile, consumer coverage and tests; all README/docs/package inventories; final UPSTREAM/proposal consistency; integration branch and final gates. | Lane source files until lane commits land; no parallel edits of the same files. |

## Vertical implementation slices

### Lane 1 — Menu context + ContextMenu; Tooltip group + Tooltip; CheckboxGroup + checkbox group/cards

**Files:** ownership table above; primitives sources/tests `context-menu.ts`, `tooltip-group.ts`, `checkbox-group.ts` and their `test/contextMenu*`, `tooltipGroup*`, `checkboxGroup*` are reference behavior to migrate, then integrator deletes them.

- [ ] **Test first:** migrate/add tests under Foldkit UI for Menu Context invocation, Tooltip group, CheckboxGroup, and update corresponding Theme Story/Scene/reuse tests. Include source replacement/unmount and matching token; right-click point; keyboard ContextMenu/Shift+F10; touch timer exactly 600ms; release/pointercancel/movement >8px; `contextmenu.defaultPrevented === false` before touch activation and `true` after activation; listener/anchor cleanup; disabled item/typeahead/Enter/Space selection; 700ms first hover, 0ms subsequent during 300ms window, focus immediate, stale expiry version; controlled CheckboxGroup group label, disabled and typed toggle, CheckboxCards checked/disabled/layout semantics. Add Menu legacy codec case deleting `maybeContextInvocation`/`longPressVersion`; assert defaults and model/message round-trip.
- [ ] **Implement:** Menu context trigger/openAt with optional defaulted Model fields; explicit Tooltip group model; stateless CheckboxGroup module; migrate Theme wrappers while retaining exact `rt-*` markup/classes and `fold`/`embed` API.
- [ ] **Focused verification after benchmark clearance:** `pnpm --filter @wsagency/wseffect-foldkit-ui exec vitest run src/menu src/tooltip src/checkboxGroup`; `pnpm --filter @wsagency/wseffect-themes exec vitest run test/contextMenu.story.test.ts test/contextMenu.scene.test.ts test/contextMenuTheme.reuse.test.ts test/tooltipGroup.story.test.ts test/tooltip.scene.test.ts test/tooltip.reuse.test.ts test/checkboxGroup.scene.test.ts test/checkboxCards.scene.test.ts`; `pnpm --filter @wsagency/wseffect-foldkit-ui typecheck`; `pnpm --filter @wsagency/wseffect-themes typecheck`. Confirm all new Message arms covered.
- [ ] Commit vertical slice with conventional message; report exact focused commands/results.

### Lane 2 — Slider.Range + range; Listbox anchor/multi-child + popup Select

**Files:** ownership table above; primitives `range-slider.ts`, `select.ts`, `select-position.ts` and tests are migration references. Keep existing native Foldkit UI `src/select/` untouched.

- [ ] **Test first:** move range Story/Scene/reuse tests into Foldkit UI and update Theme tests; test thumb order/no crossing, nonzero step origin, exact per-thumb min/max and effective grid, Page=10, vertical mapping, ARIA, pointer start/move/up/commit, pointercancel and Escape preventDefault → `CancelDrag` → restore whole snapshot, idle cancel without OutMessage, scalar Slider regression. Move Select/SelectPosition Scene/Story/reuse tests; cover controlled selection, grouped options/headings/separators, disabled options/typeahead, trigger fallback, active-item (else selected-item) positioning/resize/observer cleanup, both popper and item-aligned behavior, exact `.rt-SelectItemContent` wrapper and indicator/text sibling order with `display:contents`. Add legacy Listbox schema test removing `anchorMode`, assert default `'Trigger'`, plus updated model/message codec round-trip.
- [ ] **Implement:** add `Slider.Range`; make Listbox anchor selection explicit (`anchorMode:'Trigger'|'SelectedOrActiveItem'`, active option preferred over selected for item-aligned positioning), allow sibling item HTML; create `listboxSelect` adapter and export request for Integrator; keep `foldkit-ui/select` native helper unchanged. Migrate Themes Select and range wrappers without changing RT DOM/classes.
- [ ] **Focused verification after benchmark clearance:** `pnpm --filter @wsagency/wseffect-foldkit-ui exec vitest run src/slider src/listbox src/listboxSelect`; `pnpm --filter @wsagency/wseffect-themes exec vitest run test/slider.story.test.ts test/slider.scene.test.ts test/slider.reuse.test.ts test/select.story.test.ts test/select.scene.test.ts test/selectPosition.scene.test.ts test/selectTheme.reuse.test.ts`; `pnpm --filter @wsagency/wseffect-foldkit-ui typecheck`; `pnpm --filter @wsagency/wseffect-themes typecheck`. Confirm Story Message-arm coverage.
- [ ] Commit vertical slice with conventional message; report exact focused commands/results.

### Lane 3 — VirtualList overrides + DataTable

**Files:** `packages/foldkit-ui/src/virtualList/{index.ts,public.ts,index.test.ts,scene.test.ts}`; `packages/themes/src/components/{data-table.ts,data-table.mount.ts}` and `packages/themes/test/{dataTable.story.test.ts,dataTable.scene.test.ts,dataTable.grid.story.test.ts,dataTable.grid.reuse.test.ts,dataTable.reuse.test.ts}`.

- [ ] **Test first:** VirtualList default ul/li markup unchanged; custom viewport/row/spacer markup; nested keyed rows found by ApplyScroll and viewport-anchor preservation, dynamic measurement/resize and focus. DataTable tests assert one scrolling div, caption + sticky thead outside windowed tbody, `<tr><td colspan=visible columns+selection>height spacer</td></tr>` spacers, stable row keys and bounded LRU, all existing sort/filter/selection and native table behavior, Grid roles/indices/one roving tabindex/no-wrap keys, pending scroll/focus only after target row commits, and `FocusTargetCompleted` Message codec.
- [ ] **Implement VirtualList API:** optional `containerElement`, `containerRole`, `rowElement`, `rowRole`, `rowToView(item,index,key,rowAttributes,h)`, `spacerToView(edge,height,h)`, `windowToView({topSpacer,rows,bottomSpacer,startIndex,endIndex,itemCount},h)`. Defaults reproduce current list. Generalize nested keyed-row lookup/measurement in `ApplyScroll` while preserving stable key/index behavior.
- [ ] **Implement DataTable migration:** VirtualList owns `div` scroll viewport and observation Mount; `windowToView` returns table/caption/thead/tbody; `rowToView` returns keyed `<tr>` with provided identity/data attrs and existing Grid row/cells; spacer callback emits valid `tr/td colspan` rows. Keep sticky header outside window rows and per-instance row LRU. Replace hand-computed `rangeFor`/spacer view and `ScrollDataTableRow` with `VirtualList.scrollToKey`/`scrollToIndex` + `ApplyScroll`; `CompletedApplyScroll(Applied)` schedules `FocusDataTableCell`. On exact active cell success, command emits `FocusTargetCompleted` with scroll snapshot; DataTable applies `ObservedContainerScroll` and clears matching pending focus. Preserve header focus command.
- [ ] Commit vertical slice with conventional message; report exact focused commands/results.

## Integrator cutover and integration sequence

1. Create integration branch `feat/absorb-primitives` from `origin/main` and install via pinned Node/pnpm toolchain. No implementation/heavy commands until benchmark clearance; design/source reading only until then.
2. Integrate Lane 1, Lane 2, Lane 3 commits, resolve only deliberate interfaces in spec; do not start wrappers before their respective UI API. Package manifest remains integrator-owned; add exact export-map entries once for `./checkboxGroup`, `./tooltip/group`, and `./listboxSelect` using Foldkit UI conventions (Menu/Slider/VirtualList already have subpath entries).
3. Write failing packed-consumer assertions for new public exports and absence of primitives dependency/import. Extend `tests/consumer/coverage-manifest.json`, discovery and tests to exercise each public module/declaration and assert old package absent. Delete `packages/primitives`, workspace and root manifest references, `pnpm-lock.yaml` package/importer records, primitive build/test scripts, README and docs/package inventories. No compatibility export.
4. Mark all six proposal drafts in `docs/upstream/` `Implemented locally in packages/foldkit-ui/...` and whether optional upstream follow-up is desirable. Complete `packages/foldkit-ui/UPSTREAM.md` divergence entries for Menu invocation, Range, Tooltip group, Listbox anchor/content, CheckboxGroup, VirtualList window output; preserve Foldkit style and headless separation.
5. After lane-focused runs and package typechecks pass, integrator performs one serialized final gate set after benchmark clearance:
   - Clean build: `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check`.
   - One full `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm e2e`.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm test:consumer`.
   - `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm gate:size --app apps/gallery`.
   - compare-sp2 visual matrix: **236/236**.
6. Commit integration with conventional commits and push `feat/absorb-primitives`; do not merge to main or force-push.

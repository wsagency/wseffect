# wseffect Themes and Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved SP2 Themes API, local headless primitives, accessible virtualized DataTable, lazy Gallery routes, package/e2e/performance coverage, and pinned Radix2Solid visual comparison.

**Architecture:** `@wsagency/wseffect-primitives` supplies only the four local stateful submodels, stateless CheckboxGroup view, and SelectPosition Mount. `@wsagency/wseffect-themes` ports the 42 new R2S view/module APIs over exact upstream Foldkit APIs and local primitives, with CSS copied only from the pinned R2S release. Gallery, packed-consumer, gates and visual bench exercise these public contracts without adding eager shell/framework imports.

**Tech Stack:** Node 24.21.0, pnpm 11.5.0, TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.2 + happy-dom 20.14.5, Playwright 1.64.1, axe-core 4.11.0, Foldkit / `@foldkit/ui` 0.168.0, Effect 4.0.5, `@floating-ui/dom` 1.8.0 (direct dependency only in ContextMenu subpath), Radix2Solid source and packed tarballs at commit `383676172abb84b4a1d2e54a087d290437ee8848`.

**Spec:** `docs/superpowers/specs/2026-10-21-wseffect-sp2-themes-primitives-design.md` (approved 2026-10-21). Read the relevant requirement IDs before each task; this plan freezes the interfaces below.

## Global Constraints

- **Priority:** correctness > runtime speed > bundle size (PRI-1..3); do not trade correctness or virtualization for speed.
- **Pins:** `foldkit` 0.168.0, `@foldkit/ui` 0.168.0, `@foldkit/vite-plugin` 0.27.1, `effect`/`@effect/platform-browser` 4.0.5 exactly, `@floating-ui/dom` 1.8.0, `@radix-ui/colors` 3.0.0; published Effect peers `^4.0.5`; Node `24.21.0`; `pnpm@11.5.0`; R2S `383676172abb84b4a1d2e54a087d290437ee8848`; installed Foldkit evidence is exactly `@foldkit/ui` 0.168.0. No unpublished worktree source supplies implementation or baseline.
- **BUD-1:** hard incremental cap **1,024 B Brotli-q11** for entry + framework from new shell/nav links, route labels and loader metadata. No new component/helper/primitive/`@foldkit/ui`/Floating UI enters entry/framework closure; new CSS is not imported by shell. Existing primary pages `layout`, `typography`, `buttons`, `dialog` and existing `menus`, `form`, `virtual-list`, `shared*`, `theme` perf scenario pages remain byte-for-byte unchanged in component membership; each new component goes only on a new non-primary lazy page.
- **BUD-2..6:** `bench/baselines/size.json` tracks every page chunk/stylesheet; >2% growth updates measured bytes plus non-empty reason in the same PR; GATE-P4 counters prove unchanged subtree reuse and exactly one increment per affected memo view; proposed GATE-P2 4× CPU Event Timing medians are Select 1k open/choose ≤50 ms, Tooltip open/close ≤30 ms, Slider drag ≤30 ms, DataTable 10k update/filter/sort/select ≤50 ms, not measurements; add scenarios to existing `tools/gates/perf.ts`, with CI acceptance blocked until stable runner host and `perf-noise.json` floors exist; subpath imports exclude unrelated primitives; B vs B+H checks DEP-1; BENCH is reporting-only at exact R2S pin.
- **DEP-1:** PRIM-6 applies only to decoding helpers: use `SchemaParser.decodeUnknownExit`, never runtime `Schema` from `effect` root for decoding. Defining Model/Props schemas with `Schema` is required and allowed. Do not add Effect modules outside the existing framework closure; the packed consumer B vs B+H gate is the arbiter and must prove no Effect module is added beyond B; do not compare the historical Gallery sourcemap.
- **PRIM-1..8:** REPO-1 ESM named subpaths, `"sideEffects": false`, exact pins and Effect peer ranges; REPO-2 view identity transform at build boundary; stateful subpaths export Schema-backed Model/Message/OutMessage/init/update/view; PRIM-6 applies only to decoding helpers: decode with `SchemaParser.decodeUnknownExit`, never import runtime `Schema` from `effect` root; defining Model/Props schemas with `Schema` is required and allowed; themed wrappers reuse upstream types and `toView`/fold/embed; Commands use `Effect` with error channel `never`, ordinary failures become declared Messages; browser element-lifetime work uses `Mount.MountAction<M>` and typed cleanup, never deprecated `Mount.Mount<M>`; subscriptions use `Subscription.Subscription<unknown, M, Record<string, never>>`; public results use Effect 4.0.5 `Result.Result`; only Select, ContextMenu, RangeSlider, TooltipGroup, CheckboxGroup.view and SelectPosition are local.
- **THEME-1..8:** exact pinned R2S names, semantic defaults, element structure, schema literals, `Responsive<T>` and CSS classes; module-initialized schema lookup tables; stateless `view(props, children, h)`; stateful upstream Model/Message/OutMessage reused unchanged via `toView`, fold/embed; ARIA/state owned by headless primitive; transitive CSS imports/notices/relative paths preserved and build pipeline used; root Theme owns exactly one `#foldkit-portal-root`, nested Themes do not add one; portal preserves IDs/ARIA relationships and token inheritance; every component has schema/Scene coverage and representative R2S parity fixtures.
- **DT-1..6:** typed stable-ID columns; parent owns rows/selectedRowIds in Config; Model owns filter/sort and recomputes `orderedRowIds` in update on RowsChanged, FilterChanged and SortChanged; source-order stable sort; no data-record copying; controlled selections persist across filter/sort and select-all affects filtered IDs only; `@foldkit/ui/virtualList`; render-layer per-instance LRU keyed by DataTable id, max `visibleRowCount + 2 * overscanRows`, dispose on eviction and table Mount cleanup; 10k-row operations ≤50 ms each as a proposed 4× CPU Event Timing median ceiling; opt-in roving-DOM-focus Grid uses active `{ rowId, columnId }`, no wrapping, normal Tab exit, correct roles/counts/indices and virtualized focus recovery.
- **SP2-TEST-1..6:** every exported `update` gets Foldkit Story tests and 100% per-file function coverage for Message arms; every view gets Scene role/name/ARIA/modifier/keyboard/reuse tests; production Gallery e2e Chromium/Firefox/WebKit, zero axe-core 4.11.0 violations, overlay/portal/key/pointer/touch/small viewport coverage; packed consumer manifest covers every SP2 public subpath/export/CSS and asserts UPSTREAM/notice shipping; visual comparison uses packed R2S at the exact pin; screenshot matrix pins Chromium, 1280×800, device scale 1, fonts, light/dark root Theme, reduced motion, fixed data and animation clock, default plus every declared variant at size=2 where available, and identical semantic state/props for Gallery/bench pairs; interactive captures include Select/Popover/Dialog open, HoverCard/Tooltip hover, Button/Radio/Slider/Tab keyboard focus.
- **Visual rule (SP2-TEST-6):** CSS and DOM are copied/matched, so exact match is expected; retain numeric pass: after 1px antialias-edge tolerance ≤0.5% changed pixels and no connected differing region >0.25% of capture.
- **No Foldkit patches:** no fork/pin bump, patch-package, rewriting or vendoring of `dist`; propose generic fixes upstream only after local delivery. No AI co-author trailers. Tool/version pins above are mandatory. Lane scratch directories are under `$HOME/.cache/wseffect-work/<lane>`; keep generated fixtures, archives and benchmark output there, not in the repo.
- **UP-PR-1:** after local delivery, write five generic upstream proposal drafts (CheckboxGroup composition, Menu context invocation, multi-thumb Slider, TooltipGroup skip-delay coordination, Listbox configurable selected-item anchor). Actual PRs are opened only after maintainer engagement on pending PRs #1699, #1700, #1703 and #1711; do not delay local delivery or depend on upstream acceptance.
- **Licensing:** original TypeScript/package output remains MIT; copy R2S CSS only as permitted by the pinned license; preserve verbatim copyright/license/attribution notices and ship `UPSTREAM.md` plus required notices in the packed Themes package. Retain Radix Themes/Radix Colors notices; do not imply Radix endorsement. Foldkit remains an exact dependency and is not copied/vendored; its dependency metadata carries its notice.
- Other immovable rules: existing perf job and `tools/gates/perf.ts` are present; stable runner host/noise floors in `perf-noise.json` and SP2 scenario wiring remain prerequisites. BENCH is reporting-only; proposed ceilings are not measurements. No icons (SP3), charts (SP4), general validation, spreadsheet, pagination policy, editing, or unrelated API.

## Review Focus

1. **A replacement node reuses a stale ContextMenu source ID.** A mounted trigger gets a unique `sourceToken`; restoration occurs only if source ID and token still match, and source unmount closes without restoring focus. Test: `contextMenu.story.test.ts` › `does not focus a replacement source after source unmount`; `context-menu.spec.ts` › same behavior in browser.
2. **Filtering/sorting removes or relocates the active virtual Grid cell.** Preserve row/column identity when possible and choose the nearest surviving ordinal otherwise; restore focus only after the target virtual row mounts. Test: `dataTable.story.test.ts` › `recovers active cell after filter removes its row`; `data-table.spec.ts` › `restores focus after virtual row remount`.
3. **Theme portal element is absent or a nested Theme is present.** Default portal reuses root host; nested Theme adds no competing host; fallback only occurs when host absent. Test: `theme.scene.test.ts` › `creates one root portal host`; `theme-portal.spec.ts` › portal computed accent/radius inherits root Theme.
4. **A disabled/hidden option becomes active during typeahead, keyboard movement or selection.** Skip it for activation, preserve group/separator navigation, and do not select hidden IDs; test `select.story.test.ts` › `skips disabled options in typeahead and arrows` and `contextMenu.story.test.ts` › `skips disabled items`.
5. **A 10k-row dataset or rapidly changing filter causes retained row views or stale ordering.** Keep keys/rows stable, LRU bounded and ordering in Model; test `dataTable.story.test.ts` › `bounds cache while scrolling 10k rows` and `keeps source order for sort ties`.

---

## Frozen Interfaces (Task 0 is the only API-freeze step)

All names below are public, named ESM subpath exports unless marked CSS-only. For a stateless component, `Props` and its schema are the exact schema-derived R2S props at pin `383676172abb84b4a1d2e54a087d290437ee8848`; preserve each original literal/default/responsive domain without widening. Use `Html` and the repo's `h` factory, not Solid types. The common generic function shape is `view<Message>(props: Props, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html`; each module exports `Props` schema/type and `view` unless it is a compound namespace or CSS-only.

### Public Themes names

- Stateless single-view modules: `AccessibleIcon`, `VisuallyHidden`, `AspectRatio`, `Container`, `Inset`, `Section`, `Avatar`, `Badge`, `Blockquote`, `Quote`, `Em`, `Strong`, `Code`, `Kbd`, `IconButton`, `Link`, `Progress`, `Separator`, `Skeleton`, `Spinner`, `ScrollArea`, `ThemePanel`, `TabNav`. Each exports `{ Props, view }` with common view signature. `type ThemeSettings = typeof Theme.Settings.Type`; `ThemePanel.Props = { isOpen: boolean; settings: Partial<ThemeSettings>; toSettingsChanged(settings: Partial<ThemeSettings>): ThemePanel.Message }`; `ThemePanel.Message = { _tag: 'SettingsChanged'; settings: Partial<ThemeSettings> }`, so parent settings changes are represented as Message values rather than callbacks.
- Compound static namespaces preserve exact part names and `Part.view(props, children, h)`: `Callout.Root`, `.Icon`, `.Text`; `Table.Root`, `.Header`, `.Body`, `.Row`, `.Cell`, `.ColumnHeaderCell`, `.RowHeaderCell`; `DataList.Root`, `.Item`, `.Label`, `.Value`. Each part has its own pinned-schema-derived `Props` type and schema; no Solid context, slots, or child cloning.
- Stateful/reused modules: `RadioGroup`, `RadioCards`, `SegmentedControl`, `Select`, `Slider`, `AlertDialog`, `Popover`, `HoverCard`, `Tooltip`, `ContextMenu`. They expose `Model`, `Message`, `OutMessage`, `init`, `update`, `view`, `fold`, and `embed`; public types/implementation alias upstream FK 0.168.0 except Select's item-aligned mode and ContextMenu, which use the local primitive contracts below. `Select` uses upstream Listbox for `position: 'popper'`; `ContextMenu` reuses Menu model/init/update/query/selection but owns local invocation/anchor state. AlertDialog uses Dialog submodel with `role="alertdialog"`, Cancel `focusSelector`, no backdrop click. Slider uses upstream single-thumb Slider and local RangeSlider for multiple thumbs.
- `Radio`, `Checkbox`, `CheckboxGroup`, `CheckboxCards`, `Switch`, and `TextArea` export stateless upstream/local views.
Each stateful module exports its upstream `Model`, `Message`, `OutMessage`, `init`, `update`, and `view` types unchanged except the two local adapters. `fold<ParentModel, ParentMessage, ParentOutMessage>(config)` uses `Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage, ParentOutMessage>` and returns `Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage>`; `embed(h, config)` uses a component-specific `EmbedConfig` and `h.submodel`. Generic type parameters and any `create<Value>()` factory match the exact upstream FK 0.168.0 declaration. Local primitive Config/Model/Message/OutMessage signatures are listed below; no extra themed wrapper state.
- CSS-only `Reset` exports no view. No `Meter`, icons, `Portal`, `Slot`, `Slottable`, or compatibility aliases.

### Local primitive subpaths

// @wsagency/wseffect-primitives/checkbox-group
export type Option<Value extends string> = { value: Value; label: Html; isDisabled: boolean }
export type Props<Value extends string, Message> = { id: string; label: Html; options: ReadonlyArray<Option<Value>>; selected: ReadonlySet<Value>; isDisabled?: boolean; toggleMessage(value: Value, isChecked: boolean): Message }
export function view<Value extends string, Message>(props: Props<Value, Message>, h: HtmlBuilder<Message>): Html
// The checkbox change attribute dispatches props.toggleMessage(value, isChecked); there is no void callback or separate event Message export.

// /select-position: Mount-only; exported SelectPosition.mount(config): Mount.MountAction<SelectPosition.Message>
export type SelectPositionConfig = { panelId: string; triggerId: string; selectedItemId: string; activeItemId?: string }
export type SelectPositionMessage = { _tag: 'Positioned' } | { _tag: 'PositionFailed' }
export function mountSelectPosition(config: SelectPositionConfig): Mount.MountAction<SelectPositionMessage>

// /select: adapted upstream Listbox
export type SelectItem<Value extends string> = { value: Value; textValue: string; isDisabled: boolean; content: Html }
export type SelectGroup<Value extends string> = { id: string; label: Html; items: ReadonlyArray<SelectItem<Value> | SelectSeparator> }
export type SelectSeparator = { kind: 'separator'; id: string }
export type SelectOption<Value extends string> = { value: Value; label: Html }
export type SelectConfig<Value extends string> = { id: string; selectedValue: Option.Option<Value>; items: ReadonlyArray<SelectItem<Value> | SelectGroup<Value> | SelectSeparator>; position: 'popper' | 'item-aligned'; isModal: false }
export type SelectModel = Listbox.Model
export type SelectMessage = Listbox.Message
export type SelectOutMessage<Value extends string> = Listbox.OutMessage<Value>
export type SelectBundle<Value extends string> = Pick<Listbox.Bundle<SelectItem<Value>, Value>, 'update' | 'selectItem' | 'open' | 'close'> & {
  init(config: SelectConfig<Value>): SelectModel
  view(model: SelectModel, config: SelectConfig<Value>, h: HtmlBuilder<SelectMessage>): Html
}
export declare function createSelect<Value extends string>(): SelectBundle<Value>
// createSelect<Value>() constructs Listbox.create<SelectItem<Value>, Value>() inside its generic implementation; preserve Listbox's helper methods as well as the adapter init/update/view.
// /context-menu: reuses Menu model/update/query state but owns local renderer/anchor/invocation mapping
export type ContextMenuItem<Value extends string> = { value: Value; textValue: string; isDisabled: boolean; content: Html }
export type ContextMenuGroup<Value extends string> = { id: string; label: Html; items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator> }
export type ContextMenuSeparator = { kind: 'separator'; id: string }
export type ContextMenuConfig<Value extends string> = { id: string; items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuGroup<Value> | ContextMenuSeparator>; longPressMs: 600; sourceId: string; sourceToken: string; toItem(item: Value): Html }
export type ContextMenuInvocation = { sourceId: string; sourceToken: string; invocation: 'pointer' | 'keyboard' | 'touch'; point?: { x: number; y: number } }
export const ContextMenuModelSchema = Schema.Struct({ ...Menu.Model.fields, invocation: Schema.NullOr(Schema.Struct({ sourceId: Schema.String, sourceToken: Schema.String, invocation: Schema.Literals(['pointer', 'keyboard', 'touch']), point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })) })), longPressVersion: Schema.Number })
export type ContextMenuModel = typeof ContextMenuModelSchema.Type
export type ContextMenuMessage = Menu.Message | { _tag: 'OpenedAt'; invocation: ContextMenuInvocation } | { _tag: 'LongPressExpired'; version: number } | { _tag: 'SourceUnmounted'; token: string }
export type ContextMenuCommand = { _tag: 'FocusSource'; sourceId: string; sourceToken: string }
export type ContextMenuOutMessage<Value extends string> = Menu.OutMessage<Value>
export type ContextMenuBundle<Value extends string> = Pick<Menu.Bundle<Value>, 'update' | 'selectItem' | 'open' | 'close'> & {
  init(config: ContextMenuConfig<Value>): ContextMenuModel
  view(model: ContextMenuModel, config: ContextMenuConfig<Value>, h: HtmlBuilder<ContextMenuMessage>): Html
}
export declare function createContextMenu<Value extends string>(): ContextMenuBundle<Value>
// createContextMenu<Value>() constructs Menu.create<Value>() inside its generic implementation; preserve Menu's helper methods as well as the adapter init/update/view.
namespace RangeSlider {
  type Thumb = { id: string; value: number; min?: number; max?: number; step?: number }
  type Config = { min: number; max: number; step: number; orientation: 'horizontal' | 'vertical'; thumbs: ReadonlyArray<Thumb>; isDisabled?: boolean }
  type Model = { activeThumbId: string | null; dragStartValues: ReadonlyArray<Thumb> | null }
  type Message = { _tag: 'FocusThumb'; id: string } | { _tag: 'Step'; id: string; delta: number } | { _tag: 'Page'; id: string; direction: -1 | 1 } | { _tag: 'SetBoundary'; id: string; boundary: 'min' | 'max' } | { _tag: 'DragStart'; id: string } | { _tag: 'DragValue'; id: string; value: number } | { _tag: 'DragEnd' } | { _tag: 'CancelDrag' }
  type OutMessage = { _tag: 'ValuesChanged'; thumbs: ReadonlyArray<Thumb> }
  function init(config: Config): Model; function update(model: Model, config: Config, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage>; function view(model: Model, config: Config, h: HtmlBuilder<Message>): Html
}
// /tooltip-group
namespace TooltipGroup {
  type Config = { openDelay: 700; skipDelay: 300 }
  type Model = { isSkipping: boolean; expiryVersion: number }
  type Message = { _tag: 'TooltipOpened'; now: number } | { _tag: 'TooltipClosed'; now: number } | { _tag: 'SkipExpired'; version: number }
  type OutMessage = never
  function init(config?: Config): Model; function update(model: Model, message: Message): Update.Return<Model, Message>; function reflectShowDelay(model: Model): number
}
```

Schema exports: `RangeSlider.Model`/`Message`, `TooltipGroup.Model`/`Message`, local `ContextMenuModel`/`ContextMenuMessage`, adapted `SelectModel`/`SelectMessage`, and `DataTable.Model`/`Message` are Effect Schema values with schema-derived types; retain Foldkit schemas for reused submodels and compose local state with `Schema.Struct`/`Schema.Union`/`Schema.Literal`. Prefer plain structs and `ReadonlyArray`; only use Map/Set when the exact Effect Schema supports it and an encode/decode round-trip test proves it.

### DataTable public subpath

```ts
namespace DataTable {
  type Column<Row> = { id: string; header: Html; accessor(row: Row): string; render?(row: Row): Html; isSortable: boolean; width?: string; minWidth?: string; align?: 'start' | 'center' | 'end'; isVisible?: boolean; searchText?(row: Row): string }
  type Config<Row> = { id: string; rows: ReadonlyArray<Row>; getRowId(row: Row): string; columns: ReadonlyArray<Column<Row>>; caption: Html; selectedRowIds: ReadonlySet<string>; isGrid: boolean; rowHeight: number; overscanRows: number }
  type Model = { filter: string; sort: { columnId: string; direction: 'ascending' | 'descending' } | null; orderedRowIds: ReadonlyArray<string>; activeCell: { rowId: string; columnId: string } | null; virtualList: VirtualList.Model }
  type Message = { _tag: 'RowsChanged' } | { _tag: 'FilterChanged'; value: string } | { _tag: 'SortChanged'; columnId: string } | { _tag: 'ToggleRow'; rowId: string } | { _tag: 'SelectVisible'; selected: boolean } | { _tag: 'ActiveCellChanged'; rowId: string; columnId: string } | { _tag: 'GridKey'; key: string; ctrlKey: boolean } | { _tag: 'VirtualList'; message: VirtualList.Message }
  type OutMessage = { _tag: 'SelectionChanged'; ids: ReadonlyArray<string> } | { _tag: 'FocusCell'; rowId: string; columnId: string }
  const virtualList = VirtualList.view<string>(); function init<Row>(config: Config<Row>): Model; function update<Row>(model: Model, config: Config<Row>, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage>; function view<Row>(model: Model, config: Config<Row>, h: HtmlBuilder<Message>): Html
}
```
Grid semantics are fixed: `aria-rowcount=orderedRowIds.length + 1` includes header; header row has `aria-rowindex=1`, data row index is its ordered index + 2; `aria-colcount=visible data columns + optional selection column`; use current ordinals for `aria-colindex`. Selection header/data checkbox is labelled and `tabindex=-1`, toggled by Space while its grid cell is active. Preserve `{ rowId, columnId }` through sort/filter; when removed/hidden choose nearest surviving cell from previous ordinal; if no data rows remain, focus grid root. Parent owns `rows` and `selectedRowIds`, passing both in Config; `filter`, `sort`, `orderedRowIds`, `activeCell`, and the complete `VirtualList.Model` are in the table Model. Update folds `VirtualList.Message` into the parent with `Update.foldChild` (VirtualList has no OutMessage channel), maps child Commands and Messages, and returns DataTable's selection/focus OutMessages. `RowsChanged`, `FilterChanged`, and `SortChanged` reconcile list keys using `VirtualList.informItemsChanged`; scroll, container resize, observed scroll, and programmatic scroll all go through the child Model/update. Grid focus recovery requests `VirtualList.scrollToKey(model.virtualList, rowId, { alignment: 'Nearest' })` before mounting/restoring the active cell.
Task 0 owns a compile-time contract test `packages/themes/test/frozen-signatures.test.ts` using `expectTypeOf` and `@ts-expect-error` checks for `HtmlBuilder<Message>`, `ReadonlyArray<Html | string>`, exact Foldkit `Model`/`Message` generic arities, typed Listbox/Menu bundles, and `Update.Return`/`Update.ReturnWithOutMessage`; verify against the installed Foldkit and `@foldkit/ui` 0.168.0 declarations. Never use nonexistent `HtmlFactory` or `Update.Update`. Schema fields for all R2S `Props` above are copied from pinned `dist/types/components/*.d.ts` and `.props.d.ts` then translated to Effect Schema while keeping exact literals/defaults. Schema-backed stateful Models/Messages also round-trip through the APP-8 page-model codec and contain plain structs/`ReadonlyArray` unless a Map/Set schema round-trip proves required; this plan deliberately excludes Solid types and React/Radix aliases.
Every component task lists the named execution-counter test `execution-counter reuse: unrelated update executes 0 view functions; one changed memo arg executes exactly 1 affected view`; its test asserts per-view counters. The shared helper may be used only if one already exists in the foundation and is cited in that task.

## File Map

- `packages/primitives/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts,src/index.ts,src/{checkbox-group,select-position,select,context-menu,range-slider,tooltip-group}.ts,test/*.test.ts}`: new JS-only package and six specified subpaths; package/workspace/lock wiring is Task 0, no root export barrel.
- `packages/themes/src/components/*.ts` and matching `*.props.ts`, `packages/themes/src/css-components/*.css`, `packages/themes/src/css-components/index.css`; `scripts/build-css.js` has a fixed target list for per-component CSS subpaths. `packages/themes/src/styles/components.css` remains the shared aggregate; `packages/themes/UPSTREAM.md` records provenance/notices. Each component lane adds its own `src/css-components/<component>.css` files and lists them in its hand-off report. Task 4A.2 is the single owner of index/build-target manifest edits, completed before Task 4A.1 imports CSS subpaths.
- `packages/themes/test/{props,*.scene,*.story,css,distribution}.test.ts` and `test/fixtures/sp2/<component>.txt`: schema, behavior, CSS closure, per-component pinned R2S parity fixtures and package tests. Each component lane owns its Scene/story and fixture files, including the named execution-counter reuse test; shared `props.test.ts` and the packed-build assertion that every CSS subpath is emitted are integrator-owned and cover every public component/CSS subpath after lanes land.
- `apps/gallery/src/pages/<new-family>.ts`, new `apps/gallery/src/pages/package.json`, `routes.ts`, generated `pages.gen.ts`, `primaryPages.ts`, `shell.ts/.css`; `apps/gallery/test/{basePages,interactivePages,perfPages,manifest,routes,shell}.test.ts`; `e2e/sp2/*.spec.ts`: new lazy routes and browser coverage. `apps/gallery/src/routes.ts`, shell and pages-gen inputs are integrator-owned.
- `tests/consumer/coverage-manifest.json`, `tests/consumer/fixtures/sp2/*`, `tests/consumer/run.ts`, `bench/baselines/size.json`, `bench/baselines/perf.json`, `tools/gates/perf.ts`, `tools/gates/perf.test.ts`: integrator-owned packed API/gates/shared baselines. No lane edits these without integrator review.
- `bench/radix2solid/src/pages/*.tsx`, `src/App.tsx`, `src/types.ts`, `src/fixtures/BenchFixtures.tsx`, `scripts/*.ts`, screenshots and comparison artifacts: L4B only; source tarballs resolved at the pinned R2S commit.
- `docs/upstream/*.md` and `docs/superpowers/plans/ISSUES.md`: Task 4A.5 Foldkit proposal drafts and deferred-PR amendment.

## Lanes and Dependency Graph

| Lane | Scope / owner | Dependencies |
|---|---|---|
| 0 | Integrator: freeze/signatures, skeleton, workspace wiring, API snapshots | none; merge first |
| 1 | Local primitives | Task 0 only |
| 2A | Forms | Task 0; Lane 1 only for CheckboxGroup, item-aligned Select, RangeSlider |
| 2B | Overlays/navigation | Task 0; Lane 1 only for TooltipGroup and ContextMenu |
| 2C | Statics/typography/data + `UPSTREAM.md` (fast-worker eligible; task inputs and class-table pattern are explicit) | Task 0 |
| 3 | DataTable | Task 0; may run alongside 2A/2B/2C |
| 4A | Gallery/e2e/consumer/size/perf gates/proposal drafts | stable 1/2A/2B/2C/3 interfaces; integrator owns shared files |
| 4B | Radix2Solid visual extension/capture/compare | Task 0 frozen props; may run alongside 4A |

Graph: `0 → 1`; `0 → 2A` (with only CheckboxGroup/Select/RangeSlider edges from 1), `0 → 2B` (only TooltipGroup/ContextMenu edges from 1), `0 → 2C`, `0 → 3`; `1 + 2A + 2B + 2C + 3 → 4A.2 CSS-manifest integration → 4A.1 CSS subpath imports → 4A.3–4A.4 → 4A.5`; `0 + frozen component props → 4B`. Lanes 1, 2C, 3 and 4B may run concurrently after Task 0; 2A/2B start after Task 0 and consume their specific local primitive contracts when available. Task 4A.2 completes CSS manifest/build-target integration before Task 4A.1 imports CSS; all 4A shared-file edits remain integrator-only. One isolated worktree per lane under `$HOME/.cache/wseffect-work/<lane>`; don't rebase a lane after integrator fetches its history.

## Tasks

Each task commits independently after its focused tests and relevant package `typecheck`, `lint` and `build` pass. `pnpm --filter @wsagency/wseffect-themes exec vitest run <files>` and equivalent primitives/gallery commands are focused test invocations; expected successful Vitest output is `Test Files 1 passed (1)` and all named tests listed in the task pass. Every lane runs `pnpm check` once in its own worktree before hand-off. After each merge wave, the integrator runs `pnpm check`, `pnpm e2e`, `pnpm test:consumer` and `pnpm gate:size`; do not run repository-wide checks concurrently in lane worktrees.

### Task 0: Integrator freeze and primitive package skeleton

**Files:** Create `packages/primitives/{package.json,README.md,CHANGELOG.md}`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `src/index.ts` and six public subpath modules; modify root `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `scripts/primitives-package.test.ts`, primitive tests and this plan's Frozen Interfaces section. Package exports six named subpaths, each points to `dist/<subpath>.js` and `.d.ts`; README License paragraph names retained notices per LIC-3.

**Interfaces:** Freeze all public signatures above before lane work starts. `REPO-1` manifest has `"sideEffects": false`, exact `foldkit`/`@foldkit/ui` 0.168.0 peers, Effect and `@effect/platform-browser` peers `^4.0.5`, direct `@floating-ui/dom` 1.8.0 used only by ContextMenu. Validate `Update.Return`/`Update.ReturnWithOutMessage`, Mount, HtmlBuilder, fold/embed, and Brand APIs against foundation declarations; compile `frozen-signatures.test.ts` to reject invalid Html/message/return types, Listbox/Menu Model/Message arity and untyped factory callsites.

- [ ] **Step 1: Write failing package and signature contract tests.** Create `scripts/primitives-package.test.ts` tests `package manifest exposes six ESM subpaths` and `package peers and sideEffects match REPO-1`, plus `packages/themes/test/frozen-signatures.test.ts` using `expectTypeOf`/`@ts-expect-error` for all frozen function contracts and the HtmlBuilder child union; `packages/themes/tsconfig.json` includes `test/**/*.ts`, so run `node --test scripts/primitives-package.test.ts` and `pnpm --filter @wsagency/wseffect-themes typecheck`. Expected: package test fails because package does not exist, and compiler-check fails on intentionally invalid signature assertions.
- [ ] **Step 2: Create package skeleton.** Add exact manifest/subpath export map, scripts/configs, empty typed subpath modules, and workspace wiring. The frozen-signature test imports generated declarations from `packages/primitives/dist`; build primitives before Themes typecheck so export-map declarations are available without adding a runtime dependency solely for type tests. Rerun `node --test scripts/primitives-package.test.ts` and `pnpm --filter @wsagency/wseffect-themes typecheck`; expected: package tests pass and the contract test typechecks.
- [ ] **Step 3: Write the failing branding test.** Add `packages/primitives/test/identity.test.ts` › `build brands exported views at the library boundary`; run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/identity.test.ts`. Expected: FAIL because the package does not yet run the identity transform.
- [ ] **Step 4: Implement build identity.** Add build pipeline/brand transform by matching the existing Themes pattern; test packed output imports `foldkit/brand` and callers do not brand manually.
- [ ] **Step 5: Verify.** Run `pnpm install --lockfile-only`, `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/identity.test.ts`, `pnpm --filter @wsagency/wseffect-primitives typecheck`, `pnpm --filter @wsagency/wseffect-primitives lint` and `pnpm --filter @wsagency/wseffect-primitives build`; expected named identity test passes and typecheck/lint/build exit 0.
- [ ] **Step 6: Commit.** `git add packages/primitives scripts/primitives-package.test.ts pnpm-workspace.yaml pnpm-lock.yaml docs/superpowers/plans/2026-10-21-wseffect-sp2-themes-primitives.md && git commit -m "build: freeze sp2 primitive interfaces"`.

### Lane 1 — Local primitives


#### Task 1.1: CheckboxGroup and RangeSlider

**Files:** `packages/primitives/src/checkbox-group.ts`, `range-slider.ts`, `test/checkboxGroup.test.ts`, `test/checkboxGroup.scene.test.ts`, `test/rangeSlider.story.test.ts`, `test/rangeSlider.scene.test.ts`.
**Interfaces:** `CheckboxGroup.Option/Props/view` and `RangeSlider` types above; parent owns group selection and ordered range values; stable thumb IDs/per-thumb bounds, keyboard, drag and rollback as specified.
- [ ] Step 1: Add `checkboxGroup.test.ts` › `emits typed toggle without owning selected values`; Scene `labelled group exposes checked state`; RangeSlider Story tests `clamps thumb between neighbors`, `Page changes ten steps`, `Escape restores pre-drag values`, `supports vertical arrow direction`, `Model and Message schemas round-trip through the APP-8 page-model codec`; Scene `one accessible slider per thumb`. Run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/checkboxGroup.test.ts test/checkboxGroup.scene.test.ts test/rangeSlider.story.test.ts test/rangeSlider.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/checkboxGroup.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/checkboxGroup.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement the controlled group and range interaction Model; no value ownership.
- [ ] Step 3: Same command; expected 4 files pass and RangeSlider Story Message-arm coverage is 100%; `pnpm --filter @wsagency/wseffect-primitives typecheck` exits 0.
- [ ] Step 4: Commit `feat: add checkbox group and range slider primitives`.

#### Task 1.2: Select adapter and SelectPosition

**Files:** `packages/primitives/src/select.ts`, `select-position.ts`, `test/select.story.test.ts`, `test/select.scene.test.ts`, `test/selectPosition.test.ts`.
**Interfaces:** `SelectConfig<Value>`, `SelectItem<Value>`, `SelectGroup<Value>`, `SelectSeparator`, `SelectModel`, `SelectMessage`, `SelectOutMessage<Value>` and `createSelect<Value>()` returning the typed `SelectBundle<Value>` with `init/update/view`; `SelectPositionConfig`, `SelectPositionMessage`, and `mountSelectPosition` are defined above. The bundle wraps the upstream generic Listbox model and keeps the local renderer free of trigger Anchor; item-aligned placement uses SelectPosition.
- [ ] Step 1: Add `select.story.test.ts` › `keeps value parent-owned`, `item-aligned positions active item`, `skips disabled and separator options during typeahead`, `Model and Message schemas round-trip through the APP-8 page-model codec`; `select.scene.test.ts` › `exposes labelled listbox semantics`; `selectPosition.test.ts` › `positions panel at selected item and cleans observer`. Run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/select.story.test.ts test/select.scene.test.ts test/selectPosition.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/select.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/select.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement Listbox adapter, group/separator records, controlled value and custom item-aligned renderer; no local copy for popper mode.
- [ ] Step 3: Same command; expected 3 files/5 tests pass and Select Story Message-arm coverage is 100%; primitive typecheck exits 0.
- [ ] Step 4: Commit `feat: add item-aligned select adapter`.

#### Task 1.3: ContextMenu and TooltipGroup

**Files:** `packages/primitives/src/context-menu.ts`, `tooltip-group.ts`, `test/contextMenu.story.test.ts`, `test/contextMenu.scene.test.ts`, `test/tooltipGroup.story.test.ts`, `test/tooltipGroup.scene.test.ts`.
**Interfaces:** `createContextMenu<Value>()` returns `ContextMenuBundle<Value>` with `init/update/view`; its types are `ContextMenuConfig<Value>`, `ContextMenuModel`, `ContextMenuMessage`, and `ContextMenuOutMessage<Value>` above. It reuses Menu state while the local renderer owns invocation/anchor state and command interception. TooltipGroup uses 700ms open delay, 300ms skip window, focus immediate.
- [ ] Step 1: ContextMenu tests `pointer opens at client point`, `keyboard opens on source and focuses first enabled`, `touch long press activates at 600ms and cancels on >8px move/release`, `all close paths filter fixed-button focus`, `does not focus a replacement source after source unmount`, `local Model and Message schemas round-trip through the APP-8 page-model codec`; Scene `menu semantics and active enabled item`. TooltipGroup tests `first hover waits 700ms`, `next tooltip opens immediately in 300ms window`, `focus opens immediately`, `stale expiry version cannot close newer skip window`, `Model and Message schemas round-trip through the APP-8 page-model codec`. Run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/contextMenu.story.test.ts test/contextMenu.scene.test.ts test/tooltipGroup.story.test.ts test/tooltipGroup.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/contextMenu.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-primitives exec vitest run test/contextMenu.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement typed event/Message mapping and expiry-version state; only suppress native contextmenu after activation; maintain live source token; filter `FocusItems`, replace `FocusButton`, preserve other Menu commands; use direct Floating UI 1.8.0 and `portalToContainingRoot`, clean portal/autoUpdate.
- [ ] Step 3: Same command; expected 4 files pass and both Story files report 100% Message-arm function coverage; primitive typecheck exits 0.
- [ ] Step 4: Commit `feat: add context menu and tooltip group primitives`.

### Lane 2A — Forms

#### Task 2A.1: Checkbox family
**Files:** `packages/themes/src/components/{checkbox,checkbox-group,checkbox-cards}.ts`, `.props.ts`, matching CSS and tests.
**Interfaces:** `Checkbox` reuses controlled `FK:checkbox.view`; `CheckboxGroup.view` owns no value; `CheckboxCards` composes these and parent-owned values.
- [ ] Step 1: Add `checkbox.scene.test.ts` › `controlled and mixed state`; `checkboxGroup.scene.test.ts` › `label and typed toggle`; `checkboxCards.scene.test.ts` › `card selection remains parent controlled`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/checkbox.scene.test.ts test/checkboxGroup.scene.test.ts test/checkboxCards.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/checkbox.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/checkbox.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement exact R2S props/schema/defaults and CSS composition; use no local model.
- [ ] Step 3: Same command; expected 3 files pass; run `pnpm --filter @wsagency/wseffect-themes build`; expected build exits 0.
- [ ] Step 4: Commit `feat: add checkbox themes`.

#### Task 2A.2: Radio family
**Files:** `radio`, `radio-group`, `radio-cards` modules/schemas/CSS/tests.
**Interfaces:** preserve FK RadioGroup Model/Message/OutMessage/update; Radio, Cards and Group use the same group model/typed option IDs.
- [ ] Step 1: Tests `radioGroup.story.test.ts` › `arrows and Home End skip disabled items`; `radio.scene.test.ts` › `uses radio item attributes`; `radioCards.scene.test.ts` › `cards retain radio semantics`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/radioGroup.story.test.ts test/radio.scene.test.ts test/radioCards.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/radio.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/radio.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement views/schema/CSS from pin using upstream update; preserve horizontal/vertical orientation and roving focus.
- [ ] Step 3: Same command; expected 3 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add radio group themes`.

#### Task 2A.3: Switch and SegmentedControl
**Files:** `switch`, `segmented-control` modules/schemas/CSS/tests.
**Interfaces:** Switch uses controlled stateless FK view; Segment uses `FK:radioGroup`, single-choice radio semantics.
- [ ] Step 1: Tests `switch.scene.test.ts` › `controlled state and Space toggle`; `segmentedControl.story.test.ts` › `arrow key selects one option`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/switch.scene.test.ts test/segmentedControl.story.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/switch.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/switch.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement pinned props/schema/class maps and semantic markup.
- [ ] Step 3: Same command; expected 2 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add switch and segmented control themes`.

#### Task 2A.4: Select and TextArea
**Files:** `select`, `text-area` modules/schemas/CSS/tests.
**Interfaces:** Select popper reuses FK Listbox; item-aligned uses Lane 1 Select; TextArea uses stateless `FK:textarea.view`.
- [ ] Step 1: Tests `select.story.test.ts` › `supports groups separators disabled and typeahead in both placements`; `select.scene.test.ts` › `has labelled listbox and selected value`; `textArea.scene.test.ts` › `uses textbox role and controlled value`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/select.story.test.ts test/select.scene.test.ts test/textArea.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/selectTheme.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/selectTheme.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement as named; keep Model parent-owned; exact Select item-aligned contract from Lane 1.
- [ ] Step 3: Same command; expected 3 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add select and text area themes`.

#### Task 2A.5: Single and range Slider
**Files:** `slider` module/schema/CSS and `slider.story.test.ts`, `slider.scene.test.ts`.
**Interfaces:** single thumb uses upstream Slider unchanged; multiple thumbs use Lane 1 RangeSlider; page keys are 10 steps.
- [ ] Step 1: Tests `slider.story.test.ts` › `page keys move ten steps` and `range slider preserves controlled ordered values`; Scene › `exposes slider names min max and orientation`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/slider.story.test.ts test/slider.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/slider.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/slider.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement one/range themed composition, without wrapper state.
- [ ] Step 3: Same command; expected 2 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add slider themes`.

### Lane 2B — Overlays/navigation

#### Task 2B.1: AlertDialog and Popover
**Files:** `alert-dialog`, `popover` modules/schemas/CSS/tests.
**Interfaces:** AlertDialog uses Dialog submodel, explicit Cancel focus, role alertdialog, no backdrop click; Popover reuses FK Popover, nonmodal default.
- [ ] Step 1: Tests `alertDialog.story.test.ts` › `initial focus is Cancel and backdrop does not dismiss`; `popover.story.test.ts` › `nonmodal default and modal option`; Scenes › `roles and accessible names`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/alertDialog.story.test.ts test/alertDialog.scene.test.ts test/popover.story.test.ts test/popover.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/alertDialog.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/alertDialog.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement with upstream submodels and themed class config; no local state.
- [ ] Step 3: Same command; expected 4 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add alert dialog and popover themes`.

#### Task 2B.2: HoverCard and Tooltip
**Files:** `hover-card`, `tooltip` modules/schemas/CSS/tests.
**Interfaces:** HoverCard uses HoverIntent+Anchor (200/300ms defaults); Tooltip uses FK Tooltip and Lane 1 TooltipGroup; tooltip content never receives focus.
- [ ] Step 1: Tests `hoverCard.story.test.ts` › `opens from pointer and focus with configured delays`; `tooltipGroup.story.test.ts` › `reflects group skip delay while focused tooltip opens immediately`; Scenes › `tooltip remains nonfocusable description`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/hoverCard.story.test.ts test/hoverCard.scene.test.ts test/tooltipGroup.story.test.ts test/tooltip.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/tooltip.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/tooltip.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement exact delay/config behavior with no local tooltip model duplication.
- [ ] Step 3: Same command; expected 4 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add hover card and tooltip themes`.

#### Task 2B.3: ContextMenu and TabNav
**Files:** `context-menu`, `tab-nav` modules/schemas/CSS/tests.
**Interfaces:** ContextMenu wraps Lane 1 model; TabNav uses stateless `FK:nav.view` links and native tab order.
- [ ] Step 1: Tests `contextMenu.story.test.ts` › `restores exact live source and filters FocusButton`; `tabNav.scene.test.ts` › `uses links with aria-current and native tab order`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/contextMenu.story.test.ts test/contextMenu.scene.test.ts test/tabNav.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/contextMenuTheme.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/contextMenuTheme.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement wrappers with exact pinned APIs and class tables.
- [ ] Step 3: Same command; expected 3 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add context menu and tab navigation themes`.

### Lane 2C — Statics, typography, data and CSS provenance

#### Task 2C.1: Accessibility/status components
**Components:** AccessibleIcon, VisuallyHidden, Progress, Separator, Skeleton, Spinner (6).
**Files:** matching new `packages/themes/src/components/*.ts`, `.props.ts`, `packages/themes/src/css-components/*.css`, and Scene tests.
**R2S inputs at the pinned commit:** `packages/themes/src/components/accessible-icon.tsx`, `visually-hidden.tsx`, `progress.tsx`, `progress.props.ts`, `progress.css`, `separator.tsx`, `separator.props.ts`, `separator.css`, `skeleton.tsx`, `skeleton.props.ts`, `skeleton.css`, `spinner.tsx`, `spinner.props.ts`, `spinner.css`.
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** exact R2S props; Progress uses FK Progress; no implicit live region; Skeleton/Spinner are status only when labelled.
- [ ] Step 1: Tests `accessibleIcon.scene.test.ts` › `labels icon contents`, `visuallyHidden.scene.test.ts` › `hides visually but remains exposed`, `progress.scene.test.ts` › `exposes progress value`, `separator.scene.test.ts` › `uses separator semantics`, `skeleton.scene.test.ts` and `spinner.scene.test.ts` › `do not create implicit live regions`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/accessibleIcon.scene.test.ts test/visuallyHidden.scene.test.ts test/progress.scene.test.ts test/separator.scene.test.ts test/skeleton.scene.test.ts test/spinner.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/accessibility.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/accessibility.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement stateless views, Effect Schema and class lookup tables, copied CSS.
- [ ] Step 3: Same command; expected 6 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add accessibility and status themes`.

#### Task 2C.2: Layout and ScrollArea
**Components:** AspectRatio, Container, Inset, Section, ScrollArea (5).
**Files:** matching new `packages/themes/src/components/*.ts`, `.props.ts`, `packages/themes/src/css-components/*.css`, Scene/props tests and CSS closure tests.
**R2S inputs at the pinned commit:** `packages/themes/src/components/aspect-ratio.tsx`, `container.tsx`, `container.props.ts`, `container.css`, `inset.tsx`, `inset.props.ts`, `inset.css`, `section.tsx`, `section.props.ts`, `section.css`, `scroll-area.tsx`, `scroll-area.props.ts`, `scroll-area.css`.
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** exact R2S literal/responsive props; ScrollArea uses native scrolling/keyboard semantics and shared CSS.
- [ ] Step 1: Tests `aspectRatio.scene.test.ts` › `applies ratio`; `container.scene.test.ts` › `keeps responsive size`; `inset.scene.test.ts` › `maps inset props`; `section.scene.test.ts` › `uses section structure`; `scrollArea.scene.test.ts` › `scrolls natively`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/aspectRatio.scene.test.ts test/container.scene.test.ts test/inset.scene.test.ts test/section.scene.test.ts test/scrollArea.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/layout.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/layout.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement views and complete transitive CSS closure without importing it eagerly.
- [ ] Step 3: Same command; expected 5 files pass; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/css.test.ts`; expected CSS import/relative paths pass.
- [ ] Step 4: Commit `feat: add layout and scroll area themes`.

#### Task 2C.3: Avatar, Badge, Callout and ThemePanel
**Components:** Avatar, Badge, Callout (Root/Icon/Text), ThemePanel (4).
**Files:** matching new component/schema/CSS, Callout part tests and ThemePanel demo tests.
**R2S inputs at the pinned commit:** `packages/themes/src/components/avatar.tsx`, `avatar.props.ts`, `avatar.css`, `badge.tsx`, `badge.props.ts`, `badge.css`, `callout.tsx`, `callout.props.ts`, `callout.css`, `theme-panel.tsx`, `theme-panel.css`.
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** Callout explicit part props, Text owns size (no context); ThemePanel labelled form controls emit ThemePanel.Message, root settings consumed as Messages.
- [ ] Step 1: Tests `avatar.scene.test.ts` › `preserves image alternative semantics`, `badge.scene.test.ts` › `uses native status content`, `callout.scene.test.ts` › `composes root icon text without context`, `themePanel.story.test.ts` › `emits root setting messages`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/avatar.scene.test.ts test/badge.scene.test.ts test/callout.scene.test.ts test/themePanel.story.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/avatar.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/avatar.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement exact props/parts, no implicit live region, and class lookup tables.
- [ ] Step 3: Same command; expected 4 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add avatar feedback and theme panel themes`.

#### Task 2C.4: Typography statics
**Components:** Blockquote, Quote, Em, Strong, Code, Kbd (6).
**Files:** matching new component/schema/CSS and Scene tests.
**R2S inputs at the pinned commit:** `packages/themes/src/components/blockquote.tsx`, `blockquote.props.ts`, `blockquote.css`, `quote.tsx`, `quote.props.ts`, `quote.css`, `em.tsx`, `em.props.ts`, `em.css`, `strong.tsx`, `strong.props.ts`, `strong.css`, `code.tsx`, `code.props.ts`, `code.css`, `kbd.tsx`, `kbd.props.ts`, `kbd.css`.
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** stateless semantic element views with exact R2S schema and defaults.
- [ ] Step 1: Tests `blockquote.scene.test.ts`, `quote.scene.test.ts`, `em.scene.test.ts`, `strong.scene.test.ts`, `code.scene.test.ts`, `kbd.scene.test.ts`, each named `uses expected native semantic element`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/blockquote.scene.test.ts test/quote.scene.test.ts test/em.scene.test.ts test/strong.scene.test.ts test/code.scene.test.ts test/kbd.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/typography.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/typography.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement pure views, lookup tables and stylesheet closure.
- [ ] Step 3: Same command; expected 6 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add typography themes`.

#### Task 2C.5: IconButton and Link
**Components:** IconButton, Link (2).
**Files:** matching new modules/schema/CSS and Scene tests.
**R2S inputs at the pinned commit:** `packages/themes/src/components/icon-button.tsx`, `icon-button.props.ts`, `icon-button.css`, `link.tsx`, `link.props.ts`, `link.css`.
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** IconButton uses FK button attributes and requires accessible name; Link is native anchor with exact R2S link props.
- [ ] Step 1: Tests `iconButton.scene.test.ts` › `requires accessible name and keeps button semantics`; `link.scene.test.ts` › `renders native link`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/iconButton.scene.test.ts test/link.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/iconButton.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/iconButton.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement stateless/upstream-backed views.
- [ ] Step 3: Same command; expected 2 files pass; Themes build exits 0.
- [ ] Step 4: Commit `feat: add icon button and link themes`.

#### Task 2C.6: DataList, Table and CSS provenance
**Components:** DataList (Root/Item/Label/Value), Table (Root/Header/Body/Row/Cell/ColumnHeaderCell/RowHeaderCell), Reset CSS-only; plus `UPSTREAM.md`.
**Files:** new DataList/Table TS/schema/CSS, Reset CSS, `packages/themes/UPSTREAM.md` and verbatim applicable license notices.
**R2S inputs at the pinned commit:** `packages/themes/src/components/data-list.tsx`, `data-list.props.ts`, `data-list.css`, `table.tsx`, `table.props.ts`, `table.css`, `reset.css` only (CSS-only Reset; do not port `reset.tsx`).
Use the module-initialized literal lookup-table pattern from existing `packages/themes/src/components/button.ts` (`Object.freeze` tables plus `responsiveProp`/`responsiveClasses` where needed); don't build class maps per render.
**Interfaces:** all static parts use explicit `Props`, `children: Html`, `h`; native list/table semantics. UPSTREAM records R2S pin, exhaustive source-file list, copied CSS closure and verbatim applicable copyright/license/attribution notices. Task 4A.2 owns package `files`/exports and packed record/notices inclusion.
- [ ] Step 1: Tests `dataList.scene.test.ts` › `renders description list parts`, `table.scene.test.ts` › `renders native table structure`, `css.test.ts` › `copies reset and transitive imports`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataList.scene.test.ts test/table.scene.test.ts test/css.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/dataViews.reuse.test.ts` › `unrelated update reuses view; changed arg re-executes once`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataViews.reuse.test.ts`; assert per-view counters 0 and exactly 1.
- [ ] Step 2: Implement parts, copy only licensed pinned CSS with imports/notices, and write exhaustive `UPSTREAM.md`; report added CSS files to the integrator, who alone updates the CSS manifest/build target list in Task 4A.2.
- [ ] Step 3: Run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataList.scene.test.ts test/table.scene.test.ts test/css.test.ts`; expected 3 files pass; `pnpm --filter @wsagency/wseffect-themes build` exits 0.
- [ ] Step 4: Commit `feat: add data views and record css provenance`.

### Lane 3 — DataTable

#### Task 3.1: DataTable native table model, selection and virtualization

**Files:** `packages/themes/src/components/data-table.ts`, `data-table.props.ts`, CSS and `dataTable.story.test.ts`, `dataTable.scene.test.ts`.
**Interfaces:** `DataTable.Column/Config/Model/Message/OutMessage/init/update/view` in Frozen Interfaces; all stateful Model/Message exports are Schema-backed. Native table is default; parent owns rows and selected ID set in Config; Model owns filter/sort, stable `orderedRowIds`, active cell and virtual range. `RowsChanged`, `FilterChanged` and `SortChanged` recompute order from current Config; external filter dispatches through fold. VirtualList uses row IDs. Render-layer row-view LRU keyed by DataTable `id`, max `visibleRowCount + 2 * overscanRows`, disposed by `Mount.MountAction` cleanup; test bound/eviction with view counters or test-only accessor.
 - [ ] Step 1: Tests `keeps source order for sort ties`, `updates IDs without copying row records`, `select-all and deselect-all affect visible IDs only`, `recomputes order on RowsChanged FilterChanged and SortChanged`, `folds scroll and resize messages into VirtualList.Model`, `handles observed scroll and container resize`, `programmatic scroll-to-row targets a stable key`, `grid focus recovery scrolls to its target row`, `bounds and evicts render cache while scrolling 10k rows`, `RowsChanged rerenders each changed same-ID row exactly once while unrelated rows stay reused`, `disposes render cache on table lifetime cleanup`, `filter resets virtual range`, and `execution-counter reuse: unrelated update executes 0 row views; one changed memo arg executes exactly 1 affected row view`; Scene `native table caption headers and aria-sort`; add Model/Message schema round-trip through the APP-8 page-model codec; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataTable.story.test.ts test/dataTable.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/dataTable.reuse.test.ts` › `unrelated update executes 0 row views; changed row memo arg executes exactly 1 affected view`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataTable.reuse.test.ts`; assert per-view counters exactly.
 - [ ] Step 2: Implement Schema-backed plain-data Model/Message with embedded `VirtualList.Model`; fold the full child Message/OutMessage and child Commands as in `apps/gallery/src/pages/virtualList.ts:27-40,99-116,168-192`. Update order from Config rows on the three specified messages, use `informItemsChanged` when item keys change, and send external filter input through fold. Add view row-ID rendering, child event mapping, the bounded per-id memo cache with row identity/version plus all derived cell/search inputs in its memo arguments, and Mount cleanup.
- [ ] Step 3: Same command; expected both files pass, including bound, eviction, cleanup and schema round-trip assertions; run `pnpm --filter @wsagency/wseffect-themes typecheck && pnpm --filter @wsagency/wseffect-themes lint && pnpm --filter @wsagency/wseffect-themes build`; expected all exit 0.
- [ ] Step 4: Commit `feat: add virtualized data table`.

#### Task 3.2: DataTable Grid navigation

**Files:** DataTable module and story/scene tests only.
**Interfaces:** Opt-in `isGrid`; focus state `{ rowId, columnId }`; roles `grid/row/columnheader/gridcell`; selection checkbox `tabindex=-1`; counts/indices include header; edge keys clamp and Tab exits.
 - [ ] Step 1: Tests `clamps arrow movement at boundaries`, `home end and ctrl home end target specified cell`, `active identity survives sort and filter`, `removed row picks nearest surviving ordinal`, `restores focus after virtual row remount`, `uses VirtualList.scrollToKey before restoring focus`, and `execution-counter reuse: unrelated grid update executes 0 view functions; one changed memo arg executes exactly 1 affected view`; Scene `grid has one tabbable cell, correct counts/indices, and a labelled non-tabbable selection checkbox toggled by Space`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataTable.grid.story.test.ts test/dataTable.grid.scene.test.ts`; expected fail.
- [ ] Step 1 (reuse): Add `test/dataTable.grid.reuse.test.ts` › `unrelated update executes 0 grid views; changed memo arg executes exactly 1 affected view`; run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/dataTable.grid.reuse.test.ts`; assert per-view counters exactly.
- [ ] Step 2: Implement Model transitions and post-mount focus restoration; do not use `aria-activedescendant`.
- [ ] Step 3: Same command; expected 2 files pass with all key paths, roles, exact counts/indices, Space selection and focus recovery asserted.
- [ ] Step 4: Commit `feat: add data table grid navigation`.

### Lane 4A — Gallery, e2e, consumer, size and perf integration (integrator-owned shared files)

#### Task 4A.1: Lazy Gallery page families and Scenes

**Files:** New routes/pages and their page-local `package.json`; shared `routes.ts`, `pages.gen.ts`, `primaryPages.ts`, `shell.ts/.css` edited by integrator only; `basePages.test.ts`, `interactivePages.test.ts`.
**Interfaces:** use frozen public subpaths; page families exactly `accessibility`, `layout-extra`, `avatar`, `feedback`, `typography-extra`, `icon-button`, `links`, `scroll-area`, `data`, `forms-extra`, `select`, `range-slider`, `tab-nav`, `alert-dialog`, `popover`, `hover-card`, `tooltip`, `context-menu`, `theme-panel`, `data-table`. Keep existing primary and perf memberships unchanged.
- [ ] CSS subpath imports in Task 4A.1 are gated on completion of Task 4A.2's CSS manifest/build-target integration; only the integrator may perform that integration.
- [ ] Step 1: Add `routes.test.ts` › `every new component is on a new lazy non-primary route`, `shell.scene.test.ts` › `new links stay within BUD-1 shell budget`, and page Scenes for default/modifier/labelled keyboard paths; run `pnpm --filter @wsagency/wseffect-gallery test`; expected fail for missing routes.
- [ ] Step 2: Add route/page components with matching CSS subpath imported inside page module, not shell; expose 1k Select and 10k-row DataTable fixtures only on their new pages; regenerate `pages.gen.ts` with `pnpm build && node packages/app/dist/codegen/bin.js apps/gallery`; expected writer prints a path ending in `apps/gallery/src/pages.gen.ts`.
- [ ] Step 3: Run `node packages/app/dist/codegen/bin.js --check apps/gallery && pnpm --filter @wsagency/wseffect-gallery test && pnpm --filter @wsagency/wseffect-gallery typecheck`; expected codegen check and route/page tests pass, typecheck exits 0.
- [ ] Step 4: Commit `feat: add lazy sp2 gallery pages`.

#### Task 4A.2: Consumer manifest, packaging and CSS coverage

**Files:** `README.md` (root package list), `apps/gallery/package.json`, `packages/themes/package.json`, `packages/themes/CHANGELOG.md`, `packages/primitives/CHANGELOG.md`, `tests/consumer/coverage-manifest.json`, `tests/consumer/fixtures/sp2/*`, `tests/consumer/run.ts`, `packages/themes/test/{props,distribution}.test.ts`; `packages/themes/src/css-components/index.css`, `scripts/build-css.js` fixed target list (sole owner; complete before 4A.1 imports CSS); shared-file changes by integrator only.
**Interfaces:** coverage manifest enumerates every SP2 public subpath, export and CSS file; `props.test.ts` verifies each of the 43 new component API schemas/Props preserve pinned literals/defaults/responsive fields; packed Themes includes `UPSTREAM.md` and all applicable notices; packed primitive view exports include brand import; B and B+H closure compare uses DEP-1. Every new CSS subpath must appear in packed output, asserted from the packed package build.
- [ ] Step 1: Add `tests/consumer/check-sp2.test.ts` cases `covers every SP2 export and CSS subpath`, `packed build emits every new CSS subpath`, `packed package includes provenance and notices`, `one imported primitive does not import unrelated subpaths`, `B+H adds no disallowed Effect modules`; add `props.test.ts` case `every new public component schema matches its frozen signature`; run `node --test tests/consumer/check-sp2.test.ts` and `pnpm --filter @wsagency/wseffect-themes exec vitest run test/props.test.ts`; expected both fail until exports/schemas exist.
- [ ] Step 2: Implement manifest and fixtures from frozen public exports; add the full component-schema matrix in `props.test.ts`; assert each CSS subpath is emitted by the packed build; add/update package changelogs and root README package list; apply all lane CSS additions to the manifest and fixed build target list in this single task before Task 4A.1 imports CSS subpaths; update package files only through integrator.
- [ ] Step 3: Run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/props.test.ts test/distribution.test.ts`; expected all 43 component schema/signature cases and packed provenance checks pass. Run `pnpm test:consumer`; expected coverage, branding, tree shaking, packed types and DEP-1 checks pass.
- [ ] Step 4: Commit `test: cover sp2 packed consumer surface`.


#### Task 4A.3: Browser accessibility, Theme portal and ContextMenu/Grid e2e

**Files:** `e2e/sp2/{theme-portal,context-menu,data-table}.spec.ts`, gallery production routes/tests; integrator-owned shared browser config only if required.
**Interfaces:** portal checks existing root host and computed non-default `--accent-9`/`--radius-3`; ContextMenu tests pointer-coordinate placement, keyboard source anchoring, 600ms touch and cancellation, Escape/outside/selection focus return to exact source, and source removal while open without stale focus; Grid tests edge clamping, Home/End, sort/filter identity and nearest-row fallback, virtualized focus restoration, 10k scroll/LRU bound; every route has zero axe 4.11.0 violations in Chromium/Firefox/WebKit.
- [ ] Step 1: Add tests `reuses root portal and inherits root tokens`, `context menu invocation/dismissal/source removal matrix`, `grid edge keys, sort/filter recovery and 10k LRU`; run `pnpm exec playwright test e2e/sp2/theme-portal.spec.ts e2e/sp2/context-menu.spec.ts e2e/sp2/data-table.spec.ts`; expected failures against incomplete routes/behavior.
- [ ] Step 2: Implement only test setup/page fixtures as needed; do not weaken assertions or suppress axe violations.
- [ ] Step 3: Build first with `pnpm --filter @wsagency/wseffect-gallery build`; run `pnpm exec playwright test e2e/sp2/theme-portal.spec.ts e2e/sp2/context-menu.spec.ts e2e/sp2/data-table.spec.ts --project=chromium --project=firefox --project=webkit`; expected all tests pass on three engines and each route has zero violations.
- [ ] Step 4: Commit `test: cover sp2 browser accessibility and focus`.

#### Task 4A.4: Size and performance gates

**Files:** integrator-only `bench/baselines/size.json`, `bench/baselines/perf.json`, `tools/gates/size.ts`, `tools/gates/size.test.ts`, `tools/gates/perf.ts`, `tools/gates/perf.test.ts`, `apps/gallery/src/pages/perfPages.scene.test.ts`, `docs/superpowers/plans/ISSUES.md`.
**Interfaces:** preserve old page memberships; new pages are added to `bench/baselines/size.json`. Pin approved wseffect main commit `200a6a5` (spec approval; this commit contains `bench/baselines/size.json`), read its immutable size artifact directly with `git show 200a6a5:<artifact-path>`, and compare entry + framework Brotli-q11 bytes with a hard ≤1,024 B delta. This gate must not read its cap from mutable `size.json`, so baseline edits cannot bypass the check. Tests pin the artifact path/hash. Proposed 4× CPU Event Timing medians: Select open/choose 1k ≤50 ms, Tooltip open/close ≤30 ms, Slider drag ≤30 ms, DataTable update/filter/sort/select 10k ≤50 ms; no measurements are claimed. CI perf acceptance remains blocked until stable host and `perf-noise.json` floors exist.
- [ ] Step 1: Add gate unit tests `sp2 scenarios wire exact page operation pairs`, `shell cap is measured in Brotli-q11`, `entry plus framework delta is at most 1,024 B vs the pinned approved base artifact`, and `updating size.json cannot bypass the base-artifact cap`; run `node --test tools/gates/perf.test.ts tools/gates/size.test.ts`; expected fail for absent scenarios/routes and cap enforcement.
- [ ] Step 2: Wire scenarios and measured size baselines only after pages build; pin the immutable base artifact via `git show 200a6a5:<artifact-path>` at approved wseffect main commit `200a6a5`, compare entry + framework Brotli-q11 byte counts, reject any delta >1,024 B regardless of mutable `size.json` changes; add no new perf job or invented runner/noise data; mark CI perf acceptance blocked until stable host and `perf-noise.json` floors exist.
- [ ] Step 3: Run `pnpm gate:size`; expected all new page chunks/styles present and entry+framework delta ≤1,024 B against the pinned artifact. Run `pnpm gate:perf` only when provisioned host/noise floors exist; expected four candidate scenarios reported against ceilings. Run local repository ABAB/A-A only as directional evidence, never gate result.
- [ ] Step 4: Commit `perf: wire sp2 size and performance scenarios`.

#### Task 4A.5: Foldkit upstream proposal drafts (final integrator task)

**Files:** `docs/upstream/{checkbox-group-composition,menu-context-invocation,multi-thumb-slider,tooltip-group-skip-delay,listbox-selected-item-anchor}.md`, `docs/superpowers/plans/ISSUES.md`, `scripts/upstream-proposals.test.ts`.
**Interfaces:** Each draft documents the problem, a minimal API sketch in Foldkit style, and tests needed for one gap: CheckboxGroup composition, Menu context invocation, multi-thumb Slider, TooltipGroup skip-delay coordination, or Listbox configurable selected-item anchor. Update ISSUES.md to record that actual PRs are opened later, only after maintainer engagement with pending PRs #1699, #1700, #1703 and #1711.
- [ ] Step 1: Add `scripts/upstream-proposals.test.ts` cases `all five drafts document problem API sketch and tests` and `ISSUES defers PRs until maintainer engagement`; run `node --test scripts/upstream-proposals.test.ts`; expected fail until drafts and amendment exist.
- [ ] Step 2: Write the five concise drafts and ISSUES.md amendment; do not open actual upstream PRs.
- [ ] Step 3: Run `node --test scripts/upstream-proposals.test.ts`; expected both tests pass and all five named drafts are present.
- [ ] Step 4: Commit `docs: draft Foldkit upstream proposals`.


### Lane 4B — Radix2Solid visual extension

#### Task 4B.1: Matched Solid pages and frozen screenshot fixtures

**Files:** `bench/radix2solid/src/pages/*.tsx`, `src/App.tsx`, `src/types.ts`, `src/fixtures/BenchFixtures.tsx`, bench package only.
**Interfaces:** Matching Gallery state and props per new page, packed R2S packages from pin `383676172abb84b4a1d2e54a087d290437ee8848`; exact same semantic states, data and component-family grouping; preserve `library-source.json` content hashes/pin.
 - [ ] Step 1: Add `scripts/app-contract.test.ts` cases `every new Gallery capture has a paired Solid route` and `bench source pin/hash is unchanged`; run `node --test scripts/app-contract.test.ts`; expected fail for unmatched routes.
- [ ] Step 2: Add Solid pages for each component family/page, reusing packed fixtures and no worktree-only source.
- [ ] Step 3: Same command; expected both tests pass; `pnpm --dir bench/radix2solid run build` exits 0.
- [ ] Step 4: Commit `bench: add sp2 radix2solid comparison pages`.

#### Task 4B.2: Capture matrix and paired visual comparison

**Files:** `bench/radix2solid/package.json` (`capture:sp2` script), `scripts/{capture-sp2,compare-sp2}.ts`, `scripts/compare-sp2.test.ts`, and deterministic screenshot artifacts only; no Gallery shared files.
**Interfaces:** pin Chromium revision, 1280×800, device scale 1, fonts, light/dark root Theme, reduced motion, fixed data and animation clock; capture default plus every declared variant at `size=2` where available, light and dark. Interactive states are Select/Popover/Dialog open, HoverCard/Tooltip hover, Button/Radio/Slider/Tab keyboard focus. Pair identical semantic props/state; exact CSS/DOM match is expected, with 1px edge tolerance, ≤0.5% changed pixels and no connected differing region >0.25% capture. BENCH-2 remains reporting-only.
 - [ ] Step 1: Add `scripts/compare-sp2.test.ts` › `accepts only documented edge tolerance`, `rejects >0.5 percent changed pixels`, `rejects connected region >0.25 percent`, `requires matching semantic pair`; run `node --test scripts/compare-sp2.test.ts`; expected fail.
- [ ] Step 2: Implement deterministic capture and paired artifact metadata; preserve per-pair numerical metrics and source hashes.
- [ ] Step 3: Same command; expected 4 tests pass; run `pnpm --dir bench/radix2solid run capture:sp2`; expected deterministic captures for all new families and a paired report, not a CI gate.
- [ ] Step 4: Commit `bench: add deterministic sp2 visual comparisons`.

## Requirement → Task Coverage

| Spec IDs | Owning task(s) |
|---|---|
| PRI-1..3, REPO-1/2, PRIM-1..8, DEP-1, APP-23, package pins, frozen APIs | 0, 1.1–1.3, 4A.2 |
| THEME-1..8, ARIA-1..4 | 2A.1–2A.5, 2B.1–2B.3, 2C.1–2C.6, 4A.1, 4A.3 |
| DT-1..6 | 3.1, 3.2, 4A.1, 4A.3, 4A.4 |
| BUD-1..6 | 4A.1, 4A.2, 4A.4, 4B.1, 4B.2 |
| GATE-P4 named execution-counter reuse (`unrelated update → 0 re-executions; changed memo arg → exactly 1 per affected view`) | Every component task 1.1–1.3, 2A.1–2A.5, 2B.1–2B.3, 2C.1–2C.6, 3.1–3.2; each task's Step 1 test list includes the named per-view-counter assertion; a shared test helper is allowed only if an existing foundation helper is cited in that task. |
| SP2-GALLERY-1/2 | 4A.1, 4A.3, 4A.4 |
| UP-PR-1 | local primitives (1.1–1.3); proposal drafts, maintainer dependency and ISSUES amendment (4A.5). No actual upstream PR until maintainer engages with #1699/#1700/#1703/#1711. |
| SP2-LIC-1/2 | 0 (exact dependency manifest); 2C.6 and 4A.2 (CSS provenance, notices and package contents) |
| OUT-1..3 | All tasks constrained by Global Constraints; 0 enforces no other local primitives/Foldkit patches, 2C.6 excludes icons/charts and Meter, 3.1/3.2 exclude server-query/pagination/editing. |
| Risk table §10, self-review §12 | 1.3, 2C.6, 3.1–3.2, 4A.2–4A.4, 4B.2 |

## Self-Review

- **Spec coverage:** inventory is fully assigned: 42 Themes view/module APIs + DataTable, CSS-only Reset; local set is exactly four submodels, CheckboxGroup and SelectPosition. All requirement families above map to tasks. Existing routes and component sets are protected explicitly.
- **Step scan:** each task has named failing tests, a runnable focused command, minimal implementation boundary, successful expected result and one commit message. Browser commands use configured `chromium`, `firefox`, `webkit` Playwright projects. Shared integrations remain integrator-owned.
- **Type consistency:** public static modules share the common `Props/view` contract; compound namespaces list explicit parts; local type aliases in every lane resolve through Task 0; DataTable identity never changes to array indices; ContextMenu checks source token before focus. Task 0 compiles frozen signatures against actual `Update.Return`/`Update.ReturnWithOutMessage`, Mount and HtmlBuilder declarations.
- **Review Focus:** all five failure classes have tests in owning tasks: stale source identity (1.3/4A.3), virtual focus loss (3.2/4A.3), absent/nested Theme portal (4A.3), disabled option navigation (1.2/1.3), and retained/stale 10k row data (3.1).
- **Proportion and prerequisites:** plan resolves R2S props from pinned `.d.ts`/`.props.d.ts` without reproducing implementation bodies. Perf host/noise prerequisites remain honest blocked gates; proposed values are not presented as measured. Upstream PR work follows local delivery.
- **Rulings:** Task 0 freezes component props exactly from the pinned R2S declaration surface; interfaces are not widened by convenience. ThemePanel is controlled (`isOpen`/`settings`) and emits one `SettingsChanged` Message so it adds no local state. ContextMenu, item-aligned Select, and multi-thumb Slider are local only where FK 0.168.0 lacks the required public behavior. Grid is opt-in DOM roving focus. `Reset` is CSS-only; DataTable is the necessary single-component feature task, split into independently testable native and Grid deliverables. 4A shared files are integrator-owned; L4B never edits them.

## Director rulings

- Ruling: DataTable Model owns `filter`, `sort`, derived `orderedRowIds`, `activeCell`, and virtual range; parent owns rows and selectedRowIds, supplies them through Config, folds in RowsChanged when rows change, and sends external FilterChanged/SortChanged through fold; OutMessage carries only SelectionChanged and optional FocusCell — why — separates table UI state from parent data while preserving a single direction for input changes and selection output — cost if wrong — duplicated ownership creates stale sorting/filtering or selection divergence.
- Ruling: The per-instance LRU row-view cache is render-layer state keyed by DataTable id, removed from Model and disposed by element-lifetime Mount.MountAction cleanup; bound tests use view counters or a test-only accessor — why — page Models must remain Schema-encodable through the APP-8 codec — cost if wrong — unencodable page state or cache leaks/cross-instance contamination.
- Ruling: Stateful RangeSlider, TooltipGroup, ContextMenu local state, Select adapter, and DataTable export Schema-backed Model and Message values/types; Models prefer ReadonlyArray/plain structs and allow Map/Set only with Schema support and APP-8 round-trip tests; B vs B+H is the bundle arbiter — why — state must embed in Schema-defined page Models without violating DEP-1 — cost if wrong — page-model encoding failure or an unapproved Effect-module bundle regression.
- Ruling: Each task runs focused tests plus its package typecheck/lint/build, each lane runs `pnpm check` once before hand-off, and the integrator runs `pnpm check`, `pnpm e2e`, `pnpm test:consumer`, and size gate after every merge wave — why — failures should be caught at task/lane boundaries and integrations revalidated incrementally — cost if wrong — defects or regressions accumulate across lanes and merge waves.
- Ruling: Task 0 creates `packages/primitives/README.md` with a LIC-3 License paragraph and `CHANGELOG.md`; Task 4A.2 updates the root README package list — why — new package and public-package inventory must match repository licensing/documentation conventions — cost if wrong — missing attribution or users cannot discover the new package.
- Ruling: Task 4A.5 writes five Foldkit-style proposal drafts and amends ISSUES.md; actual PRs wait for maintainer engagement on #1699, #1700, #1703, and #1711 — why — proposals should be ready without distracting from local delivery or pre-empting pending upstream discussion — cost if wrong — redundant or premature upstream requests damage maintainer coordination.
- Ruling: L2C is fast-worker eligible but each task lists exact pinned R2S input files and copies the module-initialized class-table pattern from `packages/themes/src/components/button.ts` — why — implementation scope and existing conventions must be unambiguous for a focused worker — cost if wrong — guessed source scope or per-render class-map work causes parity drift and avoidable runtime cost.
- Ruling: frozen 0.168.0 view/API signatures use `HtmlBuilder<Message>`, `ReadonlyArray<Html | string>`, actual `Update.Return`/`ReturnWithOutMessage`; Listbox Model/Message and Menu Model/Message are non-generic while their typed `create` bundles bind generic values — why — package declarations dictate the public types — cost if wrong — APIs fail typecheck and themed models drift from the exact upstream contracts.
- Ruling: DataTable embeds and folds the full Schema-backed `VirtualList.Model` and `VirtualList.Message`/OutMessage per the foundation gallery pattern; scroll/resize/programmatic scroll and Grid focus restoration are tested, with same-ID row-data invalidation in the per-id render LRU — why — the child owns virtualization lifecycle and measurements while parent owns row records — cost if wrong — broken scroll/resize, focus recovery, or stale memoized cells.
- Ruling: CSS lanes add their own `src/css-components/<component>.css` files and report them; Task 4A.2 alone edits `css-components/index.css` and `scripts/build-css.js` fixed target list before 4A.1 imports, and packed output asserts every CSS subpath — why — one manifest owner prevents colliding integration edits and missing package outputs — cost if wrong — race-prone manifest and silently omitted CSS exports.
- Ruling: BUD-1 `tools/gates/size.ts` and `.test.ts` belong to Task 4A.4 and compare entry+framework Brotli-q11 bytes against immutable approved wseffect main commit `200a6a5` (spec approval; contains `bench/baselines/size.json`), hard failing above +1,024 B independent of mutable size baselines — why — page-size baselines cannot grant shell-budget exceptions — cost if wrong — an editable baseline can mask shell growth.
- Ruling: every component task's named execution-counter test proves unrelated updates re-execute zero memoized views and one changed memo argument re-executes exactly one affected view; DataTable additionally checks same-ID row-record invalidation — why — reuse correctness is required per component, not inferred from one representative example — cost if wrong — hidden work or stale view reuse escapes broad coverage.
- Ruling: `SelectConfig.selectedValue` is `Option.Option<Value>` to represent no selection, matching Effect's Option contract and the optional selected value expected by Listbox; cost if wrong — empty selections cannot be represented and consumers must fabricate a value.
- Ruling: `ContextMenuModel` is derived from `ContextMenuModelSchema`, a `Schema.Struct` extension of `Menu.Model.fields` with invocation and long-press version fields; do not express the Schema-backed model as a TypeScript intersection — cost if wrong — the model may not encode/decode through the page-model codec.
- Ruling: bench/radix2solid `scripts/*.test.ts` use `node --test`, not Vitest — why — use the package's existing test runner — cost if wrong — the planned contract/visual tests cannot run.

# wseffect Themes and primitives (sub-project #2): design specification

Status: **Draft for director review.** This spec defines the implementation contract; implementation planning follows director approval. No behavior outside this scope is authorized. Evidence and timings below support decisions and are not production performance claims.

## 1. Goal and priorities

Complete the Radix Themes-compatible component surface in `@wsagency/wseffect-themes`, provide the missing headless Foldkit-style submodels in `@wsagency/wseffect-primitives`, and deliver a performant, accessible DataTable. The foundation package already supplies Theme, Box, Flex, Grid, Text, Heading, Button, Card, stateless TextField, and stateful Dialog, DropdownMenu, Tabs [FND:101-119,407-458].

The priorities remain functional correctness (PRI-1), runtime speed (PRI-2), then bundle size within existing budgets (PRI-3) [FND:21-27]. Components stay Model-driven; primitives do not create competing view state. Foldkit remains an unmodified exact dependency; required generic improvements are proposed upstream rather than patched locally [FND:56-99].

## 2. Evidence base and citations

| Key | Source | Use |
|---|---|---|
| FND | `docs/superpowers/specs/2026-10-19-wseffect-foundation-design.md` | Priorities, REPO-1/2, TH-5..15, PERF, gates, tests and exclusions. |
| ISS | `docs/superpowers/plans/ISSUES.md` | Applied amendments, especially APP-23 and DEP-1; SP2b Effect `Result`, Mount and Subscription deviations [ISS:123-137,171-205]. |
| APP | `docs/superpowers/specs/2026-10-20-wseffect-sp2-app-capabilities-design.md` | Stable requirements, test and consumer-spec format. |
| R2S | `radix2solid` public commit `383676172abb84b4a1d2e54a087d290437ee8848`; `packages/themes/src/components/index.ts`, `*.props.ts`, `*.css`, `*_internal/*.css`, styles and component source. | Authoritative Themes API and CSS inventory; public export list lines 1-58. |
| FK0168 | Installed `@foldkit/ui` 0.168.0 distribution resolved at the pnpm-store path identified in §2; `dist/*.d.ts` and `dist/*.js`. | Authoritative release declarations and runtime implementation; all Foldkit mappings below are pinned to this installed artifact. |
| WAI | WAI-ARIA Authoring Practices Guide (APG), pattern pages linked by component inventory. | Keyboard, focus, role and state expectations. |

Citations `[FND:x-y]`, `[ISS:x-y]`, `[R2S:path]`, `[FK0168:path:lines]` identify sources; R2S paths are at the pinned commit. `FK0168` is the installed `@foldkit/ui` 0.168.0 package resolved at `/home/klukacin/projects/wseffect/node_modules/.pnpm/@foldkit+ui@0.168.0_effect@4.0.5_foldkit@0.168.0_@effect+platform-browser@4.0.5_effect@4.0.5__effect@4.0.5_/node_modules/@foldkit/ui` (version confirmed by its package.json:2). All cited Foldkit declarations and implementations are this package's `dist/*.d.ts` and `dist/*.js`, not source worktrees. Foundation CSS follows TH-1's copy-and-notice rule and CSS import closure [FND:409-417; ISS:9-17].

## 3. Component and helper inventory

### 3.1 Status definitions

`Existing` means foundation-provided. `P` is a pure themed view; `FK:X` means direct reuse of that public `@foldkit/ui` submodel/view; `Local:X` is implemented in `@wsagency/wseffect-primitives`. CSS names refer to R2S component stylesheet and transitive imports. Prop modifiers are those in the pinned R2S `*.props.ts` schema; retain exact literals/defaults/responsive support rather than broadening schemas. Static component rows are grouped to keep the table legible; each interactive component has an individual row and exact behavior decision below [R2S: `packages/themes/src/components/*.props.ts`, `components/index.ts:1-58`].

| Component | Status; basis | APG / interaction | CSS source | New non-primary Gallery page |
|---|---|---|---|---|
| Theme, Box, Flex, Grid, Text, Heading, Button, Card, TextField, Dialog, DropdownMenu, Tabs | Existing foundation | Foundation contract TH-5..14 | Existing | Existing routes unchanged |
| AccessibleIcon, VisuallyHidden | New; P | Name / hidden content | none | accessibility |
| AspectRatio, Container, Inset, Section | New; P | — | aspect-ratio, container, inset, section | layout-extra |
| Avatar | New; P | image alternative semantics | avatar | avatar |
| Badge, Callout | New; P compound parts | native/status content; no implicit live region | badge, callout, shared | feedback |
| Blockquote, Quote, Em, Strong, Code, Kbd | New; P | native semantic elements | blockquote, quote, em, strong, code, kbd | typography-extra |
| IconButton | New; `FK:button` attributes | Button; accessible name required | icon-button, base-button | icon-button |
| Link | New; P | Native link | link | links |
| Progress | New; `FK:progress` | Progressbar [FK0168:dist/progress/index.d.ts:1-23; dist/progress/index.js:8-67] | progress | feedback |
| Separator | New; P | Separator | separator | layout-extra |
| Skeleton, Spinner | New; P | Status only when caller labels it | skeleton, spinner | feedback |
| ScrollArea | New; P + native overflow | Native scroll region; keyboard/browser scroll semantics | scroll-area + shared | scroll-area |
| Reset | CSS-only global reset; no view export | — | reset.css (global) | styles only; no page |
| Table | New; P compound parts | Native table semantics | table + scroll-area | data |
| DataList | New; P | Native description list | data-list | data |
| Radio | New; `FK:radioGroup` item attributes/composition | Radio Group item, native roving focus | radio, base-radio | forms-extra |
| RadioGroup | New; `FK:radioGroup` | roving tabindex, horizontal/vertical arrow orientation | radio-group + base-radio | forms-extra |
| RadioCards | New; `FK:radioGroup` | same Radio Group semantics | radio-cards + radio-group | forms-extra |
| Checkbox | New; `FK:checkbox.view` controlled state, including `isIndeterminate` | Checkbox | checkbox | forms-extra |
| CheckboxGroup | New; `Local:CheckboxGroup` | Checkbox Group; checked values owned by parent | checkbox-group + checkbox | forms-extra |
| CheckboxCards | New; `Local:CheckboxGroup` + checkbox view | Checkbox Group | checkbox-cards + checkbox-group | forms-extra |
| Switch | New; `FK:switch` | Switch | switch | forms-extra |
| SegmentedControl | New; `FK:radioGroup` | single-choice Radio Group, not toggle buttons | segmented-control + radio-group | forms-extra |
| TextArea | New; `FK:textarea` view | Textbox [FK0168:dist/textarea/index.d.ts:1-26; dist/textarea/index.js:6-52] | text-area + shared | forms-extra |
| Select | New; `FK:listbox` for `position="popper"`, `Local:Select` adapter for `position="item-aligned"` | single-select listbox, typeahead, groups, separators and disabled options | select + base-menu | select |
| Slider | New; `FK:slider` for one thumb + `Local:RangeSlider` for multiple | one/multi-thumb APG Slider; min/max/step, vertical orientation, PageUp/PageDown | slider | range-slider |
| TabNav | New; `FK:nav.view` | URL links with `aria-current="page"`, native tab order | tab-nav | tab-nav |
| AlertDialog | New; `FK:dialog` with `role="alertdialog"` and explicit Cancel focus selector | Alert Dialog; no outside-dismiss; initial focus on Cancel | alert-dialog + base-dialog | alert-dialog |
| Popover | New; `FK:popover` | non-modal by default; configurable modal mode | popover + base-dialog | popover |
| HoverCard | New; `FK:hoverIntent` plus `FK:anchor` | nonmodal hover/focus content; open/close delays | hover-card | hover-card |
| Tooltip | New; `FK:tooltip` plus `Local:TooltipGroup` coordination | non-focusable description; focus/hover triggers, Escape dismissal; no panel focus | tooltip | tooltip |
| ContextMenu | New; `Local:ContextMenu` using FK Menu core | Menu; pointer-position anchor, keyboard invocation, touch long-press | context-menu + base-menu | context-menu |
| ThemePanel | New; P compound demo utility | labelled form controls; root settings emitted as Messages | theme-panel | theme-panel |
| DataTable | New; `FK:virtualList` + bounded keyed memo | native table default; opt-in Grid navigation [FK0168:dist/virtualList/index.d.ts:179-192,465-475; dist/virtualList/index.js:709-773] | table + utilities | data-table |

**Explicit non-views:** R2S `Slot`/`Slottable` and `Portal` exports are not carried over: Foldkit has no `asChild`/slot-prop composition, and root Theme owns one portal host; expose no duplicate portal component. `Reset` contributes only its global CSS reset, not a callable view. R2S `Meter` is **not an export** in `components/index.ts` and is not implemented. `asChild` is excluded from every ported component: view composition uses Foldkit's Html/attribute construction, not DOM cloning/prop forwarding.

The pinned R2S index contains 58 export statements; 12 are represented by foundation core. Excluding the icon export statement (icons are SP3), and excluding Slot, Portal, and Reset-as-view, leaves **42 new Themes view/module APIs**, including ThemePanel, plus DataTable = **43 new component APIs**. Count excludes Reset CSS output; no Meter. Cross-check against the official Radix Themes component index [Radix Components](https://www.radix-ui.com/themes/docs/components): every official component family is present in R2S at the pin, including ScrollArea and Reset. ScrollArea is a component; Reset is included as global CSS only because R2S's component has no useful standalone Foldkit view. Slot and Portal are official but excluded due to Foldkit's lack of `asChild` and Theme-owned portal hosting. `ThemePanel` is an R2S-only demo utility, not on Radix's official component list. No official component is otherwise missing at this pin [R2S: `components/index.ts:1-58`].

#### Interactive API decisions (release 0.168.0 evidence)

- **Select:** `@foldkit/ui/select.view` is a stateless native `<select>` helper [FK0168:dist/select/index.d.ts:8-23; dist/select/index.js:6-25], not a popup listbox. Popper uses single-select `@foldkit/ui/listbox.create<Item, Value>()`, parent-owned value, item/disabled/search configs, grouping/heading records, separators, typeahead and active-item scroll [FK0168:dist/listbox/single.d.ts:29-36,211-212; dist/listbox/shared.d.ts:189-194,348-355,387-391; dist/listbox/single.js:6-7,52-60; dist/listbox/shared.js:162-177,425-426,493-494,558-559,625-650; dist/typeahead.js:4-14]. However, `Listbox.view` unconditionally attaches public `AnchorListbox` to `${id}-button`; no `ViewInputs` option disables it [FK0168:dist/listbox/shared.d.ts:326-338; dist/listbox/shared.js:400-410,558-559]. Therefore `position="item-aligned"` uses `Local:Select`: it owns one upstream Listbox Model and delegates messages to `Listbox.update`, but provides a custom compatible renderer without the trigger-anchor Mount and uses `SelectPosition` against the selected/active item. This is a real view/anchor gap in 0.168.0; no Foldkit bump is made.
- **Checkbox / CheckboxGroup:** `Checkbox.view` is stateless controlled, supports `isIndeterminate`, and exposes role=checkbox/aria-checked=mixed behavior [FK0168:dist/checkbox/index.d.ts:28-57; dist/checkbox/index.js:28-36,55-59]. It has no group composition API. `Local:CheckboxGroup.view` supplies group/label semantics and toggle attributes while the parent owns selected IDs and derives group indeterminate state.
- **RadioGroup / RadioCards / SegmentedControl:** `RadioGroup.create<Value>()` supplies horizontal/vertical orientation, parent-owned selected value, disabled options, roving focus and `FocusedOption`/`Selected` messages [FK0168:dist/radioGroup/index.d.ts:6-17,50-89,129-180; dist/radioGroup/index.js:15-18,44-50,76-105,141-146,171-174,207-210]. Its update handles arrow/Home/End selection and focus; use radio semantics for RadioCards and SegmentedControl, not independently toggled buttons.
- **Switch:** use stateless controlled `@foldkit/ui/switch.view`; parent supplies checked state, toggle callback, name/value, disabled/read-only state; output uses switch role and click/Space handlers [FK0168:dist/switch/index.d.ts:19-73; dist/switch/index.js:24-60,81-153].
- **Slider:** `@foldkit/ui/slider` is single-thumb, with numeric min/max/step, Horizontal/Vertical orientation, pointer drag and keyboard Step/Page/Min/Max [FK0168:dist/slider/index.d.ts:12-43,58-71,288-343; dist/slider/index.js:45-88,240-242,303-330]. `PageIncrement/Decrement` are 10 steps. Local `RangeSlider` supplies multi-thumb values; ordinary Slider reuses upstream unchanged.
- **Tooltip:** upstream Tooltip has one showDelay (default 500ms), opens on pointer hover or non-mouse focus, excludes click-induced mouse focus, dismisses on leave/blur/Escape, and does not focus its panel [FK0168:dist/tooltip/tooltip.d.ts:9-32,68-89; dist/tooltip/tooltip.js:13-42,78-85,174-190]. Its public subpath exposes no delay/skip-delay group [FK0168:dist/tooltip/public.d.ts:1-3]; `Local:TooltipGroup` coordinates one.
- **Popover:** reuse FK Popover. `InitConfig.isModal` defaults false; `ViewInputs.anchor` uses `AnchorConfig` placement, gap, offset; modal mode locks scroll/inerts other elements and restores focus [FK0168:dist/popover/index.d.ts:72-78,214-228,276-280; dist/popover/index.js:63-70,161-165,270-279]. No local primitive.
- **HoverCard:** reuse `HoverIntent.init({ openDelay, closeDelay })` (defaults 200/300ms) and Anchor. HoverIntent supplies pointer/focus engagement only, not markup, ARIA or positioning [FK0168:dist/hoverIntent/hoverIntent.d.ts:20-25,47-65; dist/hoverIntent/hoverIntent.js:22-36,128-192,274-295; dist/anchor/anchor.d.ts:16-29; dist/anchor/anchor.js:32-40,90-98].
- **ContextMenu:** Menu is anchored; init accepts id/isAnimated/isModal and exposes item/group/separator records, but no context-point or long-press invocation [FK0168:dist/menu/index.d.ts:141-148,360-432; dist/menu/index.js:101-109,420-430,459-461]. `Local:ContextMenu` owns pointer/keyboard/touch-long-press invocation and feeds a point-position anchor to one Menu Model; contextmenu is prevented only on activation, then Escape/outside/selection restores focus to source.
- **TabNav:** use stateless `@foldkit/ui/nav.view` (`items`, `toHref`, `isItemCurrent`, `toView`); it renders links with `aria-current="page"` and native Tab/Enter, not roving tabindex [FK0168:dist/nav/index.d.ts:25-48; dist/nav/index.js:6-18,33-64].
- **AlertDialog:** reuse Dialog's submodel and set `role="alertdialog"` on its `dialog` bundle; configure `focusSelector` for Cancel. The view permits consumer-supplied dialog attributes; omit the backdrop click bundle to prevent outside-press dismissal. Native modal lifecycle handles focus and cancel/Escape [FK0168:dist/dialog/index.d.ts:76-89,238-282; dist/dialog/index.js:49-70,402-405]. No local primitive.

#### Compound APIs and composition

Foldkit has no JSX parts/context and no `asChild`; preserve R2S compound names as namespaces of pure functions rather than emulate Solid context:

- Stateful compounds expose **one submodel plus typed item/group config records**. Example:
  - `Select.Config<Value extends string> = { id: string; selectedValue: Option<Value>; items: ReadonlyArray<Select.Item<Value> | Select.Group<Value> | Select.Separator>; position: 'popper' | 'item-aligned'; isModal: false }`.
  - `Select.Item<Value> = { value: Value; textValue: string; isDisabled: boolean; content: Html }`; `Group = { id: string; label: Html; items: ReadonlyArray<Select.Item<Value> | Select.Separator> }`; `Separator = { kind: 'separator'; id: string }`.
  - One upstream `Listbox.create<Item, Value>()` Model is used. For `position='popper'`, use upstream `Listbox.view` with trigger placement. For `position='item-aligned'`, `Local:Select` delegates to upstream `Listbox.update` but supplies its own renderer and `SelectPosition` Mount against the selected/active item, because `Listbox.view` always attaches trigger-anchor Mount; this avoids competing mounts and retains one selection/interaction state.
  - `ContextMenu.Config<Value> = { id: string; items: ReadonlyArray<ContextMenu.Item<Value> | ContextMenu.Group<Value> | ContextMenu.Separator>; longPressMs: number; toItem: (item: Value) => Html }`; `Item = { value: Value; textValue: string; isDisabled: boolean; content: Html }`. One local ContextMenu submodel owns invocation plus Menu model delegation; items map to upstream `Menu.ItemConfig` and group heading records.
- Static compounds expose `X.Part.view(props, children, h)` functions, e.g. `Table.Root.view`, `Table.Header.view`, `Table.Body.view`, `Table.Row.view`, `Table.Cell.view`, `Table.ColumnHeaderCell.view`, `Table.RowHeaderCell.view`, and `Callout.Root.view`, `Callout.Icon.view`, `Callout.Text.view`. Callout size is explicit on Text props (no context).
- Preserve R2S public part names. Convert implicit Solid context into explicit part props/config and derive ARIA IDs from required stable IDs; children are `Html`. No composition prop clones or rewrites child DOM.

**Local primitive set: four submodels, one stateless group view and one Mount helper.** Submodels: `Select` (item-aligned adapter), `ContextMenu`, `RangeSlider`, `TooltipGroup`; stateless helper: `CheckboxGroup.view`; Mount helper: `SelectPosition`. Gaps are explicit: Listbox's public view unconditionally anchors to its trigger; Menu lacks context-point/long-press invocation; Slider is single-thumb; Tooltip lacks skip-delay provider; Checkbox has no group composition API [FK0168:dist/listbox/shared.d.ts:326-338; dist/listbox/shared.js:400-410,558-559]. No local Radio, basic popper Select behavior, Popover, HoverCard, TabNav, AlertDialog, or basic Tooltip.

UP-PR-1: after local delivery, submit upstream Foldkit PRs for generic CheckboxGroup composition, Menu context invocation, multi-thumb Slider, TooltipGroup coordination, and Listbox configurable selected-item anchor. These are reusable generic interaction/positioning gaps absent from public APIs. Do not delay wseffect delivery; retain local behavior if upstream declines. Radix-specific CSS/props remain local Themes implementation.

`CheckboxGroup.view` is a stateless controlled group; the parent owns selected IDs, `viewInputs` supplies option records/disabled state and it emits typed toggle messages through caller callbacks. `ContextMenu` is one local submodel whose model combines a Menu Model and invocation source/point/timer; `update` delegates Menu messages to `Menu.update`; item/group/separator records map to upstream Menu `ItemConfig`/`GroupHeading`. Right-click opens at pointer coordinates; keyboard ContextMenu/Shift+F10 opens at trigger; touch long-press defaults to 600ms and cancels on release, pointercancel or movement >8px. `RangeSlider` stores active-thumb/drag interaction only; parent owns ordered values; stable thumb IDs have per-thumb min/max/step; keyboard arrows step, PageUp/PageDown change 10 steps, Home/End go to bounds; clamp each thumb between neighbors, Escape restores pre-drag values. `TooltipGroup` owns `openDelay=700ms`, `skipDelay=300ms`, and expiry version; first hover waits openDelay, subsequent tooltip inside skip window opens immediately, and keyboard focus always opens immediately; each Tooltip stays upstream and receives effective delay through `reflectShowDelay`. `SelectPosition` is a Mount used only by Local:Select's item-aligned renderer to position the panel against the selected/active item. No local model duplicates parent selection/value. No Foldkit version bump is in scope; submit generic behavior improvements upstream after local delivery.



### 3.3 Accessibility and behavior contract

- **ARIA-1 APG behavior.** Primitive contracts follow APG patterns for Dialog, Menu, Tabs, Combobox/Listbox, Checkbox, Radio Group, Switch, Slider, Tooltip, Disclosure, and Grid. Tests assert role, accessible name, state, relationships and keyboard behavior, not merely snapshot markup.
- **ARIA-2 keyboard.** Preserve browser-native input/button semantics; composites implement the APG key map: Tab sequence, arrow movement, Home/End where pattern requires, Enter/Space activation, Escape dismissal, typeahead where options are textual, and focus restoration after overlay dismissal. Disabled/hidden items are skipped according to APG. No custom keyboard layer on statics.
- **ARIA-3 focus/dismissal.** Dialog is modal with focus containment, Escape/close behavior and restoration; nonmodal popovers do not steal modal focus; menus close on selection/Escape/outside press and restore invoking focus. Tooltip opens on focus/hover, closes on blur/pointer leave/Escape and does not receive focus. User interaction state remains in the primitive Model.
- **ARIA-4 placement/portal.** Root Theme owns a portal host. Portal-based overlays render into that host, inherit root Theme attributes and keep IDs/relationships intact. Floating UI computes collision-aware placement using viewport/scroll/resize updates and cleans listeners on close/unmount; do not hand-roll geometry. Match installed release positioning behavior and dependency [FK0168:dist/menu/index.js:420-430; dist/popover/index.js:270-279; dist/anchor/anchor.js:32-40,90-98].
- **UP-PR-1 Upstream-first.** If a requirement is a generic accessible headless behavior, submit an upstream Foldkit PR when the existing API cannot express it and the contract is broadly reusable. Do not block a local implementation on upstream acceptance; local primitives use Foldkit APIs without patching or vendoring. No PR is appropriate for Radix-specific class names, styling, API parity, DataTable, Theme portal host policy, or wseffect packaging.

## 4. Primitive package contract

- **PRIM-1 Package.** Create `@wsagency/wseffect-primitives` with REPO-1 manifest shape and `"sideEffects": false`; ESM named subpath exports, exact Foldkit pins and Effect peer ranges are from REPO-1 [FND:151-162]. Build library modules through the Foldkit view-identity transform; packed-consumer tests assert exported view modules import `foldkit/brand` (REPO-2).
- **PRIM-2 View identity.** Any exported view passed to Foldkit as a view is branded at build time. Keep view identity at the library boundary; consumers do not manually brand and primitive modules do not depend on app internals.
- **PRIM-3 Foldkit submodel shape.** A stateful primitive subpath exports `Model`, `Message`, `OutMessage`, `init`, `update`, and `view`. The themed wrapper configures the headless `view` via `toView` (or the upstream equivalent), never adds wrapper state or changes the primitive schemas. Stateless primitives expose pure view functions and schemas.
- **PRIM-4 Fold/embed.** Stateful themed components expose `fold(config)` built on `Update.foldChild` and `embed(h, config)` built on `h.submodel`, matching TH-10 exactly [FND:432-440]. No bespoke parent update machinery.
- **PRIM-5 Commands and effects.** Browser work in Commands uses `Effect` and has error channel `never`; ordinary failures become declared Messages, not defects or thrown view errors. Commands must use `Mount.MountAction<M>` for element-lifetime DOM work and typed Mount cleanup. Do not use deprecated/incorrect `Mount.Mount<M>` signatures [ISS:198-204].
- **PRIM-6 Effect imports (DEP-1).** When schema decoding is needed import `SchemaParser.decodeUnknownExit`, never runtime `Schema` from `effect` root. Do not add Effect modules outside the existing framework closure; no primitive exception is granted. The gate measures packed consumer B vs B+H per DEP-1, not a Gallery historical sourcemap [APP:94; ISS:176-205].
- **PRIM-7 Subscription types.** If a helper exposes Foldkit Subscription, use `Subscription.Subscription<unknown, M, Record<string, never>>`; public results use Effect 4.0.5 `Result.Result`, not unavailable `Either` [ISS:198-204].
- **PRIM-8 Local surface.** Export four local submodels (`Select`, `ContextMenu`, `RangeSlider`, `TooltipGroup`), the stateless `CheckboxGroup.view`, and the `SelectPosition` Mount helper; no other local interaction primitive is in scope. Package is headless and owns no Radix CSS. Select's Listbox adapter and ContextMenu model composition are fixed in §3.2.

## 5. Themes API rules

- **THEME-1 Ported API.** Port the pinned R2S component names, semantic defaults, element structure, props and CSS classes. Preserve schema literal domains and `Responsive<T>` from TH-7. No re-export shim or local aliases to different component names [FND:427-429].
- **THEME-2 Lookup tables.** Enum props map through module-initialized lookup tables derived from Schema literal values. Avoid per-render class concatenation and avoid per-instance computed closures; emit only attributes selected by existing CSS [FND:425-426].
- **THEME-3 View purity.** Stateless components have no per-instance Model/state. Their API is `X.view(props, children, h)` with Effect Schema-derived Props, primitive/responsive values and Html children. Caller may memoize them with primitive arguments through `createLazy` [FND:421-425].
- **THEME-4 Stateful composition.** Stateful components reuse `@foldkit/ui` submodels; Model, Message and OutMessage are the upstream types, re-exported unchanged. Use `toView`, props/class config and `fold`/`embed`; no wrapper state [FND:432-440].
- **THEME-5 ARIA ownership.** ARIA roles, names, keyboard behavior and state come from the headless primitive; themed view supplies visual classes only. Keep structural upstream styles and focus/forced-colors behavior [FND:436-437,454].
- **THEME-6 CSS completeness.** Include transitive CSS imports and internal dependencies, preserve relative paths and notices, run existing CSS build pipeline. CSS output imports remain lazy with page chunks when possible and the theme's stylesheet manifest includes each component stylesheet [FND:411-415; ISS:9-17].
- **THEME-7 Root portal.** Theme renders the stable root portal target in the root element; nested Theme instances do not create competing portal roots. Overlay layers inherit root theme settings while retaining original accessible relationships.
- **THEME-8 Compatibility tests.** Each component has props/schema tests and a Scene test. R2S parity fixtures cover representative variants and responsive classes; no unrelated R2S unstable APIs or icon exports are included.

## 6. DataTable

- **DT-1 Feature contract.** DataTable supports typed columns (stable ID, header, accessor/cell renderer, sort capability, width/min-width, alignment, visibility), sorting, text filtering across configured columns, controlled multi-row selection, sticky header, and optional APG Grid keyboard navigation. It excludes column resize/reorder, server-side policy, export, grouping, aggregation, pagination and row editing.
- **DT-2 Model-derived order.** Sorting and filtering are processed in `update`; Model stores `orderedRowIds` for the current filter/sort. View never sorts or filters. Build stable row IDs and normalized searchable keys once when data changes; filter by keys and update the ID order without copying row records. Sorting is stable, with source order as tie-break. Filter changes reset virtual scroll to first match.
- **DT-3 Selection.** Selection is a parent-Model-owned set keyed by row ID and persists across filter/sort. Select-all adds every currently filtered row ID; deselect-all removes only currently filtered IDs, preserving hidden selections. A no-filter select-all applies to all rows. Native table is default with caption, column headers and `aria-sort`; selection controls are labelled. Grid mode is opt-in and implements grid arrows/Home/End, with Tab entering/leaving the grid.
- **DT-4 Virtualization/cache.** Render `orderedRowIds` through `@foldkit/ui/virtualList`; never key by row index. Since `createKeyedLazy` never evicts (10k keys retained ~41 MB) [FND:476], store per-row memo entries in an explicit LRU bounded to `visibleRowCount + 2 * overscanRows`. LRU hit refreshes recency; eviction disposes the cached view. Scrolling through all 10k rows must assert cache size never exceeds this bound and earlier rows are evicted. Cache lifetime is one DataTable instance.
- **DT-5 Performance.** `data-table` page exposes 10k-row cell update, filter, sort and select-visible-row. GATE-P2-style 4× CPU Event Timing median ceiling is ≤50 ms each, matching foundation VirtualList ceilings [FND:517-525]. Do not trade correctness or virtualization for speed.

## 7. Size and performance

- **BUD-1 Eager closure and shell delta.** No new component helper, primitive, `@foldkit/ui` component or Floating UI enters entry/framework closure. Foundation first-visit GATE-S2 margin is only ~3.6 KiB (160 KiB ceiling vs 156.4 KiB baseline). Existing primary pages `layout`, `typography`, `buttons`, `dialog` remain byte-for-byte unchanged in their component memberships; existing `menus`, `form`, `virtual-list`, `shared*`, and `theme` scenario pages likewise remain unchanged. Every new component appears only on a new non-primary lazy route (GALLERY-1). The new shell/nav links, route labels and loader metadata have a hard incremental cap of **1,024 B Brotli-q11** for entry + framework; new CSS is not imported by shell. This reserves at least 2.6 KiB of the present GATE-S2 margin; actual measured transfer must still remain ≤160 KiB. APP-23 framework roots remain restricted [ISS:123-137,171-175].
- **BUD-2 Page chunks.** GATE-S3 tracks every new page chunk and stylesheet in `bench/baselines/size.json`; >2% growth requires the same PR to update measured bytes plus a non-empty reason [FND:495-502]. Shared chunk growth is also tracked.
- **BUD-3 Component reuse.** Every component/submodel and memoized subtree has GATE-P4 execution counters: unrelated Model change reuses unchanged views; changing one memo argument increments exactly once per affected view [FND:546-549]. Test stable IDs and bounded per-instance memo lifetime.
- **BUD-4 Proposed performance ceilings (not measurements).** Candidate GATE-P2 4× CPU Event Timing medians: Select open/choose (1,000 options) ≤50 ms; Tooltip open/close ≤30 ms; Slider drag update ≤30 ms; DataTable 10k update/filter/sort/select ≤50 ms. These are design ceilings inferred from analogous foundation ceilings, not observed SP2 measurements. Add all scenarios to `tools/gates/perf.ts`. The dedicated `perf` runner does not yet exist; CI perf acceptance remains blocked until GATE-P5 runner/noise baselines exist. Before merge, run local directional ABAB/A-A with the repository harness, report results as directional only, and do not substitute them for runner-backed gate results.
- **BUD-5 Module closure.** Subpath importing one primitive must not import unrelated primitives. Packed consumer B vs B+H checks strict Effect-module closure per DEP-1. Library build output tree-shakes unused component code.
- **BUD-6 Comparison.** R2S source pins are public at the exact existing commit; BENCH remains a reporting-only matched build, not a gate. No worktree-only upstream snapshot can supply source or baseline.

## 8. Gallery, test and visual acceptance

- **SP2-TEST-1 Story.** Every SP2 module exporting `update` has Foldkit Story test; every Message match arm has 100% per-file function coverage [FND:558-560].
- **SP2-TEST-2 Scene.** Every exported view has Scene tests for role/name/ARIA, modifiers, keyboard behavior and reuse. Stateful behavior uses Story + Scene.
- **SP2-TEST-3 Browser.** Production Gallery e2e in Chromium, Firefox and WebKit; every route has zero axe-core 4.11.0 violations [FND:560-563]. Cover overlay dismissal/focus return, portal containment, keyboard navigation, pointer/touch and small viewport.
- **SP2-TEST-4 Consumer.** Extend packed-consumer coverage manifest for every SP2 public subpath, export and CSS file; build/typecheck, Chromium, branding/tree shaking and coverage checks must cover each item [FND:583-588].
- **SP2-TEST-5 Visual baseline lane.** Extend `bench/radix2solid` with matching Solid pages for every new component using packed R2S tarballs from BENCH-1's pinned commit and the same props/data. Captures come from this updated comparison app—not foundation-only screenshots. Keep BENCH-2 reporting-only [FND:603-617].
- **SP2-TEST-6 Deterministic screenshot matrix.** Pin Chromium revision, 1280×800 viewport, device scale factor 1, fonts, light/dark root Theme, reduced motion, fixed data and animation clock. For every component capture default plus each declared `variant` value at `size=2` (where size exists), light and dark. For interactive components additionally capture one deterministic open state (Select/Popover/Dialog), hover state (HoverCard/Tooltip), and keyboard-focus state (Button/Radio/Slider/Tab) with fixed focus/anchor. Use the same semantic state/props on each bench/gallery pair. CSS and DOM are copied/matched, so exact match is expected; retain numeric pass: after 1px antialias-edge tolerance ≤0.5% changed pixels and no connected differing region >0.25% of component area. Any permitted exception must be a documented platform/font rasterization artifact, never layout/color/ARIA/focus mismatch. Save screenshots as CI artifacts.
- **SP2-GALLERY-1 Lazy pages.** New components only go to new non-primary pages (e.g. `context-menu`, not existing `menus`; ThemePanel gets `theme-panel`, not existing `theme`). Existing `layout`, `typography`, `buttons`, `dialog` primary pages and existing `menus`, `form`, `virtual-list`, `shared*`, `theme` perf pages retain their current component sets. New page families: `accessibility`, `layout-extra`, `avatar`, `feedback`, `typography-extra`, `icon-button`, `links`, `scroll-area`, `data`, `forms-extra`, `select`, `range-slider`, `tab-nav`, `alert-dialog`, `popover`, `hover-card`, `tooltip`, `context-menu`, `theme-panel`, `data-table`. Components can share a new family page; never add component code to eager shell.
- **SP2-GALLERY-2 Coverage.** New pages show default and modifier states, labelled keyboard paths, Select with 1k options and DataTable with 10k rows. Existing performance scenario pages are not repurposed. Page links are added to shell only within BUD-1 1,024 B shell delta.

## 9. Delivery waves and frozen interfaces
The plan's first task freezes exports, schemas, callbacks, item identity, portal host contract, component part names and CSS ownership using the decisions in this spec. There is no API research/audit phase. After the freeze, implementation lanes work in isolated worktrees.

| Wave | Lane | Deliverables | Dependency |
|---|---|---|---|
| 1 | Primitive package | `@wsagency/wseffect-primitives`, REPO-1/2 build/export contract, four local submodels, stateless CheckboxGroup view, SelectPosition Mount, fold/embed/Command/Mount conventions and tests. | First-task API freeze |
| 2A | Form controls | Checkbox/group/cards, Radio/RadioGroup/cards, Switch, SegmentedControl, Select, TextArea, single/multi Slider views and tests. | Wave 1 |
| 2B | Overlays/navigation | AlertDialog, Popover, HoverCard, Tooltip/group, ContextMenu, TabNav; Theme portal placement and focus tests. | Wave 1 |
| 2C | Static/typography/data | Remaining stateless R2S views, compound parts, CSS closure and DataList/Table. | Frozen component/compound API |
| 3 | DataTable | Model-derived sorted/filtered ID order, VirtualList, bounded LRU, selection/grid contracts and perf scenarios. | API freeze; parallel with 2A/2B/2C |
| 4A | Gallery/consumer/e2e | New non-primary routes, shell link cap, browser coverage, packed consumer/manifest, notices/changelog. | Interfaces stabilized |
| 4B | Radix2Solid visual bench | Extend `bench/radix2solid` with every new component's matching Solid page against packed R2S tarballs at BENCH-1 pin; deterministic capture matrix and paired comparison artifact. | Frozen props; may run alongside 4A |

Shared files are integrator-owned: package manifests, root exports, coverage manifest, Gallery shell/routes, `bench/baselines/size.json`, and `docs/superpowers/plans/ISSUES.md`. Lanes verify in their own isolated worktrees. Integrator merges lane results in dependency order and runs repository-wide verification once integration is complete.

## 10. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Generic helper behavior misses an APG requirement | Incorrect ARIA or forked behavior | Fixed mappings/gaps are recorded with release declarations/source in §3.2; add interaction tests for each mapping and local primitive. |
| Shared Floating UI or @foldkit/ui import becomes eager | Breaks narrow first-visit headroom and lazy contract | APP-23 closure assertion; page-level imports; S1/S2/S3 checks. |
| Theme portal loses inherited settings or focus relation | Overlay appearance/accessibility defect | Root-only portal target, attribute inheritance, three-engine tests. |
| Per-render class work or overlarge component chunks | Regresses runtime and page size | Schema lookup tables, GATE-P4 reuse assertions, GATE-S3 tracked chunks. |
| VirtualList keyed cache grows with dataset | Long-lived memory retention | Window-bounded cache; stable row IDs; lifecycle and cache-bound tests. |
| 1k Select and 10k table interaction exceeds budget | Poor responsiveness | GATE-P2 measurements on isolated runner; tune only while preserving PRI-1. |
| Visual diff measures font rasterization rather than design | False failure or tolerated real mismatch | Same Chromium/fonts/viewport, edge tolerance only, strict connected-region threshold, manual review on platform artifacts. |
| CSS copying lacks notices/dependencies | License or build break | Preserve upstream license/notice and transitive internal CSS imports; verify packed CSS. |

## 11. Licensing and out of scope

- **SP2-LIC-1** New original TypeScript and package output remain MIT per repository policy. R2S component CSS is copied from the pinned public source only as permitted by its license; preserve applicable copyright, license, and attribution notices verbatim in the relevant package distribution/UPSTREAM record. Radix Themes and Radix Colors notices remain intact; do not imply Radix endorsement.
- **SP2-LIC-2** Foldkit UI is a dependency, not copied or vendored. Its license/notice remains in packed dependency metadata. No unpublished worktree implementation may be copied into the project.
- **OUT-1** Icons and icon exports belong to SP3; charts to SP4. No icon package work or chart abstractions here.
- **OUT-2** No changes to Foldkit pins, fork, patch-package, vendored `dist`, PWA/app capabilities, general form validation or new component framework. Only required CSS and Gallery exercises are in scope.
- **OUT-3** DataTable is intentionally limited to DT-1 features; no spreadsheet, server-query system, pagination policy or editing suite.

## 12. Self-review

- **Placeholders:** no TBD/TODO, deferred API audit, or unapproved choices. The first implementation-plan task freezes already specified contracts.
- **Consistency:** local set is exactly four new submodels, one stateless CheckboxGroup view, and one positioning Mount helper; upstream mappings are explicit. Stateful compound APIs use one model plus typed records. Slot/asChild and duplicate Portal are excluded. New component links stay non-primary with quantified shell cap.
- **Scope:** 42 new Themes view/module APIs plus DataTable (43 new component APIs), with 12 existing foundation components; icons and charts remain separate. Parallel lanes have isolated worktrees and shared-file ownership.
- **Evidence:** interactive API mapping cites the pinned public type declarations and implementations; official Radix Themes component index was cross-checked. 0.168.0 is the exact public release; no local unpublished worktree implementation is copied.
- **Performance:** DataTable LRU bound, Select/Tooltip/Slider/Table proposed budgets, runner absence, and directional-only local ABAB/A-A requirement are explicit; ceilings are not misrepresented as measured results.
- **Visual acceptance:** screenshots are sourced from the expanded pinned R2S bench, matrix is bounded and deterministic, and numeric mismatch allowance is stated for identical CSS/DOM.
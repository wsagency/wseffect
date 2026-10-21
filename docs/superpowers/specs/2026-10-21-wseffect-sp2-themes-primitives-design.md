# wseffect Themes and primitives (sub-project #2): design specification

Status: **Design approved by the project director in this conversation.** This spec defines the implementation contract; implementation planning follows review. No behavior outside this scope is authorized. Evidence and timings below support decisions and are not production performance claims.

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
| FK | Foldkit repository `/home/klukacin/projects/foldkit-wt/lazy-callsite/packages/ui`, release `0.168.0`; package export map and `dist/*/index.d.ts` (also source). | Available headless helpers and APIs. Source is for reading only; no unpublished worktree code is a dependency or pin. |
| WAI | WAI-ARIA Authoring Practices Guide (APG), pattern pages linked by component inventory. | Keyboard, focus, role and state expectations. |

Citations `[FND:x-y]`, `[ISS:x-y]`, `[R2S:path]`, `[FK:path]` identify these sources; R2S paths are at the pinned commit. Foundation CSS follows TH-1's copy-and-notice rule and CSS import closure [FND:409-417; ISS:9-17].

## 3. Component and helper inventory

### 3.1 Status definitions

`Existing` means provided by the foundation. `New view` is a pure themed view; `wrap` reuses an upstream submodel; `primitive+view` needs a local `@wsagency/wseffect-primitives` helper, then a themed wrapper. `CSS` is the R2S component stylesheet plus its transitive `_internal`/shared CSS imports, not a claim that each view needs a unique output. All source CSS is imported via the Themes CSS build (not runtime JS side effects). Gallery pages are lazy and contain their component family; exact pages below are required routes, not extra eager entrypoints.

Prop shorthand: `size`, `variant`, `color`, `highContrast`, `radius`, `responsive` mean the prop is present only where the upstream `.props.ts` schema supports it; each port retains the full literal domain and responsive type exactly. `—` means the prop is not in that component's schema. Component-specific props/children/slots are defined by the pinned `*.props.ts` and source, not broadened by this table [R2S: `packages/themes/src/components/*.props.ts`]. CSS source basename is listed; dependencies follow upstream imports. `P` = pure view, `W` = stateful headless wrap, `N` = new primitive under the selected APG pattern.

| Component / family | Status; basis | APG / interaction | Props modifiers (size/variant/color/highContrast/radius/responsive) | CSS source; Gallery route |
|---|---|---|---|---|
| Theme, Box, Flex, Grid, Text, Heading, Button, Card, TextField, Dialog, DropdownMenu, Tabs | Existing: core (Theme/layout/text/button/card/input P or W; Dialog/Menu/Tabs W) | Existing contracts TH-5..14 | Existing | Existing; their current routes remain |
| AccessibleIcon, VisuallyHidden | New view; P | Name/hidden semantics; no APG composite | — | no standalone stylesheet; `accessibility` |
| AspectRatio, Container, Inset, Section | New view; P | — | responsive layout props per schema | aspect-ratio / container / inset / section; `layout` |
| Avatar | New view; P | Image alternative semantics | size; color/radius as schema | avatar; `data-display` |
| Badge, Callout | New view; P | status/alert semantics where role is requested; no implicit live region | size, variant, color, highContrast, radius as schema | badge / callout + shared; `feedback` |
| Blockquote, Quote, Em, Strong, Code, Kbd | New view; P | native semantic elements | typography modifiers as schema | blockquote / quote / em / strong / code / kbd; `typography` |
| IconButton | New view; P + `@foldkit/ui/button` | Button | size, variant, color, highContrast, radius | icon-button + base-button; `buttons` |
| Link | New view; P | Link; native navigation semantics | size/color/highContrast as schema | link; `links` |
| Progress, Meter | New view; P | Progressbar / meter | size, color, highContrast as schema | progress / meter; `feedback` |
| Separator | New view; P | Separator | size/orientation as schema | separator; `layout` |
| Skeleton, Spinner | New view; P | progress status only when explicitly labelled | size/color as schema | skeleton / spinner; `feedback` |
| Reset, Slot, Portal, ThemePanel | New view / utility; P | Portal itself is DOM placement, not an APG pattern; ThemePanel is demo utility | schema-specific | reset / theme-panel; `theme` |
| Table, DataList | New view; P | native table / description list | responsive cell/layout props as schema | table / data-list; `data` |
| Checkbox, Switch, Radio | New view; primitive+view N | Checkbox, Switch, Radio Group item semantics | size/variant/color/highContrast/radius as schema | checkbox / switch / radio + base-radio; `forms` |
| CheckboxGroup, CheckboxCards, RadioGroup, RadioCards | New view; primitive+view N | Checkbox Group / Radio Group; cards preserve same roles | size/variant/color/highContrast/radius as schema | checkbox-group / checkbox-cards / radio-group / radio-cards + internal CSS; `forms` |
| SegmentedControl | New view; primitive+view N | Radio Group (single selection) | size/variant/color/highContrast/radius as schema | segmented-control; `forms` |
| TextArea | New view; `@foldkit/ui/textarea` view + Input semantics | Textbox | size/variant/color/highContrast/radius | text-area + shared; `forms` |
| Select | New view; primitive+view N | Select-only Combobox/Listbox; single selection | size/variant/color/highContrast/radius | select + menu/portal dependencies; `select` |
| Slider | New view; `@foldkit/ui/slider` | Slider | size/color/highContrast | slider; `forms` |
| Tabs; TabNav | Existing Tabs; new TabNav P or primitive reuse | Tabs | existing / tab-nav props | tabs / tab-nav; `navigation` |
| AlertDialog | New view; `@foldkit/ui/dialog` with alertdialog role | Alert Dialog | size/variant/color/radius as schema | alert-dialog + base-dialog; `overlays` |
| Popover | New view; `@foldkit/ui/popover` or primitive N if incompatible | Dialog/Popover pattern | size/variant/color/radius as schema | popover + base-dialog; `overlays` |
| HoverCard, Tooltip | New view; primitive+view N where FK lacks public equivalent | Tooltip / non-modal dialog | size/variant/color/radius as schema | hover-card / tooltip; `overlays` |
| ContextMenu | New view; `@foldkit/ui/menu` adapted if API fits, otherwise primitive N | Menu (context-menu invocation) | size/variant/color/highContrast/radius | context-menu + base-menu; `menus` |
| Select; SegmentedControl; forms above | Listed once above | — | — | — |
| DataTable (TH-15) | New view; VirtualList + keyed memo; uses primitives for sorting/selection controls | Grid only when keyboard navigation enabled; native table otherwise | column definitions + responsive column sizing; no invented Radix prop domain | table + utilities + VirtualList; `data-table` |

The first R2S export inventory has 58 export statements, 12 represented in foundation core; 45 remaining view/utility entries plus the four named icon exports are excluded from this task's component count; DataTable is one additional wseffect component. The concrete implementation inventory is all R2S exports except the core, icon exports (`IconProps`, `ChevronDownIcon`, `ThickCheckIcon`, `ThickChevronRightIcon`, `ThickDividerHorizontalIcon`) and charts; icons are sub-project #3. Thus this scope contains **45 remaining R2S component/utility exports and DataTable** (46 new Themes exports), pending exact export normalization in planning [R2S: `components/index.ts:1-58`]. R2S category comparison is against Radix Themes' documented component surface, not private implementation modules.

### 3.2 Foldkit UI inventory and primitive decisions

`@foldkit/ui@0.168.0` exposes individual ESM subpaths, including `button`, `input`, `textarea`, `dialog`, `menu`, `tabs`, `listbox`, `combobox`, `select`, `radioGroup`, `checkbox`, `switch`, `disclosure`, `popover`, `tooltip`, `slider`, `datePicker`, `calendar`, `progress`, `meter`, `nav`, `fieldset`, `virtualList`, `anchor`, `hoverIntent`, and drag/drop/file helpers [FK: `packages/ui/package.json:9-129`]. Geometry-dependent menu/popover/tooltip behavior uses `@floating-ui/dom` (dependency at package.json:147-149). Foundation already reuses Button, Input, Dialog, Menu and Tabs [FND:430-436]. Reuse also public Foldkit VirtualList, Slider, TextArea, Checkbox, Switch, RadioGroup, Select/Combobox/Listbox, Popover, Tooltip, Disclosure, Calendar, DatePicker, Progress, Meter, and the existing keyboard/typeahead primitives when their contract satisfies the desired semantics. Do not duplicate those helpers.

Build locally exactly two primitive submodels: **CheckboxGroup** and **ContextMenu**. `@foldkit/ui` exports the individual Checkbox submodel but no checkbox-group subpath/API; its Menu submodel covers menu semantics but exposes no context-menu invocation model. These are the only new primitive submodels authorized in this package. `CheckboxCards` and `RadioCards` are themed compositions over upstream/group models and do not add state APIs. ContextMenu composes the existing Menu Model and adds context invocation/focus anchoring to its Message contract, with no second menu state. Reuse upstream `RadioGroup`, `Select`, `Combobox`, `Listbox`, `Popover`, `Tooltip`, `Disclosure`, `Slider`, `Switch`, `Tabs`, `Dialog`, `Menu`, and `VirtualList`; remaining theme components are stateless views. The public type/source audit verifies these absences against the release export map and must not broaden the local set. Evidence: `packages/ui/src/index.ts:1-29` lists exported submodels, including `Checkbox` and `Menu` but no `CheckboxGroup` or `ContextMenu` [FK]. `@foldkit/ui` declares `@floating-ui/dom` as its positioning dependency [FK: `packages/ui/package.json:9-129,147-149`].

Headless APIs expose `Model`, `Message`, `OutMessage`, `init`, `update`, `view` (and `toView` configuration where supported); retain those types unchanged. CheckboxGroup uses stable option IDs and emits parent-directed out-messages; ContextMenu reuses Menu's model and emits typed selection/cancel messages without storing a second menu state. No primitive may generate private state in a Theme view.

### 3.3 Accessibility and behavior contract

- **ARIA-1 APG behavior.** Primitive contracts follow APG patterns for Dialog, Menu, Tabs, Combobox/Listbox, Checkbox, Radio Group, Switch, Slider, Tooltip, Disclosure, and Grid. Tests assert role, accessible name, state, relationships and keyboard behavior, not merely snapshot markup.
- **ARIA-2 keyboard.** Preserve browser-native input/button semantics; composites implement the APG key map: Tab sequence, arrow movement, Home/End where pattern requires, Enter/Space activation, Escape dismissal, typeahead where options are textual, and focus restoration after overlay dismissal. Disabled/hidden items are skipped according to APG. No custom keyboard layer on statics.
- **ARIA-3 focus/dismissal.** Dialog is modal with focus containment, Escape/close behavior and restoration; nonmodal popovers do not steal modal focus; menus close on selection/Escape/outside press and restore invoking focus. Tooltip opens on focus/hover, closes on blur/pointer leave/Escape and does not receive focus. User interaction state remains in the primitive Model.
- **ARIA-4 placement/portal.** Root Theme owns a portal host. Portal-based overlays render into that host, inherit root Theme attributes and keep IDs/relationships intact. Floating UI computes collision-aware placement using viewport/scroll/resize updates and cleans listeners on close/unmount; do not hand-roll geometry. Match existing `@foldkit/ui/menu` positioning behavior and dependency rather than substituting CSS coordinates [FK: `packages/ui/src/menu`, `packages/ui/src/popover`, `@floating-ui/dom`].
- **UP-PR-1 Upstream-first.** If a requirement is a generic accessible headless behavior, submit an upstream Foldkit PR when the existing API cannot express it and the contract is broadly reusable. Do not block a local implementation on upstream acceptance; local primitives use Foldkit APIs without patching or vendoring. No PR is appropriate for Radix-specific class names, styling, API parity, DataTable, Theme portal host policy, or wseffect packaging.

## 4. Primitive package contract

- **PRIM-1 Package.** Create `@wsagency/wseffect-primitives` with REPO-1 manifest shape and `"sideEffects": false`; ESM named subpath exports, exact Foldkit pins and Effect peer ranges are from REPO-1 [FND:151-162]. Build library modules through the Foldkit view-identity transform; packed-consumer tests assert exported view modules import `foldkit/brand` (REPO-2).
- **PRIM-2 View identity.** Any exported view passed to Foldkit as a view is branded at build time. Keep view identity at the library boundary; consumers do not manually brand and primitive modules do not depend on app internals.
- **PRIM-3 Foldkit submodel shape.** A stateful primitive subpath exports `Model`, `Message`, `OutMessage`, `init`, `update`, and `view`. The themed wrapper configures the headless `view` via `toView` (or the upstream equivalent), never adds wrapper state or changes the primitive schemas. Stateless primitives expose pure view functions and schemas.
- **PRIM-4 Fold/embed.** Stateful themed components expose `fold(config)` built on `Update.foldChild` and `embed(h, config)` built on `h.submodel`, matching TH-10 exactly [FND:432-440]. No bespoke parent update machinery.
- **PRIM-5 Commands and effects.** Browser work in Commands uses `Effect` and has error channel `never`; ordinary failures become declared Messages, not defects or thrown view errors. Commands must use `Mount.MountAction<M>` for element-lifetime DOM work and typed Mount cleanup. Do not use deprecated/incorrect `Mount.Mount<M>` signatures [ISS:198-204].
- **PRIM-6 Effect imports (DEP-1).** When schema decoding is needed import `SchemaParser.decodeUnknownExit`, never runtime `Schema` from `effect` root. Do not add Effect modules outside the existing framework closure; no primitive exception is granted. The gate measures packed consumer B vs B+H per DEP-1, not a Gallery historical sourcemap [APP:94; ISS:176-205].
- **PRIM-7 Subscription types.** If a helper exposes Foldkit Subscription, use `Subscription.Subscription<unknown, M, Record<string, never>>`; public results use Effect 4.0.5 `Result.Result`, not unavailable `Either` [ISS:198-204].

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

- **DT-1 Feature contract.** DataTable supports typed column definitions (stable ID, header, accessor/cell renderer, sort capability, width/min-width, alignment and visibility), sortable columns, text filtering across caller-selected columns, controlled multi-row selection, sticky header, and keyboard navigation. It does not add column resizing/reordering, server-side query policy, export, grouping, aggregation, pagination, or row editing.
- **DT-2 Semantics.** Default output is a native table with caption, column headers, `aria-sort`, checkbox selection controls and stable row/cell IDs. Keyboard grid navigation is explicitly opt-in; when enabled implement APG Grid roles and arrow/Home/End navigation, with Tab entering/leaving the grid rather than visiting every cell. Sorting/filtering/selection are caller-sourced Model state delivered as typed Messages; no duplicate internal application state.
- **DT-3 Data and rendering.** For large collections render through Foldkit `VirtualList`; memoize rows with keyed lazy using stable row IDs. Never key by index. Bounded cache lives at most as long as DataTable instance and only retains the current visible window plus bounded overscan, avoiding `createKeyedLazy` unbounded retention [FND:458,464-476].
- **DT-4 Correctness.** Sorting is stable (equal values retain source order); filter changes reset virtual scroll to the first matching row; selection follows row IDs across sort/filter, but rows excluded by filter remain selected. Empty/loading states are caller-provided and announced only if requested; sticky header does not obscure focused row/cell.
- **DT-5 Performance.** `data-table` Gallery page exposes 10k-row update-cell, filter, sort, select-visible-row scenarios. GATE-P2-style 4× CPU Event Timing median ceiling is ≤50 ms each, identical to VirtualList 10k ceilings [FND:517-525]. Do not replace correctness guards or virtualization to meet this budget; report any baseline adjustment with evidence.

## 7. Size and performance

- **BUD-1 Eager closure.** No SP2 component, primitive, Floating UI, or its CSS/JS is added to entry/framework eager closure. The foundation's first-visit margin to GATE-S2 is only about 3.6 KB (160 KiB ceiling vs 156.4 KiB baseline); all components live on lazy family pages. Root Theme/portal behavior must not statically import component helpers. APP-23 framework group remains only resolved Foldkit, Effect, platform-browser, app runtime and Workbox roots; @foldkit/ui, primitives and Floating UI stay out [ISS:123-137,171-175].
- **BUD-2 Page chunks.** GATE-S3 tracks each page chunk and stylesheet; add every new Gallery lazy page artifact to `bench/baselines/size.json`. >2% growth fails unless artifact baseline bytes and a non-empty reason are committed [FND:495-502]. No untracked shared chunk growth.
- **BUD-3 Component reuse.** Every component/submodel and memoized Gallery subtree has GATE-P4 view-execution counters: unrelated Model update reuses unchanged views; a change to one memo argument increments exactly once per affected view [FND:546-549]. For each `createKeyedLazy`, test stable IDs and bounded lifetime/key space.
- **BUD-4 Heavy interaction budgets.** GATE-P2 4× Chromium ceilings: Select open/choose with 1,000 options ≤50 ms; Tooltip open/close ≤30 ms; Slider drag update ≤30 ms; DataTable 10k update/filter/sort/select ≤50 ms. Validate on the isolated runner under GATE-P1/P3/P5; if measured behavior misses a ceiling, the gate fails pending an evidence-backed director decision.
- **BUD-5 Module closure.** Subpath importing one primitive must not import unrelated primitives. Packed consumer B vs B+H checks strict Effect-module closure per DEP-1. Library build output tree-shakes unused component code.
- **BUD-6 Comparison.** R2S source pins are public at the exact existing commit; BENCH remains a reporting-only matched build, not a gate. No worktree-only upstream snapshot can supply source or baseline.

## 8. Gallery, test and visual acceptance

- **TEST-1 Story.** Every module exporting `update` has Foldkit Story test; all Message match arms have 100% per-file function coverage [FND:558-560].
- **TEST-2 Scene.** Every exported view has Scene tests covering role/name/ARIA, representative props, keyboard behavior, and reuse. Stateful behavior uses Story + Scene with deterministic messages.
- **TEST-3 Browser.** Production Gallery e2e in Chromium, Firefox and WebKit; every route has zero axe-core 4.11.0 violations [FND:560-563]. Exercise opening/dismissal, portal containment, focus return, keyboard movement, pointer interactions and small viewport.
- **TEST-4 Consumer.** Packed-consumer fixture builds and typechecks, runs Chromium tests, checks view branding/tree-shaking and coverage manifest. Extend `tests/consumer/coverage-manifest.json` for every public subpath, export and CSS file; every item must map to a passing check [FND:583-588].
- **TEST-5 Visual parity.** Capture paired screenshots of every component story on the pinned R2S comparison app and wseffect Gallery using the same Chromium version, viewport (1280×800), fonts, data, zoom and reduced-motion setting. Capture light and dark for each pair, for every component variant with structural visual differences; tokenize baseline inputs and use identical props. Compare full component bounding box plus 8px exterior context after masking only dynamic text/time and font antialiasing (no masking layout, color, border, shadow or focus). Pass when pixel difference after 1px edge tolerance is ≤0.5% of pixels and no connected differing region exceeds 0.25% of the component area; additionally require manual signoff for any failure due to platform rendering. Store generated comparisons as test artifacts, not baseline screenshots committed as output. The comparison must use public R2S packed artifacts pinned to BENCH-1 [FND:603-617].
- **GALLERY-1 Lazy routes.** Shell contains navigation only; each family has its own lazy page and stylesheet. Required route families: `accessibility`, `layout`, `typography`, `buttons`, `links`, `feedback`, `forms`, `select`, `navigation`, `overlays`, `menus`, `data`, `data-table`, `theme`. Static text/layout examples can share by family, never fold every component into a single eager page. Page-link prefetch follows APP-13 amendments and does not cause viewport prefetch competition during route loading [ISS:128-137].
- **GALLERY-2 Coverage.** Each route demonstrates common/default and modifier variants; interactive routes include keyboard-only paths and screen-reader-visible labels. `data-table` route includes 10k rows; `select` includes 1k options; `forms` includes grouped controls and slider; `overlays` shows portal behavior. No icon library work; use text or existing foundation controls.

## 9. Delivery waves and frozen interfaces

Implementation plan may parallelize only after a single interface-freeze task writes exports, schemas, callbacks, item identity, portal host contract, component naming and CSS ownership. Packages are non-overlapping across lanes after that point.

| Wave | Lane | Deliverables | Dependency |
|---|---|---|---|
| 0 | Contract/research | Audit @foldkit/ui public types; finalize exact new primitive list; freeze API and coverage manifest shape. | None |
| 1 | Primitive core | Package, REPO-1/2, build/exports, commands/Mount core, fold/embed conventions, primitive Story/Scene helpers. | Wave 0 |
| 2A | Form controls | Checkbox, groups/cards, radio/group/cards, switch, segmented control, Select, TextArea, Slider themed views and primitive adapters. | Primitive core + frozen API |
| 2B | Overlays/navigation | AlertDialog, Popover, HoverCard, Tooltip, ContextMenu, TabNav; portal and positioning tests. | Primitive core + frozen API |
| 2C | Static/typography/data | Remaining non-interactive R2S views, CSS closure, Tables/DataList. | Wave 0 + CSS contract |
| 3 | DataTable | VirtualList keyed implementation, column/selection/filter/sort/grid contracts and benchmarks. | Primitive core; may proceed parallel with 2A/2B/2C after the DataTable API freeze |
| 4 | Gallery, visual, docs | Lazy routes, three-engine e2e, screenshot comparisons, packed consumer/manifest, notices and changelog. | Component APIs stabilized; parallel test/doc work allowed against frozen interfaces |

Worktree rules: each lane owns disjoint files; shared exports, package manifests, coverage manifest and Gallery shell are integration-owner files, edited only in designated integration task. Merge waves in dependency order, then one main-agent full verification. No lane runs repo build/lint/test while siblings are applying changes.

## 10. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Upstream helper names imply semantics unlike APG | Incorrect ARIA or forked behavior | Public type/source audit; APG acceptance tests; local primitive only if API gap demonstrated. |
| Shared Floating UI or @foldkit/ui import becomes eager | Breaks narrow first-visit headroom and lazy contract | APP-23 closure assertion; page-level imports; S1/S2/S3 checks. |
| Theme portal loses inherited settings or focus relation | Overlay appearance/accessibility defect | Root-only portal target, attribute inheritance, three-engine tests. |
| Per-render class work or overlarge component chunks | Regresses runtime and page size | Schema lookup tables, GATE-P4 reuse assertions, GATE-S3 tracked chunks. |
| VirtualList keyed cache grows with dataset | Long-lived memory retention | Window-bounded cache; stable row IDs; lifecycle and cache-bound tests. |
| 1k Select and 10k table interaction exceeds budget | Poor responsiveness | GATE-P2 measurements on isolated runner; tune only while preserving PRI-1. |
| Visual diff measures font rasterization rather than design | False failure or tolerated real mismatch | Same Chromium/fonts/viewport, edge tolerance only, strict connected-region threshold, manual review on platform artifacts. |
| CSS copying lacks notices/dependencies | License or build break | Preserve upstream license/notice and transitive internal CSS imports; verify packed CSS. |

## 11. Licensing and out of scope

- **LIC-1** New original TypeScript and package output remain MIT per repository policy. R2S component CSS is copied from the pinned public source only as permitted by its license; preserve applicable copyright, license, and attribution notices verbatim in the relevant package distribution/UPSTREAM record. Radix Themes and Radix Colors notices remain intact; do not imply Radix endorsement.
- **LIC-2** Foldkit UI is a dependency, not copied or vendored. Its license/notice remains in packed dependency metadata. No unpublished worktree implementation may be copied into the project.
- **OUT-1** Icons and icon exports belong to SP3; charts to SP4. No icon package work or chart abstractions here.
- **OUT-2** No changes to Foldkit pins, fork, patch-package, vendored `dist`, PWA/app capabilities, general form validation or new component framework. Only required CSS and Gallery exercises are in scope.
- **OUT-3** DataTable is intentionally limited to DT-1 features; no spreadsheet, server-query system, pagination policy or editing suite.

## 12. Self-review

- **Placeholders:** no TBD/TODO or undecided implementation choices. The upstream API audit is a required task with a fixed bounded list and a rule that removes already-covered work; it is not an open design question.
- **Consistency:** primitive API keeps upstream Model state and Theme wrappers stateless; the portal belongs to root Theme; overlays remain lazy, so no apparent conflict with eager closure. DataTable selection remains Model-owned while keyed memo is bounded to visible lifetime.
- **Scope:** 45 remaining R2S view/utility exports plus DataTable are broad but one coherent package/API completion, decomposed into independent lanes; no split is required. Icons and charts remain separate subprojects.
- **Ambiguity:** table prop modifiers defer to pinned upstream component schemas rather than generalized fabricated props; exact API audit freezes implementation names. Visual pass rule, DataTable features, keyboard grid opt-in, size/perf conditions and upstream PR decision are explicit.
- **Evidence caveat:** exact component export count is derived from pinned `components/index.ts`, while folded APIs are to be validated against release public declarations. No local unpublished source is an implementation basis.
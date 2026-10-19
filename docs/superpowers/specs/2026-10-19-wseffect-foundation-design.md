# wseffect foundation (sub-project #1): design specification

Status: **Design approved by the user in conversation on 2026-10-19. This document is the written specification of that design and awaits the user's review.** Once the user approves this file, the next step is the implementation plan (writing-plans). This stage creates only this file and the repository's initial commit: no product code, scaffolding, dependency installation, publication or push. Every requirement below is a binding contract for the plan. Cited measurements are the evidence for the chosen numbers; they are not claims that anything is implemented.

## 1. Goal and context

wseffect is WS Agency's design system and application framework for enterprise web apps. It is fully Effect-v4-native, responsive, PWA-ready and fast.

- **Foundation:** it is built on [Foldkit](https://github.com/foldkit/foldkit), an Elm-architecture TypeScript framework on Effect v4. Foldkit is an upstream dependency, never a fork: it is pinned exactly, and any improvement wseffect needs goes upstream as a pull request.
- **Model:** radix2solid. wseffect reproduces the Radix Themes look and component API and consumes Radix Colors 3.0.0 unchanged.
- **Distribution:** packages publish as `@wsagency/wseffect-*` under MIT, with the WS Agency README block radix2solid uses.

Foldkit facts that shape this design:
- Views are `(model, h) => Html` over a vendored snabbdom 3.6.3 fork [F:33-79].
- Side effects are named Commands whose error channel is `never`. Services reach Commands and Subscriptions through one application `resources` Layer [F:80-142].
- `@foldkit/ui` supplies headless, accessible helpers and submodels, among them Button, Input, Dialog, Menu and Tabs [F:143-219].
- Foldkit has none of the following, so wseffect must supply them: route code splitting [F:220-247], PWA support [F:287-296], styling or tokens [F:328-341].

## 2. Priorities

The order is strict. A change that improves a lower priority at the expense of a higher one is rejected, and CI evaluates the size and performance gates only after the functional gates pass (§13).

- **PRI-1 Functional correctness.** No optimization may remove behavior or guards.
  - Foldkit's production element and representability assertions (`buildElement` assertions, the style representability check and its CSS property tables) stay in production builds. They cost 3,898 B brotli and guard server/client agreement [F:592, F:623].
- **PRI-2 Runtime speed.** When speed and size conflict, speed wins.
  - Example applied in this spec: pages are prefetched on hover, focus and viewport entry (APP-13). This transfers chunks the user may never open, in exchange for a 1-frame instead of a 2-frame first navigation [F:776-781, F:789-790].
- **PRI-3 Bundle size,** within the budgets of §11.

## 3. Evidence base

| Key | File | Content | SHA-256 at time of writing |
|---|---|---|---|
| F | `/tmp/wseffect-research/foldkit.md` | Foldkit survey, bundle reachability, lazy-page probe, wseffect-app deep research, PWA strategies | `c030369f8e3cce8cb6a8bf1e3ce5fae777bc47058bbad395001af8a1853f26ad` |
| P | `/tmp/wseffect-research/perf.md` | Runtime benchmarks S1–S9 and their design repercussions | `8d8bfff8dd25f3a74d0fcc21e1085d4948f243657539f33bb6be41662a2f0214` |
| E | `/tmp/wseffect-research/effect.md` | Effect v4 patch releases, exact-peer override probe, idiom audit, upstream activity | `2a63a992dd920c7c70f6114bd80690111a9d9785470d5aa0025e8149afe5c668` |
| R | `/tmp/wseffect-research/radix2solid.md` | radix2solid layout, packages, Themes pipeline, gates, docs and README conventions | `2bdf939bc3cb66795b269d5119edfdcab0f8c8bc0e8c08e536b921b4751d27d3` |
| S9 | `/tmp/wseffect-research/perf/s9-summary.json` | Raw S9 group summaries (`origin`, `branch`, `solid`), including the matched-DOM Foldkit/Solid comparison, cited by group key | `9038cca956b1d0d9c68c64102e3e1df0adaed1c7d1e1e91b507ff7024ee72cdc` |

**How citations work:**
- `[F:899-906]` means lines 899–906 of F.
- `[S9 groups …]` names entries of S9 by their `key` field (for example `branch 1000/4/keyed/filter`); the JSON has no stable line numbers.
- `[PR #1699]` and `[PR #1700]` are foldkit/foldkit pull requests; their state was read on 2026-10-19 (both open).
- `[FK path:a-b]` is a file in the Foldkit repository at commit `76fa0d1` (`foldkit@0.168.0`).

`/tmp` is ephemeral. Appendix A therefore reproduces every evidence table this spec relies on, and Appendix B lists the throwaway probes as historical provenance only. No probe code is imported into wseffect, with one exception: the radix2solid comparison baseline (BENCH-3).

**Research-baseline versions** [F:663, P:5-6, E:7]:

| Area | Versions |
|---|---|
| Foldkit | `foldkit` 0.168.0, `@foldkit/ui` 0.168.0, `@foldkit/vite-plugin` 0.27.1 |
| Effect | `effect`/`@effect/platform-browser` 4.0.0 (research) and 4.0.5 (override probe; current `latest`, published 2026-10-15) |
| Build | Vite 8.3.4, TypeScript 7.0.2, `vite-plugin-pwa` 2.0.0, `workbox-window` 7.4.1 |
| Browser testing | Playwright 1.64.1, Chromium 156.0.8078.4 |

## 4. Upstream dependency policy

- **UP-1 Foldkit pins.** `foldkit` and `@foldkit/ui` are pinned exactly at 0.168.0 and `@foldkit/vite-plugin` at 0.27.1.
  - **Upgrade procedure:** a dedicated PR that changes only the Foldkit pins, plus the code that the upgrade itself requires. That PR must pass every required CI job (§13). A Foldkit bump is never bundled with feature work.
  - **Why:** Foldkit is pre-1.0, allows breaking changes in minor releases, has shipped 168 minors in about 13 months, and is effectively single-maintainer [F:347-350].
  - wseffect packages do not depend on `@foldkit/devtools` or `@foldkit/devtools-mcp` in this sub-project.
- **UP-2 Effect pin.** In the repository, `effect` and `@effect/platform-browser` are pinned exactly at 4.0.5. Published peer ranges follow REPO-1.
  - **The conflict:** Foldkit 0.168.0 peers both at exactly 4.0.0 [F:6-31], but 4.0.1–4.0.5 fix Schema parser, interruption, retention, stream and timer defects that matter to a browser runtime [E:9-14].
  - **Upstream fix:** [PR #1699] widens Foldkit's Effect peers to `^4.0.0`. It keeps `@foldkit/vite-plugin` and `@foldkit/devtools-mcp` at `^4.0.5`, because Effect 4.0.3's #8935 changed `Crypto.randomUUIDv4` in a patch release.
  - **Interim resolution, until wseffect adopts a Foldkit release containing #1699:**
    - the pnpm `overrides` and `peerDependencyRules.allowedVersions` entries of the consumer snippet (UP-8), placed in the repository's `pnpm-workspace.yaml`;
    - nothing else.
  - **Evidence the interim resolution works:** the override probe passed `tsc`, the production build and 9/9 browser checks, with one deduplicated Effect copy [E:16-23; App. A.1].
- **UP-3 Single Effect copy.** CI fails if any of these holds:
  - the lockfile resolves more than one version of `effect` or of `@effect/platform-browser`;
  - the packed-consumer install (TEST-7) contains more than one `effect` package directory;
  - the gallery production source map references Effect sources from more than one package directory.

  This check stays after UP-4.
- **UP-4 Removing the interim resolution.** The Foldkit upgrade PR that adopts peers accepting 4.0.5 deletes the override and the `allowedVersions` entries from the repository. The same PR removes the consumer snippet from the wseffect-app README and from the TEST-7 fixture (UP-8), or narrows it to the entries the new Foldkit peers still require.
- **UP-8 Consumer-side resolution.** Every app consuming `@wsagency/wseffect-*` (peer `^4.0.5`, REPO-1) together with Foldkit 0.168.0 (exact `effect` 4.0.0 peers) hits the same peer conflict until a Foldkit release containing #1699 is adopted.
  - The `@wsagency/wseffect-app` README contains a section "Effect version (temporary)" with exactly this `pnpm-workspace.yaml` snippet, the reason (link to [PR #1699]), and the removal condition of UP-4:

    ```yaml
    overrides:
      effect: 4.0.5
      '@effect/platform-browser': 4.0.5
    peerDependencyRules:
      allowedVersions:
        foldkit>effect: 4.0.5
        foldkit>@effect/platform-browser: 4.0.5
        '@foldkit/ui>effect': 4.0.5
        '@foldkit/vite-plugin>effect': 4.0.5
    ```

  - The TEST-7 fixture's `pnpm-workspace.yaml` contains exactly this snippet (plus the fixture's tarball paths); a test compares it byte-for-byte with the README block.
  - When the README snippet changes, the repository's own interim entries (UP-2) change in the same PR.
- **UP-5 Keyed diff.** [PR #1700] defers removals of keyed children that are absent from the next list. On a 1k keyed filter it cut retained-row moves from 271 to 0 and dirty layout objects from 6,513 to 9 (of 6,530). On a 10k filter at 4× CPU, Event Timing fell from 4,784 to 1,392 ms [P:216-262; App. A.8].
  - wseffect does not patch Foldkit locally.
  - Until a Foldkit release containing #1700 is adopted, large filtered collections render through VirtualList (PERF-3).
- **UP-6 Size PRs.** wseffect submits an upstream size reduction only when it is neutral for correctness and speed, and each such PR carries targeted tests proving behavior is unchanged.
  - **Candidates:** DevTools production gating (−4,433 B brotli) and a hydrate-only handoff that leaves the fresh boot path without hydration code (−4,381 B) [F:590-591, F:621-622].
  - **Rejected:** removing or dev-gating Foldkit's production assertions (PRI-1).
- **UP-7 No local patches.** No patch-package, no rewriting of Foldkit `dist`, no vendored Foldkit copy. The measured local-stub approach is a soft fork that breaks on any Foldkit minor release [F:635].

## 5. Scope and decomposition

| Order | Sub-project | Content |
|---|---|---|
| 1 | **Foundation (this spec)** | Monorepo and CI gates; the complete `@wsagency/wseffect-app`; the `@wsagency/wseffect-themes` core; `apps/gallery`; `bench/radix2solid` |
| 2 | Remaining Themes components and `@wsagency/wseffect-primitives` | Every Themes component not in TH-7/TH-8, plus Foldkit-style primitives missing upstream; DataTable (TH-15) |
| 3 | `@wsagency/wseffect-icons` | Icon package |
| 4 | Charts | Chart package |

**Foundation deliverables:**
1. The monorepo with every CI gate in §11–§13.
2. `@wsagency/wseffect-app`, complete per §7 and §8.
3. `@wsagency/wseffect-themes` core per §9:
   - tokens and CSS;
   - stateless components: Theme, Box, Flex, Grid, Text, Heading, Button, Card, TextField;
   - stateful components: Dialog, DropdownMenu, Tabs.
4. `apps/gallery`, which exercises every foundation component, lazy pages and the PWA. The e2e, size and performance tests run against it (§6.2).
5. `bench/radix2solid`, the comparison app (§12.4).

Exclusions are listed in §17.

## 6. Repository and packages

### 6.1 Layout and packages

```
wseffect/
  packages/app/          @wsagency/wseffect-app
  packages/themes/       @wsagency/wseffect-themes
  apps/gallery/          @wsagency/wseffect-gallery (private)
  bench/radix2solid/     radix2solid comparison app (private)
  bench/baselines/       size.json, perf.json
  tests/consumer/        packed-consumer gate, coverage-manifest.json
  e2e/                   Playwright specs
  .gitea/workflows/      CI
  docs/superpowers/      specs/, plans/
  README.md, LICENSE, CONTRIBUTING.md
```

| Package | Sub-project | `sideEffects` | Purpose |
|---|---|---|---|
| `@wsagency/wseffect-app` | 1 | `false` | Lazy pages, PWA, version check, app shell (§7–§8) |
| `@wsagency/wseffect-themes` | 1 (core) | `["**/*.css"]` | CSS and typed components (§9) |
| `@wsagency/wseffect-primitives` | 2 | `false` | Foldkit-style primitives missing upstream |
| `@wsagency/wseffect-icons` | 3 | `false` | Icons |
| charts package | 4 | `false` | Charts |

Only the first two packages are created in sub-project #1.

- **REPO-1 Manifests.** Every published package has:
  - `version` `0.0.0` (unpublished), `private: false`, `type: module`, `license: MIT`, `publishConfig.access: public`;
  - `repository` `git+https://git.wsagency.io/ws-agency/wseffect.git` with `directory`;
  - `files` limited to `dist`, `LICENSE`, `README.md`, `CHANGELOG.md`;
  - ESM-only `exports` with `{ types, default }` per subpath;
  - `peerDependencies`: `foldkit` and `@foldkit/ui` (themes only) pinned exactly; `effect` and `@effect/platform-browser` as `^4.0.5`. The `^4.0.5` range is supported only because CI tests both its floor and the newest 4.x (CI-2); it is the same widening this project requested from Foldkit in [PR #1699].

  JS-only packages declare `"sideEffects": false`; themes declares `["**/*.css"]` [R:25].
- **REPO-2 View identity at library build time.** The application's `@foldkit/vite-plugin` brands only modules outside `node_modules` [FK `packages/vite-plugin-foldkit/src/viewIdentity.ts:197-208`; F:41-44, F:404].
  - wseffect packages are therefore built with Foldkit's view-identity transform applied at library build time.
  - The packed-consumer gate (TEST-7) asserts that every `dist` module defining an exported view imports `foldkit/brand`.

### 6.2 Gallery

**Pages.** `apps/gallery` is a wseffect-app SPA (§7) with these lazy pages:

| Page | Exercises |
|---|---|
| `layout` | Box, Flex, Grid |
| `typography` | Text, Heading |
| `buttons` | Button |
| `cards` | Card |
| `textField` | TextField |
| `dialog` | Dialog |
| `dropdownMenu` | DropdownMenu |
| `tabs` | Tabs |
| `theme` | Accent, gray, radius, scaling and appearance controls |
| `sharedA`, `sharedB` | Shared-date demo; the route `/shared` mounts both |
| `virtualList` | 10k VirtualList |
| `form` | 200 memoized fields |
| `menus` | 200 memoized DropdownMenus |

**Shell.** The shell renders:
- a header showing the shared date and a date input;
- a submodel that shows and changes the date;
- navigation links, with prefetch on intent (APP-13).

The gallery declares `primaryPages: ['layout', 'typography', 'buttons', 'dialog']` (PWA-3). Its web manifest follows PWA-7.

## 7. wseffect-app: lazy pages

### 7.1 Page modules

- **APP-1 Page module shape.** A page is `src/pages/<key>.ts` exporting `export const page = definePage({ Model, Message, init, update, view })`, where:

  | Field | Type / rule |
  |---|---|
  | `Model` | A `Schema.Codec` |
  | `Message` | A `defineMessageUnion` |
  | `init` | `() => Update.Return<Model, Message, R>`; it receives no inputs |
  | `update` | Returns `Update.ReturnWithOutMessage<Model, Message, PageOutMessage, R>` |
  | `view` | A `Submodel.defineView<Model, Message, PageInputs>` |

  `definePage` is the identity at runtime; it exists for inference and checking [F:843-846].
- **APP-2 No top-level side effects.** A page module's top level contains only imports, exports, type declarations and pure initializers (lint rule `no-top-level-side-effects-in-pages`, APP-22), and `src/pages/package.json` is exactly `{ "sideEffects": false }`.
  - Evidence: a self-registering page built with `sideEffects:false` became an empty chunk, and the registry lookup returned `undefined` at runtime [F:731].
- **APP-3 Page keys.** A page key is its file basename and must match `^[a-z][A-Za-z0-9]*$`. Codegen (APP-5) fails on any other name.

### 7.2 Shell, registry and codegen

- **APP-4 How the shell references pages.** The shell references a page only through two things:
  - `import type { page as … } from './pages/<key>'`;
  - the generated loader `() => import('./pages/<key>').then(module => module.page)`.

  The production build emits one chunk per page, and page code appears 0 times in the entry [F:730].
- **APP-5 Codegen.**
  - **Tool:** `@wsagency/wseffect-app/vite` exports the Vite plugin `wseffect()`. At dev-server start, on adding or removing a file in `src/pages/`, and at build, it generates `src/pages.gen.ts` from `src/pages/*.ts` (excluding `*.test.ts`).
  - **Output:** the `Pages` type, the `pages` registry value, the `PageKey` Schema, the kit and per-page Message fields (`Got<Key>PageMessage` with `<Key>` = PascalCase key), the `toParentMessage` map and the per-page folds.
  - **File rules:** the file begins with `// Generated by @wsagency/wseffect-app/vite from src/pages; do not edit.` and is committed.
  - **Check mode:** `@wsagency/wseffect-app/codegen` exports the same generator. `pnpm check` runs it in check mode and fails if the committed file differs.
  - **Validation:** codegen fails if `src/pages/package.json` does not declare `"sideEffects": false`, or if `primaryPages` (PWA-3) names a key that has no page file.
- **APP-6 Standalone exports.** `makePages` returns only data: loaders, keys and a registry handle. Everything else is a separate named export of the package:
  - `slotsSchema`, `messageSchema`, `loaderSubscriptions`, `activate`, `foldPage`, `viewPage`;
  - `prefetchOnIntent`, `prefetchOnVisible`, `makeApp`, `ServiceWorker`.

  **Why:** the probe's object-of-functions kit shipped about 0.7 KB of unused minified code [F:772, F:827].

  **Test:** the packed-consumer tree-shaking check builds a consumer that imports only `makePages` and `loaderSubscriptions`, and asserts that no code from the other exports is present.

### 7.3 Page slots

- **APP-7 Slot states and transitions.** Each page has one slot in the shell Model, in one of six states: `Idle`, `Available`, `Loading`, `Failed{ cause: 'Offline' | 'NewVersion' | 'LoadError', reason }`, `Ready{ model }`, `Dehydrated{ encoded }`. Transitions happen only in `update` [F:714-724]:

  | From | Event | To |
  |---|---|---|
  | `Idle` | Route requiring the page entered | `Loading` |
  | `Idle` | Prefetch succeeded | `Available` |
  | `Available` | Route entered | `Ready`, with page `init` run in the same update and its Commands lifted |
  | `Loading` | Module loaded | `Ready` (`init`) |
  | `Loading` | Load failed | `Failed` (cause per APP-15) |
  | `Failed` (`Offline` or `LoadError`) | Retry, or route re-entered | `Loading` |
  | `Failed` (`NewVersion`) | Reload | Document reload (APP-16) |
  | `Dehydrated` | Module loaded | `Ready` decoded from `encoded` without running `init`, or `Ready` via `init` if decoding fails |

  Additional rules:
  - `Ready` stays `Ready` when its route is left, so the page Model is kept.
  - `Loading` stays `Loading` when its route is left, and loading resumes when the route is re-entered.
- **APP-8 Slot JSON codec.** The slot codec is a `Schema.declare` with a registry-aware `toCodecJson` link. Foldkit derives the Model JSON codec at boot in production too, and `Schema.Unknown` page models silently lose dev state [F:806-810]. The codec therefore obeys:
  - **Encoding is total** for every state.
  - **Decoding is total** for every JSON value; unrecognized input decodes to `Idle`.
  - `Ready` encodes with the page's own JSON codec.
  - `Dehydrated` encodes as `Ready` carrying its stored JSON.
  - `Available` encodes as `Idle`.
  - Encoded `Ready` decodes to `Ready` when the page is registered and its JSON decodes; otherwise it decodes to `Dehydrated`.
  - Unit tests cover every state × {registered, unregistered}.
- **APP-9 Page Message schemas.** `messageSchema(pages, key)` validates against the registered page's Message schema and rejects values when the page is not registered.
  - Evidence: a dev reload restored two lazy pages exactly, including an `Option` field, without re-running page `init`. A changed page schema re-initialized only that page [F:733-734].

### 7.4 Loading and prefetch

- **APP-10 Loader Subscription.** `loaderSubscriptions` provides one Subscription entry per page key, with dependencies `{ isNeeded: Schema.Boolean }`.
  - `isNeeded` holds when the current route requires the key and the slot is `Loading` or `Dehydrated`.
  - The stream loads the module once and emits `LoadedPageModule` or `FailedPageModule`. Leaving the route interrupts it.
  - **Why a Subscription and not a ManagedResource:** ManagedResource's `acquire` cannot use services, it dispatches an extra release Message per navigation, and size and timings are equal [F:752-756].
- **APP-11 One fetch per chunk.** At most one network fetch per page chunk per document.
  - Evidence: rapid A→B→A with chunks delayed 600 ms fetched each chunk once, and B's load was interrupted (0 `LoadedPageModule` for B) [F:737].
- **APP-12 Route-to-page mapping.** The app supplies `pagesForRoute(route): ReadonlyArray<PageKey>`. One route may require several pages; mounting two lazy pages at once is proven [F:743].
- **APP-13 Prefetch.** The package exports two prefetch helpers:
  - `prefetchOnIntent(key)`: attributes `OnMouseEnter` and `OnFocus` that dispatch the prefetch request.
  - `prefetchOnVisible(key)`: a Mount over `IntersectionObserver` that disconnects after the first intersection.

  Rules:
  - The prefetch Command only loads the module (`Idle` → `Available`) and never runs page `init`.
  - A failed prefetch leaves the slot `Idle`.
  - Evidence: exactly one fetch overall, and a failed prefetch does not affect the later navigation [F:739].
- **APP-14 No loading frame after prefetch.** A prefetched page is committed in the navigation update itself: no loading placeholder is added to the DOM.
  - Evidence at 4× CPU: prefetched navigation 16.5–19.7 ms versus 37.7–40.8 ms cold [F:739, F:776-781].

### 7.5 Load failures

- **APP-15 Failure classification.** When a page load fails, the first matching rule decides the cause:

  | Order | Condition | Cause |
  |---|---|---|
  | 1 | `navigator.onLine === false` | `Offline` |
  | 2 | `fetch('/version.json', { cache: 'no-store' })` rejects | `Offline` |
  | 3 | The response is 2xx, its body decodes to `{ buildId: string }`, and that `buildId` differs from the running build | `NewVersion` |
  | 4 | Otherwise, including non-2xx responses, undecodable bodies and an equal `buildId` | `LoadError` |

- **APP-16 Failure actions.**
  - **`Offline` and `LoadError`:** the page area shows Retry (→ `Loading`). Re-entering the route retries automatically.
    - Retrying the same `import()` URL recovers after abort, 404 and offline in Chromium, Firefox and WebKit [F:740].
  - **`NewVersion`:** the page area shows Reload.
    - **With a service-worker registration:** Reload awaits `registration.update()` and then the `waiting` worker (installing → installed), then runs `ApplyUpdate` (PWA-5). This stops the old precache from serving the old build again.
    - **Without a registration:** Reload calls `location.reload()`.
    - Evidence: after a deploy that deleted old assets, Retry could not recover a tab without a service worker; only a reload did [F:747, F:918-920].

### 7.6 Shared state

- **APP-17 One source of truth.** A value shown in more than one place lives exactly once in the Model. Data flows only these ways:
  - **Shell → page:** read-only `PageInputs`, passed as `viewInputs` at render time.
  - **Page → shell:** `PageOutMessage`.
  - **Shell → submodel:** `viewInputs`, and submodel → shell through OutMessages.

  Page `init` receives no inputs.

  Evidence for the date rendered in the shell header, a submodel and lazy pages: correct after a change from each location, while the page is mid-load (chunk delayed 1,200 ms), and with two lazy pages mounted at once. In every case only text and attributes were patched (0 structural mutations) [F:741-743; App. A.2].
- **APP-18 Contract types.** The app defines `PageInputs` and `PageOutMessage` once, as a `Readonly` record type and a `defineMessageUnion`; `makePages` is generic over both.
  - Memoization does not help consumers whose argument changed: a date shown in 300 children re-runs all 300 views [P:79-88, P:151]. Shared values therefore go only to the components that display them.

### 7.7 Application wrapper and services

- **APP-19 `makeApp` requires `resources`.** `makeApp(config)` returns Foldkit's application value, which is started with `Runtime.run`.
  - Its config type requires `resources: Layer.Layer<R>` whenever the services required by `init`, `update`, the app's subscriptions and the kit subscriptions are not `never`.
  - Omitting it is a compile error, verified by a `@ts-expect-error` test.
  - **Why:** Foldkit's own `resources?` is optional, so the omission compiles and then crashes at runtime with "Service not found" [F:86, F:811-815].
- **APP-20 Kit subscriptions.** `makeApp` merges the kit subscriptions into the app's subscriptions. The kit subscriptions are the page loaders (APP-10), the version poll (PWA-9) and service-worker events when the PWA is enabled (PWA-5).
  - Kit subscription keys are prefixed `wseffect:`.
  - An app subscription key starting with `wseffect:` is a compile error.
- **APP-21 Optional `PageLoader`.** `PageLoader` is an optional `Context.Service` read with `Effect.serviceOption`; when it is absent, the bundle's loaders are used.
  - Tests provide it to register pages synchronously.
  - `Effect.serviceOption` is current, non-deprecated v4 API [E:40].

### 7.8 Lint rules

- **APP-22 Lint plugin.** `@wsagency/wseffect-app/oxlint-plugin` provides three rules. CI runs them over every package and app. Each rule has failing and passing fixture tests.

  | Rule | Fails on |
  |---|---|
  | `no-effect-promise-in-command` | Any `Effect.promise` call in a module that calls `Command.define`. **Reason:** a rejected promise becomes a defect that crashes the runtime; use `Effect.tryPromise` and map the failure to a Message [F:816] |
  | `no-top-level-side-effects-in-pages` | In `src/pages/**`, any top-level expression statement, and any top-level initializer calling a function outside a configurable allowlist. **Default allowlist:** `Schema.*`, `defineMessageUnion`, `defineTaggedUnion`, `definePage`, `Submodel.defineView`, `Command.define`, `Mount.define`, `Mount.defineStream`, `createLazy`, `createKeyedLazy`, `pipe` [F:817] |
  | `no-page-inputs-in-model` | In `src/pages/**`, any reference to the page view's `PageInputs` parameter, or a binding destructured from it, inside the arguments of a Message constructor or of a function passed to an `h.On*` attribute. **Reason:** copying shared state into a page Model makes it stale [F:818] |

### 7.9 Chunking

- **APP-23 Stable `framework` chunk.** The `wseffect()` Vite plugin sets `build.rolldownOptions.output.codeSplitting.groups` to one group named `framework`. That group matches modules resolved from `node_modules` or from any `@wsagency/wseffect-*` package directory.
  - **Effect:** pages import shared code from `framework-*` instead of from the entry, so changing one page does not rename every chunk.
  - **Test:** building the gallery twice, with only one page source changed, changes exactly two asset filenames: the entry and that page.
  - **Evidence:** default chunking renamed 24 of 25 chunks, the `framework` group 2 of 25. The cost is about 0.6 KiB brotli [F:885-889].

## 8. wseffect-app: PWA and versioning

- **PWA-1 Service worker is optional.** `wseffect({ pwa: false })` builds without a service worker, and the app works online, with the version poll still running. Offline use and installation require the service worker.
- **PWA-2 Plugin settings.** The PWA uses `vite-plugin-pwa` 2.0.0, which peers on Vite `^8` [F:744], with:
  - `strategies: 'generateSW'`, `registerType: 'prompt'`, `injectRegister: false`, `clientsClaim: true`;
  - `navigateFallback: 'index.html'`, with `navigateFallbackDenylist: [/^\/assets\//]`.
- **PWA-3 Caching strategy (c), hybrid.**
  - **Precache:** `index.html`, the web manifest and its icons, the entry chunk, the `framework` chunk (which contains `workbox-window` under APP-23 chunking [F:889]), any separately emitted `workbox-window` chunk, and the chunks of the app-declared `primaryPages` (a `PageKey` list in the plugin config).
  - **Runtime cache:** `CacheFirst` for `/assets/*.js`, cache name `wseffect-pages`, `ExpirationPlugin` with `maxEntries: 200` and `maxAgeSeconds: 2592000` (30 days), `cacheableResponse.statuses: [200]`.
  - **Evidence, stable chunking and 20 realistic pages** [F:899-906; App. A.4]:

    | Strategy | First visit (brotli / requests) | Never-visited primary pages offline |
    |---|---|---|
    | (a) full | 286,588 B / 31 | yes |
    | (b) shell | 102,555 B / 8 | no |
    | (c) hybrid | 117,945 B / 12 | yes |

    Visited pages work offline under (b) and (c), and a one-page deploy costs 7,853 B for (c).
- **PWA-4 `clientsClaim: true` is required.** Without it, pages visited in the first session never enter the service-worker cache, and their offline success came only from the evictable HTTP cache. Offline tests assert membership in `wseffect-pages`, not just a successful render [F:926-931].
- **PWA-5 Service-worker service.** The `ServiceWorker` `Context.Service` is provided by a Layer and contains:
  - `events`: a `Stream` of `PwaEvent`, which is `UpdateAvailable | OfflineReady | RegisterFailed{ reason } | ChangedOnlineStatus{ isOnline }`;
  - `applyUpdate`: an `Effect<void, ServiceWorkerUpdateError>`.

  Events reach the Model through a persistent Subscription. The `ApplyUpdate` Command maps failure to `FailedApplyUpdate` [F:694-696, F:816].
- **PWA-6 Update experience.** `UpdateAvailable` shows a banner with Reload.
  - A reload *before* accepting keeps the tab entirely on the old build.
  - Accepting moves shell and pages to the new build together.
  - Each phase requests JavaScript of one build only [F:747].
- **PWA-7 Web manifest.** Fields: `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, `background_color`, and PNG icons at 192×192 and 512×512.
  - The icon sizes are Chromium's installability requirement, not a research measurement.
  - A unit test validates the gallery manifest.
- **PWA-8 Build ID.** The build ID is the lowercase hex SHA-256 of the sorted, newline-joined list of emitted `assets/*` filenames.
  - It is compiled into the app and written to `dist/version.json` as `{ "buildId": "<hex>" }`.
- **PWA-9 Version poll.** The version-poll Subscription fetches `/version.json` with `cache: 'no-store'`:
  - every `versionPollMs` (default 300,000 ms, a chosen default, not a measurement) while `document.visibilityState === 'visible'` and `navigator.onLine`;
  - immediately on `visibilitychange` to visible;
  - immediately on the `online` event.

  Handling:
  - A different `buildId` emits `NewVersionAvailable` and shows the PWA-6 banner. With a service-worker registration present, it also calls `registration.update()`.
  - Network or parse failures emit nothing and change nothing.
  - **Why it exists:** without a service worker, an open tab never learns that a new version exists [F:956].
- **PWA-10 Server contract.** The wseffect-app README documents this contract and the e2e test server implements it:

  | Path | Headers and behavior |
  |---|---|
  | `assets/*` | `Cache-Control: public, max-age=31536000, immutable`; the previous 3 deployments' files stay available (3 is a chosen value) |
  | `index.html`, `sw.js`, `version.json`, `manifest.webmanifest` | `Cache-Control: no-cache` |
  | Extensionless unknown paths | Serve `index.html` |
  | Missing assets | 404 |

  **Evidence for retention:** with retained assets and no service worker, an old tab kept loading old lazy pages, kept its shared state, and loaded the entry exactly once [F:937-953; App. A.5].
- **PWA-11 Documented limits.** The README states what asset retention and the update prompt do not solve:
  - backend and stored-data skew;
  - loss of in-memory state on reload.

  Apps persist state they need before `ApplyUpdate` or Reload [F:955-960].

## 9. wseffect-themes core

### 9.1 CSS and tokens

- **TH-1 CSS sources.** The Radix Themes CSS sources and the PostCSS pipeline are copied from radix2solid commit `db5c0f04596be5bf1838c79efa7357d675736acd`: `packages/themes/src/styles`, `postcss.config.js`, `scripts/build-css.js`, `postcss-breakpoints.js`, `postcss-whitespace.js`. The source commit is recorded in `packages/themes/UPSTREAM.md`.
  - **Plugin chain:** `postcss-import` → `postcss-nesting` → `postcss-breakpoints` → `postcss-custom-media` → `postcss-combine-duplicated-selectors` → `postcss-discard-empty` → `postcss-whitespace` → `autoprefixer` [R:33].
- **TH-2 CSS outputs.** `styles.css`, `components.css`, `utilities.css`, `tokens.css`, `tokens/base.css`, `tokens/colors/<color>.css`, `layout.css`, `layout/{tokens,components,utilities}.css`, per-component `css/<component>.css`, `css/common.css` and `css/utilities.css`. Each has a `.layer.css` sibling wrapped in `@layer radix` [R:34].
  - Component CSS covers the foundation components plus their CSS dependencies from the radix2solid dependency map.
- **TH-3 Radix Colors.** `@radix-ui/colors` 3.0.0 is consumed unchanged from npm: 30 palettes, imported the way radix2solid imports them [R:36].
- **TH-4 Breakpoints.** `xs` 520, `sm` 768, `md` 1024, `lg` 1280, `xl` 1640 px, all min-width [R:43].

### 9.2 Stateless components

- **TH-5 Component shape.** Theme, Box, Flex, Grid, Text, Heading, Button, Card and TextField are pure functions `X.view(props, children, h)`:
  - Each exports an Effect Schema `X.Props`, from which its TypeScript prop type derives. `view` does not decode props at runtime.
  - Props hold only primitives, responsive records of primitives, Message values and `Html` children.
  - No component keeps per-instance state or needs closures that stay stable across renders. A caller can therefore memoize any subtree with `createLazy(fn, [primitive args…, h])`.
- **TH-6 Class mapping by lookup table.** Prop values map to classes through lookup tables precomputed from the Schema literal domains with pure initializers. There is no per-render string concatenation for enum props, and data attributes are emitted only where Radix Themes CSS selects on them.
  - **Evidence:** a themed wrapper that concatenated classes and added four data attributes per render cost +59.8% scripting over `Button.view` at 4× CPU (54.34 vs 34.01 ms update median) and +53% at 1× (13.69 vs 8.93 ms) [P:96-98; App. A.6].
- **TH-7 Responsive props.** `Responsive<T> = T | Partial<Record<'initial' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', T>>`.
  - Enum values map to `rt-r-<prop>-<value>` and `<bp>:rt-r-<prop>-<value>`.
  - Arbitrary values map to the base class plus an inline custom property `--<prop>` or `--<prop>-<bp>`, as in radix2solid [R:41-42].
- **TH-8 Reuse of `@foldkit/ui` helpers.** Button wraps `@foldkit/ui` `Button.view` and TextField wraps `Input.view`, so ARIA and behavior come from `@foldkit/ui` [F:151].

### 9.3 Stateful components

- **TH-9 Wrapped submodels.** Dialog, DropdownMenu and Tabs wrap the `@foldkit/ui` Dialog, Menu (`Menu.create<Item>()`) and Tabs submodels.
  - Their Model, Message and OutMessage are the `@foldkit/ui` types, re-exported unchanged; there is no wrapper state.
  - Themed views pass Radix Themes classes through `toView` (Dialog, Tabs) or through className/attributes config (Menu) [F:170-176, F:216].
  - Structural inline styles from `@foldkit/ui`, such as Dialog's `z-index: 2147483600`, are retained (PRI-1) [F:176].
- **TH-10 Helpers.** Each stateful component exports two helpers:
  - `fold(config)`: an `Update.foldChild` preconfigured with the component's `update`;
  - `embed(h, config)`: `h.submodel` with the themed `viewInputs`.

### 9.4 Theme

- **TH-11 Root Theme.** The root `Theme.view` renders an element with class `radix-themes` and the attributes `data-is-root-theme`, `data-accent-color`, `data-gray-color`, `data-radius`, `data-scaling`, `data-has-background` and `data-panel-background`. It adds class `light` or `dark` when `appearance` is not `inherit`.
  - **Defaults:** accent `indigo`, gray `auto` (resolved through the matching-gray table), radius `medium`, scaling `100%`, panel background `translucent`, background on, appearance `inherit` [R:45].
- **TH-12 Settings live in the Model.** Theme settings, including appearance, live in the app Model; Foldkit has no context mechanism.
  - A nested `Theme.view` renders a wrapper element carrying only the attributes passed to it. One exception: when `accentColor` is passed and `grayColor` is `auto`, it also emits `data-gray-color` with the matching gray.
  - Settings that are not passed inherit through the CSS cascade.
- **TH-13 Minimal theme-change DOM work.** Changing one theme setting mutates exactly one attribute (or the appearance class) on the Theme element, and memoized descendants are reused.
  - **Test:** a MutationObserver scoped outside the theme controls, plus `Lazy.expectAllReused`.
  - **Evidence:** the measured upper bound re-ran all 1,000 button views and reached a 120 ms p95 theme switch at 4× CPU [P:100, P:152, P:154].
- **TH-14 Accessibility of the CSS.** The themed CSS keeps Radix Themes' focus and forced-colors rules unchanged; per-component Scene tests assert the ARIA output of the wrapped `@foldkit/ui` behavior.

### 9.5 Rule for later collection components

- **TH-15 DataTable.** DataTable is sub-project #2, but this rule is fixed now: it renders through VirtualList, memoizes rows with keyed memo, and keeps its keyed cache bounded by its own lifetime (PERF-1, PERF-3, PERF-4).

## 10. Performance rules

These rules come from the performance research repercussions [P:144-155].

- **PERF-1 Keyed memo by default.** Rows, form fields and stateful submodels memoize with `createKeyedLazy`, keyed by stable entity IDs. Measured effects [P:35-36, P:74-75, P:108-109]:

  | Scenario | Effect |
  |---|---|
  | 1k-row cell edit | Row views 1,000 → 1; scripting 24.43 → 1.99 ms at 1× |
  | 200-field edit | Field views 200 → 1–2; scripting p95 at 4× 42.50 → 10.36 ms |
  | 200 Menus, unrelated update | Menu views 200 → 0; scripting p95 at 4× 59.81 → 9.10 ms |

- **PERF-2 `createLazy` takes primitives.** `createLazy` receives primitive arguments only, never `viewInputs` or props objects built during the parent's render, because those are new objects on every render [F:822].
- **PERF-3 Virtualize large collections.** wseffect components that render data-driven collections use VirtualList.
  - **Evidence:** a 10k keyed table took 640–6,100 ms Event Timing at 4× CPU, while VirtualList with 10k items stayed at 24–32 ms [P:45-52, P:60-66].
  - **Guidance for apps:** virtualize by the time row counts reach the low thousands. This threshold is marked [INFERENCE] in the research [P:147].
- **PERF-4 Bounded keyed caches.** Every `createKeyedLazy` instance lives no longer than a bounded component lifetime and uses a bounded key space. `createKeyedLazy` never evicts: 10k unique keys retained 41,502,120 B after GC [P:115-118, P:129].
- **PERF-5 Thin themed wrappers.** Themed wrappers stay thin (TH-6), and no submodel or context machinery is used for styling [P:152].
- **PERF-6 Memoize page views.** `h.submodel` does not memoize, so the kit's `viewPage` wraps each page view in `createLazy` with the slot model and the primitive `PageInputs` fields as arguments [F:801, F:858].

## 11. Budgets

**Units and method:**
- 1 KiB = 1,024 B.
- "Brotli" means Node `zlib` brotli at quality 11: of the built file for shell figures, and of the response body as served for first-visit figures.

**Gates:**
- **GATE-S1 Shell size.** The entry chunk plus the `framework` chunk of the gallery production build total ≤ 122,880 B (120 KiB) brotli.
  - Reference: the research shell measured 94,557 B (6,097 B entry + 88,460 B `framework`) **without Themes JavaScript** [F:889; App. A.4]. The foundation shell has not been measured.
  - The first implementation-plan task that builds the gallery records the real foundation shell size in `bench/baselines/size.json`.
  - If that size exceeds 122,880 B, the gate is not raised silently: the PR reports the measured size with a source-map attribution and an explanation, and the user decides whether the budget changes or the code does. Until that decision, the `size` job stays failing.
- **GATE-S2 First-visit transfer.** Server-counted brotli bytes from navigating to `/` until the service worker controls the page and the server has seen no request for 1 s total ≤ 163,840 B (160 KiB).
  - Reference: 117,945 B in 12 requests with 4 primary pages [F:906; App. A.4].
- **GATE-S3 Growth.** These tracked artifacts are compared with `bench/baselines/size.json`:
  - the GATE-S1 total;
  - the GATE-S2 total;
  - each gallery page chunk;
  - `styles.css`.

  Growth above 2% fails unless the same PR updates that artifact's baseline entry with a non-empty `reason`.

## 12. Testing

### 12.1 Performance gate

- **GATE-P1 Method** [P:6-7]:
  - **Build and browser:** the gallery production build served by `vite preview`, in Chromium via Playwright, with CDP `Emulation.setCPUThrottlingRate { rate: 4 }`.
  - **Event Timing:** `PerformanceObserver({ type: 'event', durationThreshold: 16, buffered: true })`. An interaction's duration is its longest entry per `interactionId`. An interaction with no qualifying entry is recorded as 16 ms.
  - **Scripting:** the CDP `ScriptDuration` delta per interaction.
  - **Sampling:** 10 page sessions per scenario; the statistic is the median.
- **GATE-P2 Ceilings** (Event Timing median):

  | Scenario | Ceiling | Research median at 4× |
  |---|---|---|
  | VirtualList 10k: update visible cell | ≤ 50 ms | 28 ms [P:60-66] |
  | VirtualList 10k: filter typing | ≤ 50 ms | 24 ms |
  | VirtualList 10k: sort | ≤ 50 ms | 32 ms |
  | VirtualList 10k: select visible row | ≤ 50 ms | 24 ms |
  | 200 memoized fields: edit one field | ≤ 30 ms | 16 ms [P:75] |
  | 200 memoized DropdownMenus: unrelated update | ≤ 30 ms | 24 ms [P:109] |

- **GATE-P3 Regression.**
  - **Baseline:** `bench/baselines/perf.json` stores a baseline commit.
  - **Procedure:** CI builds the gallery at that commit and at the candidate, then runs 10 interleaved baseline/candidate session pairs (ABAB) per scenario on the same runner.
  - **Fail conditions:**
    - the candidate `ScriptDuration` median exceeds 1.10 × the baseline median from the same run; or
    - the candidate Event Timing median exceeds the baseline by more than 10% **and** by at least 8 ms.
  - **Why this design:**
    - An A/A control showed a 0.83 ms median scripting split, with paired spread up to +10.14 ms [P:246-253].
    - ABAB is the method that measured #1700 [P:220].
    - Every Event Timing value in the research is a multiple of 8 ms [P:35-52].
  - The baseline commit changes only through a PR that edits `perf.json` and gives a reason.
- **GATE-P4 Reuse assertions.** `Lazy.expectAllReused` [F:312] covers every Themes component and every memoized gallery subtree.

### 12.2 Functional tests

- **TEST-1 Story tests.** Every module exporting an `update` (packages, the gallery shell, gallery pages) has Story tests. The coverage requirement applies to `update` modules only, not to view modules: Vitest V8 per-file function coverage is 100% for every module that exports an `update`, which covers every `Message.match` arm. View modules are covered by TEST-2, without a coverage percentage.
- **TEST-2 Scene tests.** Every exported view (Themes components, `viewPage`, gallery pages) has Scene tests that use role and label locators and assert ARIA output and interactions.
- **TEST-3 Browser e2e.** Every Playwright spec runs against the production gallery in Chromium, Firefox and WebKit. On every gallery route in every engine, axe-core 4.11.0 must report zero violations [R:54].
- **TEST-4 Ported probe scenarios.** The probe scenarios become e2e specs with the same pass criteria [F:726-747, F:899-947; App. A.2, A.4, A.5]:

  | Area | Pass criteria |
  |---|---|
  | Initial load | No page chunk fetched on load |
  | Shared date | Shared date in three places (shell, submodel, lazy page), with text-only patches; mid-load date change; two lazy pages mounted at once |
  | Navigation | Deep links fetch exactly the required chunks; back/forward keeps page state with one fetch per chunk; rapid A→B→A (one fetch, interrupted load) |
  | Failure and prefetch | Chunk failure → `Failed` → Retry; hover and viewport prefetch with one fetch and no loading frame; a failed prefetch does not poison navigation |
  | Dev reload | In the Chromium dev server: lazy pages restored with `Option` fields and no `init` re-run; a page schema change re-inits only that page |
  | PWA | Precache contents; offline reload, offline lazy pages and offline deep link; the update prompt, with reload-before-accept staying on the old build |
  | Deploy skew | Under strategy (c), deleted versus retained old assets: with deletion, the changed page goes to `Failed{NewVersion}` with Reload; with retention, the old tab keeps working |
  | Service-worker cache | Membership in `wseffect-pages` (PWA-4) |
  | Chunk stability | The two-filenames rule of APP-23 |

- **TEST-5 Compile-time tests.** `@ts-expect-error` tests cover [F:729]:
  - a wrong page Message at the shell boundary (unknown tag, another page's Message, wrong payload);
  - a loader resolving to the wrong page;
  - a page emitting a non-`PageOutMessage`;
  - `makeApp` without the required `resources`.
- **TEST-6 Lint fixtures.** Fixture tests for every APP-22 rule.
- **TEST-7 Packed consumer.** Each package is `pnpm pack`ed and its tarball renamed to a content-hash name. An independent fixture is then installed from those tarballs with the root's exact pins [R:51-52]. The fixture lives outside the repository's pnpm workspace, so no root `pnpm-workspace.yaml` setting (overrides, peer rules, release-age settings) applies to it. Its own `pnpm-workspace.yaml` contains exactly the UP-8 consumer snippet and nothing that resolves Effect or Foldkit differently. In that fixture:
  - a gallery copy is built and `tsc` runs;
  - Chromium e2e runs against the packed build;
  - the tree-shaking check (APP-6) and the branding check (REPO-2) run.

  `tests/consumer/coverage-manifest.json` enumerates every public subpath, export and CSS file with the IDs of the checks that cover it. The gate fails on any public item missing from the manifest, or any manifest entry without a passing check.
- **TEST-8 Repository checks.** Codegen check mode (APP-5), the single-Effect check (UP-3) and the gallery manifest test (PWA-7).

### 12.3 Test environment

Story and Scene tests run in Vitest with happy-dom, as Foldkit's do [F:312]. Happy DOM is used for functional tests only, never for performance gates (§15, risk 6).

### 12.4 Comparison baseline

- **BENCH-1 The comparison app.** `bench/radix2solid/` is a Solid 2 app with the gallery's foundation scope: the same components and lazy routes. It consumes radix2solid only from packed tarballs of commit `db5c0f04596be5bf1838c79efa7357d675736acd`.
  - The commit is recorded in `bench/radix2solid/library-source.json` as `{ repository, commit }`, the shape radix2solid-web uses (radix2solid-web pins `e1ecdf69bc24ec24035d7b1977c3931430294cc4`) [R:69].
- **BENCH-2 Side-by-side report.** Every CI run reports wseffect and radix2solid side by side as a job summary and a JSON artifact. The report covers GATE-S1/S2-equivalent sizes and the GATE-P1 scenarios, measured the same way. It is reporting only and never gates.
  - **Research context, matched DOM.** The earlier "Solid filters about 11× faster" figure [P:131-142] compared pages whose Foldkit side had 3.4× more layout objects (24,025 vs 7,011) [P:179], and is not used. The S9 comparison used the same table on both sides: 1,000 rows, 10,000 cells, 1,001 inputs, 1,007 buttons (`domCounts` of S9 groups `branch 1000/*/keyed/*` and `solid 1000/*/Solid/*`). Event Timing / scripting medians in ms:

    | CPU | Action | Foldkit keyed | Solid 2 |
    |---|---|---|---|
    | 1× | Cell | 40 / 2.54 | 40 / 4.77 |
    | 1× | Filter | 52 / 16.95 | 32 (8 of 10 qualified) / 24.69 |
    | 4× | Cell | 168 / 10.59 | 184 / 41.66 |
    | 4× | Filter | 208 / 65.24 | 292 / 118.62 |

  - These Foldkit figures were measured on an earlier #1700 revision that was later discarded [P:218]. The current #1700 revision and `origin/main` were not measured against Solid on the matched DOM. The bench therefore re-measures both frameworks itself and does not reuse these numbers.
- **BENCH-3 Provenance and import.** The first version of this baseline is being built now at `/tmp/wseffect-research/r2s-baseline` and is **to be imported in sub-project #1**. Its provisional build used source commit `db5c0f04…` with an uncommitted worktree snapshot.
  - The imported bench must build from a clean checkout of the pinned commit.
  - Provisional numbers from the snapshot are not reused.

## 13. CI and tooling

- **CI-1 Workflow.** Gitea Actions at git.wsagency.io runs `.gitea/workflows/check.yml` on `push` and `pull_request`, with `runs-on: ubuntu-24.04`. Its setup steps: pnpm 11.5.0, Node 24.21.0, `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium firefox webkit`.
- **CI-2 Jobs.**

  | Job | Status | Content |
  |---|---|---|
  | `check` | Required | Build, typecheck, lint (APP-22), TEST-1 to TEST-8 |
  | `size` | Required; runs after `check` passes | GATE-S1 to GATE-S3 |
  | `perf` | Required; runs after `check` passes | GATE-P1 to GATE-P4 |
  | `effect-latest` | Required for PRs that change any dependency version; informational otherwise; also nightly | Resolves `effect` and `@effect/platform-browser` to the newest 4.x published at least 24 h earlier, then runs typecheck, Story and Scene tests and Chromium e2e. A failing run on `main` must be resolved before any further dependency-changing PR merges, either by a fix or by lowering the upper bound of the published `effect` peer range below the failing version |
  | `bench-radix2solid` | Informational | BENCH-2 |

- **CI-3 Tool pins.**

  | Item | Pin |
  |---|---|
  | `packageManager` | `pnpm@11.5.0` |
  | `.node-version` | `24.21.0` |
  | `engines.node` | `>=24 <25` |
  | TypeScript | 7.0.2 |
  | Vite | 8.3.4 |
  | Playwright | 1.64.1 |
  | axe-core | 4.11.0 |
  | `vite-plugin-pwa` | 2.0.0 |
  | `workbox-window` | 7.4.1 |
  | `@radix-ui/colors` | 3.0.0 |

  - Every other dependency (for example Vitest and happy-dom) is added with an exact version at implementation start, and the lockfile is frozen.
  - Repository manifests use exact versions only. The one exception is the published Effect peer range of REPO-1. The workspace-level `peerDependencyRules.allowedVersions` entries of UP-2 name the exact version 4.0.5 [R:15-17].
- **CI-4 `pnpm-workspace.yaml`.**
  - `packages: [packages/*, apps/*, bench/*]`, `managePackageManagerVersions: false`, `strictPeerDependencies: true`.
  - The UP-2 `overrides` and `peerDependencyRules`.
  - The global 24 h `minimumReleaseAge` stays. `minimumReleaseAgeExclude` lists only exact versions, each with a comment giving its reason and removal condition (the radix2solid pattern) [R:16].
- **CI-5 Commits.** Credit belongs to the commit author. `Co-authored-by` trailers appear only for real human contributors; no AI co-author trailers [R:64].

## 14. Error handling

- **ERR-1 Commands.** Every Command has error channel `never`; failures become declared Messages through `Effect.tryPromise`, `Effect.match` or `Effect.catch` [E:41]. `Effect.promise` is banned in Command modules (APP-22).
- **ERR-2 Page loads.** Page load failures follow APP-15 and APP-16.
- **ERR-3 Service-worker registration failure.** It emits `RegisterFailed`, and the app continues online-only.
- **ERR-4 Update failure.** An `ApplyUpdate` failure emits `FailedApplyUpdate`, and the banner stays.
- **ERR-5 Version-poll failure.** It is silent; the next scheduled poll retries (PWA-9).
- **ERR-6 Model codec.** The slot codec never throws (APP-8); an undecodable restored page re-runs page `init`.
- **ERR-7 Missing `resources`.** A missing `resources` Layer is a compile error (APP-19).
- **ERR-8 Unexpected defects.** Unexpected defects reach Foldkit's crash view, unchanged. Apps may supply `crash.view`.

## 15. Risks

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| 1 | Foldkit pre-1.0 churn and a single maintainer | 168 minors in about 13 months; 39 of the last 50 commits by one author; median external PR merge 1.70 days [F:347-350, E:49] | Exact pins; every upgrade is its own PR with the full suite (UP-1) |
| 2 | Effect breaks API in a patch release | Effect 4.0.3 #8935 changed `Crypto.randomUUIDv4` [E:11, PR #1699] | `effect-latest` CI job next to the pinned floor (CI-2) |
| 3 | Upstream PRs stay unmerged | #1699 and #1700 open on 2026-10-19 [PR #1699, PR #1700] | Interim override and UP-3; VirtualList for large filtered lists (UP-5) |
| 4 | Upstream website E2E runs out of memory, slowing upstream contributions | 16 workers OOM at about 4.1 GB V8 heap on unmodified main; passes with `--workers=4` and an 8 GB heap [PR #1699] | `CONTRIBUTING.md` section "Upstream Foldkit PRs" prescribes `--workers=4` and `NODE_OPTIONS=--max-old-space-size=8192` for local upstream verification |
| 5 | Cold first visit to a lazy page costs 2 frames | 37.7–40.8 ms cold vs 16.5–19.7 ms prefetched at 4× [F:776-781, F:789] | Prefetch on intent and viewport (APP-13); precaching only saves bytes, not the frame |
| 6 | #1700 is slower in Happy DOM's shuffle case | 5.5% slower, outside the 3.5% noise band; Chromium within noise [PR #1700, P:211-214] | Performance gates run in Chromium only; Happy DOM serves functional tests only (§12.3) |
| 7 | Performance-gate noise on CI | A/A scripting spread up to +10.14 ms [P:246-253] | Same-runner ABAB against the baseline commit (GATE-P3) |
| 8 | Bundle floor | About 83 KB brotli for any Foldkit SPA; < 50 KB unreachable without an API redesign [F:637-657] | Budgets sized against measurement (§11); no local stubs (UP-7) |
| 9 | Registry invariant is not type-guaranteed | `Ready ⇒ registered` holds by construction only [F:798] | Codec and transition tests for every state (APP-7, APP-8) |
| 10 | Library views lose view identity | The app plugin skips `node_modules` [FK `viewIdentity.ts:197-208`] | Brand at library build time; packed check (REPO-2) |
| 11 | HTTP cache masks offline gaps | First-session pages are offline only via the HTTP cache without `clientsClaim` [F:926-931] | `clientsClaim: true`; tests check service-worker cache membership (PWA-4) |
| 12 | Event Timing threshold censors fast interactions | Interactions under 16 ms emit no entry [P:7] | Record missing entries as 16 ms (GATE-P1) |
| 13 | The radix2solid comparison targets a moving library | The bench pins `db5c0f04…`, which is on radix2solid `origin/main`; the rc.3 work in the next-suite worktree is not merged | The bench compares only against the merged pinned commit (BENCH-1). Moving the pin is a separate PR that edits `library-source.json` and states the reason; it is never bundled with wseffect changes |

## 16. Licensing and attribution

- **LIC-1 Root license.** The root `LICENSE` contains, in order:
  1. the project MIT license, `Copyright (c) 2026 wseffect contributors`;
  2. a disclaimer paragraph stating that wseffect adapts and reuses upstream work under its original licenses and is not affiliated with or endorsed by Foldkit, WorkOS or Radix;
  3. verbatim MIT texts for Radix Themes (Copyright (c) 2023 WorkOS), Radix Colors npm 3.0.0 (Copyright (c) 2021 Radix) and radix2solid (Copyright (c) 2026 Radix2Solid contributors), separated by `----` rules [R:66].

  Foldkit is a dependency, not copied code, so it needs no notice.
- **LIC-2 Package licenses.** `packages/app/LICENSE` contains the project MIT text. `packages/themes/LICENSE` contains the project MIT text plus the Radix Themes, Radix Colors and radix2solid notices.
- **LIC-3 READMEs.** The root README opens with an independence statement (unofficial; not endorsed; MIT grants no trademark rights) and the package list. It then contains a `## Created for WS Agency` section identical in structure to radix2solid's:
  - the `ws-vertical-white.svg` / `ws-vertical-color.svg` picture element, width 160;
  - the text "wseffect was created by [Kristijan Lukačin](https://github.com/klukacin) (@klukacin) for [WS Agency](https://ws.agency), the firm behind this project. We love open source, enterprise development and AI. Have a project in mind? [Let’s build it together](https://ws.agency/contact).";
  - the brand-exclusion sentence linking `https://design.ws.agency/docs/usage-and-licenses.md`.

  These are followed by `## Contributing`, `## Local development`, `## Distribution and gates` and `## License` [R:64]. Each package README ends with a License paragraph naming its retained notices.

## 17. Out of scope

- `@wsagency/wseffect-primitives` (sub-project #2), `@wsagency/wseffect-icons` (#3), charts (#4).
- Every Themes component not listed in §5. These belong to sub-project #2: AccessibleIcon, AlertDialog, AspectRatio, Avatar, Badge, Blockquote, Callout, Checkbox, CheckboxCards, CheckboxGroup, Code, Container, ContextMenu, DataList, DataTable, Em, HoverCard, IconButton, Inset, Kbd, Link, Popover, Portal, Progress, Quote, Radio, RadioCards, RadioGroup, Reset, ScrollArea, Section, SegmentedControl, Select, Separator, Skeleton, Slider, Slot, Spinner (shipped only as a CSS dependency), Strong, Switch, TabNav, Table, TextArea, ThemePanel, Tooltip, VisuallyHidden.
- SSR, SSG and hydration. wseffect apps are SPAs. If SSR is adopted later, it must respect Foldkit's build-ID refusal: HTML network-first, or HTML and JavaScript precached atomically per build [F:837-841].
- npm publication and a publish workflow; the documentation website.
- Dependencies on `@foldkit/devtools` or `@foldkit/devtools-mcp`, Tailwind integration, and React or Solid adapters.
- Local patches or forks of Foldkit (UP-7).

## 18. Specification self-review and next gate

Self-review checked for placeholders, contradictions, ambiguity and scope:
- **Placeholders:** none remain.
- **Contradictions:** the PRI-1 assertion rule and the UP-6 rejection agree. The exact repository pin of Effect (UP-2) and the published `^4.0.5` peer range (REPO-1) are distinct and both stated.
- **Scope:** exactly the approved scope; later sub-projects appear only as decomposition and in §17.

To make approved statements testable, the following were fixed explicitly:

| Decision | Where |
|---|---|
| KiB units and brotli quality 11 | §11 |
| 16 ms recording rule for censored Event Timing | GATE-P1 |
| ABAB regression method and the 8 ms Event Timing floor | GATE-P3 |
| Failure classification via `version.json` | APP-15 |
| Poll interval of 300,000 ms (chosen default) | PWA-9 |
| Retention of the previous 3 deployments (chosen value) | PWA-10 |
| Runtime cache expiration of 200 entries / 30 days | PWA-3 |
| Committed codegen output with check mode | APP-5 |
| Exact lint-rule definitions | APP-22 |
| radix2solid pin for both CSS and bench | TH-1, BENCH-1 |
| Package version 0.0.0 | REPO-1 |
| Published Effect peer range `^4.0.5`, backed by floor and latest CI | REPO-1, CI-2 |

Values marked "chosen" are design decisions, not measurements.

**Next gate:** the user reviews this written specification. After approval, the implementation plan is written with writing-plans. No product code is written before that plan is approved.

## Appendix A. Evidence tables

These tables are reproduced from the research files, because `/tmp` is ephemeral.

### A.1 Effect pin [E:7-23]

| Fact | Value |
|---|---|
| Stable versions | 4.0.0–4.0.5; `latest` = 4.0.5, published 2026-10-15T01:27:07Z |
| Foldkit 0.168.0 peers | `effect` 4.0.0, `@effect/platform-browser` 4.0.0 (exact) |
| Override probe (effect and platform-browser → 4.0.5) | `tsc` pass; build pass (305.31 kB, gzip 100.71 kB); 9/9 browser checks; one deduplicated `effect@4.0.5` |
| Patch-release relevance | 4.0.1–4.0.5 fix Schema parser reuse (#8810), cache interruption races (#8719, #8837, #8977), stream hangs (#9106), interruption and finalization semantics; 4.0.3 #8935 changed the Crypto UUID API |

### A.2 Lazy-page contract checks (probe-app) [F:729-747]

| Check | Result |
|---|---|
| Wrong page Message rejected by tsc (4 cases + non-`PageOutMessage`) | PASS |
| Page chunks 666 / 381 / 265 B brotli; 0 page markers in the entry | PASS |
| Works with `sideEffects:false`; the self-registering control became an empty chunk | PASS |
| Subscription and ManagedResource loaders | 22/22 each |
| Dev reload restores both pages, including `Option`; `init` not re-run; schema change re-inits | PASS |
| Deep links fetch `{1,0,0}`, `{1,1,0}`, `{0,1,0}` | PASS |
| Rapid A→B→A: 1 fetch each; B `LoadedPageModule` = 0 | PASS |
| Failure → Retry; re-entering the route retries | PASS |
| Hover and viewport prefetch: 1 fetch, no loading frame | PASS |
| Same-URL `import()` retry in Chromium, Firefox, WebKit | PASS |
| Shared date in 3 places: 5/6/6 mutations, 0 structural | PASS |
| Date change mid-load (1,200 ms delay) shows the current date | PASS |
| Two lazy pages: 4 nodes equal, 0 structural | PASS |

### A.3 Contract cost [F:761-792]

**Entry size** (brotli, no instrumentation):

| Build | Entry brotli |
|---|---|
| probe-lazy (Command loader, `Schema.Unknown`) | 86,585 B |
| Subscription loader, no PWA glue | 90,430 B |
| ManagedResource loader, no PWA glue | 90,297 B |
| Subscription loader with real PWA | 90,698 B |

**Timing** (median of 15 at 4× CPU):

| Build | First render | Cold nav | Prefetched nav | Revisit |
|---|---|---|---|---|
| probe-lazy (Command loader) | 179.0 ms | 35.4 ms | — | 12.4 ms |
| Subscription + PWA glue | 206.2 ms | 39.1 ms | 19.7 ms | 10.3 ms |
| Subscription, no PWA glue | 196.2 ms | 40.8 ms | 16.5 ms | 9.8 ms |
| ManagedResource + PWA glue | 198.6 ms | 37.7 ms | 19.2 ms | 10.3 ms |

### A.4 PWA strategies, 20 synthetic pages (5.6–13.0 KiB brotli each) [F:866-910]

Bytes are brotli as served; the second number is the request count. Chunking "stable" means the `framework` group of APP-23.

| Chunking | Strategy | First visit | Never-visited page | Offline after reload (visited / never / primary) | One-page update install |
|---|---|---|---|---|---|
| default | (a) full | 285,803 / 31 | 0 | ok / ok / ok | 279,642 / 27 |
| default | (b) shell | 101,911 / 8 | 7,386 / 1 | ok / Failed / Failed | 93,524 / 4 |
| default | (c) hybrid | 117,280 / 12 | 7,386 / 1 | ok / Failed / ok | 108,941 / 8 |
| stable | (a) full | 286,588 / 31 | 0 | ok / ok / ok | 19,068 / 5 |
| stable | (b) shell | 102,555 / 8 | 7,390 / 1 | ok / Failed / Failed | 7,025 / 3 |
| stable | (c) hybrid | 117,945 / 12 | 7,390 / 1 | ok / Failed / ok | 7,853 / 4 |

- Shell JavaScript (stable): entry 6,097 B + `framework` 88,460 B = 94,557 B.
- A p07-only change renamed 24/25 chunks with default chunking and 2/25 with stable chunking [F:885-889].

### A.5 Deploy skew [F:912-953]

**Old tab under its old service worker; server deleted old assets:**

| Chunking | Strategy | Unchanged never-visited page | Changed never-visited page |
|---|---|---|---|
| default | (a) | ok | ok (old revision) |
| default | (b) / (c) | Failed (404) | Failed |
| stable | (a) | ok | ok (old revision) |
| stable | (b) / (c) | ok | Failed; only a reload helps |

**No service worker:**

| Chunking | Old assets retained | Changed page in old tab | Shared state | Entry instances |
|---|---|---|---|---|
| default | yes | ok, old revision | kept | 1 |
| default | no | Failed | — | 1 |
| stable | yes | ok, old revision | kept | 1 entry + 1 `framework` |
| stable | no | Failed (unchanged pages ok) | — | 1 + 1 |

In every row, a reload moves the tab to the new build and loses in-memory state.

### A.6 Performance [P:35-118, P:246-253]

| Scenario | Variant | 1× Event / script median | 4× Event / script median |
|---|---|---|---|
| 1k cell edit | unmemoized | 56 / 24.43 ms | 204 / 85.34 ms |
| 1k cell edit | keyed | 32 / 1.99 ms | 128 / 7.39 ms |
| 10k cell edit | keyed (no virtualization) | 72 / 5.80 ms | 640 / 20.31 ms |
| 10k sort | keyed (no virtualization) | 1,248 / 200.37 ms | 6,100 / 807.22 ms |
| VirtualList 10k: update / filter / sort / select | — | 16 / 24 / 24 / 16 ms | 28 / 24 / 32 / 24 ms |
| 200 fields | unmemoized | 16 / 4.78 ms | 24 / 25.58 ms (p95 42.50) |
| 200 fields | keyed | 16 / 1.81 ms | 16 / 7.90 ms (p95 10.36) |
| 200 Menus, unrelated update | no lazy | 32 / 14.68 ms | 64 / 51.21 ms (p95 59.81) |
| 200 Menus, unrelated update | keyed | 16 / 2.09 ms | 24 / 8.11 ms (p95 9.10) |
| 1,000 buttons update | `Button.view` | 32 / 8.93 ms | 80 / 34.01 ms |
| 1,000 buttons update | themed wrapper (concatenated classes + 4 data attributes) | 40 / 13.69 ms | 96 / 54.34 ms |
| 1,000 buttons theme switch | themed, all views re-run | 40 ms | 96 ms (p95 120) |
| `createKeyedLazy`, 10k unique keys | retained heap after GC | 41,502,120 B | 41,491,314 B |
| A/A control, 1k cell | servers A / B | 56 / 64 ms; 4.72 / 5.55 ms | — |

The A/A control showed a 0.83 ms median scripting split, and paired scripting deltas ranged from −3.57 to +10.14 ms.

**Matched-DOM Foldkit vs Solid 2** [S9 groups `branch 1000/*/keyed/*`, `solid 1000/*/Solid/*`; P:218]. Both pages have 1,000 rows, 10,000 cells, 1,001 inputs and 1,007 buttons. Foldkit ran on a discarded earlier #1700 revision. Event Timing / scripting medians:

| Action | Foldkit keyed 1× | Solid 2 1× | Foldkit keyed 4× | Solid 2 4× |
|---|---|---|---|---|
| Cell | 40 / 2.54 ms | 40 / 4.77 ms | 168 / 10.59 ms | 184 / 41.66 ms |
| Filter | 52 / 16.95 ms | 32 / 24.69 ms (8 of 10 qualified) | 208 / 65.24 ms | 292 / 118.62 ms |

The earlier S7 comparison (Solid filter about 11× faster) had 3.4× more layout objects on the Foldkit side [P:179] and is superseded.

### A.7 Bundle reductions and floor [F:587-657]

| Simulated change | Brotli Δ vs 86,585 B |
|---|---|
| DevTools production no-op | −4,433 B |
| Hydrate-only handoff | −4,381 B |
| Production assertions removed (**rejected**, PRI-1) | −3,898 B |
| Slow-phase no-op / minimal crash view | −702 / −646 B |
| `minify: 'terser'` | −543 B |
| `minify: 'esbuild'` | +6,263 B |

- A bare Foldkit counter is about 83 KB brotli.
- Estimated irreducible core: about 55–58 KB ([INFERENCE] in F).
- < 50 KB is not reachable on upstream Foldkit.

### A.8 Upstream PRs (read 2026-10-19)

**#1699 "fix: widen Effect peer dependency ranges"** (open):
- Peers become `^4.0.0`; vite-plugin and devtools-mcp stay at `^4.0.5` (Effect #8935).
- The PR adds CI on the Effect 4.0.0 floor.
- Test results reported in the PR: foldkit 2,974 passed / 1 skipped; ui 1,231; devtools 6; markdown 58; node 32.
- The website E2E OOMs at 16 workers (~4.1 GB heap) on unmodified main; it passes with `--workers=4` and an 8 GB heap.

**#1700 "perf(foldkit): defer removals for absent keyed children"** (open), 1k keyed table, ABAB, medians in ms:

| CPU | Action | Origin Event | Patch Event | Origin script | Patch script |
|---|---|---|---|---|---|
| 1× | Filter | 120 | 80 | 35.99 | 27.10 |
| 4× | Filter | 472 | 312 | 132.70 | 105.86 |
| 4× | Cell | 252 | 236 | 23.07 | 19.61 |

- 1k filter DOM: 271 added / 1,000 removed → 0 / 729.
- Dirty layout objects: 6,513 → 9 (of 6,530).
- 10k filter at 4×: 4,784 → 1,392 ms.
- Random shuffle: Chromium within noise (2.6% vs a 4.7% band); Happy DOM 5.5% slower (3.5% band).

### A.9 radix2solid conventions [R:7-66]

- **Tooling:** pnpm 11.5.0; Node 24.21.0; `engines >=24 <25`; exact devDependency pins; `strictPeerDependencies: true`; global 24 h `minimumReleaseAge` with exact-version `minimumReleaseAgeExclude` entries, each commented.
- **Themes pipeline:** PostCSS chain of TH-1; outputs of TH-2; breakpoints 520/768/1024/1280/1640; 30 Radix Colors palettes from npm 3.0.0 unchanged.
- **Packed consumer:** pack, content-hash rename, independent fixture from tarballs, build, `tsc`, distribution and tree-shaking checks, Playwright on the packed build, `coverage-manifest.json` mapping every public module, export and CSS file to checks.
- **radix2solid-web** pins its library in `library-source.json` as `{ repository, commit, provenance }`.

### A.10 Foldkit source facts (commit `76fa0d1`)

- `viewIdentity.ts:197-208`: `isEligibleModuleId` returns `false` for any id matching `/(?:^|\/)node_modules(?:\/|$)/`.
- `runtime/runtime.ts:451`: `Schema.toCodecJson(Model)` is derived at every boot [F:810].
- `runtime/makeApplication.ts:26-54`: `resources?: Layer.Layer<Resources>` is optional while `Resources` is inferred from `update` [F:86].

## Appendix B. Provenance (throwaway probes)

These directories produced the evidence above. They are historical provenance only, are not part of wseffect, and may no longer exist:

| Directory | Produced |
|---|---|
| `/tmp/wseffect-research/foldkit` | Foldkit clone at `76fa0d1` |
| `/tmp/wseffect-research/probe-lazy` | First lazy-page probe |
| `/tmp/wseffect-research/probe-app` | wseffect-app contract prototype: `src/pageKit.ts`, the tests behind A.2–A.5 and the generator of the 20 synthetic pages |
| `/tmp/wseffect-research/probe-pwa` | Delegated PWA probe |
| `/tmp/wseffect-research/effect` | Effect override probe |
| `/tmp/wseffect-research/perf` | Benchmarks S1–S9 with traces |
| `/tmp/wseffect-research/bundle-analysis`, `effloor`, `counter-bundle`, `noui`, `effonly` | Size analysis |
| `/tmp/wseffect-research/r2s-baseline` | radix2solid baseline in progress (BENCH-3) |

Research file hashes are listed in §3.

# wseffect foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build sub-project #1 of wseffect: the monorepo with every CI gate, the complete `@wsagency/wseffect-app`, the `@wsagency/wseffect-themes` core, `apps/gallery` and the `bench/radix2solid` comparison app.

**Architecture:**
- **Packages:** two ESM packages on Foldkit 0.168.0 and Effect 4.0.5.
  - `wseffect-app` is a Foldkit submodel ("the kit") that owns the lazy-page slots and the PWA state, plus a Vite plugin for codegen, the build ID, chunking and the PWA.
  - `wseffect-themes` is the Radix Themes CSS compiled by the radix2solid PostCSS pipeline, plus thin typed view functions over `@foldkit/ui`.
- **Gallery** consumes both and is the fixture for e2e, size and performance gates.
- **Bench** is a Solid 2 app from packed radix2solid tarballs, measured with the same harness.

**Tech Stack:** pnpm 11.5.0, Node 24.21.0, TypeScript 7.0.2, Vite 8.3.4, Foldkit 0.168.0 / `@foldkit/ui` 0.168.0 / `@foldkit/vite-plugin` 0.27.1, Effect 4.0.5, vite-plugin-pwa 2.0.0, workbox-window 7.4.1, Vitest 5.0.2 + happy-dom 20.14.5, Playwright 1.64.1, axe-core 4.11.0, oxlint 1.85.0, Gitea Actions.

**Spec:** `docs/superpowers/specs/2026-10-19-wseffect-foundation-design.md`. Requirement IDs (UP-*, APP-*, …) refer to it. Read the spec section a task cites before starting the task.

## Global Constraints

**Dependency pins:**
- `foldkit` 0.168.0, `@foldkit/ui` 0.168.0, `@foldkit/vite-plugin` 0.27.1, exact (UP-1). A Foldkit bump is its own PR and is never bundled with feature work.
- `effect` and `@effect/platform-browser`:
  - pinned 4.0.5 exactly in the repo (UP-2);
  - published packages peer on `^4.0.5` (REPO-1).
- Interim Effect resolution (UP-2/UP-8). The exact snippet goes in root `pnpm-workspace.yaml`, the wseffect-app README and the TEST-7 fixture, byte-identical:
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
- Exactly one copy of `effect` and of `@effect/platform-browser` in every install and bundle (UP-3).
- All other dependencies use exact versions only; no `^`, `~` or ranges except the published Effect peer.
  - Tool pins (CI-3): `pnpm@11.5.0`, Node `24.21.0`, `engines.node` `>=24 <25`, TypeScript 7.0.2, Vite 8.3.4, `@playwright/test` 1.64.1, axe-core 4.11.0, vite-plugin-pwa 2.0.0, workbox-window 7.4.1, `@radix-ui/colors` 3.0.0.
  - Fixed by this plan: vitest 5.0.2, `@vitest/coverage-v8` 5.0.2, happy-dom 20.14.5, oxlint 1.85.0, `@types/node` 24.19.1.
  - PostCSS chain: postcss 8.5.9, postcss-import 16.1.1, postcss-nesting 14.0.0, postcss-custom-media 12.0.1, postcss-combine-duplicated-selectors 10.0.3, postcss-discard-empty 7.0.1, autoprefixer 10.4.27.

**Foldkit integrity:**
- No Foldkit patches: no `patchedDependencies`, no patch-package, no rewriting of Foldkit `dist`, no vendored Foldkit (UP-7).
- Foldkit's production assertions are never removed or dev-gated (PRI-1).

**Commits and branches:**
- Commits use the developer's git identity. `Co-authored-by` only for real human contributors; no AI co-author trailers (CI-5).
- One branch per lane, `lane-0`, `lane-a`, `lane-b`, `lane-c`, `lane-d`, each in its own worktree created from `main`. The integrator merges lanes into `main` in dependency order. One commit per task. Never push a lane branch's history rewrite after the integrator fetched it.

**Code rules:**
- Package `"sideEffects"`: `false` for JS-only packages; themes `["**/*.css"]`; `apps/gallery/src/pages/package.json` is exactly `{ "sideEffects": false }`.
- Every Foldkit Command has error channel `never`. `Effect.promise` is never used in a module that calls `Command.define` (ERR-1).
- Priority order for any trade-off: correctness > runtime speed > bundle size (PRI-1..3).
- Units: 1 KiB = 1,024 B; "brotli" means Node `zlib` brotli, quality 11.

## Review Focus

1. **Corrupted or foreign restored Model JSON.**
   - **Case:** a dev reload restores a Model whose slot JSON is truncated, from another app, or from an older page schema.
   - **Expected:** the slot decodes to `Idle` or `Dehydrated` and the app boots; the page re-inits; nothing throws.
   - **Test:** A1 `slotCodec.test.ts` › "decodes arbitrary JSON values to Idle without throwing".
2. **Two routes requesting the same page back-to-back while its chunk is in flight.**
   - **Expected:** exactly one network fetch, no duplicate `init`, no lost OutMessages.
   - **Test:** A3 `loader.test.ts` › "concurrent ensure for one key resolves both with one loader call".
3. **`version.json` returns HTML (an SPA-fallback misconfiguration) or a 200 with an empty body.**
   - **Expected:** the version poll stays silent, and load-failure classification yields `LoadError`, not `NewVersion`.
   - **Test:** A2 `classify.test.ts` › "HTML body classifies as LoadError".
4. **Theme setting changed while a Dialog or DropdownMenu is open.**
   - **Expected:** the open overlay keeps focus and stays open; only the Theme attribute changes.
   - **Test:** D3 `e2e/theme.spec.ts` › "changing accent while dialog is open keeps it open and focused".
5. **App subscription or Message tag colliding with the kit.**
   - **Case:** an app subscription key starting with `wseffect:`, or an app page key whose generated tag collides with an app Message tag.
   - **Expected:** a compile error, or a codegen error naming both.
   - **Tests:** A6 `makeApp.typecheck.ts` and A7 `codegen.test.ts` › "rejects page key whose tag collides".

---

## Lanes and dependencies

| Lane | Tasks | Depends on | Branch |
|---|---|---|---|
| 0 | 0.1–0.3 monorepo, CI skeleton, lint plugin skeleton | — | `lane-0` (merge first) |
| A | A1–A10 `@wsagency/wseffect-app` | 0 | `lane-a` |
| B | B1–B8 `@wsagency/wseffect-themes` | 0 | `lane-b` |
| C | C1–C5 deploy server, bench import, size gate, perf gate, report | 0 (C3–C5 run against gallery once D1 lands; until then against `tools/fixtures/mini-app`) | `lane-c` |
| D | D1–D6 gallery, e2e, packed consumer, licenses/README | A, B, C1 (D1 needs C3's `size.json` format, frozen below) | `lane-d` |

Lanes A, B and C run in parallel after lane 0 merges. Lane D may start D1 against the frozen interfaces using the integrator's merged `main` once A and B merge. Each lane rebases on `main` before its final merge and runs `pnpm check`.

## Cross-lane contracts (frozen)

Changing anything in this section requires an integrator-approved edit to this plan before code changes.

### `@wsagency/wseffect-app` exports

`exports` subpaths: `.`, `./vite`, `./codegen`, `./oxlint-plugin`. Each is `{ "types": "./dist/<path>.d.ts", "default": "./dist/<path>.js" }`.

```ts
// '.' — contract and registry
type PageInputsShape = Readonly<Record<string, string | number | boolean | null>>
interface PageDefinition<Model, Message, Inputs extends PageInputsShape, OutMessage, R = never> {
  readonly Model: Schema.Codec<Model, any, never, never>
  readonly Message: Schema.Codec<Message, any, never, never>
  readonly init: () => Update.Return<Model, Message, R>
  readonly update: (model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage, R>
  readonly view: Submodel.View<Model, Message, Inputs>
}
type AnyPage = PageDefinition<any, any, any, any, any>
type ModelOf<P>; type MessageOf<P>; type InputsOf<P>; type OutMessageOf<P>; type ServicesOf<P>
interface PageContract<Inputs, OutMessage> {
  readonly OutMessage: Schema.Codec<OutMessage, any>
  readonly definePage: <Model, Message, R = never>(page: PageDefinition<Model, Message, Inputs, OutMessage, R>) => PageDefinition<Model, Message, Inputs, OutMessage, R>
}
pageContract<Inputs extends PageInputsShape, OutMessage extends { readonly _tag: string }>(config: { OutMessage: Schema.Codec<OutMessage, any> }): PageContract<Inputs, OutMessage>
type PageLoaders<Pages> = { readonly [K in keyof Pages]: () => Promise<Pages[K]> }
interface PagesHandle<Pages extends Record<string, AnyPage>> { readonly keys: ReadonlyArray<keyof Pages & string>; readonly loaders: PageLoaders<Pages>; readonly registry: PageRegistry<Pages> }
makePages<Pages extends Record<string, AnyPage>>(loaders: PageLoaders<Pages>): PagesHandle<Pages>

// slots and kit state
type FailureCause = 'Offline' | 'NewVersion' | 'LoadError'
type PageSlot<M> = Idle | Available | Loading | Failed{ cause: FailureCause; reason: string } | Ready{ model: M } | Dehydrated{ encoded: Schema.Json }
type PageSlots<Pages> = { readonly [K in keyof Pages]: PageSlot<ModelOf<Pages[K]>> }
PwaState: Schema.Struct({ isOnline: Boolean, isOfflineReady: Boolean, isUpdateAvailable: Boolean, maybeNewBuildId: Option<String> })
interface KitState<Pages> { readonly activeKeys: ReadonlyArray<keyof Pages & string>; readonly slots: PageSlots<Pages>; readonly pwa: PwaState }
slotsSchema<Pages>(pages: PagesHandle<Pages>): Schema.Codec<PageSlots<Pages>>
messageSchema<Pages, K extends keyof Pages & string>(pages: PagesHandle<Pages>, key: K): Schema.Codec<MessageOf<Pages[K]>>
kitStateSchema<Pages>(pages: PagesHandle<Pages>): Schema.Codec<KitState<Pages>>
kitMessageFields<Pages>(pages: PagesHandle<Pages>): KitMessageFields<Pages>   // spread into the generated KitMessage union
initKit<Pages>(pages: PagesHandle<Pages>, activeKeys: ReadonlyArray<keyof Pages & string>): KitState<Pages>

// Kit message tags (fields of the generated KitMessage):
//   EnteredRoute{ keys }, LoadedPageModule{ key }, FailedPageModule{ key, cause, reason },
//   ClickedRetryPage{ key }, ClickedReloadPage{ key }, RequestedPrefetch{ key }, CompletedPrefetch{ key, isLoaded },
//   GotPwaEvent{ event: PwaEvent }, NewVersionAvailable{ buildId }, ClickedApplyUpdate, CompletedApplyUpdate, FailedApplyUpdate{ reason },
//   Got<Key>PageMessage{ message } per page (generated)
bindKit<Pages, KitMessage>(config: { pages: PagesHandle<Pages>; KitMessage: KitMessageUnion; pageMessageTags: { readonly [K in keyof Pages]: string } }): KitBinding<Pages, KitMessage>
interface KitBinding<Pages, KitMessage> {
  readonly pages: PagesHandle<Pages>
  readonly toParentMessage: { readonly [K in keyof Pages]: (message: MessageOf<Pages[K]>) => KitMessage }
  readonly update: (state: KitState<Pages>, message: KitMessage) => Update.ReturnWithOutMessage<KitState<Pages>, KitMessage, OutMessageOf<Pages[keyof Pages]>, ServicesOf<Pages[keyof Pages]> | ServiceWorker>
  readonly subscriptions: Subscriptions<KitState<Pages>, KitMessage, ServiceWorker>   // keys prefixed 'wseffect:'
  readonly view: Submodel.View<KitState<Pages>, KitMessage, KitPageViewInputs<Pages>>  // = viewPage
  readonly bannerView: Submodel.View<KitState<Pages>, KitMessage, void>
}
type KitPageViewInputs<Pages> = Readonly<{ key: keyof Pages & string; inputs: InputsOf<Pages[keyof Pages]> }>
prefetchOnIntent<KitMessage>(binding: KitBinding<any, KitMessage>, key: string): ReadonlyArray<Attribute<KitMessage>>   // OnMouseEnter + OnFocus
prefetchOnVisible<KitMessage>(binding: KitBinding<any, KitMessage>, key: string): Attribute<KitMessage>                // h.OnMount(...)

// '.' — services and app
class PageLoadError extends Data.TaggedError('PageLoadError')<{ key: string; cause: unknown }>
class PageLoader extends Context.Service<PageLoader, { readonly load: (key: string) => Effect.Effect<AnyPage, PageLoadError> }>()('wseffect/PageLoader')
PwaEvent = defineTaggedUnion({ UpdateAvailable: {}, OfflineReady: {}, RegisterFailed: { reason: String }, ChangedOnlineStatus: { isOnline: Boolean } })
class ServiceWorkerUpdateError extends Data.TaggedError('ServiceWorkerUpdateError')<{ cause: unknown }>
class ServiceWorker extends Context.Service<ServiceWorker, {
  readonly events: Stream.Stream<PwaEvent>
  readonly applyUpdate: Effect.Effect<void, ServiceWorkerUpdateError>
  readonly checkForUpdate: Effect.Effect<void>               // registration.update() then await the waiting worker; no-op without registration
  readonly hasRegistration: Effect.Effect<boolean>
}>()('wseffect/ServiceWorker') { static readonly layer: Layer.Layer<ServiceWorker> }
BUILD_ID: string            // = __WSEFFECT_BUILD_ID__
makeApp<Model, Message extends { _tag: string }, Pages, KitMessage, R>(config: MakeAppConfig<…>): Application
// MakeAppConfig = Foldkit RoutingApplicationConfig fields (Model, init, update, view, subscriptions?, routing, container, crash?)
//   + kit: { binding: KitBinding<Pages, KitMessage>; read: (model: Model) => KitState<Pages>; toParentMessage: (message: KitMessage) => Message }
//   + versionPollMs?: number (default 300_000)
//   + resources: Layer.Layer<R>, required at the type level iff R (from init/update/app subscriptions, minus ServiceWorker) is not never
// makeApp merges ServiceWorker.layer into resources, lifts binding.subscriptions and adds 'wseffect:version-poll'.
```

```ts
// './vite'
wseffect(options: {
  pagesDir?: string                  // default 'src/pages'
  primaryPages: ReadonlyArray<string>
  pwa: false | { manifest: ManifestOptions }   // vite-plugin-pwa ManifestOptions
}): Array<Plugin>   // includes @foldkit/vite-plugin's foldkit()
// './codegen'
generatePages(appRoot: string, options: { pagesDir: string }): { path: string; source: string }
checkPages(appRoot: string, options: { pagesDir: string }): { ok: true } | { ok: false; diff: string }
computeBuildId(input: { appRoot: string; workspaceRoot: string; env: NodeJS.ProcessEnv }): string
// './oxlint-plugin': default export { meta: { name: 'wseffect' }, rules: {
//   'no-effect-promise-in-command', 'no-top-level-side-effects-in-pages', 'no-page-inputs-in-model' } }
```

**Generated `src/pages.gen.ts`** (APP-5) exports:
- `Pages`, `pages`, `PageKey` (`Schema.Literals`), `KitMessage`, `kit`;
- the type `KitMessage`;
- `pageMessageTags` (`Got<PascalKey>PageMessage`).

**Kit DOM ids** (rendered by `binding.view` and `binding.bannerView`):
- `#loading-<key>`, `#failed-<key>` carrying `data-cause="<cause>"`, `#retry-<key>`, `#reload-<key>`;
- `#wseffect-update` (banner) and `#wseffect-update-reload`.

### `@wsagency/wseffect-themes` exports

**JS subpaths:** `.` and `./components/<kebab-name>`.

**CSS subpaths:** `./styles.css`, `./components.css`, `./utilities.css`, `./tokens.css`, `./tokens/base.css`, `./tokens/colors/*.css`, `./layout.css`, `./layout/*.css`, `./css/*.css`, and every `*.layer.css` sibling.

```ts
type Breakpoint = 'initial' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Responsive<T> = T | Partial<Record<Breakpoint, T>>
// Stateless: each namespace exports Props (Schema), type ViewProps<Message>, view
Theme.Settings: Schema.Struct({ accentColor, grayColor, radius, scaling, appearance, panelBackground, hasBackground })
Theme.defaults: Theme.Settings['Type']   // indigo, auto, medium, '100%', inherit, translucent, true
Theme.view<M>(props: { settings: Partial<Settings>; isRoot: boolean; id?: string }, children: ReadonlyArray<Child>, h: HtmlBuilder<M>): Html
Box.view, Flex.view, Grid.view, Text.view, Heading.view, Card.view: <M>(props: X.ViewProps<M>, children: ReadonlyArray<Child>, h: HtmlBuilder<M>) => Html
Button.view<M>(props: Button.ViewProps<M> /* size, variant, color, highContrast, radius, loading, disabled, onClick?: M, type */, children, h): Html
TextField.view<M>(props: TextField.ViewProps<M> /* id, value, onInput: (v: string) => M, placeholder, size, variant, color, radius, disabled, label */, children, h): Html
// Stateful: Model/Message/OutMessage re-exported unchanged from @foldkit/ui
Dialog.{ Model, Message, OutMessage, init, update, open, close, fold, embed }
Dialog.embed<M>(h: HtmlBuilder<M>, config: { slotId: string; model: Dialog.Model; toParentMessage: (m: Dialog.Message) => M; title: string; description?: string; size?: '1'|'2'|'3'|'4'; content: (h: HtmlBuilder<M>) => ReadonlyArray<Child>; trigger?: never }): Html
DropdownMenu.create<Item extends string>(): { Model, Message, OutMessage, init, update, fold, embed }
Tabs.create<Value extends string>(): { Model, Message, OutMessage, init, update, fold, embed }
// fold(config) = Update.foldChild preconfigured with the component's update (TH-10)
```

### Gallery contract (implemented by D1/D2; consumed by C3/C4 and D3–D5)

**Routes → page keys:**

| Route | Page keys |
|---|---|
| `/` | none |
| `/layout` | layout |
| `/typography` | typography |
| `/buttons` | buttons |
| `/cards` | cards |
| `/text-field` | textField |
| `/dialog` | dialog |
| `/dropdown-menu` | dropdownMenu |
| `/tabs` | tabs |
| `/theme` | theme |
| `/shared` | sharedA, sharedB |
| `/shared-a` | sharedA |
| `/virtual-list` | virtualList |
| `/form` | form |
| `/menus` | menus |

**Primary pages:** `['layout', 'typography', 'buttons', 'dialog']`.

**DOM ids:**
- Shell: `#date-shell`, `#date-input`, `#date-submodel` (submodel text), `#date-submodel-next` (+1 day button), `#build-id`.
- Navigation: `#link-<key>`, and `#link-shared` for `/shared`.
- Shared pages: `#date-page-sharedA`, `#date-page-sharedB`, `#sharedA-prev` (−1 day via OutMessage), `#sharedA-note` (shows an `Option<string>` field; text `(none)` or the note), `#sharedA-add-note`.

**Performance hooks** (`data-perf`; the bench app implements the same hooks):

| Page | Hooks |
|---|---|
| `/virtual-list` | `vl-filter` (input), `vl-sort` (button), `vl-cell-input` (input in the first visible row), `vl-select` (button in the first visible row) |
| `/form` | `form-field-0` (first of 200 inputs) |
| `/menus` | `menus-tick` (button causing an update unrelated to the 200 menus) |

**`bench/baselines/size.json`** (owned by C3):
```json
{ "unit": "B", "compression": "brotli-q11",
  "entries": { "<artifact-id>": { "bytes": 0, "reason": "string" } } }
```
Artifact ids: `shell` (entry + framework chunk), `first-visit`, `page:<key>`, `styles.css`.

**`bench/baselines/perf.json`** (owned by C4):
```json
{ "baselineCommit": "<sha>", "reason": "string" }
```

## File structure

```
package.json  pnpm-workspace.yaml  pnpm-lock.yaml  .node-version  .gitignore  tsconfig.base.json  tsconfig.json  .oxlintrc.json  vitest.workspace.ts
.gitea/workflows/check.yml                 # CI (0.2, extended by C5)
scripts/check-repo.ts                      # REPO-1, CI-3, UP-3, UP-7, UP-8 checks (0.1)
scripts/check-update-coverage.ts           # TEST-1 (0.2)
packages/app/
  src/contract.ts registry.ts slots.ts slotCodec.ts kit/{state.ts,messages.ts,update.ts,classify.ts,binding.ts} loader.ts
  src/view/{page.ts,banner.ts,prefetch.ts} pwa/{serviceWorker.ts,events.ts,register-stub.ts} versionPoll.ts makeApp.ts buildId.ts index.ts
  src/vite/{index.ts,codegen.ts,buildIdPlugin.ts,chunking.ts,pwa.ts} codegen/index.ts
  src/oxlint-plugin/{index.ts,rules/*.ts}  test/**  scripts/brand-dist.mjs
packages/themes/
  postcss.config.js postcss-breakpoints.js postcss-whitespace.js scripts/build-css.js scripts/brand-dist.mjs UPSTREAM.md
  src/styles/**  src/css/components/*.css (copied CSS)  src/props/*.ts  src/components/<name>.ts  src/index.ts  test/**
apps/gallery/
  index.html  vite.config.ts  public/icons/*  src/{main.ts,shell.ts,contract.ts,routes.ts,pages.gen.ts}  src/pages/*.ts  src/pages/package.json
tools/serve/{server.ts,server.test.ts}       # PWA-10 server with byte accounting (C1)
tools/gates/{size.ts,perf.ts,report.ts,scenarios.ts}   # C3–C5
tools/fixtures/mini-app/                     # small Foldkit app with the perf hooks, for C3/C4 before D lands
bench/radix2solid/  bench/baselines/{size.json,perf.json}
e2e/*.spec.ts  playwright.config.ts
tests/consumer/{run.ts,coverage-manifest.json,check-*.ts}
README.md  LICENSE  CONTRIBUTING.md
```

---

## Lane 0

### Task 0.1: Monorepo scaffold, pins and repository checks

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.gitignore`, `tsconfig.base.json`, `tsconfig.json`, `vitest.workspace.ts`
- Create: `packages/app/package.json`, `packages/app/tsconfig.json`, `packages/app/tsconfig.build.json`, `packages/app/vitest.config.ts`, `packages/app/src/index.ts`
- Create: the same five files under `packages/themes/`
- Create: `scripts/check-repo.ts`
- Test: `scripts/check-repo.test.ts`

**Interfaces:**
- Produces:
  - root scripts `build`, `typecheck`, `lint`, `test`, `check` (`pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm check:repo`), `check:repo` (`node scripts/check-repo.ts`);
  - package manifests per REPO-1, with `src/index.ts` containing only `export {}` until A1 and B2.

- [ ] **Step 1: Write the failing test.** `scripts/check-repo.test.ts` (node:test) with these tests:
  - `checkManifest(fixture)` rejects:
    - a `^` dev dependency;
    - a missing `files` entry;
    - `sideEffects: true`;
    - a peer `effect: "4.0.5"` (must be `^4.0.5`);
    - a `patchedDependencies` key;
    - a `pnpm-workspace.yaml` whose UP-8 block differs by one character.
  - `checkEffectCopies(lockfileText)` returns an error naming `effect` when the lockfile has `effect@4.0.0` and `effect@4.0.5`.
- [ ] **Step 2: Run** `node --test scripts/check-repo.test.ts`. Expected: FAIL, `Cannot find module './check-repo.ts'`.
- [ ] **Step 3: Implement `scripts/check-repo.ts`.**
  - Exports `checkManifest(manifest, path): string[]`, `checkWorkspace(yamlText): string[]`, `checkEffectCopies(lockfileText): string[]`.
  - The CLI runs all three over every `package.json` (excluding `node_modules`) and exits 1 on any error.
  - **REPO-1 fields:** version `0.0.0`, `private:false`, `type:module`, `license:MIT`, `publishConfig.access:public`, repository `git+https://git.wsagency.io/ws-agency/wseffect.git` plus `directory`, `files` ⊆ `[dist, LICENSE, README.md, CHANGELOG.md]`, `exports` entries `{types, default}`.
  - **Published packages:** these checks apply only to `packages/*`.
- [ ] **Step 4: Write the workspace files.**
  - `pnpm-workspace.yaml` contains:
    - `packages: [packages/*, apps/*, bench/*]`;
    - `managePackageManagerVersions: false`, `strictPeerDependencies: true`;
    - the UP-8 block verbatim;
    - a comment that the global 24 h `minimumReleaseAge` stays;
    - `minimumReleaseAgeExclude: []`.
  - Root `package.json`: `packageManager: pnpm@11.5.0`, `engines.node: ">=24 <25"`, exact devDependencies from Global Constraints.
  - `.node-version`: `24.21.0`.
  - `.gitignore`: `node_modules`, `dist`, `.artifacts`, `coverage`, `test-results`, `playwright-report`, `*.tgz` except `!bench/radix2solid/packs/*.tgz`.
- [ ] **Step 5: Run** `pnpm install && node --test scripts/check-repo.test.ts && pnpm check:repo`. Expected: tests pass; `check:repo` prints `repo checks: 0 errors`.
- [ ] **Step 6: Commit** `chore: scaffold wseffect monorepo with pinned toolchain`.

### Task 0.2: CI skeleton and update-coverage check

**Files:**
- Create: `.gitea/workflows/check.yml`, `scripts/check-update-coverage.ts`
- Test: `scripts/check-update-coverage.test.ts`

**Interfaces:**
- Produces:
  - CI jobs `check` (required) and `effect-latest` (CI-2). C5 adds `size`, `perf` and `bench-radix2solid`.
  - `pnpm test` runs vitest with coverage, then `node scripts/check-update-coverage.ts`.

- [ ] **Step 1: Write the failing tests.** `check-update-coverage.test.ts`:
  - `findUpdateModules(['a.ts' exporting "export const update =", 'b.ts' exporting "export const view ="])` → `['a.ts']`.
  - `uncoveredFunctions(coverageFinal, ['a.ts'])` lists `a.ts:fnName` when `f[id] === 0`.
- [ ] **Step 2: Run** `node --test scripts/check-update-coverage.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
  - `findUpdateModules(files: string[]): string[]` matches `export const update\b`, `export function update\b` and `export { … update … }`.
  - `uncoveredFunctions(coverage: CoverageMap, modules: string[]): string[]`.
  - The CLI reads every `coverage/coverage-final.json` and exits 1 with the list. TEST-1 applies to update modules only.
- [ ] **Step 4: Write `check.yml`.**
  - Trigger: `on: [push, pull_request]`; `runs-on: ubuntu-24.04`.
  - Steps: pnpm/action-setup 11.5.0, setup-node 24.21.0 with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium firefox webkit`, `pnpm check`.
  - Job `effect-latest`:
    - **When:** `schedule` nightly (`0 3 * * *`); `pull_request` when `pnpm-lock.yaml` or any `package.json` changes (required); otherwise `continue-on-error: true`.
    - **Resolve:** `node scripts/resolve-effect-latest.ts` picks the newest `effect` 4.x whose `time` is ≥ 24 h old (`npm view effect time --json`) and rewrites the two override values in a scratch copy of `pnpm-workspace.yaml`.
    - **Run:** `pnpm install --no-frozen-lockfile && pnpm typecheck && pnpm --filter "./packages/*" test && pnpm exec playwright test --project=chromium`.
  - Add `scripts/resolve-effect-latest.ts` with a unit test: given a fake `time` map, it chooses 4.0.7 over 4.1.0 when 4.1.0 is 3 h old.
- [ ] **Step 5: Run** `node --test scripts/*.test.ts`. Expected: all pass.
- [ ] **Step 6: Commit** `ci: add check and effect-latest workflows`.

### Task 0.3: Lint plugin skeleton and first rule

**Files:**
- Create: `packages/app/src/oxlint-plugin/index.ts`, `packages/app/src/oxlint-plugin/rules/noEffectPromiseInCommand.ts`, `.oxlintrc.json`
- Test: `packages/app/test/oxlint/noEffectPromiseInCommand.test.ts`, fixtures in `packages/app/test/oxlint/fixtures/no-effect-promise/{bad.ts,good.ts}`

**Interfaces:**
- Produces:
  - the plugin default export `{ meta: { name: 'wseffect' }, rules }` (ESLint rule shape, loaded by oxlint `jsPlugins`);
  - test helper `runOxlint(fixtureDir, rule): { file, line, ruleId }[]` in `packages/app/test/oxlint/runOxlint.ts` (spawns `pnpm exec oxlint -c <temp config> <dir> --format json`).
- Consumes: built `packages/app/dist/oxlint-plugin/index.js`; the test builds first via `pnpm --filter @wsagency/wseffect-app build:lint`.

- [ ] **Step 1: Write the failing test.**
  - `bad.ts`: `Command.define('X', { messages: [M], execute: Effect.promise(() => fetch('/')) })`.
  - `good.ts`: the same with `Effect.tryPromise` plus `Effect.match`.
  - Assertions: `runOxlint(dir, 'wseffect/no-effect-promise-in-command')` reports exactly 1 diagnostic, in `bad.ts`.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test oxlint`. Expected: FAIL (plugin missing).
- [ ] **Step 3: Implement the rule.** Report `Effect.promise` `CallExpression`s when the `Program` contains a `Command.define(` call. Message: `Effect.promise in a Command module turns rejection into a defect; use Effect.tryPromise and map failure to a Message (ERR-1)`. `build:lint` = `tsc -p tsconfig.build.json` restricted to `src/oxlint-plugin`.
- [ ] **Step 4: Configure linting.** `.oxlintrc.json`: `jsPlugins: [{ name: "wseffect", specifier: "./packages/app/dist/oxlint-plugin/index.js" }]` with the rule set to `error`. Root `lint` = `pnpm --filter @wsagency/wseffect-app build:lint && oxlint`.
- [ ] **Step 5: Run** `pnpm --filter @wsagency/wseffect-app test oxlint && pnpm lint`. Expected: PASS; `pnpm lint` reports 0 errors.
- [ ] **Step 6: Commit** `feat(app): add oxlint plugin with no-effect-promise-in-command`.

---

## Lane A — `@wsagency/wseffect-app`

All tests are Vitest with happy-dom and Foldkit's `foldkit/test/vitest` setup (`packages/app/vitest.config.ts`). Story tests use `story`/`message`/`Command.resolve`; Scene tests use `scene` with role and label locators.

### Task A1: Page contract, registry and slot codec

**Files:**
- Create: `packages/app/src/contract.ts`, `registry.ts`, `slots.ts`, `slotCodec.ts`; update `index.ts`
- Test: `packages/app/test/slotCodec.test.ts`, `packages/app/test/registry.test.ts`, `packages/app/test/fixtures/pages/{alpha.ts,beta.ts}` (pages with an `Option` field)

**Interfaces:**
- Produces: `pageContract`, `PageDefinition`, `AnyPage`, `ModelOf`/`MessageOf`/`InputsOf`/`OutMessageOf`/`ServicesOf`, `makePages`, `PagesHandle`, `PageSlot`, `PageSlots`, `slotsSchema`, `messageSchema`, `FailureCause` (exact shapes in Cross-lane contracts).
- Internal to Lane A: `registry.register(key, page)`, `registry.get(key): Option<Page>`.

- [ ] **Step 1: Write the failing codec tests** (`slotCodec.test.ts`; APP-8, ERR-6):
  - "encodes every state × registered/unregistered without throwing": `Idle`, `Available`, `Loading`, `Failed{Offline}`, `Ready{model with Option.some('x')}`, `Dehydrated{encoded}`; JSON round-trip through `JSON.stringify`.
  - `Available` → `{_tag:'Idle'}`; `Dehydrated{encoded:E}` → `{_tag:'Ready', model:E}`.
  - Encoded Ready decodes to `Ready` with `Option.isSome(model.maybeNote)` when registered; to `Dehydrated` when unregistered; to `Dehydrated` when registered but the page JSON does not decode.
  - "decodes arbitrary JSON values to Idle without throwing" for `null`, `42`, `[]`, `{_tag:'Bogus'}`, `{_tag:'Failed'}` (missing fields) (Review Focus 1).
  - `Failed{cause:'NewVersion', reason:'x'}` round-trips.
- [ ] **Step 2: Write the failing registry and message tests** (`registry.test.ts`; APP-6, APP-9, APP-18):
  - `makePages(loaders).keys` equals `['alpha', 'beta']`.
  - `makePages` returns an object with only `keys`, `loaders`, `registry`.
  - `Schema.is(messageSchema(pages, 'alpha'))(validAlphaMessage)` is `false` before registration and `true` after `registry.register`.
  - A beta message is rejected for `'alpha'`.
- [ ] **Step 3: Run** `pnpm --filter @wsagency/wseffect-app test slotCodec registry`. Expected: FAIL (imports missing).
- [ ] **Step 4: Implement.**
  - `slotCodec.ts` uses `Schema.declare` with a `toCodecJson` link to `Schema.Json` (pattern: spec App. A.2 / research probe): decode through `Schema.decodeUnknownOption(EncodedSlot)`, never throwing.
  - Registry: a `Map` that only grows. `messageSchema` is a `Schema.declare` delegating to the registered page's `Message`.
  - `pageContract(config)` returns `{ OutMessage: config.OutMessage, definePage: page => page }`.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit** `feat(app): page contract, registry and total slot codec`.

### Task A2: Kit state machine, failure classification and prefetch Command

**Files:**
- Create: `packages/app/src/kit/{state.ts,messages.ts,update.ts,classify.ts,binding.ts}`
- Test: `packages/app/test/kit.story.test.ts`, `packages/app/test/classify.test.ts`, `packages/app/test/fixtures/kit.ts` (a hand-written equivalent of a generated `pages.gen.ts` for the alpha/beta fixtures)

**Interfaces:**
- Consumes: A1.
- Produces:
  - `PwaState`, `KitState`, `kitStateSchema`, `kitMessageFields`, `initKit`, `bindKit` (with `update`; A3 adds `subscriptions`, A4 adds `view`/`bannerView`);
  - `classifyFailure(input: { isOnline: boolean; fetchVersion: Effect<Response, unknown>; runningBuildId: string }): Effect<FailureCause>`;
  - Command names `LoadPageForPrefetch`, `ClassifyPageFailure`, `ReloadDocument`.

- [ ] **Step 1: Write the failing Story tests** (`kit.story.test.ts`; APP-7, APP-12, APP-13, APP-14, APP-16, APP-17):
  - `EnteredRoute{keys:['alpha']}` from `Idle` → slot `Loading`, `activeKeys = ['alpha']`.
  - `LoadedPageModule{key:'alpha'}` from `Loading` (registered) → `Ready`; alpha's init Command is lifted (`Command.expectHas(AlphaInit)`).
  - `RequestedPrefetch{alpha}` from `Idle` → `Command.expectExact(LoadPageForPrefetch({key:'alpha'}))`. Resolving `CompletedPrefetch{isLoaded:true}` → `Available`; `isLoaded:false` → `Idle`.
  - `EnteredRoute{['alpha']}` from `Available` → `Ready` in the same step, with no `Loading` state in between (APP-14).
  - `Dehydrated` + `LoadedPageModule` → `Ready` with the decoded model and **no** init Command. With undecodable `encoded` → `Ready` via init.
  - `FailedPageModule{cause:'LoadError'}` → `Failed`. `ClickedRetryPage` → `Loading`. `EnteredRoute` including a `Failed{Offline}` key → `Loading`.
  - `ClickedReloadPage` on `Failed{NewVersion}` → `Command.expectExact(ReloadDocument())`.
  - `Ready` stays `Ready` and `Loading` stays `Loading` when `EnteredRoute{[]}`.
  - A page OutMessage from `Got<Alpha>PageMessage` is returned as the kit's `outMessage` (`expectOutMessage`).
- [ ] **Step 2: Write the failing classification tests** (`classify.test.ts`; APP-15, Review Focus 3):

  | Input | Expected |
  |---|---|
  | `isOnline:false` | `Offline` |
  | fetch rejects | `Offline` |
  | 200 `{"buildId":"b"}` with running `"a"` | `NewVersion` |
  | 200 with equal `buildId` | `LoadError` |
  | 404 | `LoadError` |
  | 200 HTML body (`<!doctype html>`) | `LoadError` (test name: "HTML body classifies as LoadError") |
  | 200 empty body | `LoadError` |
- [ ] **Step 3: Run** `pnpm --filter @wsagency/wseffect-app test kit classify`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `update` is `Message.match` over the kit tags.
  - Page messages are folded through the registry, lifting Commands with `Command.mapMessage`.
  - `LoadPageForPrefetch` uses `ensure` (A3 provides it; until A3 lands, define `ensure` in `loader.ts` within this task).
  - `ReloadDocument`:
    - with `ServiceWorker.hasRegistration`: `checkForUpdate`, then `applyUpdate`;
    - otherwise: `location.reload()` via `Effect.sync`.
  - All failures map to Messages.
- [ ] **Step 5: Run** the same command. Expected: PASS. Then `pnpm test` includes `check-update-coverage` with 100% function coverage for `kit/update.ts`.
- [ ] **Step 6: Commit** `feat(app): kit slot state machine, failure classification, prefetch`.

### Task A3: Loader subscriptions and the `PageLoader` service

**Files:**
- Create/modify: `packages/app/src/loader.ts`, `packages/app/src/kit/binding.ts` (adds `subscriptions`)
- Test: `packages/app/test/loader.test.ts`

**Interfaces:**
- Consumes: A1, A2.
- Produces:
  - `ensure(pages, key): Effect<Page, PageLoadError>`, which uses `Effect.serviceOption(PageLoader)` and falls back to `pages.loaders[key]`;
  - `PageLoader`, `PageLoadError`;
  - `binding.subscriptions` with entries `'wseffect:load:<key>'`, deps `{ isNeeded: Schema.Boolean }`.

- [ ] **Step 1: Write the failing tests** (APP-10, APP-11, APP-21, Review Focus 2):
  - "concurrent ensure for one key resolves both with one loader call": a spy loader with a 50 ms delay; `Effect.all([ensure(k), ensure(k)])` → loader calls `1`.
  - Subscription stream: with `isNeeded:true` it emits `LoadedPageModule{key}`. When deps flip to `false` before the loader resolves, the stream is interrupted and emits nothing (Foldkit `Subscription` test helpers).
  - With `PageLoader` provided by `Layer.succeed`, the bundle loader is never called.
  - A loader rejection → `FailedPageModule{key, cause}`, with cause from `classifyFailure` (fake `fetchVersion`).
  - `isNeeded` is true only when `key ∈ activeKeys` and the slot is `Loading` or `Dehydrated`.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test loader`. Expected: FAIL.
- [ ] **Step 3: Implement.** In-flight loads are shared through a `Map<key, Deferred>` cleared on failure, so a retry fetches again.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): model-derived page loader subscriptions`.

### Task A4: Page view, prefetch attributes and update banner

**Files:**
- Create: `packages/app/src/view/{page.ts,prefetch.ts,banner.ts}`
- Test: `packages/app/test/view.scene.test.ts`

**Interfaces:**
- Consumes: A1–A3.
- Produces: `binding.view` (`viewPage`), `binding.bannerView`, `prefetchOnIntent`, `prefetchOnVisible`, and the kit DOM ids from Cross-lane contracts.

- [ ] **Step 1: Write the failing Scene tests** (TEST-2, PERF-6, APP-13, APP-16, PWA-6):
  - `Loading` renders `#loading-alpha` (role `status`).
  - `Failed{LoadError}` renders `#failed-alpha[data-cause=LoadError]` with button "Retry"; clicking dispatches `ClickedRetryPage`.
  - `Failed{NewVersion}` renders a "Reload" button dispatching `ClickedReloadPage`.
  - `Ready` renders the page view with `inputs`.
  - `Lazy.expectAllReused` holds when the shell re-renders with identical slot model and input primitives, and re-runs when one input primitive changes.
  - `prefetchOnIntent` attributes dispatch `RequestedPrefetch` on `mouseenter` and on `focus`.
  - Banner: hidden when `isUpdateAvailable` is false; `#wseffect-update` with button `#wseffect-update-reload` dispatching `ClickedApplyUpdate` when true.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test view`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `viewPage` wraps each page view in a per-key `createLazy` whose args are `[slot.model, ...Object.values(inputs) in sorted-key order, h]`.
  - `prefetchOnVisible` is a `Mount.defineStream` over `IntersectionObserver` that disconnects after the first intersection.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): kit page view, prefetch helpers and update banner`.

### Task A5: ServiceWorker service, PWA events and version poll

**Files:**
- Create: `packages/app/src/pwa/{serviceWorker.ts,events.ts,register-stub.ts}`, `packages/app/src/versionPoll.ts`, `packages/app/src/buildId.ts`
- Test: `packages/app/test/serviceWorker.test.ts`, `packages/app/test/versionPoll.test.ts`, `packages/app/test/pwa.story.test.ts`

**Interfaces:**
- Consumes: A2.
- Produces:
  - `ServiceWorker` (with `layer`), `ServiceWorkerUpdateError`, `PwaEvent`;
  - `versionPollSubscription(config: { intervalMs: number; runningBuildId: string }): Subscription entry` emitting `NewVersionAvailable{buildId}`;
  - `BUILD_ID`;
  - `register-stub.ts`, the module the Vite plugin aliases to `virtual:pwa-register` when `pwa: false`.

- [ ] **Step 1: Write the failing tests** (PWA-5, PWA-6, PWA-9, ERR-3, ERR-4, ERR-5):
  - `ServiceWorker.layer` with a fake `registerSW` emits `ChangedOnlineStatus{isOnline:navigator.onLine}` first, then `OfflineReady` on `onOfflineReady` and `UpdateAvailable` on `onNeedRefresh`.
  - `onRegisterError` → `RegisterFailed{reason}`.
  - Window `offline` → `ChangedOnlineStatus{false}`.
  - `applyUpdate` with a rejecting `updateSW` → fails with `ServiceWorkerUpdateError`. Story: `ClickedApplyUpdate` → resolve `ApplyUpdate` with `FailedApplyUpdate` → `pwa.isUpdateAvailable` stays `true`.
  - Version poll with `TestClock`:
    - fetches at 0 and after 300,000 ms;
    - no fetch while `visibilityState='hidden'`;
    - immediate fetch on `visibilitychange` to visible and on `online`;
    - a different `buildId` emits `NewVersionAvailable` and calls `checkForUpdate`;
    - network error or HTML body emits nothing.
  - Story: `NewVersionAvailable{b}` sets `pwa.isUpdateAvailable=true` and `maybeNewBuildId=Some(b)`.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test serviceWorker versionPoll pwa`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `BUILD_ID = __WSEFFECT_BUILD_ID__`, declared in `src/globals.d.ts`. Tests define it via vitest `define: { __WSEFFECT_BUILD_ID__: '"test-build"' }`.
  - The service is built with `Layer.effect` + `Queue.unbounded` + `Effect.acquireRelease` for listeners. `applyUpdate` uses `Effect.tryPromise`.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): ServiceWorker service and version poll`.

### Task A6: `makeApp` and compile-time tests

**Files:**
- Create: `packages/app/src/makeApp.ts`
- Test: `packages/app/test/makeApp.test.ts`, `packages/app/test/makeApp.typecheck.ts` (included in `tsc`, never executed)

**Interfaces:**
- Consumes: A2–A5.
- Produces: `makeApp` (contract signature).

- [ ] **Step 1: Write the failing type tests** (APP-19, APP-20, ERR-7, TEST-5, Review Focus 5). In `makeApp.typecheck.ts`:
  - `// @ts-expect-error` on a config whose `update` requires a `Clock2` service but omits `resources`;
  - `// @ts-expect-error` on `subscriptions: { 'wseffect:mine': … }`;
  - no error when `resources: Clock2.layer` is given.
- [ ] **Step 2: Write the failing runtime test.** `makeApp(config)` started in happy-dom:
  - the merged subscription keys include `wseffect:load:alpha` and `wseffect:version-poll`, and include `wseffect:service-worker` exactly when `__WSEFFECT_PWA__` is true;
  - a supplied `crash.view` is passed through unchanged (ERR-8).
- [ ] **Step 3: Run** `pnpm --filter @wsagency/wseffect-app typecheck && pnpm --filter @wsagency/wseffect-app test makeApp`. Expected: typecheck reports the unused `@ts-expect-error`s; the test fails.
- [ ] **Step 4: Implement `makeApp`.**
  - It calls `Runtime.makeApplication` with merged subscriptions (`Subscription.lift(binding.subscriptions)({ read, toParentMessage })`).
  - `resources: Layer.mergeAll(config.resources ?? Layer.empty, ServiceWorker.layer)`.
  - The config type is a conditional on `[R] extends [never]`.
- [ ] **Step 5: Run** the Step 3 command. Expected: PASS.
- [ ] **Step 6: Commit** `feat(app): makeApp with required resources`.

### Task A7: Vite plugin, part 1: codegen

**Files:**
- Create: `packages/app/src/vite/codegen.ts`, `packages/app/src/codegen/index.ts`, `packages/app/src/codegen/bin.ts` (`wseffect-codegen --check <appRoot>`)
- Test: `packages/app/test/codegen.test.ts`, fixtures `packages/app/test/fixtures/app-pages/`

**Interfaces:**
- Produces: `generatePages`, `checkPages` (contract), the generated file shape from Cross-lane contracts, and the package `bin` entry `wseffect-codegen`.

- [ ] **Step 1: Write the failing tests** (APP-2, APP-3, APP-4, APP-5, TEST-8):
  - `generatePages(fixture)` output starts with `// Generated by @wsagency/wseffect-app/vite from src/pages; do not edit.`
  - It contains `import type { page as AlphaPage } from './pages/alpha'` and `alpha: () => import('./pages/alpha').then(module => module.page)`.
  - It contains `GotAlphaPageMessage: { message: messageSchema(pages, 'alpha') }`.
  - It contains `PageKey = Schema.Literals(['alpha', 'beta'])` (sorted).
  - `*.test.ts` files are excluded.
  - A file `Bad-name.ts` → throws `page key "Bad-name" must match ^[a-z][A-Za-z0-9]*$`.
  - Missing `src/pages/package.json` or `{"sideEffects":true}` → throws mentioning `"sideEffects": false`.
  - `primaryPages: ['gamma']` with no `gamma.ts` → throws `primaryPages names unknown page "gamma"`.
  - Two keys `fooBar` and `foobar`: both generate distinct tags; a key whose tag equals a reserved kit tag → throws "rejects page key whose tag collides" (Review Focus 5).
  - `checkPages` returns `{ ok: false, diff }` after the committed file is edited by one character, and `{ ok: true }` when equal.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test codegen`. Expected: FAIL.
- [ ] **Step 3: Implement.** The plugin hooks `configResolved` and `buildStart` and watches the pages directory with `configureServer` → `watcher.on('add'|'unlink')`. It writes the file only when the content changed.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): page codegen with check mode`.

### Task A8: Vite plugin, part 2: build ID, framework chunk and PWA configuration

**Files:**
- Create: `packages/app/src/vite/{index.ts,buildIdPlugin.ts,chunking.ts,pwa.ts}`; add `computeBuildId` to `packages/app/src/codegen/index.ts`
- Test: `packages/app/test/buildId.test.ts`, `packages/app/test/vitePlugin.test.ts`, `packages/app/test/fixtures/mini-workspace/` (two-package workspace: an app plus a `workspace:*` lib)

**Interfaces:**
- Consumes: A7.
- Produces:
  - `wseffect(options)` (contract); `computeBuildId`;
  - defines `__WSEFFECT_BUILD_ID__` and `__WSEFFECT_PWA__`; emits `dist/version.json`;
  - `validateManifest(manifest): string[]` exported from `./vite`.

- [ ] **Step 1: Write the failing build-ID tests** (PWA-8, TEST-9 unit level):
  - Two calls over an unchanged tree return equal 64-hex strings.
  - One byte changed in app `src/a.ts` changes the ID.
  - One byte changed in the linked lib's `src/x.ts` changes the ID; one byte changed in the lib's `dist/x.js` or `test/x.test.ts` does not.
  - A lockfile change changes the ID.
  - `env.WSEFFECT_BUILD_ID='abc1234'` → `'abc1234'`; `'ABC'` or `'abc12'` → throws `WSEFFECT_BUILD_ID must match ^[0-9a-f]{7,64}$`.
  - The hash input encoding matches the spec: path, `0x00`, decimal length, `0x00`, bytes. Assert against a precomputed SHA-256 of a one-file fixture.
  - Linked packages are found from `pnpm-lock.yaml` `importers.<app>.dependencies.*.version` starting with `link:` or `file:` (transitively); tracked files come from `git ls-files`.
- [ ] **Step 2: Write the failing plugin tests** (APP-23, PWA-1..4, PWA-7). Run `vite build` programmatically on `test/fixtures/app-pages` with `wseffect({ primaryPages: ['alpha'], pwa: {manifest} })`:
  - `dist/version.json` equals `{ buildId }`, and the same string occurs in the entry JS.
  - Output contains a `framework-*.js` chunk; page chunks import from it and not from `index-*`.
  - `sw.js` precache URLs include `index.html`, the entry, `framework-*`, `alpha-*` and not `beta-*`.
  - `sw.js` contains `CacheFirst`, `wseffect-pages`, `maxEntries:200`, `maxAgeSeconds:2592000`, `clientsClaim()`.
  - With `pwa: false`: no `sw.js`, and the entry contains no `workbox`.
  - `validateManifest` rejects missing 192×192 or 512×512 PNG icons and accepts the PWA-7 field set.
- [ ] **Step 3: Run** `pnpm --filter @wsagency/wseffect-app test buildId vitePlugin`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `computeBuildId` runs in the plugin's `config` hook.
  - `define` covers both constants.
  - `generateBundle` emits `version.json` via `this.emitFile`.
  - Chunking: `build.rolldownOptions.output.codeSplitting.groups = [{ name: 'framework', test: /node_modules|[\\/]packages[\\/](app|themes)[\\/]|@wsagency[\\/]wseffect-/ }]`.
  - PWA: `VitePWA` with exactly the PWA-2/PWA-3 options; when `pwa:false`, an alias from `virtual:pwa-register` to `register-stub.js`.
  - The plugin array includes `foldkit()` from `@foldkit/vite-plugin`.
- [ ] **Step 5: Run** again. Expected: PASS.
- [ ] **Step 6: Commit** `feat(app): vite plugin build id, framework chunk and PWA`.

### Task A9: Remaining lint rules

**Files:**
- Create: `packages/app/src/oxlint-plugin/rules/{noTopLevelSideEffectsInPages.ts,noPageInputsInModel.ts}`
- Test: `packages/app/test/oxlint/{noTopLevelSideEffectsInPages,noPageInputsInModel}.test.ts` with `fixtures/pages-side-effects/src/pages/*.ts` and `fixtures/page-inputs/src/pages/*.ts`

**Interfaces:**
- Consumes: 0.3's `runOxlint`.
- Produces: rule ids `wseffect/no-top-level-side-effects-in-pages` (option `allow: string[]`, default allowlist per APP-22) and `wseffect/no-page-inputs-in-model`, both enabled in `.oxlintrc.json`.

- [ ] **Step 1: Write the failing tests** (APP-22, TEST-6):

  | Rule | Bad fixture | Good fixture |
  |---|---|---|
  | side effects | `registerPage('x', page)` at top level → 1 diagnostic; `const t = setTimeout(…)` → 1; same code outside `src/pages` → 0 | `Schema.Struct`, `defineMessageUnion`, `definePage`, `Submodel.defineView`, `createLazy`, `pipe`, `Command.define` → 0 |
  | page inputs | view `(model, { selectedDate }, h) => h.button([h.OnClick(Message.Saved({ date: selectedDate }))])` → 1 diagnostic; `inputs => h.input([h.OnInput(v => Message.Set({ v, d: inputs.selectedDate }))])` → 1 | rendering `selectedDate` as text → 0 |
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app test oxlint`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement both rules.** The side-effects rule checks `Program.body` statements in files whose path contains `/src/pages/`. The page-inputs rule tracks the second parameter of the function passed to `Submodel.defineView` and its destructured bindings.
- [ ] **Step 4: Run** again, then `pnpm lint`. Expected: PASS; 0 errors repo-wide.
- [ ] **Step 5: Commit** `feat(app): page side-effect and page-inputs lint rules`.

### Task A10: Package build, branding, README and LICENSE

**Files:**
- Modify: `packages/app/package.json` (scripts `build: tsc -p tsconfig.build.json && node scripts/brand-dist.mjs`, `exports`, `bin`)
- Create: `packages/app/scripts/brand-dist.mjs`, `packages/app/README.md`, `packages/app/LICENSE`, `packages/app/CHANGELOG.md`
- Test: `packages/app/test/distribution.test.ts`, `packages/app/test/readme.test.ts`

**Interfaces:**
- Produces:
  - `dist/` matching the four subpaths;
  - README section headings exactly `## Effect version (temporary)`, `## Server contract`, `## Limits of updates`.
- Consumes: D5 compares the README UP-8 block byte-for-byte; the block sits between `<!-- up8:start -->` and `<!-- up8:end -->`.

- [ ] **Step 1: Write the failing tests.**
  - `distribution.test.ts` (REPO-2): after `pnpm build`, every `dist/**/*.js` file that defines an exported view (`binding.view`, `bannerView` modules) contains `from 'foldkit/brand'`; `package.json` `exports` keys equal `['.', './vite', './codegen', './oxlint-plugin']`.
  - `readme.test.ts`:
    - the text between the markers equals the Global Constraints snippet;
    - the README contains the PWA-10 table rows and the PWA-11 limits (backend/stored-data skew, loss of in-memory state on reload) and the UP-4 removal condition;
    - LICENSE matches the project MIT text (LIC-2).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-app build && pnpm --filter @wsagency/wseffect-app test distribution readme`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `brand-dist.mjs` calls `brandDistDirectory(packageRoot, '@wsagency/wseffect-app')` from `@foldkit/vite-plugin` (the same pattern as `@foldkit/ui`'s `scripts/brand-dist.mjs`).
  - Write the README and LICENSE.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): branded distribution, README and license`.

---

## Lane B — `@wsagency/wseffect-themes`

### Task B1: CSS pipeline import

**Files:**
- Create: `packages/themes/{postcss.config.js,postcss-breakpoints.js,postcss-whitespace.js,scripts/build-css.js,UPSTREAM.md,LICENSE}`
- Create: `packages/themes/src/styles/**` and `packages/themes/src/css-components/*.css` (CSS only)
- Test: `packages/themes/test/css.test.ts`

**Interfaces:**
- Produces: `dist/styles/**` with every CSS output of TH-2 and `.layer.css` siblings; CSS `exports` subpaths from Cross-lane contracts.

- [ ] **Step 1: Copy sources.**
  - Command: `git clone --filter=blob:none https://github.com/wsagency/radix2solid.git /tmp/r2s-css && git -C /tmp/r2s-css checkout 383676172abb84b4a1d2e54a087d290437ee8848`. The pin is public `main` (rc.3); never use a local worktree commit (spec TH-1 pin rule).
  - Copy `packages/themes/src/styles/**`, `packages/themes/src/components/*.css`, `postcss.config.js`, `postcss-breakpoints.js`, `postcss-whitespace.js` and `scripts/build-css.js` from the clone.
  - Component CSS imports are path-adjusted from `src/components` to `src/css-components`; no `.tsx` file is copied.
  - `build-css.js` restricts per-component output to the foundation set (box, flex, grid, text, heading, button, card, text-field, dialog, dropdown-menu, tabs) plus its `dependencies` map closure (spinner, scroll-area, heading, text).
  - Keep the header comment `// Original Radix Themes CSS target order; MIT, Copyright (c) 2023 WorkOS.`
  - `UPSTREAM.md` records the repository, commit `383676172abb84b4a1d2e54a087d290437ee8848`, the copied paths and local changes.
- [ ] **Step 2: Write the failing tests** (TH-1..4, LIC-2):
  - after `pnpm --filter @wsagency/wseffect-themes build:css`, each TH-2 output exists with a `.layer.css` sibling starting with `@layer radix {`;
  - `css/button.css` exists and `css/checkbox.css` does not;
  - `tokens/colors/` has 30 palette files;
  - `styles.css` contains `@media (min-width: 520px)`, `768px`, `1024px`, `1280px`, `1640px`;
  - `@radix-ui/colors` resolved version is `3.0.0`;
  - LICENSE contains the project MIT, Radix Themes (2023 WorkOS), Radix Colors (2021 Radix) and radix2solid notices.
- [ ] **Step 3: Run** `pnpm --filter @wsagency/wseffect-themes build:css && pnpm --filter @wsagency/wseffect-themes test css`. Expected: PASS after Steps 1–2 are wired (first run before wiring: FAIL).
- [ ] **Step 4: Commit** `feat(themes): import Radix Themes CSS pipeline from radix2solid 38367617`.

### Task B2: Prop definitions, responsive classes and lookup tables

**Files:**
- Create: `packages/themes/src/props/{breakpoints.ts,responsive.ts,classTable.ts,layout.props.ts,margin.props.ts,padding.props.ts,color.props.ts,radius.props.ts}`
- Test: `packages/themes/test/props.test.ts`

**Interfaces:**
- Produces:
  - `Breakpoint`, `Responsive<T>`;
  - `classTable<Values extends string>(prefix: string, values: ReadonlyArray<Values>): Readonly<Record<Values, string>>`, computed once at module load with pure initializers;
  - `responsiveClasses(prop: ResponsivePropDef, value: Responsive<string> | undefined): { classes: ReadonlyArray<string>; style: Readonly<Record<string, string>> }`.

- [ ] **Step 1: Write the failing tests** (TH-6, TH-7):
  - `responsiveClasses(p, '4')` → `{ classes: ['rt-r-p-4'], style: {} }`.
  - `{ initial: '2', md: '4' }` → `['rt-r-p-2', 'md:rt-r-p-4']`.
  - Arbitrary `'13px'` → `{ classes: ['rt-r-p'], style: { '--p': '13px' } }`.
  - `{ sm: '13px' }` → `classes ['sm:rt-r-p']`, `style {'--p-sm':'13px'}`.
  - `classTable('rt-variant-', ['solid','soft'])` is frozen, and two calls to the button class lookup return the identical string instance (lookup, not concatenation).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test props`. Expected: FAIL.
- [ ] **Step 3: Implement** prop definitions that mirror radix2solid's `src/props` values for the foundation props.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): responsive prop classes via precomputed tables`.

### Task B3: Theme

**Files:**
- Create: `packages/themes/src/components/theme.ts`, `packages/themes/src/props/grayMatch.ts`
- Test: `packages/themes/test/theme.scene.test.ts`

**Interfaces:**
- Consumes: B2.
- Produces: `Theme.Settings`, `Theme.defaults`, `Theme.view` (contract).

- [ ] **Step 1: Write the failing Scene tests** (TH-11, TH-12, TH-13, GATE-P4):
  - Root render with defaults has class `radix-themes` and attributes `data-is-root-theme="true"`, `data-accent-color="indigo"`, `data-gray-color="slate"`, `data-radius="medium"`, `data-scaling="100%"`, `data-has-background="true"`, `data-panel-background="translucent"`. It has no `light`/`dark` class with `appearance: 'inherit'`, and class `dark` with `'dark'`.
  - A nested Theme with only `{ radius: 'full' }` carries `data-radius` only. Nested `{ accentColor: 'crimson' }` with gray `auto` also emits `data-gray-color="mauve"`.
  - Changing `accentColor` in the Model mutates exactly one attribute on the Theme element (MutationObserver), and a memoized child (`createLazy`) is reused (`Lazy.expectAllReused`).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test theme`. Expected: FAIL.
- [ ] **Step 3: Implement.** The gray-matching table is copied from radix2solid `get-matching-gray-color.ts`.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): Theme root and nested views`.

### Task B4: Box, Flex, Grid, Text, Heading, Card

**Files:**
- Create: `packages/themes/src/components/{box,flex,grid,text,heading,card}.ts`
- Test: `packages/themes/test/layout.scene.test.ts`, `packages/themes/test/typography.scene.test.ts`

**Interfaces:**
- Consumes: B2.
- Produces: `X.Props`, `X.ViewProps<M>`, `X.view` per contract. `Text`/`Heading` take `as`: Text `'span'|'div'|'label'|'p'`, Heading `'h1'..'h6'`.

- [ ] **Step 1: Write the failing Scene tests** (TH-5, TH-6, TH-7, TH-14, GATE-P4):
  - `Flex.view({ direction: { initial: 'column', md: 'row' }, gap: '3' })` → classes `rt-Flex rt-r-fd-column md:rt-r-fd-row rt-r-gap-3`.
  - `Grid.view({ columns: '3' })` → `rt-r-gtc-3`.
  - `Heading.view({ as: 'h2', size: '6' })` → role `heading` level 2, class `rt-r-size-6`.
  - `Card.view({ variant: 'surface' })` → `rt-Card rt-variant-surface`.
  - Each component under `createLazy` with equal primitive args → `Lazy.expectAllReused`.
  - `X.Props` decodes valid props and rejects `size: '99'`.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test layout typography`. Expected: FAIL.
- [ ] **Step 3: Implement** each component as a pure function using class tables (no per-render enum concatenation).
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): layout, typography and card views`.

### Task B5: Button and TextField

**Files:**
- Create: `packages/themes/src/components/{button,text-field}.ts`
- Test: `packages/themes/test/controls.scene.test.ts`

**Interfaces:**
- Consumes: B2.
- Produces: `Button.view` and `TextField.view` (contract), wrapping `@foldkit/ui` `Button.view` and `Input.view` (TH-8).

- [ ] **Step 1: Write the failing Scene tests** (TH-8, TH-14, GATE-P4):
  - Button renders role `button` named by its children, with classes `rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button` and `data-accent-color` only when `color` is passed.
  - Click dispatches `onClick`; `disabled` sets `aria-disabled`/`disabled` from `@foldkit/ui`; `loading` renders a spinner and keeps the label width.
  - TextField `label: 'Email'` is found by `label('Email')`; typing dispatches `onInput` with the value; classes `rt-TextFieldRoot rt-r-size-2 rt-variant-surface`.
  - Lazy reuse for both.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test controls`. Expected: FAIL.
- [ ] **Step 3: Implement** via `toView` attribute bundles plus the class tables.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): Button and TextField over @foldkit/ui`.

### Task B6: Dialog

**Files:**
- Create: `packages/themes/src/components/dialog.ts`
- Test: `packages/themes/test/dialog.story.test.ts`, `packages/themes/test/dialog.scene.test.ts`

**Interfaces:**
- Produces: `Dialog.{Model, Message, OutMessage, init, update, open, close, fold, embed}`, re-exported from `@foldkit/ui` Dialog with no wrapper state (TH-9, TH-10).

- [ ] **Step 1: Write the failing tests** (TH-9, TH-10, TH-14, TEST-1, TEST-2):
  - Story: `fold({ read, write, toParentMessage, foldOutMessage })` on `RequestedOpen` yields OutMessage `Opened`; the update module's function coverage is 100%.
  - Scene: `embed` renders `rt-DialogContent rt-r-size-3` panel classes, the title as `aria-labelledby` target, and keeps `@foldkit/ui`'s inline `z-index` (`2147483600`). Escape closes; the close button has accessible name "Close".
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test dialog`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): themed Dialog submodel helpers`.

### Task B7: DropdownMenu and Tabs

**Files:**
- Create: `packages/themes/src/components/{dropdown-menu,tabs}.ts`
- Test: `packages/themes/test/{dropdownMenu,tabs}.{story,scene}.test.ts`

**Interfaces:**
- Produces: `DropdownMenu.create<Item>()` and `Tabs.create<Value>()` bundles (contract), wrapping `Menu.create<Item>()` and `@foldkit/ui` Tabs.

- [ ] **Step 1: Write the failing tests** (TH-9, TH-10, TH-14):
  - **DropdownMenu Story:** `SelectedItem` → OutMessage `Selected{value}`.
  - **DropdownMenu Scene:** the trigger has `aria-haspopup="menu"` and `aria-expanded`; the panel has role `menu` with classes `rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent`; items have role `menuitem`; ArrowDown moves `aria-activedescendant`.
  - **Tabs:** role `tablist`/`tab`/`tabpanel`; roving `tabindex`; selecting emits the OutMessage; classes `rt-TabsList`, `rt-TabsTrigger`.
  - 200 closed menus under `createKeyedLazy` → 0 menu view calls on an unrelated update (GATE-P4, PERF-1).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes test dropdownMenu tabs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(themes): DropdownMenu and Tabs`.

### Task B8: Themes distribution and README

**Files:**
- Modify: `packages/themes/package.json` (build `tsc -p tsconfig.build.json && node scripts/brand-dist.mjs && node scripts/build-css.js`, `exports`, `sideEffects: ["**/*.css"]`)
- Create: `packages/themes/scripts/brand-dist.mjs`, `packages/themes/README.md`, `packages/themes/CHANGELOG.md`
- Test: `packages/themes/test/distribution.test.ts`

- [ ] **Step 1: Write the failing test** (REPO-1, REPO-2, LIC-2/LIC-3):
  - every `dist/components/*.js` defining a view contains `from 'foldkit/brand'`;
  - the `exports` map covers `.`, `./components/<name>` for the 12 components, and every CSS subpath from B1;
  - README ends with a License paragraph naming the retained notices.
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-themes build && pnpm --filter @wsagency/wseffect-themes test distribution`. Expected: FAIL, then PASS after the build scripts are written.
- [ ] **Step 3: Commit** `feat(themes): branded distribution and README`.

---

## Lane C — server, bench, gates

### Task C1: Deploy server with byte accounting and retention

**Files:**
- Create: `tools/serve/server.ts`, `tools/serve/cli.ts`
- Test: `tools/serve/server.test.ts`

**Interfaces:**
- Produces: `startServer(options: { port: number; brotli: boolean }): Promise<ServerHandle>` with
  - `deploy(dir: string, opts?: { retain?: number }): void` (default retention 3 deployments, PWA-10);
  - `stats(reset?: boolean): { requests: number; bytes: number; byPath: string[] }`;
  - `close()`.

  Used by C3, C4, D3, D4.

- [ ] **Step 1: Write the failing tests** (PWA-10):
  - `assets/*` responses carry `Cache-Control: public, max-age=31536000, immutable`; `index.html`, `sw.js`, `version.json`, `manifest.webmanifest` carry `no-cache`.
  - An extensionless unknown path serves `index.html`; a missing asset returns 404.
  - After deploying 4 builds, assets of builds 2–4 resolve and build 1's return 404.
  - With `brotli:true` and `accept-encoding: br`, the body is brotli and `stats().bytes` equals the summed encoded body lengths.
- [ ] **Step 2: Run** `node --test tools/serve/server.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with `node:http`, a brotli cache per file, and a retention list.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(tools): deploy server with retention and byte accounting`.

### Task C2: Import the radix2solid bench from a clean checkout

**Files:**
- Create: `bench/radix2solid/{package.json,vite.config.ts,index.html,tsconfig.json,library-source.json,src/**,packs/*.tgz,scripts/prepare-library.ts,README.md}`
- Test: `bench/radix2solid/scripts/prepare-library.test.ts`

**Interfaces:**
- Produces:
  - a Solid 2 app implementing the gallery routes and the `data-perf` hooks from Cross-lane contracts;
  - `library-source.json` `{ repository: "https://github.com/wsagency/radix2solid.git", commit: "383676172abb84b4a1d2e54a087d290437ee8848", packedTarballs: { name: { file, contentSha256 } } }`. The commit is public `main` (rc.3); `prepare-library.ts` fails if `git fetch origin <commit>` fails (spec TH-1 pin rule).
- Consumes: the app sources of `/tmp/wseffect-research/r2s-baseline/app` as the starting point. Its snapshot-built packs and numbers are **not** reused (BENCH-3).

- [ ] **Step 1: Write the failing test** for `prepare-library.ts --verify`:
  - It clones the repository at `commit` into `.artifacts/radix2solid-src` (`git clone --filter=blob:none`, `git checkout <commit>`, asserting `git status --porcelain` is empty).
  - It runs `pnpm install --frozen-lockfile && pnpm build`, then `pnpm pack` for primitives and themes.
  - It computes `contentSha256` = SHA-256 over the sorted `(path, sha256)` list of the unpacked tarball files, independent of tar metadata.
  - The test: with a fake clone directory, `contentSha256` of two tarballs with identical files but different mtimes are equal.
- [ ] **Step 2: Run** `node --test bench/radix2solid/scripts/prepare-library.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `prepare-library.ts`.** Modes: `--write` (copy packs into `bench/radix2solid/packs/`, update `library-source.json`) and `--verify` (exit 1 on any content-hash mismatch).
- [ ] **Step 4: Build the app.** Copy the r2s-baseline app sources into `bench/radix2solid/src`. Adapt routes and hooks to the gallery contract (pages layout, typography, buttons, cards, textField, dialog, dropdownMenu, tabs, theme, shared, virtualList, form, menus). Dependencies: `file:./packs/<name>.tgz`, `solid-js`/`@solidjs/web` 2.0.0-rc.15, `@solidjs/vite-plugin` 3.0.0-next.50. Add those exact versions to `minimumReleaseAgeExclude` only if needed, with reason comments (CI-4).
- [ ] **Step 5: Run** `node bench/radix2solid/scripts/prepare-library.ts --write && pnpm install && pnpm --filter radix2solid-bench build && node bench/radix2solid/scripts/prepare-library.ts --verify`. Expected: the build succeeds; verify prints `content hashes match`.
- [ ] **Step 6: Commit** `feat(bench): radix2solid comparison app from clean 38367617 packs`.

### Task C3: Size gate

**Files:**
- Create: `tools/gates/size.ts`, `bench/baselines/size.json` (format per contract; entries filled by D1)
- Create: `tools/fixtures/mini-app/` (Foldkit app using `wseffect()` with 3 pages, the perf hooks and the PWA)
- Test: `tools/gates/size.test.ts`

**Interfaces:**
- Consumes: C1 `startServer`.
- Produces: `measureSize(input: { distDir: string; pagesDir: string }): Promise<SizeReport>`, where `SizeReport = { shell: number; firstVisit: { bytes: number; requests: number }; pages: Record<string, number>; stylesCss?: number }`; `compareSize(report, baseline): { failures: string[] }`; CLI `pnpm gate:size --app apps/gallery`.

- [ ] **Step 1: Write the failing tests** (GATE-S1, S2, S3):
  - `compareSize` fails when `shell > 122880` with the message `GATE-S1: shell <n> B exceeds 122,880 B; do not raise the budget without user decision` (spec GATE-S1).
  - It fails when first-visit `> 163840`.
  - It fails when any tracked artifact grows by more than 2% over baseline and the baseline `reason` is empty; it passes when the same PR's baseline entry has a non-empty reason.
  - On `tools/fixtures/mini-app`: `shell` equals the brotli-q11 size of `index-*.js` + `framework-*.js`. `firstVisit` counts every server request from `goto('/')` until `navigator.serviceWorker.controller` is set and the server has seen no request for 1,000 ms.
- [ ] **Step 2: Run** `node --test tools/gates/size.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with Playwright Chromium and the C1 server with `brotli:true`.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(gates): size budgets and growth check`.

### Task C4: Performance gate harness

**Files:**
- Create: `tools/gates/perf.ts`, `tools/gates/scenarios.ts`, `bench/baselines/perf.json`
- Test: `tools/gates/perf.test.ts`

**Interfaces:**
- Produces:
  - `SCENARIOS: ReadonlyArray<{ id: 'vl-cell'|'vl-filter'|'vl-sort'|'vl-select'|'form-field'|'menus-tick'; route: string; act: (page) => Promise<void>; ceilingMs: 50|30 }>`;
  - `runScenario(baseUrl, scenario, sessions = 10): Promise<{ eventMs: number[]; scriptMs: number[] }>`;
  - `abab(baselineUrl, candidateUrl, scenario): Promise<RegressionResult>`;
  - CLI `pnpm gate:perf --app apps/gallery`.

- [ ] **Step 1: Write the failing tests** (GATE-P1, P2, P3):
  - `interactionDuration(entries)` takes the longest entry per `interactionId` and returns `16` when no entry qualifies.
  - `regressed({ baseScript, candScript, baseEvent, candEvent })` (medians over the arrays):
    - script 10.0 → 11.1 ms: true (> 1.10×); script 10.0 → 10.9 ms: false;
    - event 40 → 48 ms: true (+20% and +8 ms); 16 → 24 ms: true;
    - event 72 → 78 ms: false (+6 ms); 100 → 109 ms: false (+9%); 200 → 212 ms: false (+6%).
  - `ceilings`: vl-* scenarios 50, form-field and menus-tick 30.
  - Against `tools/fixtures/mini-app` with 2 sessions, `runScenario` returns arrays of length 2 and applies `Emulation.setCPUThrottlingRate { rate: 4 }`.
- [ ] **Step 2: Run** `node --test tools/gates/perf.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `PerformanceObserver({ type:'event', durationThreshold:16, buffered:true })` is installed via `addInitScript`; CDP `Performance.getMetrics` `ScriptDuration` delta per interaction.
  - ABAB: build the baseline commit in `git worktree add .artifacts/perf-baseline <baselineCommit>` with `pnpm install --frozen-lockfile && pnpm --filter @wsagency/wseffect-gallery build`; serve both builds on two ports; alternate 10 pairs.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(gates): Event Timing perf gate with ABAB regression`.

### Task C5: Side-by-side report and CI gate jobs

**Files:**
- Create: `tools/gates/report.ts`
- Modify: `.gitea/workflows/check.yml` (jobs `size`, `perf` with `needs: check`, and `bench-radix2solid` with `continue-on-error: true`)
- Test: `tools/gates/report.test.ts`

**Interfaces:**
- Consumes: C2–C4.
- Produces: `report.json` artifact `{ wseffect: { size, perf }, radix2solid: { size, perf } }` and a Markdown job summary table.

- [ ] **Step 1: Write the failing test** (BENCH-2): `renderSummary(report)` produces one Markdown table with rows `shell`, `first-visit`, and each scenario's Event/script medians, columns `wseffect | radix2solid`, and the header line `Reporting only; not a gate.`
- [ ] **Step 2: Run** `node --test tools/gates/report.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The `bench-radix2solid` job runs `prepare-library.ts --verify`, builds the bench and gallery, and runs `measureSize` and all `SCENARIOS` (10 sessions each, same method) on both.
  - It writes `report.json` and appends the summary to `$GITHUB_STEP_SUMMARY`.
  - `size` runs `pnpm gate:size --app apps/gallery`; `perf` runs `pnpm gate:perf --app apps/gallery`.
- [ ] **Step 4: Run** `node --test tools/gates/report.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `ci: add size, perf and radix2solid report jobs`.

---

## Lane D — gallery, e2e, packed consumer, docs

### Task D1: Gallery shell, pages and first size record

**Files:**
- Create: `apps/gallery/{package.json,index.html,vite.config.ts,tsconfig.json,public/icons/icon-192.png,public/icons/icon-512.png}`
- Create: `apps/gallery/src/{main.ts,shell.ts,contract.ts,routes.ts,datePicker.ts}`, `apps/gallery/src/pages/{layout,typography,buttons,cards,textField,dialog,dropdownMenu,tabs,theme,sharedA,sharedB}.ts`, `src/pages/package.json`, generated `src/pages.gen.ts`
- Test: `apps/gallery/test/shell.story.test.ts`, `apps/gallery/test/pages.scene.test.ts`, `apps/gallery/test/manifest.test.ts`

**Interfaces:**
- Consumes: A1–A10 and B1–B8 exports exactly as in Cross-lane contracts; C3 `measureSize`.
- Produces:
  - the gallery contract (routes, ids, primary pages);
  - `contract.ts` exporting `PageInputs = { selectedDate: string }` and `PageOutMessage = defineMessageUnion({ RequestedShiftDay: { days: Schema.Number } })`;
  - `bench/baselines/size.json` entries.

- [ ] **Step 1: Write the failing tests** (§6.2, APP-17, APP-18, PWA-7, TEST-1, TEST-2):
  - **Shell Story:** `ChangedDate` updates the single `selectedDate`; `RequestedShiftDay{-1}` from `sharedA`'s OutMessage shifts it; `ChangedUrl('/shared')` sends `EnteredRoute{['sharedA','sharedB']}` to the kit.
  - **Scene:** every page renders its components with accessible names.
  - **sharedA** shows `selectedDate` from inputs in `#date-page-sharedA` and has the `Option<string>` note field.
  - **Theme page:** controls change accent, gray, radius, scaling and appearance through the shell Model.
  - **Manifest test:** `validateManifest(manifestFromViteConfig)` returns `[]` (PWA-7).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-gallery test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Gallery config: `wseffect({ primaryPages: ['layout','typography','buttons','dialog'], pwa: { manifest } })`; routes per contract; `makeApp`.
  - The shell embeds the date submodel (`#date-submodel`, `#date-submodel-next`) via `viewInputs`.
  - Generate `pages.gen.ts` with `pnpm --filter @wsagency/wseffect-gallery exec wseffect-codegen .` and commit it.
  - Root `check` adds `wseffect-codegen --check apps/gallery`.
- [ ] **Step 4: Run** `pnpm --filter @wsagency/wseffect-gallery test && pnpm --filter @wsagency/wseffect-gallery build`. Expected: PASS; the build emits one chunk per page plus `framework-*`.
- [ ] **Step 5: Record sizes** (GATE-S1). Run `pnpm gate:size --app apps/gallery --write-baseline --reason "initial foundation measurement"`.
  - Expected: `bench/baselines/size.json` written with `shell`, `first-visit`, `page:*`, `styles.css`.
  - **If `shell` > 122,880 B:** do NOT change the budget. Commit the baseline with the measured value; the `size` job then fails. Open the PR with a source-map attribution (`SOURCEMAP=on` build plus `tools/gates/size.ts --attribute`) and stop for the user's decision.
- [ ] **Step 6: Commit** `feat(gallery): shell, foundation pages and initial size baseline`.

### Task D2: Performance pages

**Files:**
- Create: `apps/gallery/src/pages/{virtualList,form,menus}.ts`
- Test: `apps/gallery/test/perfPages.scene.test.ts`

**Interfaces:**
- Produces: the `data-perf` hooks consumed by C4.

- [ ] **Step 1: Write the failing Scene tests** (PERF-1..4, GATE-P4, UP-5):
  - **virtualList:** 10,000 items through `@foldkit/ui` VirtualList; renders ≤ 20 rows; filter and sort operate on the Model; row views are memoized with `createKeyedLazy` keyed by item id, and the cache instance belongs to the page module's lifetime with keys bounded by the 10,000 ids.
  - **form:** 200 TextFields; editing field 0 re-runs exactly 1 field view (`Lazy.expectAllReused` for the other 199).
  - **menus:** 200 DropdownMenus; `menus-tick` re-runs 0 menu views.
  - Every `createLazy` call site passes only primitives and `h` (PERF-2).
- [ ] **Step 2: Run** `pnpm --filter @wsagency/wseffect-gallery test perfPages`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** again, then `pnpm gate:perf --app apps/gallery --write-baseline --reason "initial foundation baseline"`. Expected: PASS; all six ceilings met; `perf.json` records the current commit.
- [ ] **Step 5: Commit** `feat(gallery): VirtualList, form and menus performance pages`.

### Task D3: Browser e2e: lazy pages, shared state, accessibility

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers/{server.ts,accessibility.ts,mutations.ts}`
- Create: `e2e/lazy.spec.ts`, `e2e/shared.spec.ts`, `e2e/navigation.spec.ts`, `e2e/failure.spec.ts`, `e2e/theme.spec.ts`, `e2e/devReload.spec.ts`, `e2e/chunks.spec.ts`, `e2e/axe.spec.ts`

**Interfaces:**
- Consumes: C1 `startServer`; the gallery contract.
- Produces: Playwright projects `chromium`, `firefox`, `webkit` against the production gallery; `devReload` runs Chromium only against `vite dev`.

- [ ] **Step 1: Write the specs** (TEST-3, TEST-4, APP-11, APP-13, APP-14, APP-16, APP-17, APP-23):

  | Spec | Assertions |
  |---|---|
  | `lazy` | No page chunk requested on `/` |
  | `shared` | Date changed from `#date-input`, `#date-submodel-next` and `#sharedA-prev` keeps `#date-shell`, `#date-submodel`, `#date-page-sharedA`, `#date-page-sharedB` equal; MutationObserver records 0 `childList` mutations outside `<title>`; date changed while the sharedA chunk is delayed 1,200 ms shows the new date when the page appears |
  | `navigation` | Deep links `/shared` fetch sharedA+sharedB, `/dialog` fetches dialog only; back/forward keeps `#sharedA-note` and fetches each chunk once; `/dialog` → `/tabs` → `/dialog` with 600 ms delays fetches each once and shows only dialog |
  | `failure` | Aborted chunk → `#failed-buttons[data-cause=LoadError]` → `#retry-buttons` succeeds after unroute; hover on `#link-buttons` and scroll to a viewport-prefetched link each fetch once and add no `#loading-*` node on navigation; a failed prefetch then navigation renders the page |
  | `theme` | Accent change mutates exactly one attribute on the root Theme; "changing accent while dialog is open keeps it open and focused" (Review Focus 4) |
  | `devReload` | Dev server: sharedA note set, `apps/gallery/src/routes.ts` touched; after reload the note and the date are restored, and no `GotSharedAPageMessage` from init appears (via `window.__wseffectMessages` exposed only when `import.meta.env.DEV`); a sharedA schema field added → sharedA re-inits, sharedB keeps state; files restored afterwards |
  | `chunks` | Two builds with `WSEFFECT_BUILD_ID` fixed and one page source byte changed differ in exactly 2 asset filenames |
  | `axe` | Every route in every engine: `accessibilityViolations(page)` is `[]` |
- [ ] **Step 2: Run** `pnpm exec playwright test` against a build that lacks the features (for example, with the kit view's loading ids removed). Expected: FAIL. Then restore.
- [ ] **Step 3: Run** `pnpm build && pnpm exec playwright test`. Expected: all projects PASS.
- [ ] **Step 4: Commit** `test(e2e): lazy pages, shared state, failures, theme, dev reload, axe`.

### Task D4: PWA, deploy-skew and build-ID e2e

**Files:**
- Create: `e2e/pwa.spec.ts`, `e2e/skew.spec.ts`, `e2e/buildId.spec.ts`

**Interfaces:**
- Consumes: C1 (`deploy` with and without retention); the gallery built twice:
  - `WSEFFECT_BUILD_ID=aaaaaaa1`, and `WSEFFECT_BUILD_ID=bbbbbbb2 GALLERY_REVISION=r2`;
  - `GALLERY_REVISION` is a `define` used only in the `tabs` page, so v1 and v2 differ only in the tabs page.

- [ ] **Step 1: Write the specs** (TEST-4 PWA, deploy-skew and service-worker-cache rows, PWA-3, PWA-4, PWA-6, PWA-9, TEST-9):
  - **`pwa`:**
    - precache contains `index.html`, entry, `framework-*` and the 4 primary pages, but not `tabs-*`;
    - after visiting `/tabs` in the first session, `tabs-*` is in cache `wseffect-pages`;
    - offline: reload `/`, `/tabs` (visited), `/layout` (primary, never visited) and the deep link `/dialog` all render; `/cards` (never visited, not primary) shows `#failed-cards[data-cause=Offline]`.
  - **Update flow:**
    - deploy v2 → `#wseffect-update` appears after `registration.update()`;
    - reload before accept keeps `#build-id` = `aaaaaaa1`;
    - `#wseffect-update-reload` → `#build-id` = `bbbbbbb2`;
    - JS requested per phase belongs to one build.
  - **`skew`:**
    - no SW (`serviceWorkers:'block'`), v1 open, v2 deployed with retention 0: navigating to `/tabs` → `#failed-tabs[data-cause=NewVersion]`, then `#reload-tabs` → `#build-id` = `bbbbbbb2`;
    - with retention (default 3): `/tabs` renders v1 content and `#date-shell` keeps its value;
    - no SW, v2 deployed, no retention change: dispatch `visibilitychange` to visible (`page.evaluate` sets `document.visibilityState` via the hidden→visible tab switch `page.bringToFront()` after opening a second page) → the version poll fetches immediately and `#wseffect-update` appears. `versionPollMs` stays at its 300,000 ms default; no test-only configuration path is added.
  - **`buildId`:**
    - two builds of an unchanged tree without `WSEFFECT_BUILD_ID` have equal `version.json`;
    - a one-byte change in `apps/gallery/src/pages/cards.ts` changes it;
    - a one-byte change in `packages/themes/src/components/card.ts` changes it;
    - `WSEFFECT_BUILD_ID=0123abcd` is used verbatim; `WSEFFECT_BUILD_ID=XYZ` makes `vite build` exit non-zero;
    - the entry JS contains the `version.json` value.
- [ ] **Step 2: Run** `pnpm exec playwright test e2e/pwa.spec.ts e2e/skew.spec.ts e2e/buildId.spec.ts --project=chromium`. Expected: PASS. Firefox and WebKit run `pwa` offline cases where Playwright supports service workers; projects that do not are listed in `playwright.config.ts` `grepInvert` with the reason.
- [ ] **Step 3: Commit** `test(e2e): PWA precache, offline, update prompt, deploy skew, build id`.

### Task D5: Packed consumer gate

**Files:**
- Create: `tests/consumer/run.ts`, `tests/consumer/check-tree-shaking.ts`, `tests/consumer/check-branding.ts`, `tests/consumer/check-up8.ts`, `tests/consumer/check-coverage-manifest.ts`, `tests/consumer/coverage-manifest.json`
- Test: `tests/consumer/run.test.ts` (unit tests for the checks)

**Interfaces:**
- Consumes: A10 and B8 build outputs; the UP-8 README block markers.
- Produces: `pnpm test:consumer` (part of `pnpm check`).

- [ ] **Step 1: Write the failing unit tests** (TEST-7, APP-6, REPO-2, UP-3, UP-8):
  - `checkUp8(readmeText, workspaceYaml)` fails on a 1-character difference.
  - `checkTreeShaking(bundleText, marker)` fails when markers from `viewPage`, `ServiceWorker`, `makeApp`, `prefetchOnVisible` appear in a consumer importing only `makePages` and `loaderSubscriptions`.
  - `checkCoverageManifest(manifest, publicSurface, passedChecks)` fails on an unlisted export and on a listed entry whose check did not pass.
- [ ] **Step 2: Run** `node --test tests/consumer/run.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `run.ts`.**
  1. `pnpm pack` both packages into `.artifacts/packs`, renamed to `<sha256-prefix>.tgz`.
  2. Create `.artifacts/consumer/` **outside** the repo workspace: a copy at `os.tmpdir()/wseffect-consumer-<hash>` whose `pnpm-workspace.yaml` is exactly the README UP-8 block.
  3. Its `package.json` has `file:` tarball dependencies and the root's exact tool pins.
  4. Copy the gallery `src`, `index.html`, `vite.config.ts`, `public` and e2e specs.
  5. `pnpm install`, `vite build`, `tsc --noEmit`.
  6. Run `check-up8`, the single-Effect check (`scripts/check-repo.ts` `checkEffectCopies` on the consumer lockfile, plus a directory scan for `node_modules/.pnpm/effect@*` count = 1), `check-branding`, and `check-tree-shaking` (a second tiny consumer entry).
  7. Run Playwright `chromium` against the packed build (`GALLERY_PACKED=1`).
  8. Run `check-coverage-manifest`.
- [ ] **Step 4: Run** `pnpm test:consumer`. Expected: `packed consumer: all checks passed`.
- [ ] **Step 5: Commit** `test(consumer): packed-tarball consumer gate with coverage manifest`.

### Task D6: Root LICENSE, README and CONTRIBUTING

**Files:**
- Create: `LICENSE`, `README.md`, `CONTRIBUTING.md`
- Test: `scripts/check-docs.test.ts`

- [ ] **Step 1: Write the failing test** (LIC-1, LIC-3, CI-5, risk 4, UP-4..7, TH-15):
  - **`LICENSE`:** first line `MIT License`; contains `Copyright (c) 2026 wseffect contributors`; then the disclaimer, then the Radix Themes (`Copyright (c) 2023 WorkOS`), Radix Colors (`Copyright (c) 2021 Radix`) and radix2solid (`Copyright (c) 2026 Radix2Solid contributors`) MIT texts separated by `----`.
  - **`README.md`:** contains `## Created for WS Agency` with `ws-vertical-white.svg` and `ws-vertical-color.svg` at `width="160"`, the LIC-3 sentence verbatim and the `usage-and-licenses.md` link. Headings follow in order: `## Contributing`, `## Local development`, `## Distribution and gates`, `## License`.
  - **`CONTRIBUTING.md`:** contains the following sections.

    | Section | Content |
    |---|---|
    | `## Upstream Foldkit PRs` | `--workers=4` and `NODE_OPTIONS=--max-old-space-size=8192` |
    | `## Dependency upgrades` | UP-1 own-PR rule, UP-4 removal steps, UP-6 neutral-only size PRs, UP-7 no patches |
    | `## Performance rules` | PERF-1..6 and TH-15 |
    | `## Commits` | No AI co-author trailers |
- [ ] **Step 2: Run** `node --test scripts/check-docs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the three documents.**
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `docs: root license, README and contributing guide`.

---

## Integration and final verification (integrator)

- [ ] Merge order: `lane-0` → `lane-a`, `lane-b`, `lane-c` (any order, each rebased) → `lane-d`.
- [ ] After the final merge on `main`, run `pnpm install --frozen-lockfile && pnpm check && pnpm gate:size --app apps/gallery && pnpm gate:perf --app apps/gallery`. Expected: all pass, except the GATE-S1 decision path described in D1 Step 5.
- [ ] Push `main`; confirm the Gitea Actions jobs `check`, `size` and `perf` are green and that `bench-radix2solid` produced `report.json`.

## Requirement coverage

| Requirement | Task(s) |
|---|---|
| PRI-1 | Global Constraints; 0.1 (no patches check); B6 (inline styles kept) |
| PRI-2 | A4 (prefetch), A2 (Available activation); D3 |
| PRI-3 | C3 |
| UP-1 | 0.1 (exact pins check) |
| UP-2 | 0.1 (workspace block) |
| UP-3 | 0.1 (`checkEffectCopies`); D5 (packed) |
| UP-4 | A10 (README removal condition); D6 (CONTRIBUTING steps) |
| UP-5 | D2 (VirtualList for filtered lists) |
| UP-6 | D6 |
| UP-7 | 0.1 (rejects `patchedDependencies`); D6 |
| UP-8 | 0.1, A10, D5 |
| REPO-1 | 0.1, A10, B8 |
| REPO-2 | A10, B8, D5 |
| APP-1 | A1 |
| APP-2 | A7 (`sideEffects` validation), A9 (lint) |
| APP-3 | A7 |
| APP-4 | A7; D1 (build has one chunk per page) |
| APP-5 | A7; D1 (committed file, check in `pnpm check`) |
| APP-6 | A1 (`makePages` data only); D5 (tree-shaking) |
| APP-7 | A2 |
| APP-8 | A1 |
| APP-9 | A1 |
| APP-10 | A3 |
| APP-11 | A3; D3 |
| APP-12 | A2 (`EnteredRoute`); D1 (routes table) |
| APP-13 | A2, A4; D3 |
| APP-14 | A2; D3 |
| APP-15 | A2 |
| APP-16 | A2, A4; D4 |
| APP-17 | D1; D3 |
| APP-18 | A1; D1 (`contract.ts`) |
| APP-19 | A6 |
| APP-20 | A6 |
| APP-21 | A3 |
| APP-22 | 0.3, A9 |
| APP-23 | A8; D3 (`chunks`) |
| PWA-1 | A8 |
| PWA-2 | A8 |
| PWA-3 | A8; D4 |
| PWA-4 | A8; D4 |
| PWA-5 | A5 |
| PWA-6 | A4, A5; D4 |
| PWA-7 | A8 (`validateManifest`); D1 |
| PWA-8 | A8; D4 |
| PWA-9 | A5; D4 |
| PWA-10 | C1; A10 (README) |
| PWA-11 | A10 |
| TH-1, TH-2, TH-3, TH-4 | B1 |
| TH-5 | B4, B5 |
| TH-6 | B2, B4 |
| TH-7 | B2, B4 |
| TH-8 | B5 |
| TH-9 | B6, B7 |
| TH-10 | B6, B7 |
| TH-11 | B3 |
| TH-12 | B3; D1 (theme page) |
| TH-13 | B3; D3 (`theme`) |
| TH-14 | B4, B5, B6, B7 |
| TH-15 | D6 (rule documented for sub-project #2) |
| PERF-1 | B7, D2 |
| PERF-2 | A4, D2 |
| PERF-3 | D2 |
| PERF-4 | D2 |
| PERF-5 | B2, B4, B5 |
| PERF-6 | A4 |
| GATE-S1, GATE-S2, GATE-S3 | C3; D1 (initial record) |
| GATE-P1, GATE-P2, GATE-P3 | C4; D2 (baseline) |
| GATE-P4 | A4, B3–B7, D2 |
| TEST-1 | 0.2 (`check-update-coverage`); A2, A5, B6, B7, D1 |
| TEST-2 | A4, B3–B7, D1, D2 |
| TEST-3 | D3 |
| TEST-4 | D3, D4 |
| TEST-5 | A6 (`makeApp.typecheck.ts`); A1/A7 (page Message and loader cases in `packages/app/test/boundary.typecheck.ts`, added in A7 Step 1) |
| TEST-6 | 0.3, A9 |
| TEST-7 | D5 |
| TEST-8 | 0.1 (single-Effect), A7 (codegen check), D1 (manifest) |
| TEST-9 | A8 (unit), D4 (builds) |
| BENCH-1 | C2 |
| BENCH-2 | C5 |
| BENCH-3 | C2 |
| CI-1 | 0.2 |
| CI-2 | 0.2 (`check`, `effect-latest`); C5 (`size`, `perf`, `bench-radix2solid`) |
| CI-3 | 0.1 |
| CI-4 | 0.1; C2 (`minimumReleaseAgeExclude` entries) |
| CI-5 | Global Constraints; D6 |
| ERR-1 | 0.3 (lint); A2, A5 (failure Messages) |
| ERR-2 | A2, A3 |
| ERR-3 | A5 |
| ERR-4 | A5 |
| ERR-5 | A5 |
| ERR-6 | A1 |
| ERR-7 | A6 |
| ERR-8 | A6 |
| LIC-1 | D6 |
| LIC-2 | A10, B1 |
| LIC-3 | D6, A10, B8 |

## Self-review notes

- **Spec coverage:** every requirement ID in the spec appears in the table above.
- **TEST-5:** the page-Message and loader compile-time cases are in A7 Step 1. Add `packages/app/test/boundary.typecheck.ts` there with `@ts-expect-error` for an unknown page tag, another page's Message, a wrong payload, a loader resolving to the wrong page, and a page emitting a non-`PageOutMessage`.
- **Type consistency:** these names are used identically in every task: `KitState`, `KitMessage`, `KitBinding`, `bindKit`, `binding.view`/`bannerView`/`subscriptions`, `PageInputs`, `PageOutMessage`, `pageContract`, `makePages`, `ServiceWorker.layer`, `checkForUpdate`, `hasRegistration`, `measureSize`, `runScenario`, `startServer`.
- **Deviation from the spec text, flagged for the integrator:**
  - The spec's TH-1 now lists both `packages/themes/src/styles` and the component `.css` files in `packages/themes/src/components`; B1 copies exactly those plus the PostCSS files, and no `.tsx`.
  - The kit is shaped as one Foldkit submodel (`KitState` field plus one `GotKitMessage` app Message) so the shell needs one fold and one embed. Codegen still generates the per-page `Got<Key>PageMessage` fields, inside `KitMessage`, as APP-5 requires.
  - `ServiceWorker` gains `checkForUpdate` and `hasRegistration` beside the spec's `events`/`applyUpdate`, to implement APP-16 and PWA-9.

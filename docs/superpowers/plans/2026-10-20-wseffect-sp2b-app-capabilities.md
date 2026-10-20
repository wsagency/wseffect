# wseffect app capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved sub-project 2b browser/application capabilities as standalone, typed, lazy exports of `@wsagency/wseffect-app`, with consumer, browser, bundle, dependency-closure, documentation, and performance evidence.

**Architecture:** Keep Foldkit as owner of ordinary view DOM and Model state, route async work through Commands/Subscriptions/Mounts, and place each feature in a focused implementation module exported from the package root. Share breakpoint values through a Themes-owned token module, keep Islands explicit and bounded, and gate each separately imported helper with consumer builds and source-map checks.

**Tech Stack:** Node 24.21.0, pnpm 11.5.0, TypeScript 7.0.2, Foldkit 0.168.0, Effect 4.0.5, Vite 8.3.4, Vitest 5.0.2, Playwright 1.64.1, `@starfederation/datastar-sdk` 1.0.0, Idiomorph 0.8.0.

**Spec:** `docs/superpowers/specs/2026-10-20-wseffect-sp2-app-capabilities-design.md` (binding requirement IDs SIG-*, VAL-*, PERSIST-*, BP-1, LOC-*, CMD-*, OBS-*, DEP-1, ISL-*, DOC-1, PKG-1, SIZE-1, PERF-1, CLEAN-1). Read the cited section before each task.

## Global Constraints

- Correctness > runtime speed > bundle size (PRI-1..3).
- Each application datum is held once in Model; helpers emit typed Messages or provide typed services, never maintain a competing view-state store (ARC-1).
- Async side effects use Commands or Subscriptions; element-lifetime work uses Mount. Commands represent failure as Messages and have error channel `never` (ARC-2).
- Named exports, not a monolithic feature bundle, are the public contract; importing one capability must not eagerly import unrelated capabilities (ARC-3).
- Every helper is ≤1.5 KB Brotli quality 11 helper-only; Island is ≤4.5 KB including Idiomorph 0.8.0 (0BSD). 1 KiB = 1,024 B.
- Only Persistence may add an Effect module, and only `KeyValueStore`; all other helpers add none to the app's shipped framework chunk.
- Locale formatter cache has LRU capacity ≤64 entries; `ConflictPolicy` is a REQUIRED constructor argument, with exactly `last-writer-wins-by-timestamp` and `local-wins` supported.
- Signals implement only the Datastar SSE JSON-only `patch-signals` subset; no HTML patches, script evaluation, expressions, arbitrary browser code, Pro features, or broader compatibility claim.
- Clean-room: do not use Datastar Pro code or documentation text and do not claim Pro compatibility. Interop is limited to the tested JSON-only subset against `@starfederation/datastar-sdk` (MIT). New app code follows the repository MIT policy; if Datastar core code is ever reused, retain its MIT notice and attribution. Idiomorph is 0BSD.
- Use existing exact repository pins: Foldkit 0.168.0, Effect and `@effect/platform-browser` 4.0.5, TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.2, Playwright 1.64.1, Node 24.21.0, pnpm 11.5.0; use exact pins for newly added dependencies, including SDK 1.0.0 and Idiomorph 0.8.0.
- No Foldkit patches, vendoring, or dependency upgrades. Use narrow public imports. Do not use `Effect.promise` in a module defining Foldkit Commands.
- Do not introduce query-sync exports, aliases, or wrappers; use the documented Foldkit `Route.query(Schema)` pattern.
- Commits use the existing developer identity. No AI trailers.

## Review Focus

1. **SSE transport/offline/interruption races:** after offline pause, reconnect, or interruption, no duplicate, stale, or post-interruption Message is emitted. Test in Task S1: deterministic-clock Subscription tests race offline/online, connection success, and interruption.
2. **Foreign/corrupt persisted data and timestamp ties:** restore defaults and report typed failure for malformed/foreign/schema-invalid envelopes; equal timestamps deterministically retain local data. Test in Task P1: corrupt envelope/default recovery and equal-timestamp cases for both explicit policies.
3. **Existing accessibility associations and recovery:** validation transitions invalid→valid clear stale native and ARIA state without erasing other `aria-describedby` IDs. Test in Task S2: control with pre-existing IDs through valid→invalid→valid.
4. **Resize feedback and teardown:** repeated equal-size notifications coalesce, and pending frame work cannot emit after teardown; consumer-driven oscillation is documented as outside the guarantee. Test in Task C2: same-frame multi-notification, equal dimensions, and interruption before frame callback.
5. **Untrusted/out-of-bound island patch targets:** reject before mutating any node for malformed, missing, root, sibling-outside, and escaping targets. Test in Task I1: snapshot document before each rejection and assert byte-equivalent DOM plus typed rejection reason.

---

## Lanes and dependencies

| Lane | Tasks | Depends on | Worktree guidance |
|---|---|---|---|
| S — signals + validation | S1, S2 | Base `main`; no cross-lane code dependency | Independent worktree |
| P — persistence + locale + breakpoints | P1, P2, P3 | P3 consumes the frozen Themes token module from lane P; coordinate shared token change with the Themes worktree before editing it | Independent worktree, with one owner for Themes token edits |
| C — commands + resize | C1, C2 | Base `main` | Independent worktree |
| I — Island | I1 | Base `main` | Independent worktree |
| G — gates, consumer fixtures, gallery, docs | G1, G2, G3, G4 | G1/G2 can start on base; G3 after S/P/C/I helpers exist; G4 after interfaces are frozen | Independent worktree; integrate after helper lanes |

S, P, C, and I are parallel implementation lanes. P3's Themes token API must be merged/frozen before P3's app-side integration and any gallery breakpoint demo. G1/G2 can be implemented concurrently with helper lanes against the frozen exports below; run the final repository checks once after lane integration. G3 and G4 depend on all functional helper tasks. Each task ends in one task-specific commit; rebase before integration and do not rewrite a branch already fetched by the integrator.

## Cross-lane interfaces (frozen)

All runtime helpers are exported by name from `@wsagency/wseffect-app` (`.`). No helper-specific app subpaths are added: a consumer imports only the named helper it uses, and the build/consumer tests prove unused modules stay out of that consumer's closure. Existing subpaths (`./vite`, `./codegen`, `./oxlint-plugin`) remain unchanged. No new app-to-Themes runtime dependency is added; the breakpoint Subscription imports only the public token module subpath from Themes.

Shared helper messages are tagged ordinary Messages; commands have Foldkit error channel `never`. Concrete APIs:

```ts
// signals.ts
export type SignalTransport =
  | { readonly _tag: 'EventSource'; readonly url: string; readonly withCredentials?: boolean }
  | { readonly _tag: 'Fetch'; readonly url: string; readonly init?: RequestInit }
export type SignalOutcome<A> =
  | { readonly _tag: 'SignalPatch'; readonly value: A; readonly onlyIfMissing: boolean }
  | { readonly _tag: 'RejectedSignalPatch'; readonly reason: 'MalformedJson' | 'UnsupportedEvent' | 'UnsupportedOperation' | 'SchemaFailure' }
  | { readonly _tag: 'SignalTransportFailure'; readonly reason: 'Network' | 'Interrupted' }
export interface SignalBackoff { readonly delaysMs: ReadonlyArray<number>; readonly jitter: number }
export function signalSubscription<A, M>(config: {
  readonly schema: Schema.Codec<A, any, never, never>
  readonly transport: SignalTransport
  readonly backoff?: SignalBackoff
  readonly toMessage: (outcome: SignalOutcome<A>) => M
}): Subscription.Subscription<M>

// validation.ts
export type ValidationResult = { readonly _tag: 'Valid' } | { readonly _tag: 'Invalid'; readonly message: string }
export type ValidationProjectionError = { readonly _tag: 'InvalidControl' }
export function projectConstraintValidity(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  errorId: string, result: ValidationResult): Either.Either<void, ValidationProjectionError>

// persistence.ts
export type ConflictPolicy = 'last-writer-wins-by-timestamp' | 'local-wins'
export type PersistenceFailure = { readonly _tag: 'PersistenceFailure'; readonly operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; readonly reason: string }
export interface PersistConfig<A, M> {
  readonly key: string; readonly version: number; readonly schema: Schema.Codec<A, any, never, never>
  readonly defaultValue: A; readonly conflictPolicy: ConflictPolicy
  readonly migrate: (storedVersion: number, data: unknown) => Either.Either<A, unknown>
  readonly debounceMs: number
  readonly toMessage: (value: A) => M; readonly toFailureMessage: (failure: PersistenceFailure) => M
}
export function persist<A, M>(config: PersistConfig<A, M>): Persistence<A, M>
// Persistence exposes restore, save(value), saveDebounced(value), and subscribe as Effects/Streams
// scoped to the caller's owning Scope; no policy default exists.

// breakpoints.ts (in app; reads public Themes tokens)
export type Breakpoint = 'initial' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export function breakpointSubscription<M>(toMessage: (value: Breakpoint) => M): Subscription.Subscription<M>

// locale.ts
export interface Locale {
  readonly locale: string
  readonly number: (value: number, options?: Intl.NumberFormatOptions) => string
  readonly dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  readonly relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => string
  readonly plural: (value: number, options?: Intl.PluralRulesOptions) => Intl.LDMLPluralRule
}
export function makeLocale(locale: string): Locale

// clipboard.ts / scroll.ts
export type BrowserCommandResult = { readonly _tag: 'Succeeded' } | { readonly _tag: 'Failed'; readonly reason: string }
export function clipboardCommand<M>(text: string, toMessage: (result: BrowserCommandResult) => M): Command.Command<M, never>
export function scrollIntoViewCommand<M>(id: string, options: ScrollIntoViewOptions,
  toMessage: (result: BrowserCommandResult) => M): Command.Command<M, never>

// resize.ts
export type ResizeResult = { readonly _tag: 'Resized'; readonly width: number; readonly height: number }
  | { readonly _tag: 'ResizeUnavailable' | 'ResizeFailure'; readonly reason?: string }
export function resizeObserverMount<M>(toMessage: (result: ResizeResult) => M): Mount.Mount<M>

// island.ts
export type IslandPatch = { readonly _tag: 'OuterHtml'; readonly selector: string; readonly html: string }
  | { readonly _tag: 'InnerHtml'; readonly selector: string; readonly html: string }
export type IslandResult = { readonly _tag: 'Applied' } | { readonly _tag: 'RejectedIslandPatch'; readonly reason: string }
export function Island<M>(props: { readonly id: string; readonly html: string; readonly patches: Stream.Stream<IslandPatch>;
  readonly toMessage: (result: IslandResult) => M }, h: HtmlBuilder<M>): Html<M>
```

`Schema`, `Either`, `Stream`, `Subscription`, `Command`, `Mount`, and `HtmlBuilder` above refer to the versions/types exported by the existing Effect/Foldkit public APIs. S1 resolves the exact public `Subscription.Subscription` and cancellation form against Foldkit 0.168.0 in a typecheck test before implementation; do not deep-import Foldkit internals. Any proposed signature change requires an integrator-approved edit to this plan before implementation.

The Themes-owned breakpoint source is `packages/themes/src/breakpoints.ts`, exporting `BREAKPOINTS` as a frozen ordered tuple `readonly [{ name: 'xs'; minWidth: 520 }, { name: 'sm'; minWidth: 768 }, { name: 'md'; minWidth: 1024 }, { name: 'lg'; minWidth: 1280 }, { name: 'xl'; minWidth: 1640 }]`; expose it from `@wsagency/wseffect-themes/breakpoints`. Generate/update the custom-media CSS values from this token source as part of P3; do not duplicate threshold literals in app code. If current package build constraints require generated CSS rather than direct TS consumption, preserve this one authoritative token module and test generated CSS equality.

## File map

| File | Responsibility |
|---|---|
| `packages/app/src/signals.ts` | Explicit EventSource/fetch SSE transport, JSON-only parser, schema boundary, retry/offline lifecycle. |
| `packages/app/src/validation.ts` | Native validity + ARIA projection from caller-owned result. |
| `packages/app/src/persistence.ts` | Schema envelope, migration, storage, debounce, conflict resolution and scoped cross-tab sync. |
| `packages/app/src/breakpoints.ts` | Initial + matchMedia breakpoint Subscription using Themes tokens. |
| `packages/app/src/locale.ts` | Locale-explicit Intl facade and ≤64-entry deterministic LRU per instance. |
| `packages/app/src/clipboard.ts`, `scroll.ts` | Independent typed browser Commands. |
| `packages/app/src/resize.ts` | Scope-owned ResizeObserver Mount with frame coalescing/deduplication. |
| `packages/app/src/island.ts` | Lazy explicit island component and root-fenced Idiomorph adapter. |
| `packages/app/src/index.ts`, `packages/app/package.json` | Root named exports and standalone distribution contract; keep current existing subpaths. |
| `packages/app/test/{signals,validation,persistence,breakpoints,locale,browserCommands,resize,island}.test.ts` | Focused unit/scene tests; browser-specific tests under package test/browser as appropriate. |
| `packages/themes/src/breakpoints.ts`, `packages/themes/package.json`, CSS build inputs | Single breakpoint token source, public subpath and generated custom media. |
| `tests/consumer/{run.ts,check-app-capabilities.ts,fixtures/app-capabilities/*}` | Each helper independently packed-built and checked for exported symbol, helper closure, lazy/eager reachability, and module list. |
| `tools/gates/{app-capabilities.ts,app-capabilities.test.ts}` | Framework source-map baseline comparison and helper-only Brotli-q11 budget gate. |
| `apps/gallery/src/pages/{capabilities,signals,island,validation,persistence,locale,browser}.ts`, `apps/gallery/src/routes.ts`, `apps/gallery/test/*`, `e2e/capabilities.spec.ts` | Consumer demo pages and behavior e2e; examples use real Model Messages and avoid claiming unsupported features. |
| `packages/app/README.md`, `packages/app/test/readme.test.ts` | API usage, security/lifecycle caveats, and Route.query(Schema) pattern. |
| `.gitea/workflows/check.yml`, root `package.json` | Wire dedicated app-capabilities checks into existing CI scripts. |
| `tools/gates/perf.ts`, perf-runner workflow only if needed | Invoke quiet-runner evidence after `perf` runner is available; do not fabricate or commit local timing/noise values. |

## Tasks

### Lane S — signals and validation

### Task S1: Typed signals Subscription

**Files:**
- Create: `packages/app/src/signals.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/signals.test.ts`
- Modify: `packages/app/package.json` (exact dev dependency `@starfederation/datastar-sdk` 1.0.0 only if the fixture requires it)

**Interfaces:**
- Consumes: frozen `SignalTransport`, `SignalOutcome<A>`, `SignalBackoff`, `signalSubscription` signatures above; Foldkit 0.168.0 Subscription and Effect stream/time APIs.
- Produces: `signalSubscription`; only JSON event subset `datastar-patch-signals` with `data: signals <JSON object>` and optional `data: onlyIfMissing true|false`.

- [ ] **Step 1: Write failing tests** for `parsesSdkPatchSignalsToTypedMessage`, `rejectsMalformedJsonUnsupportedEventAndSchemaFailure`, `usesSelectedEventSourceOrFetchTransport`, `reconnectsWithBoundedBackoffAndResetsAfterSuccess`, `pausesOfflineResumesOnline`, and `closesAndCancelsOnInterruption`. Assert no partial/post-interruption Message and injected deterministic clock/random; use `@starfederation/datastar-sdk` 1.0.0 for supported-event interoperability.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/signals.test.ts`;** expected: FAIL on missing export/behavior.
- [ ] **Step 3: Implement `signalSubscription`** in `signals.ts`; parse only supported frames, schema-decode fully before Message emission, represent parse/schema/protocol/network outcomes as typed outcome values, keep fetch AbortController/EventSource/timers/online listeners under one Subscription scope, and use explicit retry delays plus bounded jitter (default delays `[250, 500, 1000, 2000, 4000]` ms, jitter `0.2`). Reset attempt count after successful connection. Resolve and typecheck against public Foldkit APIs only.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/signals.test.ts`;** expected: PASS, all signal tests green without wall-clock sleeps.
- [ ] **Step 5: Commit** `git add packages/app/src/signals.ts packages/app/src/index.ts packages/app/test/signals.test.ts packages/app/package.json && git commit -m "feat(app): add typed signal subscription"`.

### Task S2: Constraint validation projection

**Files:**
- Create: `packages/app/src/validation.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/validation.test.ts`
- Create: `packages/app/test/browser/validation.spec.ts`

**Interfaces:**
- Consumes: frozen `ValidationResult`, `ValidationProjectionError`, `projectConstraintValidity`.
- Produces: independent named `projectConstraintValidity`; browser native validity remains authoritative.

- [ ] **Step 1: Write failing unit/browser tests** `projectsValidInvalidValidTransitions`, `preservesOtherDescribedByTokens`, `returnsTypedErrorForInvalidControl`; browser test `nativeValidityAndErrorAssociationFollowModelResult` checks `setCustomValidity`, `checkValidity`, `aria-invalid`, and supplied error element ID.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/validation.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement `projectConstraintValidity`** as a pure DOM projection over passed Model result; do not decode/retain validation state. Remove only the supplied error ID when clearing an error and preserve all other described-by tokens.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/validation.test.ts` and `pnpm exec playwright test packages/app/test/browser/validation.spec.ts`;** expected: PASS with native APIs and ARIA state asserted.
- [ ] **Step 5: Commit** `git add packages/app/src/validation.ts packages/app/src/index.ts packages/app/test/validation.test.ts packages/app/test/browser/validation.spec.ts && git commit -m "feat(app): project schema validation to controls"`.

### Lane P — persistence, locale, breakpoints

### Task P1: Versioned scoped persistence

**Files:**
- Create: `packages/app/src/persistence.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/persistence.test.ts`
- Create: `packages/app/test/browser/persistence.spec.ts`

**Interfaces:**
- Consumes: frozen `ConflictPolicy`, `PersistenceFailure`, `PersistConfig<A, M>`, and `persist`.
- Produces: scoped persistence service with `restore`, immediate `save`, trailing-edge `saveDebounced`, and incoming typed Messages; conflict policy is REQUIRED, never defaulted.

- [ ] **Step 1: Write failing tests** `roundTripsSchemaEnvelope`, `defaultsAndEmitsFailureForMalformedForeignUnavailableAndUndecodableData`, `migratesOnlyDifferentSupportedVersionsAndRevalidates`, `debouncesLatestValueOnVirtualClock`, `mapsQuotaFailureToMessage`, `usesBroadcastChannelAndStorageFallback`, `cleansListenersOnScopeInterruption`, `lastWriterWinsUsesTimestampAndLocalWinsKeepsModel`, and `equalTimestampKeepsLocalValue`. Browser tests cover channel and storage-event paths across actual contexts.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/persistence.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement `persist`** in one module; envelope is exactly `{ version, writtenAt, data }`; Schema decode envelope and payload before use; migrate only version mismatches and validate migrated current data; use Effect time and scoped cleanup; apply incoming winner only as one Message. Use only public `KeyValueStore` for the one permitted additional Effect module; narrow imports avoid unrelated `DateTime`, `Tuple`, `http/internal/urlParams`, and `Redacted` pulls.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/persistence.test.ts` and `pnpm exec playwright test packages/app/test/browser/persistence.spec.ts`;** expected: PASS, including quota failure, both sync transports, interruption, and policy/tie cases.
- [ ] **Step 5: Commit** `git add packages/app/src/persistence.ts packages/app/src/index.ts packages/app/test/persistence.test.ts packages/app/test/browser/persistence.spec.ts && git commit -m "feat(app): add versioned persistence"`.

### Task P2: Locale service with bounded cache

**Files:**
- Create: `packages/app/src/locale.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/locale.test.ts`

**Interfaces:**
- Consumes: frozen `Locale`, `makeLocale(locale: string): Locale`.
- Produces: explicit-locale number/dateTime/relativeTime/plural formatter facade.

- [ ] **Step 1: Write failing tests** `reusesFormatterForRepeatedNormalizedOptions`, `normalizesDistinctOptionKeys`, `evictsLeastRecentlyUsedAtCapacity`, `isolatesFormatterCacheBetweenLocales`, and `doesNotGrowBeyond64ForCallerOptions`; assert locale is passed to every native `Intl.*Format` constructor and output does not depend on machine default locale.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/locale.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement `makeLocale`** with deterministic LRU capacity 64 per Locale instance; canonicalize option keys and cache formatter instances, not arbitrary unbounded keys; pass the explicit locale for every constructor.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/locale.test.ts`;** expected: PASS including cache eviction/isolation.
- [ ] **Step 5: Commit** `git add packages/app/src/locale.ts packages/app/src/index.ts packages/app/test/locale.test.ts && git commit -m "feat(app): add bounded locale formatter service"`.

### Task P3: Shared breakpoint tokens and Subscription

**Files:**
- Create: `packages/themes/src/breakpoints.ts`
- Modify: `packages/themes/package.json`, Themes token/CSS build inputs and relevant CSS tests
- Create: `packages/themes/test/breakpoints.test.ts`
- Create: `packages/app/src/breakpoints.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/breakpoints.test.ts`

**Interfaces:**
- Consumes: `BREAKPOINTS` from `@wsagency/wseffect-themes/breakpoints`, exactly ordered at 520, 768, 1024, 1280, 1640px; app `Breakpoint` union and `breakpointSubscription` signature above.
- Produces: one Themes-owned token source for generated CSS + app matchMedia Subscription; initial state is emitted on subscription start.

- [ ] **Step 1: Write failing Themes/app tests** `tokensMatchCustomMediaCss`, `emitsInitialBreakpoint`, and `transitionsJustBelowAtAndAboveEveryThreshold`; assert the five threshold values and no app-side duplicate literal source.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-themes exec vitest run test/breakpoints.test.ts` and `pnpm --filter @wsagency/wseffect-app exec vitest run test/breakpoints.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement shared tuple and public `./breakpoints` export** in Themes, deriving emitted CSS custom-media from that token source; implement app Subscription using `matchMedia` listeners (no resize polling), emitting initial and changed semantic value.
- [ ] **Step 4: Run both targeted Vitest commands;** expected: PASS with values at and around each boundary identical in CSS and app.
- [ ] **Step 5: Commit** `git add packages/themes/src/breakpoints.ts packages/themes/package.json packages/themes/test/breakpoints.test.ts packages/app/src/breakpoints.ts packages/app/src/index.ts packages/app/test/breakpoints.test.ts packages/themes/src/styles packages/themes/scripts && git commit -m "feat(app): share theme breakpoint tokens"`.

### Lane C — commands and resize observation

### Task C1: Clipboard and ScrollIntoView Commands

**Files:**
- Create: `packages/app/src/clipboard.ts`, `packages/app/src/scroll.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/browserCommands.test.ts`

**Interfaces:**
- Consumes: `BrowserCommandResult`, `clipboardCommand`, `scrollIntoViewCommand` frozen signatures above.
- Produces: two independently importable Foldkit Commands with error channel `never`.

- [ ] **Step 1: Write failing tests** `clipboardEmitsSuccess`, `clipboardMapsDeniedUnavailableAndInsecureContextToFailure`, `scrollUsesNativeOptionsAndEmitsSuccess`, and `scrollMapsMissingTargetAndDomExceptionToFailure`; test the commands with browser API stubs and assert no thrown/rejected command failure.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/browserCommands.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement separate command modules** using `navigator.clipboard.writeText(text)` and native `Element.scrollIntoView(options)`; map all normal failures to callback Message. Do not add permission bypass or custom scroll policy.
- [ ] **Step 4: Run targeted Vitest command;** expected: PASS and Commands typecheck with `never` error channel.
- [ ] **Step 5: Commit** `git add packages/app/src/clipboard.ts packages/app/src/scroll.ts packages/app/src/index.ts packages/app/test/browserCommands.test.ts && git commit -m "feat(app): add clipboard and scroll commands"`.

### Task C2: ResizeObserver Mount

**Files:**
- Create: `packages/app/src/resize.ts`
- Modify: `packages/app/src/index.ts`
- Create: `packages/app/test/resize.test.ts`

**Interfaces:**
- Consumes: frozen `ResizeResult`, `resizeObserverMount`.
- Produces: owned-element ResizeObserver Mount, reports dimension changes only, one emission max per animation frame.

- [ ] **Step 1: Write failing tests** `emitsChangedWidthAndHeight`, `coalescesFrameAndDeduplicatesDimensions`, `disconnectsAndCancelsPendingFrameOnRelease`, and `reportsUnsupportedAndObserverFailureAsTypedOutcomes`; include test for interruption before queued frame callback.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/resize.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement `resizeObserverMount`** to observe only the Mount-owned element, compare dimensions, coalesce the latest size to one animation-frame callback, and cancel/disconnect on scope release. It performs no layout writes; explicitly state it cannot prevent app-induced oscillation.
- [ ] **Step 4: Run targeted Vitest command;** expected: PASS with teardown and ordinary-failure behavior asserted.
- [ ] **Step 5: Commit** `git add packages/app/src/resize.ts packages/app/src/index.ts packages/app/test/resize.test.ts && git commit -m "feat(app): add scoped resize observer mount"`.

### Lane I — explicit Island

### Task I1: Root-fenced lazy Island component

**Files:**
- Create: `packages/app/src/island.ts`
- Modify: `packages/app/src/index.ts`, `packages/app/package.json`
- Create: `packages/app/test/island.test.ts`, `packages/app/test/browser/island.spec.ts`

**Interfaces:**
- Consumes: frozen `IslandPatch`, `IslandResult`, `Island` signature; idiomorph exactly 0.8.0.
- Produces: opt-in Island for trusted server-rendered descendants only; Idiomorph adapter lazy and confined to declared root.

- [ ] **Step 1: Write failing tests** for `appliesOuterHtmlAndInnerHtmlWithinRoot`, `rejectsMalformedMissingRootAndOutsideTargetsBeforeMutation`, `rejectsSiblingInsertionWithoutInIslandParent`, `preservesActiveInputValueFocusAndSelection`, and `interruptedIslandStopsReceivingPatches`. Browser coverage runs Chromium, Firefox, and WebKit and snapshots the full document before rejected patches.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/island.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Implement `Island`** with a lazy dynamic import of Idiomorph, preflight every selector/operation and prove target/parent is a strict descendant before any DOM operation; use `ignoreActiveValue` and `restoreFocus`. Never accept user-controlled raw HTML as a supported input.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/island.test.ts` and `pnpm exec playwright test packages/app/test/browser/island.spec.ts --project=chromium --project=firefox --project=webkit`;** expected: PASS in all three browser projects.
- [ ] **Step 5: Commit** `git add packages/app/src/island.ts packages/app/src/index.ts packages/app/package.json packages/app/test/island.test.ts packages/app/test/browser/island.spec.ts && git commit -m "feat(app): add bounded server-rendered islands"`.

### Lane G — gates, consumer fixtures, gallery, documentation

### Task G1: DEP-1 module-closure investigation and module-diff gate

**Files:**
- Create: `tools/gates/app-capabilities.ts`, `tools/gates/app-capabilities.test.ts`
- Modify: `tests/consumer/run.ts`, `tests/consumer/check-app-capabilities.ts`, `.gitea/workflows/check.yml`, root `package.json`

**Interfaces:**
- Consumes: consumer fixture source maps and shipped gallery framework source-map baseline.
- Produces: `checkAppCapabilityModules({ helper, modules, baseline }): { ok: boolean; unexpected: string[] }`; CI command `pnpm gate:app-capabilities` checks every helper independently.

- [ ] **Step 1: Write failing gate tests** `allowsFrameworkBaselineModules`, `allowsOnlyKeyValueStoreForPersistence`, `rejectsUnexpectedEffectModulesForEveryOtherHelper`, and `reportsUnexpectedModulePaths`; include a fixture modeling spike pulls of `DateTime`, `Tuple`, `http/internal/urlParams`, `Redacted`, and `encoding/EncodingError`.
- [ ] **Step 2: Run `pnpm exec vitest run tools/gates/app-capabilities.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Inspect each capability's source-map module closure against the shipped framework baseline.** Specifically trace why clipboard/scroll/resize pulled `DateTime`, `Tuple`, `urlParams`, and `Redacted`; remove the broad/deep imports responsible and use narrow public imports or native platform APIs. For Persistence allow only `persistence/KeyValueStore.js` beyond baseline. Add helper-by-helper source-map diff and actionable unexpected-module report.
- [ ] **Step 4: Run `pnpm exec vitest run tools/gates/app-capabilities.test.ts` and `pnpm gate:app-capabilities`;** expected: PASS with no unexpected Effect additions; persistence reports at most KeyValueStore.
- [ ] **Step 5: Commit** `git add tools/gates/app-capabilities.ts tools/gates/app-capabilities.test.ts tests/consumer/run.ts tests/consumer/check-app-capabilities.ts .gitea/workflows/check.yml package.json && git commit -m "ci: gate app capability module closure"`.

### Task G2: Standalone consumer fixtures and helper-size gate

**Files:**
- Create: `tests/consumer/fixtures/app-capabilities/*`, `tools/gates/app-capability-size.ts`, `tools/gates/app-capability-size.test.ts`
- Modify: `tests/consumer/run.ts`, `tools/gates/app-capabilities.ts`, root `package.json`, `.gitea/workflows/check.yml`

**Interfaces:**
- Consumes: each named export from the frozen root API; built consumer manifests/source maps from Vite.
- Produces: isolated per-helper build plus `checkAppCapabilitySizes({ helper, helperOnlyBytes, eagerReachable }): { ok: boolean; errors: string[] }`; Island ceiling 4,608 B and other helpers 1,536 B Brotli-q11.

- [ ] **Step 1: Write failing tests** `buildsEachHelperInAnIndependentEntry`, `unusedHelpersAreAbsentFromClosure`, `noHelperIsEagerUnlessImportedByShell`, `islandBudgetIncludesIdiomorph`, and `budgetsExcludeFrameworkPeerCode`; fixture importing one helper at a time must preserve manifest and source maps.
- [ ] **Step 2: Run `pnpm exec vitest run tools/gates/app-capability-size.test.ts`;** expected: FAIL before implementation.
- [ ] **Step 3: Add packed consumer Vite fixtures** importing each helper separately, emit Vite manifest/source maps, calculate helper-only Brotli quality 11 excluding existing framework peers, inspect eager reachability, and enforce ≤1.5 KB for each helper (including `persist`) and ≤4.5 KB for Island including Idiomorph. Wire checks into consumer CI.
- [ ] **Step 4: Run `pnpm exec vitest run tools/gates/app-capability-size.test.ts` and `pnpm test:consumer`;** expected: PASS, each fixture independently resolves its named export, unused helpers absent, all measured budgets met.
- [ ] **Step 5: Commit** `git add tests/consumer tools/gates/app-capability-size.ts tools/gates/app-capability-size.test.ts tools/gates/app-capabilities.ts package.json .gitea/workflows/check.yml && git commit -m "ci: enforce standalone app helper budgets"`.

### Task G3: Gallery capability demos and browser e2e

**Files:**
- Create: `apps/gallery/src/pages/capabilities.ts`, focused demo modules under `apps/gallery/src/pages/`, `apps/gallery/test/capabilities.test.ts`, `e2e/capabilities.spec.ts`
- Modify: `apps/gallery/src/routes.ts`, `apps/gallery/src/pages.gen.ts` via the repository generator, `apps/gallery/src/shell.ts` as needed

**Interfaces:**
- Consumes: all frozen app exports; app Model remains the source of truth.
- Produces: independently lazy gallery route demonstrating signals, native validation, persistence, breakpoints, locale, clipboard, scrolling, ResizeObserver, and explicit Island behavior; no unsupported Datastar claim.

- [ ] **Step 1: Write failing Gallery scene/e2e tests** `capabilityRoutesAreLazy`, `signalPatchUpdatesModel`, `nativeValidationTransitions`, `persistenceRestoresAndReportsFailure`, `breakpointLocaleClipboardScrollResizeBehaviors`, and `islandRejectsOutOfRootPatch`; assert visible result/typed feedback and no helper enters the eager shell absent import.
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-gallery exec vitest run test/capabilities.test.ts`;** expected: FAIL until route/pages exist.
- [ ] **Step 3: Implement capability pages as lazy page modules** and wire user-initiated events to typed Messages/Commands; the Island page content is clearly server-owned/trusted and explicitly not a general rendering alternative. Use existing gallery conventions and stable IDs in e2e.
- [ ] **Step 4: Run `pnpm --filter @wsagency/wseffect-gallery exec vitest run test/capabilities.test.ts` and `pnpm exec playwright test e2e/capabilities.spec.ts`;** expected: PASS in configured browser projects, with cleanup/rejection cases exercised.
- [ ] **Step 5: Commit** `git add apps/gallery/src apps/gallery/test/capabilities.test.ts e2e/capabilities.spec.ts && git commit -m "feat(gallery): demonstrate app capabilities"`.

### Task G4: README, query pattern, caveats, and DOC-1 test

**Files:**
- Modify: `packages/app/README.md`
- Modify: `packages/app/test/readme.test.ts`

**Interfaces:**
- Consumes: frozen APIs and their behavior/caveats.
- Produces: package usage docs for independently imported helpers, limits, and Foldkit query usage; no query helper export.

- [ ] **Step 1: Write failing README tests** `documentsSupportedRouteQueryPattern` (asserts public `Route.query(Schema)`, parsing route values, explicit optional/invalid transforms, typed route state and call-site choice of `pushUrl` vs `replaceUrl`) and `documentsBrowserAndIslandLimitations` (clipboard secure-context/user activation, persistence not secure storage, read-only resize feedback limits, server-trusted Island boundary, exact Datastar JSON subset).
- [ ] **Step 2: Run `pnpm --filter @wsagency/wseffect-app exec vitest run test/readme.test.ts`;** expected: FAIL for missing examples/limitations.
- [ ] **Step 3: Update README** with exact imports, small usage examples and failure/lifecycle notes. Explicitly state there is no query synchronization helper and no general DOM-rendering or Datastar Pro compatibility.
- [ ] **Step 4: Run targeted README test;** expected: PASS and query example uses only supported Foldkit public API.
- [ ] **Step 5: Commit** `git add packages/app/README.md packages/app/test/readme.test.ts && git commit -m "docs(app): document app capabilities"`.

### Task G5: Quiet-runner PERF-1 evidence

**Files:**
- Modify only if needed: `tools/gates/perf.ts`, perf-runner workflow, benchmark report schema/tests; do not add fabricated measurements.
- Output: committed/reviewed evidence artifact generated only on the isolated `perf` runner after it is available.

**Interfaces:**
- Consumes: available `perf` runner and paired ABAB/A-A harness; no product helper behavior changes.
- Produces: recorded environment, sample count, medians, A/A noise band and directional results; no speed claim or new budget without quiet-runner evidence.

- [ ] **Step 1: Confirm `perf` runner availability and harness contract**; run `pnpm gate:perf --help` (or the repository's documented perf-gate invocation) and verify A/A self-test and paired ABAB outputs are reportable. Do not run timing on a loaded developer host.
- [ ] **Step 2: Schedule/run measurement on the quiet `perf` runner** once available, with paired ABAB samples and A/A noise bands for timing cases; report runner/OS/browser/Node, sample count, medians, and noise bands.
- [ ] **Step 3: Record the measured evidence** in the established performance report location, marking the values directional and making no new performance promise unless effect exceeds measured noise.
- [ ] **Step 4: Verify** report contains runner, sample count, medians, and A/A noise-band data; expected: artifact is produced by `perf` runner and contains no host-spike timing reused as a claim.
- [ ] **Step 5: Commit** the measured report/update using the existing perf workflow's established commit procedure; never commit a placeholder noise file.

## Requirement coverage

| Requirement | Task |
|---|---|
| SIG-1, SIG-2, SIG-3, SIG-4, SIG-5, SIG-6, SIG-7, SIG-8 | S1, G1, G2 |
| VAL-1, VAL-2, VAL-3, VAL-4 | S2, G2 |
| PERSIST-1, PERSIST-2, PERSIST-3, PERSIST-4, PERSIST-5, PERSIST-6 | P1, G1, G2 |
| BP-1 | P3, G3 |
| LOC-1, LOC-2 | P2, G2, G3 |
| CMD-1, CMD-2 | C1, G2, G3, G4 |
| OBS-1, OBS-2 | C2, G2, G3, G4 |
| DEP-1 | G1 |
| ISL-1, ISL-2, ISL-3, ISL-4, ISL-5 | I1, G2, G3, G4 |
| DOC-1 | G4 |
| PKG-1 | G1, G2 |
| SIZE-1 | G2 |
| PERF-1 | G5 |
| CLEAN-1 | S1, I1, G3, G4; Global Constraints |
| PRI-1, PRI-2, PRI-3; ARC-1, ARC-2, ARC-3 | S1, S2, P1–P3, C1–C2, I1, G1–G4; Global Constraints |

## Plan self-review

- **Spec coverage:** Every requirement ID is assigned in the coverage table; requirement-specific tests occur in the owning implementation or gate task. G1 explicitly includes the spike module-pull investigation and fix; G5 is gated on the quiet `perf` runner.
- **Step scan:** Each task uses failing-test → observed failure → minimal implementation → passing targeted command → commit. G5 is explicitly conditional on runner availability and cannot manufacture local timing evidence.
- **Type consistency:** Root exports and frozen names/signatures are consistently used by consumer and Gallery tasks. Themes owns one token tuple and public `./breakpoints` subpath; app consumes that path only in breakpoint code.
- **Review Focus:** Five failure classes are each tied to named tests in their owning task.
- **Proportion:** Tasks define interfaces, test names, commands, gate thresholds, and exact branch boundaries without prescribing implementation bodies where tests/API determine behavior.

## Resolved planning ambiguities

- No app helper-specific subpaths: all helpers are named exports from the existing root `.` entry; independent builds verify tree shaking, while existing `./vite`, `./codegen`, and `./oxlint-plugin` stay unchanged.
- Themes is the sole owner of the shared `BREAKPOINTS` tuple at `@wsagency/wseffect-themes/breakpoints`; app adds no Themes package dependency beyond consuming that public token export.
- Signal retry default is fixed for implementation planning at delays `[250, 500, 1000, 2000, 4000]` ms and jitter `0.2`; tests inject deterministic time/random. Callers may override through `SignalBackoff`.
- The helper budget translates to 1,536 B at 1 KiB = 1,024 B; Island budget translates to 4,608 B including Idiomorph. No performance budget is inferred from spike timing.

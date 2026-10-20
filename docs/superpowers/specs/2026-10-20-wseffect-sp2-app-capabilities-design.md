# wseffect app capabilities (sub-project #2b): design specification

Status: **Design approved by the user in conversation on 2026-10-20. This document records the design and is ready for review.** The next step after review is an implementation plan. This specification adds no product code, dependencies, package scaffolding, or publication changes. Its requirements are binding inputs to that plan. Measurements are evidence for design choices, not implementation claims or guaranteed performance.

## 1. Goal and context

Sub-project #2b adds focused browser/application capabilities to `@wsagency/wseffect-app`, the Effect-v4-native application package built on Foldkit's Elm architecture. It is delivered alongside sub-project #2 (remaining Themes components and primitives) and changes only the app package, so there is no package overlap. Each capability is a standalone named export with an independently lazy-loadable implementation; consumers opt in by importing it. Foldkit remains the owner of ordinary view DOM, Models remain the source of truth, Commands and Subscriptions remain the side-effect boundary, and Mounts own element lifetimes [FND:13-17, 221-227].

The adopted capabilities are: a typed signal stream; Schema-backed native constraint validation; versioned persistence; theme-aligned breakpoints; bounded-cache `Locale`; clipboard and scroll Commands; and a ResizeObserver Mount. Idiomorph is limited to an explicit, bounded `Island` component for server-rendered content. Query synchronization gets no helper: the app README documents Foldkit's existing `Route.query(Schema)` pattern.

## 2. Priorities and invariants

The order is strict and inherited from foundation PRI-1..3 [FND:21-27]:

- **PRI-1 Functional correctness.** Do not weaken Model ownership, Schema decoding, native constraints, cleanup, or safety boundaries to improve size or timing.
- **PRI-2 Runtime speed.** Optimize only after behavior is correct; do not claim a speed win from the loaded-host spike measurements [HM:31-42; HS:90-107].
- **PRI-3 Bundle size.** Meet the budgets in §5.7 without sacrificing PRI-1 or PRI-2.
- **ARC-1 One Model.** Each application datum is held once in Model; helpers emit typed Messages or provide typed services, never maintain a competing view-state store [FND:300-307].
- **ARC-2 Effect/Foldkit boundaries.** Async side effects use Commands or Subscriptions; element-lifetime work uses Mount. Commands represent failure as Messages and have error channel `never` [FND:13-16].
- **ARC-3 Independent exports.** Importing one capability must not eagerly import unrelated capabilities. Named exports, not a monolithic feature bundle, are the public contract [FND:221-227].

## 3. Evidence base and citations

The source spike branches are temporary. Appendix A copies the evidence tables used by this specification so the measurements, byte counts, recommendations, and test outcomes remain reviewable after those branches disappear.

| Key | Source | Use |
|---|---|---|
| FND | `docs/superpowers/specs/2026-10-19-wseffect-foundation-design.md` | Foldkit architecture, priority order, standalone export and one-Model contracts. |
| HM | `spikes/hypermedia/REPORT.md` on `spike/hypermedia` | Signals, islands, validation, bundle/eager closure, browser and ABAB/A-A evidence. Copied in Appendix A.1–A.3. |
| HS | `spikes/helpers/REPORT.md` on `spike/helpers` | Persistence, query, breakpoints, locale, clipboard, scroll, resize evidence, module closure data and test coverage. Copied in Appendix A.4–A.6. |
| BP | `packages/themes/src/styles/breakpoints.css` | Shared threshold source: `xs` 520px, `sm` 768px, `md` 1024px, `lg` 1280px, `xl` 1640px. |
| DS | `@starfederation/datastar-sdk` 1.0.0 package metadata and source repository: <https://github.com/starfederation/datastar-typescript> (MIT). | Interoperability test target for the Datastar SSE JSON-only subset. No Pro code or documentation is an input. |
| IM | `idiomorph` 0.8.0 package metadata and source repository: <https://github.com/bigskysoftware/idiomorph> (0BSD). | The only permitted island morph engine. |

Citations such as `[FND:221-227]`, `[HM:19-29]`, and `[HS:61-88]` denote line ranges in the named source. `[DS]` and `[IM]` refer to the linked package metadata/source above. Values from temporary reports are also reproduced in Appendix A. A source table is evidence, not a production benchmark or a license to copy its implementation.

## 4. Scope and deliverables

| Area | Decision | Deliverable |
|---|---|---|
| Signals | Adopt | Standalone typed SSE signal-stream exports with EventSource and fetch transports. |
| Constraint validation | Adopt | Standalone Schema-to-native-constraint-validation adapter. |
| Persistence | Adopt | Versioned Schema persistence with migration, debounce, cross-tab synchronization, and a required explicit conflict policy. |
| Breakpoints | Adopt | Breakpoint Subscription using the same exported token source as Themes. |
| Locale | Adopt | `Locale` service with a bounded formatter cache. |
| Clipboard / scrolling | Adopt | Independent typed Commands. |
| Resize observation | Adopt | Independent Mount with teardown and a feedback-loop guard. |
| Islands | Adopt, explicit opt-in only | Lazy `Island` component backed by Idiomorph, bounded to a declared island root. |
| Query synchronization | No helper | Document Foldkit's `Route.query(Schema)` pattern in the `@wsagency/wseffect-app` README. |

All exports ship from `@wsagency/wseffect-app`; no new published package is in scope. Product work must not change Foldkit or patch its files [FND:56-99].

## 5. App capability requirements

### 5.1 Typed signal stream

- **SIG-1 Transports.** The public API MUST support native `EventSource` and cancellable `fetch`-based SSE transports. Callers MUST select the transport explicitly; the fetch path MUST expose request configuration needed for authenticated/custom-header requests. Both transports MUST feed the same typed event decoder and Subscription lifecycle.
- **SIG-2 Protocol subset.** Interoperability is limited to the Datastar SSE JSON-only `patch-signals` subset exercised against `@starfederation/datastar-sdk` (MIT): the `datastar-patch-signals` event with `data: signals <JSON object>` and optional `data: onlyIfMissing true|false` fields. Decode only this subset. Do not implement HTML patches, script evaluation, expressions, browser-side arbitrary code, Datastar Pro features, or any broader Datastar compatibility claim.
- **SIG-3 Schema boundary.** The caller supplies a Schema for signal data. A patch is applied/emitted only after complete JSON and Schema decoding; malformed JSON, unsupported event names/operations, or Schema failures MUST emit a typed `RejectedSignalPatch` outcome rather than throw, partially update state, or disappear silently. Valid patches MUST produce typed Messages for the application's one Model.
- **SIG-4 Reconnection.** A transient transport close/error MUST reconnect with a bounded backoff schedule and reset its attempt state after a successful connection. Backoff limits and jitter MUST be explicit in the API or documented defaults, and tests MUST use a deterministic clock/random source rather than wall-clock sleeps.
- **SIG-5 Offline lifecycle.** The stream MUST pause retries while offline and resume/reconnect when the browser returns online. Unmount/interruption MUST cancel fetch, close EventSource, clear timers/listeners, and prevent post-interruption Messages.
- **SIG-6 Ordinary errors.** Network, parse, unsupported-patch, and schema failures MUST be surfaced as typed rejected/failure Messages; they MUST NOT escape the Subscription as an unhandled defect. A consumer can distinguish rejection from transport interruption.
- **SIG-7 Interop and tests.** Tests MUST send supported JSON events from `@starfederation/datastar-sdk` and assert decoded values; malformed JSON, invalid Schema data, unsupported event, reconnect/backoff, offline pause/resume, cancellation, and both transports MUST be tested. No Datastar source or docs text is copied. If Datastar core code is ever reused in a later separately approved change, retain its MIT notice and attribution.
- **SIG-8 Loading.** Each signal export MUST be independently tree-shakable and its implementation lazy; it MUST be absent from the eager app closure unless an application imports it from its shell. Keep unrelated capabilities out of its import closure.

### 5.2 Schema to Constraint Validation

- **VAL-1 Source of truth.** The adapter accepts a Schema-validated model result and projects it onto a native form control; it MUST NOT keep a second validation Model or replace the application's validation rules.
- **VAL-2 Projection.** For valid values, set the custom validity message to empty and remove invalid/error associations. For invalid values, call `setCustomValidity` with the Model message, set `aria-invalid="true"`, and set/maintain `aria-describedby` to the supplied error element ID without discarding other described-by tokens. The control's browser-native `validity`, `checkValidity`, and normal form submission behavior remain authoritative.
- **VAL-3 Error behavior.** Invalid control/schema input MUST return an ordinary typed result or Message; do not throw from view code. Clearing or changing an error MUST clear stale custom validity and ARIA state.
- **VAL-4 Verification and loading.** Unit and browser tests MUST cover valid→invalid→valid transitions, browser constraint APIs, existing `aria-describedby` tokens, and the error-element association. The adapter MUST be an independent lazy export and absent from the eager closure unless imported from the shell [HM:13-15, 23-29, 55-61].

### 5.3 Persistence

- **PERSIST-1 Envelope and decode.** Persist `{ version, writtenAt, data }` using the supplied Schema codec; `writtenAt` is the timestamp used for cross-tab conflict resolution. Restore MUST validate the envelope, decode data, and return the supplied default plus a typed failure Message for malformed, foreign, unavailable, or undecodable data; it MUST never trust storage bytes as application Model values.
- **PERSIST-2 Migration.** The API MUST accept a migration function for supported prior versions. Restore MUST call it only when stored and current versions differ, validate the migrated result with the current Schema, and report unsupported/failing migrations as ordinary Messages.
- **PERSIST-3 Writes and debounce.** Immediate save and trailing-edge debounced save MUST be available. The debounce interval MUST be configurable, use Effect time so tests can use a virtual clock, and persist only the latest value after the quiet interval. Storage/quota errors MUST become typed Messages.
- **PERSIST-4 Cross-tab transport.** Use `BroadcastChannel` where available and a `localStorage` `storage`-event fallback; listener/channel lifetime MUST follow the owning Scope and be cleaned up on interruption. No secure-storage guarantee is implied.
- **PERSIST-5 Explicit conflict contract.** A conflict policy is a REQUIRED constructor argument; there is no implicit default. Supported values are `last-writer-wins-by-timestamp` and `local-wins`. The former applies the greater envelope timestamp and ignores an older remote value; equal timestamps deterministically favor the local value. `local-wins` retains the current local Model value when a conflicting remote write arrives. The chosen winner MUST be the only value emitted as an incoming Model Message. Cross-tab writes MUST carry enough version/timestamp metadata to apply the selected policy.
- **PERSIST-6 Loading, budget, and tests.** Persistence MUST be a standalone named export, lazy unless imported by the shell, and ≤1.5 KB Brotli-11 helper-only. Only Effect `KeyValueStore` may be added to the framework's Effect module closure. Tests MUST cover round-trip, bad envelope/schema, default recovery, migration, debounce, quota failure, BroadcastChannel, storage fallback, interruption cleanup, both conflict policies, and equal timestamps [HS:7-9, 21, 43, 53-59, 61-88].

### 5.4 Theme breakpoints and Locale

- **BP-1 Shared breakpoints.** Export one shared breakpoint token definition used by both `@wsagency/wseffect-themes` CSS and the app Subscription: `xs` 520px, `sm` 768px, `md` 1024px, `lg` 1280px, `xl` 1640px [BP:1-5]. Do not duplicate threshold literals in app code. Initial state MUST be emitted at subscription start; transitions MUST be derived from `matchMedia` changes, not resize polling. Tests MUST assert initial and just-below/at/above every threshold.
- **LOC-1 Locale service.** Provide a `Locale` service constructed for an explicit locale. It exposes cached native Intl number, date/time, relative-time, and plural-rule formatters. Locale changes require a new service Layer; output MUST not depend on the machine's default locale.
- **LOC-2 Bounded cache.** Formatter cache MUST be bounded per service and evict deterministically (LRU or a fixed key space). Use an LRU capacity of at most 64 entries. Tests MUST verify repeat reuse, distinct normalized keys, eviction at capacity, and isolation between locale Layers; caller-supplied arbitrary options MUST NOT cause unbounded growth. The capability is standalone and must remain lazy [HS:12, 34, 46, 90-107].

### 5.5 Browser Commands and Mount

- **CMD-1 Clipboard.** Export a typed Clipboard Command accepting text. It MUST use `navigator.clipboard.writeText`, map denial/unavailable/secure-context errors to a failure Message, and return success through a success Message. It MUST NOT throw or imply permission bypass. Document user-activation and secure-context requirements [HS:13, 25, 35, 47].
- **CMD-2 ScrollIntoView.** Export a typed ScrollIntoView Command accepting an element ID and native scroll options. Missing targets and DOM exceptions MUST become failure Messages; successful scrolling becomes a success Message. Let the caller choose native `ScrollIntoViewOptions` rather than adding a second scroll-policy layer [HS:14, 26, 36, 48].
- **OBS-1 ResizeObserver Mount.** Export a Foldkit Mount that observes its owned element, emits typed width/height Messages only when dimensions change, and disconnects on scope release. Unsupported environments and observer failures MUST be ordinary typed failures or documented no-observation outcomes, never unhandled defects [HS:15, 27, 37, 49].
- **OBS-2 Feedback-loop guard.** Document that observation is read-only and the Mount does not write layout. Coalesce observations to at most one emission per animation frame, deduplicate equal dimensions, and cancel pending work on teardown. This prevents repeated same-size notifications and bounds update frequency; it cannot prevent application code from causing a true oscillating layout. Add a test for deduplication/coalescing and cleanup.
- **DEP-1 Effect module closure.** Clipboard, ScrollIntoView, ResizeObserver, Breakpoints, Locale, signals, and validation MUST add no Effect modules absent from **B**, the static/modulepreload closure of a production build of the packed consumer with the helper page present but no helper imported. **B+H** is the same consumer build with exactly one helper imported by its lazy page; the gate diffs its emitted Effect modules against B and fails on unexpected additions. Persistence is the only exception and may add only `KeyValueStore`. Helper size is measured separately as Brotli-q11 bytes in B+H's lazy-only closure, excluding B's eager closure. The Gallery framework map remains historical spike evidence, not the production baseline. Use narrow public imports and remove accidental pulls of `DateTime`, `Tuple`, `http/internal/urlParams`, `Redacted`, and other unrelated Effect modules [HS:75-88].

### 5.6 Explicit bounded Island

- **ISL-1 Opt-in boundary.** Export an explicit `Island` component for a server-rendered subtree only. It is the documented exception to Foldkit DOM ownership; it MUST NOT be a general rendering path and MUST NOT compete with Foldkit rendering inside or outside its declared root.
- **ISL-2 Enforcement.** Resolve patch targets only within the declared island root; reject invalid selectors, missing targets, the root itself where a descendant is required, sibling insertions without an in-island parent, and any operation escaping the root. Reject before any DOM mutation and return typed `RejectedIslandPatch` with a reason. A rejected patch leaves the entire document unchanged [HM:13-15].
- **ISL-3 DOM behavior.** Idiomorph (0BSD) is the only morph implementation. Preserve active input value, focus, and selection when matching controls; the spike required Idiomorph's `ignoreActiveValue` and `restoreFocus` options [HM:14, 16, 41-42]. The component accepts only trusted server-rendered content; user-controlled raw HTML is outside its contract.
- **ISL-4 Lazy and size.** The Idiomorph and adapter closure MUST be a lazy chunk, with no eager entry unless the application imports the component from its shell. Its Brotli-11 helper-only size, including Idiomorph, MUST be ≤4.5 KB. It MUST add no Effect modules beyond the framework closure.
- **ISL-5 Verification.** Tests MUST cover every supported operation, malformed selector, outside/missing/root target, no mutation after rejection, focus/value/selection retention, and boundary behavior in Chromium, Firefox, and WebKit. Document which server-owned content may use this component and the explicit prohibition on general app rendering [HM:55-61].

### 5.7 Query documentation, packaging, budgets, and performance

- **DOC-1 Query pattern, not helper.** Do not add query-sync exports, aliases, or wrappers. Update the `@wsagency/wseffect-app` README with the Foldkit `Route.query(Schema)` pattern: schema-parse route values, transform invalid/optional values explicitly, build typed route state, and choose `pushUrl` versus `replaceUrl` at the application call site [HS:10, 22, 44, 112, 121-125]. A README test MUST assert the example uses the supported Foldkit public API.
- **PKG-1 Standalone exports.** Every adopted helper is a separately named export and independently tree-shakable; importing one helper does not import another helper's code. Tests MUST build consumer fixtures importing each helper separately and inspect their output.
- **SIZE-1 Budgets.** Each adopted helper is ≤1.5 KB Brotli quality 11 helper-only, excluding existing framework peer code. `persist` is included in this budget. `Island` is ≤4.5 KB including Idiomorph. None is in the eager closure unless explicitly imported from the app shell. The consumer-only Vite fixture MUST emit manifest/source maps; CI MUST calculate helper closure bytes and eager reachability [HM:19-29; HS:61-88].
- **PERF-1 Quiet-runner evidence.** Re-measure timing on a quiet runner before any speed claim or performance budget is adopted. Use paired ABAB samples and A/A noise bands for the timing cases; report environment, sample count, medians and noise band. The loaded-host results in Appendix A.3 and A.6 are directional only and MUST NOT become product performance promises [HM:31-51; HS:90-107].
- **CLEAN-1 Clean-room and licensing.** Do not use Datastar Pro code or documentation text and do not claim Datastar Pro compatibility. Interop claims are limited to the Datastar SSE JSON-only subset tested against `@starfederation/datastar-sdk` (MIT) [DS]. New application code follows the repository's MIT policy. If Datastar core code is ever reused, include its MIT notice and attribution. Idiomorph is 0BSD [IM].

## 6. Risks and mitigations

| Risk | Consequence | Required mitigation |
|---|---|---|
| SSE transport and browser online state race | Duplicate, stale, or post-cancel Messages | One Subscription owns transport, listeners, timers, and cancellation; test reconnect, offline/online races, and interruption. |
| JSON subset confused with full Datastar | Unsafe or misleading compatibility claim | Document exact supported event and JSON subset; reject everything else; test with the MIT SDK only. |
| Cross-tab persistence conflict ambiguity | Tabs silently overwrite one another | Require an explicit policy, envelope timestamp, deterministic tie-break, and policy-specific tests. |
| Arbitrary formatter options grow cache | Long-lived app memory growth | Bounded per-Layer LRU with an eviction test and locale-scoped lifetime. |
| Resize-driven Model writes cause layout oscillation | Repeated observer updates or browser loop errors | Read-only observer, frame coalescing, size deduplication, cleanup, and explicit documentation that consumer oscillation is not solved by the helper. |
| Island code mutates Foldkit-owned DOM | Hydration/view inconsistencies and user-input loss | Explicit bounded root, reject-before-mutate checks, opt-in API, focus/value preservation, browser tests, size/lazy gate. |
| Framework imports drag unrelated Effect modules | Larger helper and duplicate runtime code | Narrow imports and module-list diff against framework baseline; only `KeyValueStore` may be additional for persistence. |
| Loaded-host timings mislead | Premature optimization or budget | Quiet-runner ABAB/A-A remeasurement; no speed claims based on Appendix A results. |

## 7. Out of scope

- General DOM morphing, app-wide rendering, hydration, or a replacement for Foldkit's view ownership.
- Datastar HTML patches, expression execution, scripts, Pro implementation/documentation, or a Pro-compatibility claim.
- Query synchronization helper or hidden routing policy; this is application-level code using Foldkit's public route API.
- Secure or encrypted browser persistence, server synchronization, conflict-free replicated data types, or implicit conflict resolution.
- Locale negotiation/detection, translation catalogs, message formatting framework, or arbitrary unbounded formatter caches.
- Polyfills for unsupported browsers, accessibility certification with assistive technology, or guarantees about browser permission grants.
- Any Foldkit fork, patch, or dependency upgrade in this sub-project.

## 8. Self-review

- **Coverage:** SIG-1..8 cover transports, supported protocol, decoding/rejection, reconnection, offline and cancellation, errors, SDK tests, and lazy loading. VAL-1..4 cover source-of-truth and native projection. PERSIST-1..6 cover envelope, migration, debounce, channels, explicit conflict policy, budget/tests. BP-1 and LOC-1..2 cover shared thresholds and cache bounds. CMD-1..2 and OBS-1..2 cover browser Commands, lifecycle, and feedback guard. ISL-1..5 enforce opt-in bounded DOM ownership. DOC-1, PKG-1, SIZE-1, DEP-1, PERF-1, CLEAN-1 capture no-helper query, tree shaking, size/modules, quiet-runner evidence, and licensing.
- **Testability:** every functional requirement names observable state, cleanup, rejection, output, threshold, or bundle/module assertion; no acceptance relies only on subjective UX.
- **Evidence:** Appendix A copies every spike evidence table cited for adopted/rejected decisions, sizes/module closure, browser behavior, and timing. Reported timings are explicitly directional.
- **Design decisions to preserve:** `ConflictPolicy` is mandatory with exactly two supported choices; Locale cache capacity is bounded at 64 entries; only KeyValueStore may add an Effect module beyond the framework chunk; the island ceiling includes Idiomorph; query remains documentation only.

## Appendix A. Preserved spike evidence tables

The following tables reproduce the spike reports' cited evidence so this design does not depend on temporary branches. They are experimental evidence, not acceptance tests for production code.

### A.1 Hypermedia candidate verdicts [HM:11-15]

| Candidate | Verdict | Evidence / conditions |
|---|---|---|
| Datastar signals / server updates | Adopt with changes | Effect stream handles decoded signals with typed schemas and owns cancellation/reconnection; native EventSource remains a browser transport. Keep HTML and application state server-owned. Offline pause/reconnect tested. SSE-to-paint measurements favored Effect but only narrowly exceeded A/A noise, with a scheduler outlier. |
| Idiomorph islands | Reject as default rendering | Descendant boundary check and focus/selection restoration passed cross-browser tests, but it mutates DOM outside Foldkit's ownership model. Retain only for explicit bounded islands. 1k morph did not beat A/A noise at either throttle. |
| Native constraint-validation attributes | Adopt with changes | Maps model validity to setCustomValidity, aria-invalid, and error association; native constraint validation remains authoritative. Browser tests cover validity and ARIA. |

### A.2 Hypermedia bundle and eager closure [HM:19-29]

| Feature | Brotli-11 bytes | In eager closure? |
|---|---:|---|
| Signals | 1,051 | No |
| Island patch + mount | 3,977 | No |
| Constraint validation + mount | 476 | No |

Build used Vite 8.3.4 and externalized existing framework peers. Fixture entry was 5.06 kB (2.18 kB gzip); these are incremental feature sizes, not a standalone total.

### A.3 Hypermedia ABAB / A-A timings [HM:31-51]

| Rate | Measurement (A → B) | A/A band (p95 abs; min…max) | Readout |
|---|---|---|---|
| 1× | 1k direct text update 19.0 → Idiomorph 21.1 ms | 13.6; −8.7…+13.6 ms | Difference +2.1 is inside noise. |
| 4× | 1k direct text update 58.7 → Idiomorph 49.2 ms | 16.9; −13.8…+16.9 ms | Difference −9.5 is inside noise. |
| 1× | Native EventSource-to-paint 21.7 → Effect stream-to-paint 8.8 ms | 9.3; −9.3…+8.6 ms | Difference −12.9 is directional only. |
| 4× | Native EventSource-to-paint 27.8 → Effect stream-to-paint 11.1 ms | 15.4; −15.4…+15.2 ms | Difference −16.7 is directional only. |

The host had high background load. An Effect-stream sample reached 244.3 ms at 1×; the report explicitly advises against stable latency claims.

### A.4 Hypermedia browser coverage [HM:55-61]

| Engine | Offline/reconnect | Island fence + focus/selection | Native validity + ARIA |
|---|---:|---:|---:|
| Chromium | Pass | Pass | Pass |
| Firefox | Pass | Pass | Pass |
| WebKit | Pass | Pass | Pass |

The complete Playwright run was 10 passed, 2 skipped; the runtime benchmark runs in Chromium because CDP throttling is Chromium-only.

### A.5 Helper candidate recommendations and helper-only sizes [HS:7-15, 61-73]

| Candidate | Verdict | Helper-only bytes (Brotli q11) | Key evidence |
|---|---|---:|---|
| Schema persistence | Adopt with changes | 1,020 | 20 unit tests; cross-page storage/channel/fallback browser coverage; spike left cross-tab policy to caller. |
| Query sync | No helper | 0 | Foldkit Query Sync uses `Route.query(Schema)`, transforms, typed route building, and push/replace URL APIs. |
| Theme breakpoints | Adopt with changes | 357 | Five thresholds; cross-engine and boundary tests. |
| Locale / Intl | Adopt with changes | 328 | Cached number/date/relative-time/plural formatting; unbounded-growth risk noted. |
| Clipboard Command | Adopt with changes | 244 | Permission denial maps to failure Message. |
| ScrollIntoView Command | Adopt with changes | 353 | Live element and missing-target behavior tested. |
| ResizeObserver Mount | Adopt with changes | 335 | Size changes, stream interruption, and cleanup tested. |

### A.6 Effect module closure diff [HS:75-88]

Baseline was the gallery framework source map (91 Effect modules, 1 `@effect/platform-browser` module, 77 Foldkit modules). These are Effect modules absent from that baseline; all paths are under `effect/dist/`.

| Helper | Effect modules in closure | Already in framework | Additional Effect modules in spike |
|---|---:|---:|---|
| Persistence | 78 | 71 | `Clock.js`, `DateTime.js`, `Tuple.js`, `encoding/EncodingError.js`, `http/internal/urlParams.js`, `internal/redacted.js`, `persistence/KeyValueStore.js` |
| Breakpoints | 30 | 30 | None |
| Locale | 16 | 16 | None |
| Clipboard | 67 | 62 | `DateTime.js`, `Tuple.js`, `encoding/EncodingError.js`, `http/internal/urlParams.js`, `internal/redacted.js` |
| Scroll | 67 | 62 | `DateTime.js`, `Tuple.js`, `encoding/EncodingError.js`, `http/internal/urlParams.js`, `internal/redacted.js` |
| Resize | 76 | 71 | `DateTime.js`, `Tuple.js`, `encoding/EncodingError.js`, `http/internal/urlParams.js`, `internal/redacted.js` |

The module closure differences above are spike findings to fix; final implementation acceptance is stricter: only KeyValueStore may be added for persistence and no other helper may add an Effect module.

### A.7 Locale timing evidence [HS:90-107]

Measurements are µs/call. Cached path includes normalized options-key/cache lookup; comparison constructs a formatter each call. The host had high background load and A/A relative spans ranged 20.0%–134.2%, so the data is directional.

| Engine | Operation | Cached median (A/A P10–P90) | Construct per call | Ratio |
|---|---|---:|---:|---:|
| Chromium | Number | 0.86 (0.70–1.08) | 15.99 | 18.6× |
| Chromium | DateTime | 1.24 (0.97–2.63) | 35.47 | 28.6× |
| Chromium | RelativeTime | 0.28 (0.24–0.47) | 8.21 | 29.8× |
| Chromium | PluralRules | 0.26 (0.22–0.42) | 8.37 | 32.4× |
| Firefox | Number | 1.25 (1.17–1.42) | 17.00 | 13.6× |
| Firefox | DateTime | 1.42 (1.17–1.75) | 28.08 | 19.8× |
| Firefox | RelativeTime | 0.50 (0.42–0.67) | 5.75 | 11.5× |
| Firefox | PluralRules | 0.58 (0.42–0.75) | 15.42 | 26.4× |
| WebKit | Number | 0.75 (0.67–0.92) | 16.58 | 22.1× |
| WebKit | DateTime | 1.33 (1.25–1.58) | 44.33 | 33.3× |
| WebKit | RelativeTime | 0.25 (0.25–0.42) | 11.00 | 44.0× |
| WebKit | PluralRules | 0.42 (0.33–0.42) | 16.25 | 39.0× |

### A.8 Helper pros and cons [HS:39-49]

| Candidate | Pros | Cons |
|---|---|---|
| Persistence | Schema validation, migration, default recovery, and effectful storage abstraction solve a common app concern. | Write ownership and cross-tab precedence must be defined; debounce and sync add lifecycle/consistency complexity. |
| Query sync | Foldkit route parser, Schema transforms, and URL Commands already provide typed building blocks. | Field mapping and route policy remain explicit app-specific logic; a wrapper would conceal those choices. |
| Breakpoints | A single semantic Model value avoids repeating raw media-query checks. | Must align with Theme thresholds, initialize correctly, and avoid stale width state. |
| Locale / Intl | Reuses formatter instances for a locale/options pair and avoids machine-dependent defaults. | Arbitrary options can grow the cache; locale changes recreate the service; browser locale data varies. |
| Clipboard | Small typed Command with useful failure feedback and no bespoke clipboard implementation. | Browser policy and secure-context restrictions cannot be bypassed; consumer must call on user intent. |
| ScrollIntoView | Small convenience for typed event/Command wiring and missing-target reporting. | Native API is already one call; a wrapper can obscure UX policy and can be inlined. |
| ResizeObserver | Foldkit Mount owns observer lifetime and cleanup. | Model-driven layout changes can trigger more measurements; deduplication alone cannot prevent application-level feedback. |

### A.9 Helper test and browser evidence [HS:53-59]

| Evidence | Result |
|---|---|
| Unit tests | 20 passed across five files; persistence round-trip/default/migration/quota/debounce/channel/fallback, breakpoint mapping, Command errors, and Intl cache/formatting covered. |
| Browser tests | 21/21 across Chromium, Firefox, WebKit (7 per engine): persistence BroadcastChannel/storage fallback, breakpoint thresholds, clipboard denial mapping, scrolling, ResizeObserver updates/teardown, and Intl timing. |
| Typecheck | Passed with browser fixtures included. |


## Appendix B. Requirement ID index

`PRI-1`, `PRI-2`, `PRI-3`; `ARC-1`–`ARC-3`; `SIG-1`–`SIG-8`; `VAL-1`–`VAL-4`; `PERSIST-1`–`PERSIST-6`; `BP-1`; `LOC-1`–`LOC-2`; `CMD-1`–`CMD-2`; `OBS-1`–`OBS-2`; `DEP-1`; `ISL-1`–`ISL-5`; `DOC-1`; `PKG-1`; `SIZE-1`; `PERF-1`; `CLEAN-1`.

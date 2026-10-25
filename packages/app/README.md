# @wsagency/wseffect-app

A Foldkit application foundation for lazy page modules, page loading, offline behavior, update prompts, and deployment-version checks.

## Installation

Install `@wsagency/wseffect-app`, `@wsagency/wseffect-foldkit`, `@wsagency/wseffect-foldkit-ui`, `@wsagency/wseffect-vite-plugin`, Effect `4.0.5`, Vite `8`, and `vite-plugin-pwa` `2.0.0`. The app package exposes its root API from `@wsagency/wseffect-app`, its Vite integration from `@wsagency/wseffect-app/vite`, its page generator from `@wsagency/wseffect-app/codegen`, and its Oxlint rules from `@wsagency/wseffect-app/oxlint-plugin`. `@wsagency/wseffect-themes` is a required peer dependency because breakpoints read its public tokens. Generated page code imports `@wsagency/wseffect-app/runtime`, the boot-runtime entry; application code should use the root API.

Create `src/pages/package.json` with `{"sideEffects":false}`. Each page is a lazy module named with a key matching `^[a-z][A-Za-z0-9]*$`. Run `wseffect-codegen .` to generate `src/pages.gen.ts`; use `wseffect-codegen --check .` in CI to reject stale generated output.

Configure Vite with `wseffect({ primaryPages, pwa })`. `primaryPages` lists page keys that must be precached for offline use. Set `pwa: false` to disable service-worker installation while retaining the version poll and online application behavior. When PWA is enabled, provide a manifest with `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, theme and background colors, and PNG icons at 192×192 and 512×512. The build isolates app-source modules shared by the entry and lazy pages in `app-shared-*` assets; generated shared assets are precached with the entry.

`makeApp` merges the application resources with the app's ServiceWorker layer, page subscriptions, and version polling. Supply the app's page binding and mapping between the kit's state/messages and the enclosing application. The default version poll interval is five minutes; `versionPollMs` overrides it.

## App capabilities

Each helper is a named export from `@wsagency/wseffect-app`. Keep application data in the app's Model; callbacks below translate helper outcomes into the application's own Message union.

### Typed signals

```ts
import { Schema } from 'effect'
import type { Subscription } from '@wsagency/wseffect-foldkit'
import { signalSubscription, type SignalOutcome, type SignalTransport } from '@wsagency/wseffect-app'

type ServerState = { readonly online: boolean }
type Message = { readonly _tag: 'SignalsReceived'; readonly outcome: SignalOutcome<ServerState> }

const signals: Subscription.Subscription<unknown, Message, Record<string, never>> =
  signalSubscription({
    schema: Schema.Struct({ online: Schema.Boolean }),
    transport: { _tag: 'EventSource', url: '/signals' } satisfies SignalTransport,
    toMessage: (outcome) => ({ _tag: 'SignalsReceived', outcome }),
  })
```

`signalSubscription` returns `Subscription.Subscription<unknown, M, Record<string, never>>`. It owns the selected transport, reconnection, offline pause/resume, and cleanup when the Subscription is interrupted. `SignalOutcome<A>` distinguishes decoded patches, rejected patches, and transport failures; feed each outcome into the Model through a typed Message.

The only supported signal protocol is the Datastar JSON-only `patch-signals` subset: `datastar-patch-signals` with `data: signals <JSON object>` and optional `data: onlyIfMissing true|false`. There is no HTML patching, expression evaluation, arbitrary script execution, or Datastar Pro compatibility. Native EventSource can observe only `datastar-patch-signals` and the default `message` event; other named events are unobservable and are not reported. Choose Fetch when complete rejection reporting is required. Both transports ignore SSE `id:` and `retry:` fields and use the configured `SignalBackoff` instead.

### Native constraint validation

```ts
import { Result } from 'effect'
import { projectConstraintValidity, type ValidationResult, type ValidationProjectionError } from '@wsagency/wseffect-app'

type Model = { readonly emailValidation: ValidationResult }
type Message = { readonly _tag: 'ValidationProjectionFailed'; readonly error: ValidationProjectionError }

function projectEmailValidation(model: Model, control: HTMLInputElement, dispatch: (message: Message) => void) {
  const result = projectConstraintValidity(control, 'email-error', model.emailValidation)
  if (Result.isFailure(result)) dispatch({ _tag: 'ValidationProjectionFailed', error: result.failure })
}
```

`projectConstraintValidity(control, errorId, result)` returns `Result.Result<void, ValidationProjectionError>`: it updates the browser's native custom validity and the associated `aria-invalid`/`aria-describedby` state, or returns a typed invalid-control failure. Model validation remains the source of truth; no second validation Model is kept.

### Versioned persistence

```ts
import { Effect, Result, Schema, Stream } from 'effect'
import { persist, type PersistenceFailure } from '@wsagency/wseffect-app'

type Preferences = { readonly favorites: ReadonlyArray<string> }
type Model = { readonly preferences: Preferences }
type Message =
  | { readonly _tag: 'PreferencesRestored'; readonly value: Preferences }
  | { readonly _tag: 'RemotePreferencesWon'; readonly value: Preferences }
  | { readonly _tag: 'PersistenceFailed'; readonly failure: PersistenceFailure }

const preferences = persist<Preferences, Message>({
  key: 'preferences',
  version: 1,
  schema: Schema.Struct({ favorites: Schema.Array(Schema.String) }),
  defaultValue: { favorites: [] },
  conflictPolicy: 'local-wins',
  migrate: (storedVersion, data) => {
    if (storedVersion === 0 && data !== null && typeof data === 'object' && 'favorite' in data && typeof data.favorite === 'string') {
      return Result.succeed({ favorites: [data.favorite] })
    }
    return Result.fail(data)
  },
  debounceMs: 150,
  toMessage: (value) => ({ _tag: 'RemotePreferencesWon', value }),
  toFailureMessage: (failure) => ({ _tag: 'PersistenceFailed', failure }),
})

const restoreMessage: Effect.Effect<Message> =
  Effect.map(preferences.restore, (value) => ({ _tag: 'PreferencesRestored', value }))
const syncMessages: Stream.Stream<Message> = preferences.subscribe
const savePreferences = (model: Model) => preferences.save(model.preferences)
```

`persist<A, M>` returns `Persistence<A, M>`: `restore` is an `Effect<A>`, `save` and `saveDebounced` write a value, and `subscribe` is a `Stream<M>`. Restore failures return the configured default and are delivered once to the first subscriber; save, migration, and sync failures use `toFailureMessage`. The conflict policy is required. `local-wins` is strict: remote values are never applied to the Model. Persistence uses origin-local storage and is not secure storage; do not store secrets or treat it as an access-control boundary.

The envelope's `data` is stored in the supplied Schema codec's encoded form, so that encoded side must be JSON-compatible. Restore and sync decode that stored payload. `migrate(storedVersion, data)` receives the raw payload from the old envelope and must return the current decoded value; persistence validates that value against the current codec before restoring it.

### Theme breakpoints

```ts
import type { Subscription } from '@wsagency/wseffect-foldkit'
import { breakpointSubscription, type Breakpoint } from '@wsagency/wseffect-app'

type Message = { readonly _tag: 'BreakpointChanged'; readonly value: Breakpoint }
const viewport: Subscription.Subscription<unknown, Message, Record<string, never>> =
  breakpointSubscription((value) => ({ _tag: 'BreakpointChanged', value }))
```

The Subscription emits the initial breakpoint and subsequent distinct values using the Themes breakpoint tokens (`xs`, `sm`, `md`, `lg`, `xl`, or `initial`). Interruption removes every media-query listener. Its Model Message reports a viewport measurement; it does not own layout state.

### Locale formatting

```ts
import { Effect } from 'effect'
import { LocaleService } from '@wsagency/wseffect-app'

type Model = { readonly total: number }
type Message = { readonly _tag: 'AmountFormatted'; readonly text: string }

const formatTotal = (model: Model) =>
  Effect.map(Effect.service(LocaleService), (locale): Message => ({
    _tag: 'AmountFormatted',
    text: locale.number(model.total),
  }))
const localeLayer = LocaleService.layer('en-US')
```

Provide `localeLayer` with the app's resources, then use the `LocaleService` to derive presentation from the current Model. `makeLocale(locale)` is also available when a service is not needed. Number, date-time, relative-time, and plural formatters are cached in a bounded 64-entry LRU; locale changes use a new layer/service.

### Clipboard Command

```ts
import type { Command } from '@wsagency/wseffect-foldkit'
import { clipboardCommand, type BrowserCommandResult } from '@wsagency/wseffect-app'

type Model = { readonly shareUrl: string }
type Message = { readonly _tag: 'ClipboardFinished'; readonly result: BrowserCommandResult }
const copyShareUrl = (model: Model): Command.Command<Message, never> =>
  clipboardCommand(model.shareUrl, (result) => ({ _tag: 'ClipboardFinished', result }))
```

The Command emits a success or typed failure Message; denial and unavailable APIs are ordinary failures, not thrown errors. Clipboard writes require a secure context and user activation (for example, a direct user action); browser policy cannot be bypassed.

### ScrollIntoView Command

```ts
import type { Command } from '@wsagency/wseffect-foldkit'
import { scrollIntoViewCommand, type BrowserCommandResult } from '@wsagency/wseffect-app'

type Message = { readonly _tag: 'ScrollFinished'; readonly result: BrowserCommandResult }
const scrollToResults: Command.Command<Message, never> =
  scrollIntoViewCommand('results', { behavior: 'smooth', block: 'start' }, (result) => ({ _tag: 'ScrollFinished', result }))
```

The Command uses native `Element.scrollIntoView` options. Missing elements and DOM exceptions become failure Messages; the caller chooses scroll behavior and when to run the Command.

### ResizeObserver Mount

```ts
import type { Mount } from '@wsagency/wseffect-foldkit'
import { resizeObserverMount, type ResizeResult } from '@wsagency/wseffect-app'

type Message = { readonly _tag: 'ElementResized'; readonly result: ResizeResult }
const resizeAction: Mount.MountAction<Message> =
  resizeObserverMount((result) => ({ _tag: 'ElementResized', result }))
// Attach resizeAction to the observed element with h.OnMount(resizeAction).
```

`resizeObserverMount` returns `Mount.MountAction<M>`. It emits changed dimensions, coalesces work to a frame, and disconnects/cancels pending work when the element unmounts; unsupported observers and observer errors are typed `ResizeResult` cases. Observation is read-only and cannot prevent application-induced oscillation: Model-driven layout changes can still cause a feedback loop.

### Explicit Island

```ts
import { Stream } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { Island, type IslandPatch, type IslandResult } from '@wsagency/wseffect-app'

type Message = { readonly _tag: 'IslandPatchFinished'; readonly result: IslandResult }
declare const h: HtmlBuilder<Message>
declare const trustedServerHtml: string
const patches: Stream.Stream<IslandPatch> = Stream.make({
  _tag: 'InnerHtml',
  selector: '#balance',
  html: '<strong>Updated by the server</strong>',
})
const accountIsland = Island({
  id: 'account-summary',
  html: trustedServerHtml,
  patches,
  toMessage: (result) => ({ _tag: 'IslandPatchFinished', result }),
}, h)
```

`Island` is an explicit Foldkit DOM-ownership exception for trusted server-rendered HTML only; never pass user-controlled raw HTML. Its `html` prop is mount-time initialization. Use a new `id`/key to remount with different initial HTML. Patches are restricted to descendants of the island root; rejected patches do not mutate the document, and a morph failure rolls back the change (including active control state).

## Query values with Foldkit

There is no query synchronization helper in this package. Use Foldkit's public `Route.query(Schema)` parser, map its parsed value to a tagged route state, handle parse failure explicitly, and decide at the call site whether a navigation pushes or replaces browser history:

<!-- route-query-example:start -->
```ts
import { Effect, pipe, Schema } from 'effect'
import { Navigation, Route } from '@wsagency/wseffect-foldkit'

const SearchQuery = Schema.Struct({
  q: Schema.String,
  page: Schema.optional(Schema.FiniteFromString),
})
const Search = {
  make: (query: typeof SearchQuery.Type) => ({ _tag: 'Search' as const, ...query }),
}
const searchRoute = pipe(
  Route.literal('search'),
  Route.query(SearchQuery),
  Route.mapTo(Search),
)
type SearchRouteState = { readonly _tag: 'Search' } & typeof SearchQuery.Type
type Message =
  | { readonly _tag: 'SearchRouteSelected'; readonly route: SearchRouteState }
  | { readonly _tag: 'InvalidSearchQuery' }

const parseSearch = (search: string): Effect.Effect<Message> =>
  Effect.match(searchRoute.parse(['search'], search), {
    onFailure: () => ({ _tag: 'InvalidSearchQuery' }),
    onSuccess: ([route]) => ({
      _tag: 'SearchRouteSelected',
      route: { ...route, page: route.page ?? 1 },
    }),
  })

const searchUrl = searchRoute.build({ q: 'birds', page: 2 })
const navigateToSearch = Navigation.pushUrl(searchUrl)
const replaceSearchDraft = Navigation.replaceUrl(searchUrl)
```
<!-- route-query-example:end -->

`Route.query(SearchQuery)` decodes query values through the Schema: `page` is optional and `FiniteFromString` rejects malformed/non-finite values. `parseSearch` turns parse errors into an application Message and explicitly defaults an omitted page to `1`; the tagged route state remains typed. Use `pushUrl` for a user-visible history entry or `replaceUrl` for an in-place update, according to the call site's navigation intent. Do not add a wrapper or query-sync helper.

## Helper bundle budgets

The consumer gate measures helper-only JavaScript with Brotli quality 11, excluding the packed app's existing framework closure. Each helper is independently lazy; Island's budget includes Idiomorph.

| Helper | Measured (Brotli-q11) | Gate budget |
|---|---:|---:|
| Signals | 1,489 B | 1,600 B |
| Constraint validation | 395 B | 1,536 B |
| Persistence | 1,300 B | 1,536 B |
| Breakpoints | 552 B | 1,536 B |
| Locale | 500 B | 1,536 B |
| Clipboard | 382 B | 1,536 B |
| ScrollIntoView | 336 B | 1,536 B |
| ResizeObserver | 614 B | 1,536 B |
| Island (including Idiomorph) | 4,365 B | 4,864 B |

Only Persistence may add an Effect module to the packed consumer's baseline, and only `persistence/KeyValueStore.js`; all other helpers add none. The gates inspect the packed consumer's emitted module graph, not the historical Gallery framework map.


## Effect version

Vendored Foldkit packages and wseffect use the workspace's exact Effect 4.0.5 pins. Consumers do not need Foldkit-specific overrides or `allowedVersions` rules.

## Server contract

Serve one immutable deployment directory at a time and retain the current plus the previous 3 deployments while old tabs may still request lazy page chunks.

| Request path | Required behavior |
|---|---|
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable`; serve the file from the current or retained deployment, otherwise return 404. |
| `/` and extensionless routes | Serve the current `index.html` with `Cache-Control: no-cache`. |
| `index.html`, `sw.js`, `version.json`, `manifest.webmanifest` | Use `Cache-Control: no-cache`. |
| Missing asset path | Return 404; never return the SPA document for a missing asset. |
| Unknown extensionless route | Fall back to the current `index.html`. |
| Deployment retention | Retain the current deployment and the previous 3 deployment asset trees so already-open tabs can load their old lazy chunks. |

The Vite plugin emits `version.json` containing the same build ID compiled into the application. The service worker uses prompt-based updates; the version poll also detects a newer build in an already-open tab.

## Limits of updates

Retaining old assets and prompting before a reload do not make incompatible backend APIs or stored data compatible with an old or new client. Deployments must manage backend and persisted-data skew separately. Applying an update reloads the document and loses in-memory application state; persist state explicitly if it must survive a reload.

## License

MIT. See [LICENSE](./LICENSE).

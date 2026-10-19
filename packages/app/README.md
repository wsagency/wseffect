# @wsagency/wseffect-app

A Foldkit application foundation for lazy page modules, page loading, offline behavior, update prompts, and deployment-version checks.

## Installation

Install `@wsagency/wseffect-app`, Foldkit `0.168.0`, Effect `4.0.5`, Vite `8`, and `vite-plugin-pwa` `2.0.0`. The app package exposes its runtime from `@wsagency/wseffect-app`, its Vite integration from `@wsagency/wseffect-app/vite`, its page generator from `@wsagency/wseffect-app/codegen`, and its Oxlint rules from `@wsagency/wseffect-app/oxlint-plugin`.

Create `src/pages/package.json` with `{"sideEffects":false}`. Each page is a lazy module named with a key matching `^[a-z][A-Za-z0-9]*$`. Run `wseffect-codegen .` to generate `src/pages.gen.ts`; use `wseffect-codegen --check .` in CI to reject stale generated output.

Configure Vite with `wseffect({ primaryPages, pwa })`. `primaryPages` lists page keys that must be precached for offline use. Set `pwa: false` to disable service-worker installation while retaining the version poll and online application behavior. When PWA is enabled, provide a manifest with `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, theme and background colors, and PNG icons at 192×192 and 512×512.

`makeApp` merges the application resources with the app's ServiceWorker layer, page subscriptions, and version polling. Supply the app's page binding and mapping between the kit's state/messages and the enclosing application. The default version poll interval is five minutes; `versionPollMs` overrides it.

## Effect version (temporary)

Foldkit 0.168.0 declares Effect 4.0.0 peers, while wseffect packages use Effect 4.0.5. Until Foldkit adopts [PR #1699](https://github.com/foldkit/foldkit/pull/1699), consumers may need the same resolution in their workspace root `pnpm-workspace.yaml`.

<!-- up8:start -->
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
<!-- up8:end -->

Remove this override and its `allowedVersions` entries when the Foldkit upgrade adopts peers accepting Effect 4.0.5. Make that change in the same upgrade PR that removes this snippet and the corresponding packed-consumer fixture configuration, or narrow it to any remaining peer conflicts.

## Server contract

Serve one immutable deployment directory at a time and retain the three previous deployment asset trees while old tabs may still request lazy page chunks.

| Request path | Required behavior |
|---|---|
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable`; serve the file from the current or retained deployment, otherwise return 404. |
| `/` and extensionless routes | Serve the current `index.html` with `Cache-Control: no-cache`. |
| `index.html`, `sw.js`, `version.json`, `manifest.webmanifest` | Use `Cache-Control: no-cache`. |
| Missing asset path | Return 404; never return the SPA document for a missing asset. |
| Unknown extensionless route | Fall back to the current `index.html`. |
| Deployment retention | Retain the three newest deployment asset trees so already-open tabs can load their old lazy chunks. |

The Vite plugin emits `version.json` containing the same build ID compiled into the application. The service worker uses prompt-based updates; the version poll also detects a newer build in an already-open tab.

## Limits of updates

Retaining old assets and prompting before a reload do not make incompatible backend APIs or stored data compatible with an old or new client. Deployments must manage backend and persisted-data skew separately. Applying an update reloads the document and loses in-memory application state; persist state explicitly if it must survive a reload.

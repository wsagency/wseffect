# @wsagency/wseffect-foldkit

Foldkit is an Effect-based TypeScript framework for browser applications, with an architecture inspired by Elm. Use this package for the core runtime, HTML builder, routing, and model/update APIs.

## Install

For the `0.1.0-rc.0` prerelease, install from the `next` dist-tag:

```sh
pnpm add @wsagency/wseffect-foldkit@next effect@^4.0.5 @effect/platform-browser@^4.0.5
```

For the stable release, use the default dist-tag:

```sh
pnpm add @wsagency/wseffect-foldkit effect@^4.0.5 @effect/platform-browser@^4.0.5
```

`effect` and `@effect/platform-browser` are required peers (`^4.0.5`). Node.js `>=20.19.0` is supported for tooling and builds; the runtime targets modern browsers.

## Minimal runtime

The `./runtime` export provides `makeElement` and `run` for a small direct Foldkit application:

```ts
import { makeElement, run } from '@wsagency/wseffect-foldkit/runtime'
```

See the [wseffect documentation](https://wseffect.com) for the full getting-started guide and API reference.
Source and issue tracking: [GitHub repository](https://github.com/wsagency/wseffect) · [issues](https://github.com/wsagency/wseffect/issues).

## Upstream attribution

This package vendors the Foldkit core source at `foldkit@0.168.0` from commit `060271955cc2fdd34ddb5e17a64b6662268f79c5`. It is an independently maintained snapshot; see [UPSTREAM.md](./UPSTREAM.md) for provenance, local divergence, sync, and contribution policy. Its public export map is retained from upstream. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`. Authored upstream by Devin Jameson; maintained and distributed by WS Agency. Licensed under MIT; see [LICENSE](./LICENSE) and [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).


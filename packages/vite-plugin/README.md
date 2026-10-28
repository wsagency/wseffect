# @wsagency/wseffect-vite-plugin

The wseffect Vite plugin integrates Foldkit builds with state-preserving live reload and provides build and prerender helpers.

## Install

For the `0.1.0-rc.0` prerelease, install from the `next` dist-tag:

```sh
pnpm add -D @wsagency/wseffect-vite-plugin@next @wsagency/wseffect-foldkit@next vite@8.3.4 effect@^4.0.5 @effect/platform-browser@^4.0.5
```

For the stable release, use the default dist-tag:

```sh
pnpm add -D @wsagency/wseffect-vite-plugin @wsagency/wseffect-foldkit vite@8.3.4 effect@^4.0.5 @effect/platform-browser@^4.0.5
```

Foldkit, Vite `8.3.4`, `effect`, and `@effect/platform-browser` are required peers; the Effect peer ranges are `^4.0.5`. Node.js `>=20.19.0` is supported.

## Configure Vite

The root export provides the `foldkit` plugin factory:

```ts
import { foldkit } from '@wsagency/wseffect-vite-plugin'

export default {
  plugins: [foldkit()],
}
```

See the [wseffect documentation](https://wseffect.com) for the full Vite/build guide and API reference.

## Upstream attribution

This package vendors the Foldkit Vite plugin source at `@foldkit/vite-plugin@0.27.1` from commit `060271955cc2fdd34ddb5e17a64b6662268f79c5`. It is an independently maintained snapshot; see [UPSTREAM.md](./UPSTREAM.md) for provenance, local divergence, sync, and contribution policy. Its public export map is retained from upstream. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`. Authored upstream by Devin Jameson; maintained and distributed by WS Agency. Licensed under MIT; see [LICENSE](./LICENSE) and [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

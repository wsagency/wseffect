# @wsagency/wseffect-foldkit-ui

Foldkit UI provides accessible, stateful UI components for applications built with the wseffect Foldkit core.

## Install

For the `0.1.0-rc.0` prerelease, install from the `next` dist-tag:

```sh
pnpm add @wsagency/wseffect-foldkit-ui@next @wsagency/wseffect-foldkit@next effect@^4.0.5 @effect/platform-browser@^4.0.5
```

For the stable release, use the default dist-tag:

```sh
pnpm add @wsagency/wseffect-foldkit-ui @wsagency/wseffect-foldkit effect@^4.0.5 @effect/platform-browser@^4.0.5
```

The core package, `effect`, and `@effect/platform-browser` are required peers. Effect peers accept `^4.0.5`. Node.js `>=20.19.0` is supported for tooling and builds; UI components run in modern browsers.

## Component API

Import components from their public subpaths. For example, the `button` export provides the Button view:

```ts
import { view } from '@wsagency/wseffect-foldkit-ui/button'
```

See the [wseffect documentation](https://wseffect.com) for setup guidance and the full component/API reference.

## Upstream attribution

This package vendors the Foldkit UI source at `@foldkit/ui@0.168.0` from commit `060271955cc2fdd34ddb5e17a64b6662268f79c5`. It is an independently maintained snapshot; see [UPSTREAM.md](./UPSTREAM.md) for provenance, local divergence, sync, and contribution policy. Its public export map is retained from upstream. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`. Authored upstream by Devin Jameson; maintained and distributed by WS Agency. Licensed under MIT; see [LICENSE](./LICENSE) and [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

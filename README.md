# wseffect

wseffect is an independent, unofficial project. It is not endorsed by Foldkit, WorkOS, Radix, or WS Agency. The MIT license grants no trademark rights in any names, logos, or other marks.

This repository contains:

- `@wsagency/wseffect-app` — a Foldkit application foundation for lazy pages, PWA behavior, and deployment-version checks.
- `@wsagency/wseffect-themes` — Radix Themes foundation styles and typed Foldkit view helpers for the pinned component families.
- `@wsagency/wseffect-primitives` — local, headless Select, ContextMenu, CheckboxGroup, RangeSlider, TooltipGroup, and SelectPosition primitives.
- `@wsagency/wseffect-foldkit` — wseffect-owned Foldkit core source, vendored from the reproducible 0.168.0 release.
- `@wsagency/wseffect-foldkit-ui` — wseffect-owned Foldkit UI source, vendored from the reproducible 0.168.0 release.
- `@wsagency/wseffect-vite-plugin` — wseffect-owned Foldkit Vite plugin source, vendored from the reproducible 0.27.1 release.
- `apps/gallery` — the integration gallery and browser-test fixture.
- `bench/radix2solid` — a comparison app built from the radix2solid library.

## Created for WS Agency

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ws.agency/brand/ws-vertical-white.svg">
  <img src="https://ws.agency/brand/ws-vertical-color.svg" width="160" alt="WS Agency">
</picture>

wseffect was created by [Kristijan Lukačin](https://github.com/klukacin) (@klukacin) for [WS Agency](https://ws.agency), the firm behind this project. We love open source, enterprise development and AI. Have a project in mind? [Let’s build it together](https://ws.agency/contact).

The WS Agency name and logos are excluded from this project’s MIT license; see [usage and licenses](https://design.ws.agency/docs/usage-and-licenses.md).

## Effect version

Vendored Foldkit packages and wseffect use the workspace's exact Effect 4.0.5 pins; no Foldkit peer override snippet is needed by consumers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the vendored Foldkit contribution policy, performance requirements, and commit conventions.

## Local development

Use Node.js 24.21.0 and pnpm 11.5.0. Install the locked dependencies with `pnpm install --frozen-lockfile`, then run `pnpm check` for the repository checks. Start the gallery development server with `pnpm --filter @wsagency/wseffect-gallery exec vite`.

## Distribution and gates

The app, themes, primitives, and vendored Foldkit packages are distributed as ESM packages. `pnpm check` runs the repository's automated checks, while the size and performance gates use the gallery and the radix2solid bench app. The packed-consumer check exercises all six workspace packages from tarballs outside this workspace.

## License

wseffect is licensed under the MIT License. The repository also retains MIT notices for Radix Themes, Radix Colors, and radix2solid; see [`LICENSE`](LICENSE) for the complete texts. The three Foldkit source snapshots retain their upstream MIT license and third-party notices in their package directories.

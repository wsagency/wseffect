# wseffect

wseffect is an independent, unofficial project. It is not endorsed by Foldkit, WorkOS, Radix, or WS Agency. The MIT license grants no trademark rights in any names, logos, or other marks.

This repository contains:

- `@wsagency/wseffect-app` — a Foldkit application foundation for lazy pages, PWA behavior, and deployment-version checks.
- `@wsagency/wseffect-themes` — Radix Themes foundation styles and typed Foldkit view helpers.
- `apps/gallery` — the integration gallery and browser-test fixture.
- `bench/radix2solid` — a comparison app built from the radix2solid library.

## Created for WS Agency

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ws.agency/brand/ws-vertical-white.svg">
  <img src="https://ws.agency/brand/ws-vertical-color.svg" width="160" alt="WS Agency">
</picture>

wseffect was created by [Kristijan Lukačin](https://github.com/klukacin) (@klukacin) for [WS Agency](https://ws.agency), the firm behind this project. We love open source, enterprise development and AI. Have a project in mind? [Let’s build it together](https://ws.agency/contact).

The WS Agency name and logos are excluded from this project’s MIT license; see [usage and licenses](https://design.ws.agency/docs/usage-and-licenses.md).

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for upstream Foldkit contribution guidance, dependency-upgrade rules, performance requirements, and commit conventions.

## Local development

Use Node.js 24.21.0 and pnpm 11.5.0. Install the locked dependencies with `pnpm install --frozen-lockfile`, then run `pnpm check` for the repository checks. Start the gallery development server with `pnpm --filter @wsagency/wseffect-gallery exec vite`.

## Distribution and gates

The app and themes packages are distributed as ESM packages. `pnpm check` runs the repository's automated checks, while the size and performance gates use the gallery and the radix2solid bench app. The packed-consumer check exercises the packages from their tarballs outside this workspace.

## License

wseffect is licensed under the MIT License. The repository also retains MIT notices for Radix Themes, Radix Colors, and radix2solid; see [`LICENSE`](LICENSE) for the complete texts. Foldkit is a dependency and is not copied into this repository.

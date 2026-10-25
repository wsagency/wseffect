# Upstream provenance and sync

- Repository: https://github.com/foldkit/foldkit
- Upstream package: `packages/ui`, tag `@foldkit/ui@0.168.0`
- Snapshot commit: `060271955cc2fdd34ddb5e17a64b6662268f79c5`
- Source package `dist` rebuilt at that commit is byte-for-byte identical to the installed published `@foldkit/ui@0.168.0` dist.

## Local divergence

- The package is named `@wsagency/wseffect-foldkit-ui`; upstream subpath exports remain unchanged.
- Workspace dependency versions/build/test scripts are aligned with wseffect. Internal imports target the local core package; the branding step remains part of the build and imports the local Vite plugin so the task resolves without an upstream npm package. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`.
- This file, the provenance README, and the first local changelog entry are maintained by wseffect.

## Sync procedure

1. Select and record an upstream release tag and commit; check the package source and published build provenance.
2. Export only this package's tracked source at the selected commit (no Git history or generated dist), preserving upstream formatting.
3. Reapply only the package-name/import, workspace dependency, and build/test integration changes listed above and record each additional delta here.
4. Rebuild declarations and dist with the pinned wseffect toolchain; run this package's upstream tests as part of `pnpm check`; review source and output diffs.
5. Update this provenance, README, CHANGELOG, licenses/notices, and snapshot hashes.

## Contribution policy

Upstream PRs are optional. Propose a change upstream only when it is generally useful to Foldkit users and fits Foldkit's philosophy; wseffect may maintain its own changes otherwise.

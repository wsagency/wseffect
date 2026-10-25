# Upstream provenance and sync

- Repository: https://github.com/foldkit/foldkit
- Upstream package: `packages/vite-plugin-foldkit`, tag `@foldkit/vite-plugin@0.27.1`
- Snapshot commit: `060271955cc2fdd34ddb5e17a64b6662268f79c5`
- Source package `dist` rebuilt at that commit is byte-for-byte identical to the installed published `@foldkit/vite-plugin@0.27.1` dist.

## Local divergence

- The package is named `@wsagency/wseffect-vite-plugin`; its root export remains unchanged.
- Workspace dependency versions/build/test scripts are aligned with wseffect; internal imports target the local core package. The generated SSR entry imports `handleRequest` from `@wsagency/wseffect-foldkit/experimental/server` so generated code resolves the owned workspace package rather than the upstream npm name. The view-identity transform likewise injects the local `@wsagency/wseffect-foldkit/brand` specifier; this is package-name migration only, with no global key, symbol, virtual-module ID, or shared brand string change. Identity tests use the local import. `Crypto.randomUUIDv4` is invoked as the Effect method required by the workspace Effect version, preserving the intended UUID effect. The package TypeScript config overrides the workspace's `noEmit` default so its build emits the `dist` consumed by workspace dependents. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`.
- This file, the provenance README, and the first local changelog entry are maintained by wseffect.

## Sync procedure

1. Select and record an upstream release tag and commit; check the package source and published build provenance.
2. Export only this package's tracked source at the selected commit (no Git history or generated dist), preserving upstream formatting.
3. Reapply only the package-name/import, workspace dependency, build/test integration, and generated SSR import changes listed above and record each additional delta here.
4. Rebuild declarations and dist with the pinned wseffect toolchain; run this package's upstream tests as part of `pnpm check`; review source and output diffs.
5. Update this provenance, README, CHANGELOG, licenses/notices, and snapshot hashes.

## Contribution policy

Upstream PRs are optional. Propose a change upstream only when it is generally useful to Foldkit users and fits Foldkit's philosophy; wseffect may maintain its own changes otherwise.

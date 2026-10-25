# Upstream provenance and sync

- Repository: https://github.com/foldkit/foldkit
- Upstream package: `packages/vite-plugin-foldkit`, tag `@foldkit/vite-plugin@0.27.1`
- Snapshot commit: `060271955cc2fdd34ddb5e17a64b6662268f79c5`
- Source package `dist` rebuilt at that commit is byte-for-byte identical to the installed published `@foldkit/vite-plugin@0.27.1` dist.

## Local divergence

- The package is named `@wsagency/wseffect-vite-plugin`; its root export remains unchanged. Workspace dependency versions/build/test scripts are aligned with wseffect. Its local `tsconfig.base.json` mirrors upstream compiler options, with separate build and test configs, rather than extending the workspace base; the clean/build scripts preserve upstream's `rimraf` then TypeScript sequence. The root Oxlint config disables only wseffect-specific rules for all three vendored packages.
- Core imports, generated SSR code, and the view-identity transform use `@wsagency/wseffect-foldkit` and its subpaths. The plugin's package-resolution crawl recognizes the owned package-name namespace; singleton dedupe/SSR noExternal, optimizeDeps exclusions, build-token module-id recognition, module-id test fixtures, and diagnostics use the local core/UI/plugin names. `@foldkit/devtools` remains external and unchanged because it is not one of the vendored packages.
- The view-identity transform still excludes only core module IDs and injects the local `@wsagency/wseffect-foldkit/brand` import; no global key, symbol, virtual-module ID, or shared brand string changes. Tests cover the local specifier and local package module IDs.
- Upstream reads `crypto.randomUUIDv4` as an Effect value. Effect 4.0.5 exposes `randomUUIDv4()` as a method returning the Effect, so calling `.pipe` on the method reference is a runtime failure when the default dev-only MCP relay starts (not merely a compile error). The published production dist can run without exercising that relay path. The local source calls the method and preserves the relay UUID effect.
- This file, the provenance README, and the first local changelog entry are maintained by wseffect.

## Sync procedure

1. Select and record an upstream release tag and commit; check the package source and published build provenance.
2. Export only this package's tracked source at the selected commit (no Git history or generated dist), preserving upstream formatting.
3. Reapply only the package-name/import, workspace dependency, build/test integration, and generated SSR import changes listed above and record each additional delta here.
4. Rebuild declarations and dist with the pinned wseffect toolchain; run this package's upstream tests as part of `pnpm check`; review source and output diffs.
5. Update this provenance, README, CHANGELOG, licenses/notices, and snapshot hashes.

## Contribution policy

Upstream PRs are optional. Propose a change upstream only when it is generally useful to Foldkit users and fits Foldkit's philosophy; wseffect may maintain its own changes otherwise.

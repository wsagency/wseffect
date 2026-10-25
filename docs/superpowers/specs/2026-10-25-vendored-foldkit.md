# Vendored Foldkit design

wseffect will own the three Foldkit packages it directly uses as source snapshots, with no upstream Git history:

- `packages/foldkit` → `@wsagency/wseffect-foldkit` (core)
- `packages/foldkit-ui` → `@wsagency/wseffect-foldkit-ui`
- `packages/vite-plugin` → `@wsagency/wseffect-vite-plugin`

Keep the upstream public subpath export maps unchanged. Migrate dependency specifiers only; use wseffect's exact workspace dependency pins (including Effect 4.0.5). Build source to `dist` and declarations with the workspace toolchain in topological order. Integrate each package's upstream unit tests into `pnpm check`; exclude upstream source directories from reformatting while keeping typechecking and tests enabled.

The use inventory found direct usage in app, primitives, themes, gallery, and root tooling dependencies; imports are spread through `packages/*`, `apps/gallery`, tests, and consumer fixtures. Used core subpaths include the package root, `html`, `message`, `runtime`, `schema`, `scene`, and `test/vitest`; UI subpaths include component modules such as `@foldkit/ui/tooltip` and related component exports. The vite plugin is configured by app, gallery, and primitives tooling. Also update generated code/templates, tests/consumer pack-and-fixture coverage, lockfile, and size-gate classification if package-based. Retain only these three vendored packages unless inventory evidence establishes another package is actually used.

Each vendored directory will contain upstream `LICENSE` and `THIRD-PARTY-NOTICES.md`, a provenance README, an owned CHANGELOG whose first entry records `vendored from Foldkit <tag> @ <sha>`, and `UPSTREAM.md` recording repository/tag/commit, local divergence, sync steps, and contribution policy. Upstream code remains unchanged apart from narrowly necessary package/build integration, all of which must be logged in `UPSTREAM.md`.

The source snapshot and version fidelity depend on the upstream commit/tag and published-dist reproduction verdict from the provenance investigation. After that input arrives, vendor the source snapshot and validate the cutover with clean build/check, browser E2E, consumer packing, size gate, and the 236/236 Radix2Solid comparison; do not merge before director approval.

# SDD ledger — plan: docs/superpowers/plans/2026-10-19-wseffect-foundation.md

Workspace: `/home/klukacin/projects/wseffect-wt/lane-c`; branch `lane-c`; start commit `35640c5e4af2018afd97a28a456fefa7668c20b5`.

## Pre-flight scan

| Tasks | Shared interface | Finding |
|---|---|---|
| C1 → C3 | C1 `startServer` / deploy, stats, close used by size measurement | Aligned: byte counts and request counts support first-visit measurement; retention supports build fixtures. |
| C1 → C4 | C1 `startServer` serves production fixture for scenarios | Aligned: C4 uses a server per build and can close handles. |
| C2 ↔ C3 | Same performance hooks in benchmark app and wseffect mini-app | Aligned with frozen `data-perf` hook names; C2 must match row/cell DOM, field types, and 200-menu count per user instruction. |
| C2 → C4 | C4 scenarios drive both benchmark and wseffect apps | Aligned if C2 app exposes the six frozen hooks and routes. |
| C2 → C5 | C5 consumes clean library provenance, app build, and hooks | Aligned with pinned `library-source.json` contract. |
| C3 → C4 | Mini-app fixture and size package used by perf harness | Aligned: routes/hooks provide scenario selectors. |
| C3 → C5 | `measureSize` / `SizeReport` and size baseline used in report | Aligned with frozen size format and artifact IDs. |
| C4 → C5 | `SCENARIOS`, `runScenario`, `abab` consumed by report job | Aligned; C5 will use the same measurement methods for both apps. |
| C1 self-check | `node:http` server, cache policy, fallback, retention, brotli byte accounting | Test cases and implementation scope agree. |
| C2 self-check | clean pinned clone, pack hashing, Solid 2 app, matching hooks | Test and implementation scope agree; do not reuse snapshot packs/numbers. |
| C3 self-check | size limits/growth test, mini-app, `SizeReport` | Interface/test scope agrees. Plan file list omits root package scripts required by its `pnpm gate:size` CLI; see ruling and ISSUES.md. |
| C4 self-check | Event Timing, script duration, ABAB, scenarios | Interface/test scope agrees. Plan file list omits root package scripts required by `pnpm gate:perf`; see ruling and ISSUES.md. |
| C5 self-check | report artifact/table and CI jobs | Consumes C2–C4. Before D1, explicitly target mini-app as current user directed and plan lane table says. |

## Rulings

- Ruling: `task-start`/`task-brief` only match numeric `Task N` headings, but this plan uses `Task C1`–`C5`; create manual task briefs from the read plan sections and record exact BASE commits — cost if wrong: helper-generated brief/ledger tracking is unavailable, but requirements remain verbatim from plan.
- Ruling: Add root `gate:size` and `gate:perf` scripts in `package.json` alongside C3/C4 so the specified `pnpm gate:*` CLIs are executable; the current root manifest has neither script. Smallest compliant fix; cost if wrong: one root script edit may be unnecessary if a different supported invocation exists.
- Ruling: Until D1 provides gallery, C3–C5 build/measure `tools/fixtures/mini-app` and `bench/radix2solid` per the user instruction and plan lane table; perf baseline initially points at the C3 commit containing the fixture — cost if wrong: an initial mini-app comparison may need replacement when D2 lands.
- Ruling: Add and register a minimal activating/client-claiming service worker in the Solid bench app so the shared GATE-S2 `measureSize` path can terminate on controller readiness; plan BENCH-2 requires equivalent sizes but C2 baseline has no SW — cost if wrong: added SW bytes may skew the comparison and would need to be noted.
- Ruling: Extend the C5 report JSON and Markdown summary with verified remaining differences because the user requires them but the planned report shape has no field; cost if wrong: a small schema extension is unnecessary.
- Ruling: Use the user-directed standalone Foldkit/Vite mini-app with `foldkit()`, manual APP-23-style framework code splitting, dynamic lazy pages and the gallery hooks instead of unavailable `wseffect()`; keep gates generic and replace the fixture with the gallery after D lands — cost if wrong: interim size/perf results may differ from the eventual integrated gallery.
- Ruling: Add `--attribute` to C3 and honor `SOURCEMAP=on` in the fixture because D1 invokes that command; print per-source Brotli-q11 `sourcesContent` weights as explicitly indicative, not an additive decomposition of minified output — cost if wrong: the weights may not represent exact generated-code contribution.
- Ruling: Use Vite preview for perf runs because spec GATE-P1 explicitly requires it; retain C1 `startServer` for byte-accounted size measurement — cost if wrong: preview delivery behavior may differ from the C1 test server, but it matches the performance spec.
- Ruling: Add C4 `--self-test` for ten ABAB pairs of identical builds, reporting per-scenario/metric empirical p95 absolute paired deltas and signed observed ranges as diagnostic-only noise bands — cost if wrong: ten pairs yield a coarse rather than stable estimate.
- Ruling: Align the mini-app's virtual rows and controls to the Solid bench contract: six row children, 15 visible rows, text inputs, shared hooks/filter fields, and 200 menus; keep native Foldkit markup and report its residual component difference — cost if wrong: the interim fixture may still differ from Gallery behavior.
- Ruling: Point C5 CI commands to the mini-app until Lane D provides Gallery, then switch the jobs to Gallery and remove the fixture — cost if wrong: interim report values may not represent the eventual Gallery.

## Task status

- Task C1: complete (commits `35640c5..72f373c`, tests: `mise exec node@24.21.0 -- node --test tools/serve/server.test.ts` → 5/5 pass; RED→GREEN observed).
- Baseline evidence: direct `mise exec node@24.21.0 -- pnpm test` failed before any Lane C edits because `packages/app/dist/oxlint-plugin/index.js` was absent; `packages/app/package.json` requires building that export first. Full baseline `mise exec node@24.21.0 -- pnpm check` then built/typechecked/linted, passed 1 Vitest test + 11 Node tests, and reported `repo checks: 0 errors`.
- Task C2: complete (`72f373c..3ef1620`; `pnpm --filter radix2solid-bench test` → 3/3 pass, `build` and `typecheck` pass, `prepare-library.ts --verify` prints `content hashes match`, frozen install passes; pushed to `origin/lane-c`). `--write` used a fresh clone at `383676172abb84b4a1d2e54a087d290437ee8848`; one `pnpm install --no-frozen-lockfile` updated the workspace lock before frozen-install verification.
- Task C3: complete; `node --test tools/gates/size.test.ts` → 5/5 pass; mini-app typecheck passes; `SOURCEMAP=on` build plus `pnpm gate:size --app tools/fixtures/mini-app --attribute` verified.
- Tools typecheck coverage: fixed the server header and Buffer types; added `tools/tsconfig.json` and wired it into root `pnpm typecheck`. RED observed with the new project covering all tools; `pnpm typecheck` now passes.

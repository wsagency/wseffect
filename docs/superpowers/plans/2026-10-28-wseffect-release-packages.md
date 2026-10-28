# wseffect Release Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare, verify, and manually publish all five coordinated wseffect packages as `0.1.0-rc.0` from canonical public GitHub source.

**Architecture:** Package source and release checks remain in the wseffect repository. Deterministic local scripts derive publication order from manifests, inspect the actual packed archives, and gate the manual npm web-2FA publish. GitHub migration and npm publication are explicit operator tasks following code completion and the history-audit gate.

**Tech Stack:** Node 24.21.0, pnpm 11.5.0, TypeScript 7.0.2, Effect 4.0.7, Vitest 5.0.2, npm registry, tar archives.

**Spec:** `docs/superpowers/specs/2026-10-28-wseffect-public-release-design.md`

**Execution target:** the wseffect repository on branch `release/0.1.0-rc.0`.

## Global Constraints

- First coordinated release is `0.1.0-rc.0` of all five packages, published with `--tag next`; `latest` follows each RC until `0.1.0`.
- ALL builds, checks, publishes, and deploys run locally on the owner's Omarchy workstation. No CI workflow or preview is part of this release.
- `effect`, `@effect/platform-browser`, `@effect/platform-node`, `@effect/platform-node-shared`, and `@effect/vitest` repository pins move to exactly `4.0.7`, the latest stable; `4.0.9` does not exist.
- Publish peer ranges for `effect` and `@effect/platform-browser` as `^4.0.5` in all five package manifests.
- For the packed-consumer fixture, write a fixture-local `pnpm-workspace.yaml` whose `minimumReleaseAgeExclude` contains exactly the five local `@wsagency/*` tarballs; do not weaken the root age policy for these file-based fixture packages.
- The root's temporary exact 4.0.7 age exclusions are added only if implementation begins before `2026-10-29T03:00Z`, removing them once that time has passed.
- Publishing operator is klukacin; never store credentials in repo, shell profile, or the release package directory.
- Local publishing carries **no provenance**.
- No Foldkit runtime change; document the Foldkit test changes in `packages/foldkit/UPSTREAM.md`.
- History audit for secrets and internal-only content is a mandatory external gate before any public mirror or npm release.
- Use Node 24.21.0 and pnpm 11.5.0 via `mise exec node@24.21.0 pnpm@11.5.0 -- …`; use `$HOME/.cache/wseffect-work/release-packages/tmp` for temporary files, never `/tmp`.

## Review Focus

1. **Old and new Effect scheduler timing:** adjusted tests must continue to assert the same behavior on 4.0.5 and 4.0.7; pin named assertions in Task 1 tests.
2. **Consumer peer resolution at both supported Effect versions:** fresh packed consumer installs must resolve one Effect copy and build on both 4.0.5 and 4.0.7; pin in Task 2.
3. **Incorrect or cyclic package dependency graph:** graph output must derive from current manifests and reject cycles/missing internal nodes; pin in Task 7.
4. **Packed metadata and attribution missing despite source files being present:** inspect actual tarball manifests and listings for required documents/notices and forbidden artifacts; pin in Task 8.
5. **Unreviewed public history or partial npm publication:** history report must pass before GitHub push; after first publish failure stop and verify each package/tag before continuing; pin in Tasks 11–12.

---

## File Structure

| Files | Responsibility |
|---|---|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `apps/gallery/package.json`, package manifests | Exact Effect pins and coordinated publish metadata/peer ranges. |
| `packages/foldkit/src/html/onMount.test.ts`, `packages/foldkit/src/runtime/mountViewState.test.ts`, `packages/foldkit/UPSTREAM.md`, `packages/foldkit-ui/src/listboxSelect/selectPosition.test.ts` | Diagnosis-backed test-only adjustments and provenance record. |
| `tests/consumer/run.ts`, `tests/consumer/run.test.ts`, `tests/consumer/fixtures/*` | Independent packed-consumer install/build for Effect 4.0.5 and 4.0.7. |
| `scripts/check-repo.ts`, `scripts/check-repo.test.ts` | Release-aware manifest guard. |
| `scripts/release/*.ts`, `scripts/release/*.test.ts` | Manifest graph, archive inspection, preflight and registry verification. |
| `packages/{foldkit,foldkit-ui,vite-plugin}/README.md`, root `README.md`, package `UPSTREAM.md`, package notices, `packages/*/CHANGELOG.md` | Consumer guidance, attribution, RC changelogs. |
| `docs/RELEASING.md` | Exact manual release checklist and recovery rules. |
| External operations | GitHub migration and npm publication; no code is allowed to automate or bypass human gates. |

## Part A — Code and documentation tasks

### Task 1: Apply Effect 4.0.7 and diagnosed test-only fixes

**Files:**
- Modify: root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/gallery/package.json`, manifests for all packages.
- Modify: `packages/foldkit/src/html/onMount.test.ts`, `packages/foldkit/src/runtime/mountViewState.test.ts`, `packages/foldkit-ui/src/listboxSelect/selectPosition.test.ts`, `packages/foldkit/UPSTREAM.md`, root `README.md`, `packages/app/README.md`.
- Test: existing Foldkit OnMount/runtime tests and Foldkit UI `selectPosition.test.ts`.

**Interfaces:**
- Consumes: diagnosed behavior and exact diff in `$HOME/.cache/wseffect-work/effect-diagnosis/REPORT.md` and `fix.diff`.
- Produces: all five Effect package pins exactly 4.0.7; test-only fixes, no runtime-source changes.

- [ ] **Step 1: Write/adjust focused test assertions** so OnMount opts into `acquireRelease(..., { interruptible: true })`; paused observer assertion uses `vi.waitFor`; auto-resume fixture exposes `subscriptionReady` only after `PubSub.subscribe` acquires and waits for it before publishing; UI select-position helper awaits `Stream.runHead` and asserts observer attachment.
- [ ] **Step 2: Run targeted tests before implementation/pin change.** Run `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm --filter @wsagency/wseffect-foldkit exec vitest run src/html/onMount.test.ts src/runtime/mountViewState.test.ts` and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm --filter @wsagency/wseffect-foldkit-ui exec vitest run src/listboxSelect/selectPosition.test.ts`. Expected: diagnosis reproduction on 4.0.7 or the focused tests expose missing synchronization before edits.
- [ ] **Step 3: Set exact pins** for `effect`, `@effect/platform-browser`, `@effect/platform-node`, `@effect/platform-node-shared`, and `@effect/vitest` to `4.0.7` throughout workspace manifests/overrides/lock; update root and app README Effect-version statements. Add exact root age exclusions only if implementation begins before `2026-10-29T03:00Z`; remove them if present after then. Add the Foldkit test-change entry to `packages/foldkit/UPSTREAM.md`.
- [ ] **Step 4: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm install --no-frozen-lockfile` then the two focused commands from Step 2. Expected: targeted suites pass and Foldkit runtime production sources are unchanged.
- [ ] **Step 5: Commit** `git add package.json pnpm-workspace.yaml pnpm-lock.yaml apps/gallery/package.json packages/foldkit packages/foldkit-ui/src/listboxSelect/selectPosition.test.ts packages/app/README.md README.md && git commit -m "test: align Effect 4.0.7 lifecycle fixtures"`.

### Task 2: Set Effect peer ranges and verify packed consumers at 4.0.5/4.0.7

**Files:**
- Modify: all five `packages/*/package.json` manifests and `tests/consumer/run.ts`.
- Create/modify: `tests/consumer/fixtures/effect-4.0.5/`, `tests/consumer/fixtures/effect-4.0.7/`, `tests/consumer/effectVersions.test.ts`.

**Interfaces:**
- Consumes: Task 1's 4.0.7 producer builds.
- Produces: a consumer matrix that accepts both tested versions while every package advertises `^4.0.5` for both `effect` and `@effect/platform-browser`.

- [ ] **Step 1: Write failing consumer-matrix tests** `acceptsEffect405`, `acceptsEffect407`, `packsOneEffectCopy`, and `buildsEveryPackageSetAtBothVersions`; assert package metadata peer values exactly `^4.0.5` and fixture lockfiles contain one Effect version.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test tests/consumer/effectVersions.test.ts`. Expected: FAIL while manifests/matrix are not updated.
- [ ] **Step 3: Set peers in all five manifests** and make the fixture runner install the same packed package set twice, once with Effect/platform-browser 4.0.5 and once with 4.0.7. Each fixture owns its `pnpm-workspace.yaml`; `minimumReleaseAgeExclude` lists exactly the five local `@wsagency/*` tarballs, not any Effect version.
- [ ] **Step 4: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test tests/consumer/effectVersions.test.ts && mise exec node@24.21.0 pnpm@11.5.0 -- pnpm test:consumer`. Expected: both fixtures install/build and packed-consumer gate reports `packed consumer: all checks passed`.
- [ ] **Step 5: Commit** `git add packages tests/consumer && git commit -m "test: verify Effect peer range in packed consumers"`.

### Task 3: Make `check-repo` release-aware

**Files:**
- Modify: `scripts/check-repo.ts`, `scripts/check-repo.test.ts`.

**Interfaces:**
- Consumes: current manifest model and release tag/version `0.1.0-rc.0`.
- Produces: exported `checkManifest(manifest, path, releaseVersion?)` behavior accepting development version where appropriate and validating coordinated release metadata in release mode.

- [ ] **Step 1: Write failing tests** `acceptsDevelopmentVersionOutsideRelease`, `acceptsOnlySamePreparedRcForRelease`, `rejectsVersionSkew`, `requiresPublicGitHubRepositoryAndHomepage`, `requiresNextTagAndPublicAccess`, and `requiresPublicPackageMetadata`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/check-repo.test.ts`. Expected: failure because the current guard requires `0.0.0` and internal Gitea URLs.
- [ ] **Step 3: Implement release-aware checks** without weakening existing workspace/type/exports checks; compare all five package versions and required canonical URLs/metadata against the explicit prepared RC version.
- [ ] **Step 4: Run** the command from Step 2 and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check:repo`. Expected: unit tests and current development repository guard pass.
- [ ] **Step 5: Commit** `git add scripts/check-repo.ts scripts/check-repo.test.ts && git commit -m "build: validate coordinated public releases"`.

### Task 4: Add canonical npm metadata

**Files:**
- Modify: `packages/{app,themes,foldkit,foldkit-ui,vite-plugin}/package.json`, `scripts/check-repo.ts`, `scripts/check-repo.test.ts`.

**Interfaces:**
- Consumes: Task 3 release-aware assertions.
- Produces: five manifests with canonical GitHub repository, package directory, homepage, bugs, description, keywords, author/maintainer credit, `engines`, `private:false`, public registry/access and `tag:next`.

- [ ] **Step 1: Add failing manifest fixtures** testing `homepage=https://wseffect.com`, repository `git+https://github.com/wsagency/wseffect.git`, package-specific `directory`, `bugs=https://github.com/wsagency/wseffect/issues`, description/keywords/author/engines, `private:false`, and `publishConfig.tag=next`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/check-repo.test.ts`. Expected: new public-metadata assertions fail.
- [ ] **Step 3: Update five manifests** using the verified runtime floors and preserve upstream author attribution while stating WS Agency maintenance/distribution; ensure registry and public access values match the spec.
- [ ] **Step 4: Run** test and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check:repo`. Expected: all five manifests satisfy exact metadata assertions.
- [ ] **Step 5: Commit** `git add packages/*/package.json scripts/check-repo.ts scripts/check-repo.test.ts && git commit -m "chore: add public package metadata"`.

### Task 5: Write consumer READMEs and root install guidance

**Files:**
- Modify: `packages/foldkit/README.md`, `packages/foldkit-ui/README.md`, `packages/vite-plugin/README.md`, root `README.md`.
- Test: README assertions in existing package tests or `tests/consumer/readmes.test.ts`.

**Interfaces:**
- Consumes: names, peers and supported APIs from package manifests and `docs/superpowers/specs/2026-10-28-wseffect-public-release-design.md`.
- Produces: copy-pasteable RC and stable install instructions and a root consumer-oriented package install section.

- [ ] **Step 1: Write failing README tests** asserting each landing page has correct scoped package spellings, `@next` RC install, stable install form, required peer/dependency instructions and real import example; root README has all five package roles, public docs/issues links and no tarball-only instructions.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test tests/consumer/readmes.test.ts`. Expected: test fails on missing user-facing content.
- [ ] **Step 3: Author concise package landing pages** including supported runtime, use cases, exact install/peer setup, API entry points, full-doc links and correct upstream attribution. Update root install path and remove stale internal-host references.
- [ ] **Step 4: Run** the README test. Expected: all five package/root install instructions and scoped imports match the manifests.
- [ ] **Step 5: Commit** `git add README.md packages/foldkit/README.md packages/foldkit-ui/README.md packages/vite-plugin/README.md tests/consumer/readmes.test.ts && git commit -m "docs: add consumer package quickstarts"`.

### Task 6: Ship UPSTREAM files and per-package WS Agency notices

**Files:**
- Modify: `packages/foldkit/package.json`, `packages/foldkit-ui/package.json`, `packages/vite-plugin/package.json`; all five package notices/license files as needed.
- Create: package-level `WS-AGENCY-NOTICE.md` in all five package directories; `tests/consumer/packaging.test.ts`.

**Interfaces:**
- Consumes: Tasks 4–5 metadata and attribution.
- Produces: every tarball carries per-package WS Agency trademark/non-affiliation notice and every linked `UPSTREAM.md` is present.

- [ ] **Step 1: Write failing package tests** `shipsUpstreamForFoldkitUiAndPlugin`, `shipsAgencyNoticeForEveryPackage`, `noticeExcludesBrandRightsFromMit`, and `keepsThirdPartyNotices` against actual pack file lists.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test tests/consumer/packaging.test.ts`. Expected: fail because files allowlists/notices are incomplete.
- [ ] **Step 3: Add `UPSTREAM.md` to the Foldkit, UI and plugin allowlists** and put the WS Agency trademark notice into each package's `files`; preserve full upstream LICENSE and `THIRD-PARTY-NOTICES.md` texts.
- [ ] **Step 4: Run** test and pack one package from each category. Expected: extracted archives contain all notices and valid README links.
- [ ] **Step 5: Commit** `git add packages tests/consumer/packaging.test.ts && git commit -m "docs: ship package provenance and brand notices"`.

### Task 7: Derive package release order from manifests

**Files:**
- Create: `scripts/release/graph.ts`, `scripts/release/graph.test.ts`.
- Modify: root `package.json` only to expose the graph command if needed.

**Interfaces:**
- Produces: `releaseOrder(manifests: ReadonlyArray<PackageManifest>): { order: string[]; edges: Array<{ from: string; to: string }> }`, with dependency edges meaning dependency before dependent.
- Expected current order: Foldkit → Foldkit UI → Themes → Vite plugin → app; sibling ordering may be stable by package name where no graph dependency dictates it.

- [ ] **Step 1: Write failing tests** `ordersDependencyBeforeConsumer`, `includesPeerAndDependencyEdges`, `rejectsMissingInternalPackage`, `rejectsCycle`, and `stableOrdersIndependentPackages`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/release/graph.test.ts`. Expected: FAIL because module does not exist.
- [ ] **Step 3: Implement `releaseOrder`** using topological sorting of the five package manifests, with deterministic tie-breaking and explicit cycle/missing-node errors.
- [ ] **Step 4: Run** the test and `mise exec node@24.21.0 pnpm@11.5.0 -- node scripts/release/graph.ts`. Expected: printed edges/order match the actual manifest graph.
- [ ] **Step 5: Commit** `git add scripts/release/graph.ts scripts/release/graph.test.ts package.json && git commit -m "build: derive npm release order from manifests"`.

### Task 8: Inspect actual npm tarballs and reject hygiene regressions

**Files:**
- Create: `scripts/release/inspect.ts`, `scripts/release/inspect.test.ts`.
- Modify: `tests/consumer/packaging.test.ts` if checks are shared.

**Interfaces:**
- Consumes: Task 7 order and package archives.
- Produces: `inspectArchive({ archivePath, expectedName, version, repositoryUrl }): Promise<InspectionResult>` reporting manifest, export-target, file-content and checksum errors.

- [ ] **Step 1: Write fixture archive tests** `checksPackedManifestAndWorkspaceRewrite`, `checksExportTargetsAndRequiredDocs`, `rejectsForbiddenWorkspaceFileLinkSpecs`, `rejectsMissingNoticesOrUPSTREAM`, `rejectsUnexportedTestArtifactsAndMaps`, `allowsExportedFoldkitTestUtilities`, and `rejectsSecretOrHostPathMarkers`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/release/inspect.test.ts`. Expected: failures until archive inspector exists.
- [ ] **Step 3: Implement archive extraction/inspection** against `package/package.json` and `tar -tzf`; verify every export target exists, packed internal workspace references equal the coordinated RC, no secret/host paths occur, required README/license/changelog/notices/UPSTREAM files ship, and only intentional exported tests/maps remain. Hash each archive.
- [ ] **Step 4: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/release/inspect.test.ts && mise exec node@24.21.0 pnpm@11.5.0 -- pnpm test:consumer`. Expected: fixtures catch each mutation and actual packed consumer passes.
- [ ] **Step 5: Commit** `git add scripts/release/inspect.ts scripts/release/inspect.test.ts tests/consumer && git commit -m "test: inspect npm release tarballs"`.

### Task 9: Add local preflight and registry-verification commands

**Files:**
- Create: `scripts/release/preflight.ts`, `scripts/release/verify-registry.ts`, `scripts/release/preflight.test.ts`, `scripts/release/verify-registry.test.ts`.
- Modify: root `package.json` release scripts.

**Interfaces:**
- Consumes: Tasks 3, 7 and 8 guard/graph/archive APIs.
- Produces: `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0`, local-only `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:pack`, and read-only `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:verify -- --version 0.1.0-rc.0`.

- [ ] **Step 1: Write failing tests** for clean `main`/origin equality, clean tree including untracked paths, coordinated version, all checks/artifacts required, per-package registry version/integrity/tags verification, registry delay retry and wrong tag rejection.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/release/preflight.test.ts scripts/release/verify-registry.test.ts`. Expected: FAIL before command implementations.
- [ ] **Step 3: Implement preflight/pack/verify scripts**; preflight runs local checks and graph, packs outside Git repo into the configured cache, calls Task 8 inspector, and dry-runs every tarball. Registry verify is read-only and confirms all five exact versions, integrity values and both `next`/`latest` tags without treating CLI output as proof.
- [ ] **Step 4: Run** the test command and `TMPDIR="$HOME/.cache/wseffect-work/release-packages/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0`. Expected: actionable preflight report; registry fixture tests pass.
- [ ] **Step 5: Commit** `git add scripts/release package.json && git commit -m "build: add local npm release preflight"`.

### Task 10: Prepare RC.0 version, changelogs, and release runbook

**Files:**
- Modify: five `packages/*/package.json`, five `packages/*/CHANGELOG.md`, `docs/RELEASING.md`, `scripts/check-repo.test.ts` fixtures.

**Interfaces:**
- Consumes: Tasks 1–9 and final peer/metadata decisions.
- Produces: all five manifests at `0.1.0-rc.0`, changelogs and a manual runbook with precise commands/stop conditions.

- [ ] **Step 1: Write failing release-manifest fixture** `acceptsOnlyCoordinatedRc0` and changelog assertions for all five packages.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/check-repo.test.ts`. Expected: RC0 guard and changelog assertions fail before version bump.
- [ ] **Step 3: Set all five versions** to `0.1.0-rc.0`; ensure `publishConfig` has public registry/access/`tag:next`; add RC changelog notes; write `docs/RELEASING.md` for the tag, fresh detached worktree, frozen install/check/build, graph-derived sequential pack/publish, live npm web 2FA, explicit `dist-tag add ... latest` after every RC, registry propagation checks, temporary npmrc cleanup, no provenance, recovery on partial publish, and no unpublish-by-reflex.
- [ ] **Step 4: Run** manifest tests, `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check`, and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0`. Expected: all release manifests align and preflight passes after all Part A changes.
- [ ] **Step 5: Commit** `git add packages docs/RELEASING.md scripts/check-repo.test.ts && git commit -m "docs: prepare coordinated 0.1.0-rc.0 release"`.

### Task 11: Require history audit before public release

**Files:**
- Create: `scripts/release/history-gate.ts`, `scripts/release/history-gate.test.ts`.
- Modify: `scripts/release/preflight.ts`, `scripts/release/preflight.test.ts`, `docs/RELEASING.md`.

**Interfaces:**
- Consumes: external report `$HOME/.cache/wseffect-work/history-audit/REPORT.md` produced by the independent history audit.
- Produces: preflight that requires the external report and explicit `--history-audit-reviewed` owner confirmation that the audit covered every ref, secret, and internal-only content; no unreviewed public migration/tag/publish can proceed.

- [ ] **Step 1: Write failing tests** `rejectsMissingReport`, `rejectsMissingOwnerConfirmation`, `acceptsOwnerConfirmedReport`, and `doesNotCopyReportIntoRepository`; verify the release CLI does not set approval by default.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/release/history-gate.test.ts`. Expected: FAIL before gate implementation.
- [ ] **Step 3: Implement a manual-confirmation history gate** with signature `checkHistoryAudit({ reportPath, ownerApprovedClean }: { reportPath: string; ownerApprovedClean: boolean }): Promise<{ ok: boolean; reason?: string }>`; preflight supplies `ownerApprovedClean` only when explicit `--history-audit-reviewed` is present. It fails if the report is missing/empty or owner approval is false. Before confirming, the owner reads the report and verifies it covers all refs, secrets and internal-only content; do not invent a parser/schema or infer success from file presence. Keep report/raw audit outside Git.
- [ ] **Step 4: Run** tests and `TMPDIR="$HOME/.cache/wseffect-work/release-packages/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0`. Expected: it explicitly refuses while the audit is absent/unapproved; only after a human reviews the completed report may they rerun with `--history-audit-reviewed`.
- [ ] **Step 5: Commit** `git add scripts/release docs/RELEASING.md && git commit -m "build: gate public release on history audit"`.

## Part B — Operational checklists

### Task 12: Create and verify canonical GitHub mirror

**Files:** no repository code files; record verification evidence in the release operator's local cache, not committed secrets/artifacts.

**Interfaces:**
- Consumes: Task 11's passing history audit; owner approval; Gitea source and empty GitHub destination.
- Produces: verified `wsagency/wseffect` refs/settings and archived Gitea repo.

**DevOps action items — GitHub**

1. **Actor:** owner. **Target:** GitHub org `wsagency`, empty public repo `wsagency/wseffect`. **Command:** create empty repository with no README/license. **Mode:** write. **Approval gate:** owner approval. **Verification:** public URL, owner and empty refs confirmed. **Rollback:** delete only before history import if the wrong repo/visibility was selected.
2. **Actor:** owner/dev with approved push rights. **Target:** Gitea `ws-agency/wseffect` → GitHub `wsagency/wseffect`. **Command:** `git clone --bare git@git.wsagency.io:ws-agency/wseffect.git "$HOME/.cache/wseffect-work/release-packages/wseffect.git"` then `git -C "$HOME/.cache/wseffect-work/release-packages/wseffect.git" push --mirror git@github.com:wsagency/wseffect.git`. **Mode:** read for audit, write for mirror. **Approval gate:** report `$HOME/.cache/wseffect-work/history-audit/REPORT.md` reviewed clean and owner-approved. **Verification:** compare every branch/tag name and SHA, including `main` `121f9c8`; run public clone/fetch. **Rollback:** stop before write if any finding; repair incomplete refs without deleting valid imported history.
3. **Actor:** owner/repo admin. **Target:** GitHub `wsagency/wseffect` settings and local remotes/source URLs. **Command:** apply main ruleset, owner-only `v*` tag ruleset, disable Actions, enable secret scanning/push protection/private vulnerability reporting, disable Wiki, set description/homepage/MIT; update `origin` and tracked source URLs. **Mode:** write. **Approval gate:** verified mirror. **Verification:** inspect settings, `git remote -v`, public clone, URL inventory. **Rollback:** correct mistaken settings/remotes without reopening two writable canonicals.
4. **Actor:** owner/Gitea admin. **Target:** Gitea `ws-agency/wseffect`. **Command:** archive after GitHub ref verification. **Mode:** write. **Approval gate:** owner approval after full ref comparison. **Verification:** archived/read-only repo and history remains browsable. **Rollback:** unarchive only to resolve migration failure; retain GitHub as canonical after cutover.

1. **Actor:** klukacin. **Target:** registry.npmjs.org five names `@wsagency/wseffect-app`, `@wsagency/wseffect-themes`, `@wsagency/wseffect-foldkit`, `@wsagency/wseffect-foldkit-ui`, `@wsagency/wseffect-vite-plugin`. **Command:** `for package in @wsagency/wseffect-app @wsagency/wseffect-themes @wsagency/wseffect-foldkit @wsagency/wseffect-foldkit-ui @wsagency/wseffect-vite-plugin; do mise exec node@24.21.0 pnpm@11.5.0 -- npm view "$package" name; done`; for each archive path printed by `release:pack`, run `mise exec node@24.21.0 pnpm@11.5.0 -- npm publish --dry-run "$archive" --access public --tag next`. **Mode:** read/dry-run. **Approval gate:** separate package-name query approval; release tag and all checks approved. **Verification:** names available, dry-run accepts every package archive. **Rollback:** none for read-only/dry-run; fix source/archive before publishing.
2. **Actor:** klukacin. **Target:** five npm packages in computed dependency order. **Command:** temporary userconfig; `mise exec node@24.21.0 pnpm@11.5.0 -- npm login --auth-type=web`; for each graph-ordered `{ package, archive }` emitted by `release:pack`, run `mise exec node@24.21.0 pnpm@11.5.0 -- npm publish "$archive" --access public --tag next --registry=https://registry.npmjs.org/`, then `mise exec node@24.21.0 pnpm@11.5.0 -- npm dist-tag add "$package@0.1.0-rc.0" latest`. **Mode:** write. **Approval gate:** live owner web 2FA on every publish/dist-tag operation. **Verification:** query version/integrity/`next`/`latest` after registry propagation. **Rollback:** stop at first inconsistency; do not unpublish reflexively; release a corrected higher RC and move tags deliberately.
3. **Actor:** klukacin. **Target:** npm temp userconfig and release cache. **Command:** logout, remove temp config, retain only archive hashes and registry evidence outside Git. **Mode:** write/local cleanup. **Approval gate:** all five versions/tags verified. **Verification:** no auth file remains and registry evidence records all packages. **Rollback:** if cleanup fails, revoke credentials immediately and stop further release work.

- [ ] **Step 1: Verify audit report** at `$HOME/.cache/wseffect-work/history-audit/REPORT.md`; require a clean result for every branch/tag before public write. Run `test -s "$HOME/.cache/wseffect-work/history-audit/REPORT.md"` and the release gate. Expected: no push authorized unless report passes.
- [ ] **Step 2: Owner creates** empty public GitHub repo `wsagency/wseffect`; from the bare Gitea clone, run `git -C "$HOME/.cache/wseffect-work/release-packages/wseffect.git" push --mirror git@github.com:wsagency/wseffect.git`. This write requires owner approval after history audit.
- [ ] **Step 3: Verify refs and settings.** Compare branch/tag names and SHAs on both forges, including main `121f9c8`; set default main; configure main ruleset blocking force push/deletion, `v*` owner-only tag ruleset, Actions disabled, secret scanning/push protection/private vulnerability reporting enabled, Wiki disabled, description/homepage/MIT license. Verify public clone/fetch.
- [ ] **Step 4: Update local origin and source URLs**, then archive Gitea `ws-agency/wseffect` only after all refs match. Verify Gitea is read-only and public GitHub remains canonical. Do not maintain two writable copies.
- [ ] **Step 5: Record exact verification commands and results** in local release record; the commit-to-commit ref map contains all refs and GitHub clone succeeds. There is no source code commit for these external operations.

### Task 13: Tag, pack, inspect, and manually publish RC.0

**Files:** no credential-bearing files; release records and archives remain under `$HOME/.cache/wseffect-work/release-packages/` outside Git.

**Interfaces:**
- Consumes: Tasks 1–12; verified canonical public GitHub `main`; owner-approved release tag; local npm login with live klukacin 2FA.
- Produces: five public `0.1.0-rc.0` versions with `next` and `latest` tags, registry integrity evidence, and cleaned temporary npm credentials.

**DevOps action items — GitHub tag and npm RC.0**

1. **Actor:** owner. **Target:** canonical GitHub `wsagency/wseffect` `origin/main`. **Command:** create annotated `v0.1.0-rc.0`; sign if owner key is available, otherwise leave annotated unsigned. **Mode:** write. **Approval gate:** history gate passed and package source/checks reviewed. **Verification:** `git verify-tag` when signed, and `git rev-parse 'v0.1.0-rc.0^{}'` equals the audited main SHA. **Rollback:** do not retag a published release; if tag points to wrong source before publishing, delete/recreate only with owner approval.
2. **Actor:** klukacin. **Target:** fresh tagged worktree and five package archives. **Command:** frozen install/build/check, graph-derived pack and archive inspection, `mise exec node@24.21.0 pnpm@11.5.0 -- npm publish --dry-run` for each archive. **Mode:** local read/build/archive writes. **Approval gate:** tagged source SHA is clean/audited; full checks green. **Verification:** all five inspectors and dry-runs pass with checksums. **Rollback:** delete local archives and correct source before registry writes.
3. **Actor:** klukacin. **Target:** npm five package versions/dist-tags. **Command:** for each graph-ordered `{ package, archive }` emitted by `release:pack`, manually publish under `next` with web 2FA and run `mise exec node@24.21.0 pnpm@11.5.0 -- npm dist-tag add "$package@0.1.0-rc.0" latest`. **Mode:** write. **Approval gate:** live npm web 2FA. **Verification:** run `mise exec node@24.21.0 pnpm@11.5.0 -- npm view "$package@0.1.0-rc.0" name version dist.integrity dist-tags --json` for each package; values match archive and both tags. **Rollback:** stop on first failure; publish corrective higher RC and move tags only after explicit review.

- [ ] **Step 1: Verify** report `$HOME/.cache/wseffect-work/history-audit/REPORT.md`, owner-review every ref/secrets/internal-only finding, then run `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0 --history-audit-reviewed` on clean `origin/main`; no tag/mirror/publish if it fails.
- [ ] **Step 2: Create annotated `v0.1.0-rc.0` tag** on verified `origin/main`; sign if the owner's signing key is available, otherwise retain annotated unsigned tag. Verify tag resolves to audited main SHA.
- [ ] **Step 3: In a fresh detached tagged worktree**, run frozen install, `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check`, `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm release:preflight -- --version 0.1.0-rc.0 --history-audit-reviewed`; pack and inspect all five archives in computed order; run `mise exec node@24.21.0 pnpm@11.5.0 -- npm publish --dry-run "$archive"` for each. Expected: audit report/owner confirmation is present; all checks, inspectors and dry-runs pass. Copy final archives to `$HOME/.cache/wseffect-work/release-packages/tmp/`; create isolated npm userconfig; log in with `mise exec node@24.21.0 pnpm@11.5.0 -- npm login --auth-type=web` and obtain live klukacin web 2FA approval. For each graph-ordered `{ package, archive }` emitted by `release:pack`, publish its archive with `mise exec node@24.21.0 pnpm@11.5.0 -- npm publish "$archive" --access public --tag next --registry=https://registry.npmjs.org/`, then run `mise exec node@24.21.0 pnpm@11.5.0 -- npm dist-tag add "$package@0.1.0-rc.0" latest`. Stop at the first error; do not publish dependents after a failure.
- [ ] **Step 4: Verify** all five using `for package in @wsagency/wseffect-foldkit @wsagency/wseffect-foldkit-ui @wsagency/wseffect-themes @wsagency/wseffect-vite-plugin @wsagency/wseffect-app; do mise exec node@24.21.0 pnpm@11.5.0 -- npm view "$package@0.1.0-rc.0" name version dist.integrity dist-tags --json; done`. Expected: registry versions/integrities match archives and `next`/`latest` both resolve to RC.0.
- [ ] **Step 5: Logout and remove temp npm config**, retain hashes/verification outputs, and commit only non-secret release documentation/results. No npm rollback/unpublish unless explicitly approved; recovery is a corrected higher RC and deliberate dist-tag movement.

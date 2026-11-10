# wseffect RC.1 Public Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five coordinated RC.1 packages and the complete previously specified public documentation website and two starters.

**Architecture:** Preserve existing package APIs and release safeguards. Build the separate Astro website only against verified published packages; reuse the complete existing website plan rather than replace it with a reduced launch.

**Tech Stack:** Node 24.21.0, pnpm 11.5.0, Effect 4.0.7; website tooling and exact versions from the inherited website plan, subject to registry availability verification.

**Spec:** `../specs/2026-11-10-wseffect-rc1-continuation-design.md`, incorporating `../specs/2026-10-28-wseffect-public-release-design.md`.

## Global Constraints

- All five package versions and website/starter pins: `0.1.0-rc.1`. Both npm `next` and `latest` point at this release.
- Repository Effect pins exactly `4.0.7`; public Effect/browser peers `^4.0.5`.
- Use `mise exec node@24.21.0 pnpm@11.5.0 --` for product commands. Temporary artifacts live under `$HOME/.cache/wseffect-work`, never `/tmp`.
- Preserve the original dirty checkout, RC.0 tag and release record. Never relax clean-main, owner history-review or registry verification gates.
- Website separate at `/home/klukacin/projects/wseffect-web`, exact registry packages only. No workspace/link/file/tarball fallback or unshipped source input to builds.
- No Actions, CI, previews, provenance claim or performance gate. Secrets never in chat/source; Cloudflare credentials only reach Wrangler.
- Editing agents skip build/lint/tests/formatters mid-flight. The integration owner runs checks once after each integrated change. Parallel agents have disjoint ownership.

## Review Focus

1. Internal package skew: existing graph/manifest/inspection tests plus `check-repo --release-version` in Task 3.
2. Accidentally claiming RC.0 published or audit approved: Task 2 runbook preserves evidence distinctions; Task 4 requires owner signoff and registry integrity.
3. Missing API pages: inherited website Task 4 inventory rejects unmapped published exports.
4. Search violates JS-free docs: explicit search route; inherited Tasks 8/12 check static docs and interactive search separately.
5. Stale deploy/asset failures: inherited Tasks 9–11 cover HEAD/Accept/404/cache, retention collision/limits and dirty/stale/lock rejection.

## Tasks

### Task 1: Coordinated package metadata

**Files:** `packages/{foldkit,foldkit-ui,themes,vite-plugin,app}/package.json`; current release dependency references in consumer fixture manifests if present. Parent owns `pnpm-lock.yaml` regeneration.
**Produces:** five aligned RC.1 manifests and internal references; unchanged public APIs and Effect peer contract.

- [ ] Read manifests and existing graph/version guard before editing; replace current RC.0 release versions with RC.1, preserving historical fixture cases intended to test arbitrary versions.
- [ ] Report touched files and any dependency-reference consumer needing migration; do not edit docs or scripts owned by another task.
- [ ] Parent regenerates lock only if required and executes Task 3 checks. Existing contract tests cover this metadata change; no source-text tests.

### Task 2: Release documentation and changelogs (parallel with Task 1)

**Files:** five package `CHANGELOG.md` and `README.md` files; root `README.md` and `docs/RELEASING.md`.
**Produces:** current RC.1 operator commands and truthful per-package notes, retaining historical RC.0 entries.

- [ ] Update current install/release commands to RC.1; prepend concise package-specific release notes for coordinated public-launch preparation without inventing runtime changes.
- [ ] Preserve prior history, all safety gates, explicit latest alignment, graph-derived order and live web 2FA.
- [ ] Use version-specific archive directories and records so RC.1 never overwrites RC.0 artifacts. Do not claim publication or deployment happened.
- [ ] Parent reviews docs against Task 1 metadata and the existing script CLI; release checks run in Task 3.

### Task 3: Integrate, verify and review package candidate

**Files:** `pnpm-lock.yaml` if needed; defects only in affected contract files.
**Consumes:** Tasks 1/2. **Produces:** reviewed candidate with actual check evidence.

- [ ] Install using pinned tools and frozen lockfile; if metadata requires lock update, regenerate once then frozen install.
- [ ] Run `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check` and `mise exec node@24.21.0 pnpm@11.5.0 -- node scripts/check-repo.ts --release-version 0.1.0-rc.1`; all stages must pass.
- [ ] Dispatch independent spec/code review of Tasks 1/2. Fix concrete findings and rerun only impacted checks.
- [ ] Present verified candidate for authorized main integration; do not weaken preflight to accept the feature branch.

### Task 4: Publish verified registry release

**Files:** external RC.1 release records/archives; no credentials in repository.
**Consumes:** reviewed candidate on canonical main; owner history-audit signoff. **Produces:** five publicly verified RC.1 packages.

- [ ] Obtain owner review of the existing external history audit; never infer approval from its existence.
- [ ] Execute `docs/RELEASING.md` preflight, annotated RC.1 tag, fresh detached build/pack/inspection/dry runs with new version-specific paths. Retain checksums.
- [ ] Secure live npm web login/2FA; publish sequentially in computed order, advancing latest per package; stop on first inconsistency.
- [ ] Run `release:verify -- --version 0.1.0-rc.1 --record <RC.1 record>`; all five versions, integrity and both tags must match before Task 5 dependency installation.

### Task 5: Complete website and starters with subagents

**Files/interfaces/steps:** all Tasks 1–12 of `2026-10-28-wseffect-web.md` are incorporated in full, with RC.1 replacing launch RC.0 pins. That plan remains the detailed implementation source.

- [ ] Verify planned registry tooling versions exist, then establish site root/config through inherited Task 1. Do not substitute versions without resolving availability.
- [ ] Execute independent slices: renderer/shared-root demos (Tasks 2–3); export inventory/Props (Tasks 4–5); Worker/retention (Tasks 9–10). Assign root config/package scripts to one integrator; workers propose shared edits rather than race.
- [ ] After published inventory interfaces exist, execute complete authored/generated content (Task 6), both independent starter downloads (Task 7), and search/metadata/Markdown (Task 8). Search has its own interactive route, static docs navigation only links to it.
- [ ] Integrate safeguarded deploy and ordered checks (Tasks 11–12); check all routes, snippets, isolated registry starter builds, three browser engines and axe. Review each integrated slice, fix observed defects, and record actual evidence.
- [ ] Do not create incidental scaffold/default/source-text tests required by older plan wording; use behavioral checks proving the stated contract. Never substitute generic reference placeholders for complete documentation.

### Task 6: Public site and production acceptance

**Files/interfaces/steps:** inherited website Tasks 13–15, all original DevOps action lists, and external release evidence.

- [ ] Push verified complete site to existing `wsagency/wseffect-web` after authorization; configure and verify required settings, no Actions.
- [ ] Obtain separate Cloudflare bootstrap/DNS/deploy authorization and securely delivered scoped credential; execute the original DevOps contract and records.
- [ ] Run guarded clean-main deploy, live HTTP/redirect/Markdown/retained-asset smoke checks, and fresh-directory acceptance using both real downloaded starters.
- [ ] Record public package/tag/integrity, source SHA, Worker version, smoke results and clean consumer outputs. Completion requires all inherited acceptance criteria; record any external blocker precisely without declaring launch complete.

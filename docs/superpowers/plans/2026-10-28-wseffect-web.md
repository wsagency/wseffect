# wseffect.com Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the separate Astro documentation site `wsagency/wseffect-web` at `https://wseffect.com`, with static documentation, wseffect examples, downloadable starters, and a tested Worker/developer release contract.

**Architecture:** Astro owns MDX, static HTML, Shiki, Pagefind, sitemap, Markdown twins and authored editorial content. The site consumes only exact published wseffect npm versions; a narrow pinned Foldkit server helper emits static component examples, while explicit `Runtime.embed` islands share one page Theme/portal root. A Worker implements headers, Markdown negotiation and extension-aware fallback; all build/check/deploy operations are local.

**Tech Stack:** Node 24.21.0, pnpm 11.5.0, Astro 7.4.2, `@astrojs/mdx` 8.1.1, published wseffect packages `0.1.0-rc.0`, Foldkit `experimental/server`, `Runtime.embed`, Pagefind, Shiki, Wrangler 4.149.0, Vitest, Playwright 1.64.1, axe-core 4.11.0.

**Spec:** `docs/superpowers/specs/2026-10-28-wseffect-public-release-design.md`

**Execution target:** local site repository `/home/klukacin/projects/wseffect-web`; push to `wsagency/wseffect-web` once the owner has created the GitHub repository.

## Global Constraints

- Separate public `wsagency/wseffect-web`; consume exact published npm versions. No workspace links.
- Astro + wseffect, validated by the Astro spike. Astro owns MDX, Shiki, static output, sitemap, Pagefind search, Markdown twins, and Worker Markdown negotiation. Build-time static component examples use Foldkit `experimental/server` `renderToString` through a narrow version-pinned helper with tests. Interactive demos use `Runtime.embed` islands.
- Each page has one root Theme and exactly one shared `#foldkit-portal-root`; islands mount beneath this arrangement and do not create their own root Theme/portal roots. Do not carry over spike's per-island roots or `.radix-themes[data-is-root-theme="true"]` / `.rt-PopperContent` CSS stacking overrides unless production tests prove they are necessary.
- `wseffect-web` builds and deploys an accessible, searchable, static-first Astro site from published npm packages only.
- Static docs pages ship no JavaScript; only explicit demo routes/islands load the runtime bundle.
- Astro's default hashed asset directory is `/_astro/`; before deploy, merge current plus previous three releases' `/_astro/` hashed asset trees from a local release store into `out/`, retaining the release SHA mapping.
- The Cloudflare Worker uses static assets with `run_worker_first` and extension-aware route fallback; it must serve missing assets as 404, never app/page HTML.
- ALL builds, checks, publishes, and deploys run locally on the owner's Omarchy workstation. No CI workflow or preview is part of this release.
- The owner's Omarchy workstation stores the scoped Cloudflare token in libsecret/pass. Pass it only to the Wrangler process.
- Allow indexing from production launch; publish permissive `robots.txt` and sitemap.
- Performance is not a release gate. Retain a manual performance report; no perf runner exists.
- Use Node 24.21.0 and pnpm 11.5.0; use `$HOME/.cache/wseffect-work/release-web/tmp` for temporary files, never `/tmp`.

## Review Focus

1. **Experimentally rendered HTML drift across Foldkit versions:** static output must stay deterministic and non-hydratable; Task 2 tests the pinned helper's HTML, error boundaries and Theme output.
2. **Separate island roots break popover/dialog layering or focus:** assert exactly one page Theme and portal root and exercise Select/Dialog in all three engines in Task 3.
3. **New public exports have no docs route:** compare live published export inventory against route coverage and reject unlisted exports in Task 4.
4. **Starter accidentally resolves monorepo links or unpublished dependencies:** install each downloadable artifact from npm in an isolated directory and build in Task 7.
5. **Worker returns HTML for missing assets or wrong cache headers:** test every HTTP contract row and HEAD/Accept/path variants in Task 9, including `/_astro/` retention assets in Task 10.

---

## File Structure

**New repository root:** `/home/klukacin/projects/wseffect-web` (separate from the wseffect worktree).

| Files | Responsibility |
|---|---|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.node-version`, `astro.config.mjs`, `wrangler.jsonc` | Exact tools and published package pins; Astro static output and Worker config. |
| `src/content/docs/**/*.mdx`, `src/content/config.ts`, `src/data/*` | Authored editorial material, generated API route metadata and curated Gallery source mappings. |
| `src/components/StaticExample.astro`, `src/lib/render-static.ts`, tests | Narrow server-render boundary for build-time examples. |
| `src/islands/*`, `src/layouts/*`, `src/styles/*` | Interactive Runtime.embed islands and one page-level Theme/portal root. |
| `scripts/inventory.ts`, `scripts/props.ts`, `scripts/snippets.ts`, `scripts/starters.ts`, `scripts/markdown.ts`, `scripts/check-links.ts` | Deterministic generators and validation. |
| `src/pages/`, `public/` | Routes, branding, robots, static notices and starter downloads. |
| `worker/index.ts`, `worker/index.test.ts`, `scripts/retention.ts`, tests | Response headers, redirects/Markdown/fallback and retained hashed assets. |
| `scripts/deploy.ts`, `scripts/deploy.test.ts` | Local safeguarded deploy, dry-run and rollback handoff. |
| `playwright.config.ts`, `e2e/*.spec.ts`, `axe` checks, `README.md` | Three-engine browser/accessibility gate and site operator/developer guide. |

## Code tasks

### Task 1: Scaffold Astro with exact published package pins

**Files:**
- Create in `/home/klukacin/projects/wseffect-web`: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.node-version`, `astro.config.mjs`, `src/pages/index.astro`, `src/styles/global.css`, `README.md`.
- Test: `scripts/scaffold.test.ts`.

**Interfaces:**
- Consumes: five packages published at `0.1.0-rc.0`; no source repository checkout as a package input.
- Produces: `pnpm build` creates static `out/`; exact package deps and lock have no `workspace:`/`link:`/`file:` refs.

- [ ] **Step 1: Write failing scaffold tests** `pinsAstroAndTools`, `usesOnlyRegistryWseffectPackages`, `buildsStaticRoot`, and `docsRootHasNoJavaScript`.
- [ ] **Step 2: Run** `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/scaffold.test.ts`. Expected: FAIL before scaffold exists.
- [ ] **Step 3: Create Astro site root** pinned to Astro 7.4.2 and `@astrojs/mdx` 8.1.1, exact `@wsagency/wseffect-*` `0.1.0-rc.0` dependencies plus required published peers, and Wrangler 4.149.0. Configure static `out/`, no service worker/PWA manifest, and no workspace declarations/links.
- [ ] **Step 4: Run** the test and `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm install --frozen-lockfile && mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`. Expected: static root built with no client JS and all wseffect deps resolved from registry.
- [ ] **Step 5: Commit** site changes with `git add . && git commit -m "feat: scaffold Astro docs site"`.

### Task 2: Add tested Foldkit static-render helper

**Files:**
- Create: `src/lib/render-static.ts`, `src/lib/render-static.test.ts`, `src/components/StaticExample.astro`.
- Modify: `astro.config.mjs` only if required by tested integration.

**Interfaces:**
- Produces: `renderStatic(view: Html, options: { theme: ThemeSettings }): string` using pinned `@wsagency/wseffect-foldkit/experimental/server` and `Effect.runSync(renderToString(..., { isHydratable: false }))`.

- [ ] **Step 1: Write failing tests** `rendersExpectedThemeHtml`, `doesNotEmitHydrationMarkers`, `preservesAccessibleMarkup`, `failsBuildOnRenderFailure`, and `usesPublishedFoldkitServerExport`.
- [ ] **Step 2: Run** `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec vitest run src/lib/render-static.test.ts`. Expected: FAIL before helper exists.
- [ ] **Step 3: Implement the narrow helper** against the exported server API; keep renderer-specific code out of MDX components and pin the package through the exact root dependency.
- [ ] **Step 4: Run** the focused test and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`. Expected: test passes and generated component markup is present in HTML with no hydration scripts.
- [ ] **Step 5: Commit** `git add src/lib src/components && git commit -m "feat: render static Foldkit examples"`.

### Task 3: Add one-root Runtime.embed island system

**Files:**
- Create: `src/layouts/DocsLayout.astro`, `src/islands/embed.ts`, `src/islands/select-demo.ts`, `src/islands/dialog-demo.ts`, `src/islands/embed.test.ts`, `e2e/islands.spec.ts`.
- Modify: `src/styles/global.css`, Astro page templates.

**Interfaces:**
- Produces: one page-level root Theme and single `#foldkit-portal-root`; `mountIsland(host, entry): { dispose(): void }` wraps `Runtime.embed` and calls handle disposal when Astro island disconnects.

- [ ] **Step 1: Write failing unit/browser tests** `usesOneThemeRoot`, `usesOnePortalRoot`, `doesNotCreateIslandThemeRoots`, `disposeOnRemoval`, plus Select opens/selects Blue, popper stacks above content, Dialog opens/closes with Escape and restores focus.
- [ ] **Step 2: Run** focused Vitest and Playwright Chromium test; expected failure with no island helper.
- [ ] **Step 3: Implement** a shared page layout that owns Theme CSS and portal root; mount selected demos with `Runtime.embed` under that layout and dispose by island lifecycle. Do not copy the spike's per-island roots or CSS stacking overrides unless tests establish they remain necessary.
- [ ] **Step 4: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec playwright test e2e/islands.spec.ts --project=chromium --project=firefox --project=webkit`. Expected: Select and Dialog interaction, layering, focus and cleanup pass in all engines.
- [ ] **Step 5: Commit** `git add src/layouts src/islands src/styles e2e/islands.spec.ts && git commit -m "feat: embed shared-root Foldkit demos"`.

### Task 4: Generate package export inventory and route coverage

**Files:**
- Create: `scripts/inventory.ts`, `scripts/inventory.test.ts`, `src/data/export-inventory.json`.
- Modify: Astro route frontmatter/page generator and `package.json` scripts.

**Interfaces:**
- Produces: `buildInventory(packageExports): Inventory` mapping exact package/subpath to route, generated/curated mode and source; missing/duplicate route coverage fails.

- [ ] **Step 1: Write failing tests** `coversEveryPublicExport`, `rejectsUnmappedExport`, `rejectsDuplicateRoute`, `keepsExperimentalModulesExplicit`, and `includes55ThemeNamespaces31UiSubpathsAndEveryFoldkitModule`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec vitest run scripts/inventory.test.ts`. Expected: FAIL before generator/inventory.
- [ ] **Step 3: Generate the inventory** from the five installed published package export maps, with explicit aliases for grouped modules (`tooltip/group`) and per-export route mapping; write `src/data/export-inventory.json` deterministically.
- [ ] **Step 4: Run** inventory test and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm inventory:check`. Expected: every public export has a route or an explicit grouped reference and generator output is stable.
- [ ] **Step 5: Commit** `git add scripts/inventory.ts scripts/inventory.test.ts src/data/export-inventory.json package.json && git commit -m "build: inventory published wseffect exports"`.

### Task 5: Generate Effect Schema Props tables

**Files:**
- Create: `scripts/props.ts`, `scripts/props.test.ts`, `src/components/PropsTable.astro`.
- Modify: Themes API pages generated from Task 4 inventory.

**Interfaces:**
- Produces: `propsRows(propsSchema): ReadonlyArray<{ name: string; type: string; required: boolean; choices?: string[]; description?: string }>` from public `Component.Props` schemas.

- [ ] **Step 1: Write failing schema tests** `unwrapsOptionalUnion`, `showsLiteralChoices`, `showsBooleanAndResponsiveTypes`, `doesNotInventDescriptionsOrDefaults`, and `emitsAllPublicThemeProps`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec vitest run scripts/props.test.ts`. Expected: FAIL before schema walker exists.
- [ ] **Step 3: Implement schema normalization** against Effect Schema public AST and exported Themes `Props`; retain unsupported schema nodes visibly instead of fabricating defaults/descriptions.
- [ ] **Step 4: Run** focused tests and production build. Expected: Props tables include every exported component prop and match tested optionality/literal variants.
- [ ] **Step 5: Commit** `git add scripts/props.ts scripts/props.test.ts src/components/PropsTable.astro && git commit -m "feat: generate component props tables"`.

### Task 6: Build complete first-release content corpus

**Files:**
- Create: `src/content/docs/**/*.mdx`, `src/content/config.ts`, `src/data/gallery-mappings.ts`, route generation templates.
- Modify: `src/data/export-inventory.json` only for reviewed route/source mapping changes.

**Interfaces:**
- Consumes: Tasks 2–5 helper/inventory/schema tables.
- Produces: all routes listed in the specification with source classification and complete coverage checks.

- [ ] **Step 1: Write failing content/inventory tests** `everySpecifiedRouteExists`, `generatedApiRoutesHaveSourceExport`, `authoredTutorialRoutesHaveOwner`, `galleryExamplesHaveAttribution`, `frontmatterRequiredFieldsValidate`, and `experimentalSsrIsLabeled`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec vitest run scripts/content.test.ts`. Expected: fail until page inventory and mappings exist.
- [ ] **Step 3: Author and generate content by source:** generate package-reference pages from exports and Props metadata for the 55 Themes namespaces, 31 Foldkit UI subpaths and every Foldkit/app/plugin export; manually author overview, Getting Started, concepts, architecture, accessibility, deployment, migrations, and license/notice narrative; curate demonstrations from explicitly mapped Gallery routes/page sources with source attribution. Generate changelog pages from five package changelogs. Mark SSR experimental.
- [ ] **Step 4: Run** content test, route inventory check, and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`. Expected: complete first-version sitemap, valid MDX/frontmatter and no unmapped export.
- [ ] **Step 5: Commit** `git add src/content src/data scripts/content.test.ts && git commit -m "docs: add complete wseffect reference corpus"`.

### Task 7: Build and verify minimal/full downloadable starters

**Files:**
- Create: `src/starters/minimal/**`, `src/starters/full/**`, `scripts/starters.ts`, `scripts/starters.test.ts`, `tests/starters/minimal.test.ts`, `tests/starters/full.test.ts`.
- Modify: Getting Started pages and site package scripts.

**Interfaces:**
- Produces: downloadable minimal direct-Foldkit starter and full app/codegen/Vite starter, both pinned to published `0.1.0-rc.0` and all required peers.

- [ ] **Step 1: Write failing tests** `downloadsMinimalAndFull`, `minimalInstallsFromRegistry`, `fullInstallsRunsCodegenAndBuilds`, `noWorkspaceOrFileDependency`, and `manifestPeerSetMatchesPublishedPackages`.
- [ ] **Step 2: Run** starter tests; expected failure until artifacts exist.
- [ ] **Step 3: Implement both projects** using the verified `$HOME/.cache/wseffect-work/starter/QUICKSTART.md` behavior, replacing tarball/override workarounds with registry package versions and explicit peers; generate reproducible downloads and lockfiles.
- [ ] **Step 4: Run** each starter in an independent temp directory: `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm install --frozen-lockfile` and `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`; full starter also runs `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec wseffect-codegen --check .` before build. Expected: both use only registry artifacts and build successfully.
- [ ] **Step 5: Commit** `git add src/starters scripts/starters.ts scripts/starters.test.ts tests/starters src/content/docs/getting-started && git commit -m "feat: ship registry-backed starter projects"`.

### Task 8: Add search, robots, sitemap, 404 and Markdown twins

**Files:**
- Create: `scripts/search.ts`, `scripts/markdown.ts`, `scripts/site-metadata.ts`, tests; Astro `src/pages/404.astro`, `src/pages/robots.txt.ts`, generated sitemap routes and Markdown output.
- Modify: package scripts and layouts.

**Interfaces:**
- Produces: Pagefind index over static HTML; indexable robots/sitemap; 404 HTML; Markdown twin for registered pages; no 404 twin.

- [ ] **Step 1: Write failing tests** `searchFindsPageAndHeading`, `sitemapListsAllCanonicalPages`, `robotsAllowsIndexing`, `unknownRouteRenders404`, `markdownTwinExistsForEveryPageExcept404`, and `docsHtmlContainsNoJavaScript`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/site-metadata.test.ts scripts/markdown.test.ts`. Expected: FAIL before generators.
- [ ] **Step 3: Implement static generators** for Pagefind, XML sitemap, permissive robots, route 404 and HTML-to-Markdown twins; page inventory remains the sole canonical route list.
- [ ] **Step 4: Run** tests and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`. Expected: search data, sitemap, robots, Markdown and 404 are in `out/`; docs pages load no JavaScript.
- [ ] **Step 5: Commit** `git add scripts src/pages package.json && git commit -m "feat: add static search and agent docs"`.

### Task 9: Implement Worker response/header/fallback contract

**Files:**
- Create: `worker/index.ts`, `worker/index.test.ts`, `wrangler.jsonc`.
- Modify: Astro static output config and test fixtures.

**Interfaces:**
- Produces: Worker `fetch(request, env, ctx): Promise<Response>` implementing the spec table: immutable `/_astro/*`; `no-cache` HTML, generated Markdown and `/version.json`; GET/HEAD Markdown negotiation with `Vary: Accept`; extensionless page resolution; extension-bearing missing-path 404; `www` redirect tested at zone level.

- [ ] **Step 1: Write failing contract tests for every spec row** plus method/Accept variations, `Vary`, redirect precedence, unknown extensionless route and missing image/script; explicitly assert no manifest or service-worker behavior is configured.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec vitest run worker/index.test.ts`. Expected: FAIL before Worker implementation.
- [ ] **Step 3: Implement Worker-first handling** around Cloudflare static assets with extension-aware fallback and Markdown twin lookup; apply cache policy per path and pass normal assets through.
- [ ] **Step 4: Run** Worker tests and `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec wrangler types`. Expected: all contract rows pass and config declares static `out/`, `run_worker_first`, no previews/routes/service worker.
- [ ] **Step 5: Commit** `git add worker wrangler.jsonc && git commit -m "feat: enforce docs Worker response contract"`.

### Task 10: Retain the previous three `/_astro/` asset trees

**Files:**
- Create: `scripts/retention.ts`, `scripts/retention.test.ts`, `docs/RELEASING.md` release-store format section.
- Modify: local deploy pipeline.

**Interfaces:**
- Produces: `mergeRetainedAssets(outDir, releaseStore, currentSha, retainCount=3): Promise<RetentionResult>` preserving current and previous three releases' hashed `/_astro/` assets and detecting collisions/limits.

- [ ] **Step 1: Write failing tests** `mergesCurrentAndPreviousThree`, `dropsOlderAssets`, `rejectsHashCollisionWithDifferentBytes`, `enforcesCloudflareFileCountAndByteLimits`, and `recordsSourceReleaseSha`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/retention.test.ts`. Expected: FAIL before merge logic exists.
- [ ] **Step 3: Implement merge** from the local release store into `out/_astro/`; preserve only current plus three prior release trees and return SHA provenance; enforce the configured current Cloudflare asset count/size limits before mutation/deploy.
- [ ] **Step 4: Run** tests against synthetic release stores, including over-limit fixtures. Expected: deterministic retained set, collision/limit errors, source SHA list.
- [ ] **Step 5: Commit** `git add scripts/retention.ts scripts/retention.test.ts docs/RELEASING.md && git commit -m "build: retain prior Astro hashed assets"`.

### Task 11: Add safeguarded local deploy with dry-run

**Files:**
- Create: `scripts/deploy.ts`, `scripts/deploy.test.ts`, `docs/RELEASING.md` deploy instructions.
- Modify: root `package.json`, `wrangler.jsonc` if necessary.

**Interfaces:**
- Produces: `pnpm deploy:site -- --dry-run` validates without deploy; normal command serializes, checks clean main==origin/main, builds a fresh worktree, verifies artifact/SHA, merges retention, rechecks origin, and calls pinned Wrangler with process-scoped token only.

- [ ] **Step 1: Write failing script tests** `serializesWithLock`, `rejectsDirtyTree`, `rejectsWrongBranchOrStaleHead`, `buildsFreshShaWorktree`, `runsCheckInSameDeploy`, `rejectsMissingVersionOrHeaders`, `rejectsWorkspaceLinks`, `rechecksOriginAfterBuild`, `keepsTokenOutOfEnvAndLogs`, and `dryRunDoesNotDeploy`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/deploy.test.ts`. Expected: FAIL before deploy script exists.
- [ ] **Step 3: Implement deploy** with exclusive lock; fresh clean worktree for current origin/main SHA; frozen install; remove old output; run `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check`; verify version SHA, worker/header/fallback files, secrets/host paths and exact npm dependencies; merge Task 10 assets; fetch/recheck origin; only then invoke `mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec wrangler deploy --message "$SHA"`. Read token from libsecret/pass and inject only into the Wrangler child process; dry-run stops before Wrangler invocation.
- [ ] **Step 4: Run** test suite and `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm deploy:site -- --dry-run`. Expected: success report for valid fixture, no remote write, stale/dirty/token/log safety tests pass.
- [ ] **Step 5: Commit** `git add scripts/deploy.ts scripts/deploy.test.ts package.json docs/RELEASING.md && git commit -m "build: add guarded local Worker deploy"`.

### Task 12: Add full local `pnpm check` with three-engine Playwright and axe

**Files:**
- Create: `playwright.config.ts`, `e2e/docs.spec.ts`, `e2e/search.spec.ts`, `e2e/starters.spec.ts`, `scripts/check.test.ts`, `scripts/check.ts`.
- Modify: `package.json`, README.

**Interfaces:**
- Produces: `pnpm check` in fixed order: build; link/export/route inventory checks; snippet compilation; minimal/full registry starter install/build; Playwright Chromium/Firefox/WebKit; axe on docs and representative interactive pages.

- [ ] **Step 1: Write failing check-orchestrator tests** `runsGatesInSpecifiedOrder`, `failsFastWithStageName`, `runsAllThreeEngines`, `checksAxeOnDocsAndIslands`, and `doesNotRunPerformanceGate`.
- [ ] **Step 2: Run** `mise exec node@24.21.0 pnpm@11.5.0 -- node --test scripts/check.test.ts`. Expected: FAIL before orchestrator exists.
- [ ] **Step 3: Implement the single local check command** invoking Astro build, inventory/link/export/HTML/Markdown checks, snippet compile, starter install/build, Playwright in three engines and axe. No workflow/CI files and no perf gate.
- [ ] **Step 4: Run** `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm check`. Expected: every stage passes and docs HTML is JS-free; report manual performance separately.
- [ ] **Step 5: Commit** `git add package.json scripts/check.ts scripts/check.test.ts playwright.config.ts e2e README.md && git commit -m "test: gate docs build and browser behavior"`.

## Operational tasks

### Task 13: Create and push `wsagency/wseffect-web`

**Files:** external GitHub repository only; credentials remain outside the repository.

**Interfaces:**
- Consumes: approved spec and completed Tasks 1–12.
- Produces: canonical public site repo cloned at `/home/klukacin/projects/wseffect-web`, branch `main` protected against force push/deletion, Actions disabled, source/issues URLs linked to wseffect GitHub.

**DevOps action items — GitHub**

1. **Actor:** owner. **Target:** GitHub org `wsagency`, empty public `wsagency/wseffect-web`. **Command:** create empty repository; do not add README or license. **Mode:** write. **Approval gate:** owner approval. **Verification:** public URL, owner and empty refs confirmed. **Rollback:** delete only before any reviewed site source is pushed if repo visibility/name is wrong.
2. **Actor:** owner/dev. **Target:** site repo `main` settings and local remote. **Command:** set `origin` to `git@github.com:wsagency/wseffect-web.git`; push reviewed tree; disable Actions; apply main protection against force push/deletion. **Mode:** write. **Approval gate:** repo creation and completed local checks. **Verification:** `git ls-remote origin refs/heads/main` matches reviewed SHA, public clone/frozen build succeeds and GitHub Actions are disabled. **Rollback:** correct remote/settings without force-pushing shared history.

- [ ] **Step 1: Owner creates** empty public `wsagency/wseffect-web`; verify public visibility, owner and empty default branch. This external write requires owner approval.
- [ ] **Step 2: Push from** `/home/klukacin/projects/wseffect-web` to `git@github.com:wsagency/wseffect-web.git`; set main default, disable Actions, apply main ruleset, and verify repository links.
- [ ] **Step 3: Verify** `git ls-remote origin refs/heads/main` equals reviewed local main SHA; clone into `$HOME/.cache/wseffect-work/release-web/clone-check` and run frozen install/build.
- [ ] **Step 4: Commit/push** any source-host URL correction with `docs: correct website repository links`.

### Task 14: DevOps one-time Cloudflare/DNS bootstrap and records

**Files:** site repo `docs/RELEASING.md` records only non-secret final values; DevOps `devops2` records.

**Interfaces:**
- Consumes: public site repository and initial approved checked artifact; owner-authorized bootstrap.
- Produces: Worker `wseffect-web`, Custom Domain `wseffect.com`, scoped Worker-only token, `www` redirect, domain/project records.

**DevOps action items — Cloudflare/DNS**

1. **Actor:** DevOps. **Target:** Cloudflare account Worker `wseffect-web`, static `out/`, Custom Domain `wseffect.com`, scoped token. **Command/API:** first approved Worker deploy, attach Custom Domain, create Individual Workers Editor token scoped to this Worker. **Mode:** write. **Approval gate:** owner approves first production bootstrap; DevOps retains master credential. **Verification:** Worker active, TLS valid, token scope exact. **Rollback:** remove incorrect Custom Domain/Worker and revoke incorrectly scoped token.
2. **Actor:** DevOps. **Target:** Cloudflare zone `wseffect.com`, host `www`. **Command/API:** proxied placeholder `AAAA www → 100::`; Single Redirect to `https://wseffect.com` preserving path/query, status 301. **Mode:** write. **Approval gate:** user-approved redirect decision. **Verification:** `curl -sSI 'https://www.wseffect.com/path?q=x'` returns 301 with exact apex Location. **Rollback:** disable redirect and remove placeholder.
3. **Actor:** DevOps. **Target:** devops2 `cloudflare/domains/wseffect.com/` and `projects/wseffect/README.md` + changelog. **Command:** add zone/Worker/redirect/token-scope and project deployment/rollback records, never token values. **Mode:** write. **Approval gate:** bootstrap complete. **Verification:** records match Cloudflare and contain no secret. **Rollback:** correct erroneous records and revoke any exposed credential.
4. **Actor:** owner. **Target:** Omarchy libsecret/pass and local deploy command. **Command:** store scoped token and invoke deploy script that injects it only into Wrangler. **Mode:** local write. **Approval gate:** DevOps supplies the scoped token securely after Worker bootstrap. **Verification:** no token in shell environment, logs, repo, or build/test process. **Rollback:** revoke token and delete secret entry if exposure is suspected.

- [ ] **Step 1: DevOps performs** first Worker deploy/bootstrap; configure static assets/`run_worker_first`, Custom Domain and scoped Individual Workers Editor token for this Worker only.
- [ ] **Step 2: DevOps configures DNS** and verifies the `www` 301 path/query behavior.
- [ ] **Step 3: DevOps records** domain/project deployment details in devops2; provide account ID/token name through approved secure channel, never token value in Git/chat.
- [ ] **Step 4: Owner stores token** in Omarchy libsecret/pass; run the deploy script's dry-run and verify token is passed only to Wrangler.

### Task 15: Deploy and complete public developer acceptance

**Files:** no source-code changes required unless contract defects are fixed through Tasks 9–12.

**Interfaces:**
- Consumes: verified published `0.1.0-rc.0`, completed DevOps bootstrap, `pnpm check` green and clean main==origin/main.
- Produces: checked production Worker deployment and an end-to-end clean-directory developer check.

**DevOps action items — local deployment and acceptance**

1. **Actor:** owner. **Target:** clean public `wsagency/wseffect-web` main and production Worker. **Command:** run safeguarded `pnpm deploy:site` after local check. **Mode:** write. **Approval gate:** owner deploy authorization and DevOps bootstrap. **Verification:** Worker version/SHA and smoke tests match. **Rollback:** `wrangler rollback` to prior Worker or redeploy previous verified artifact.
2. **Actor:** owner/dev. **Target:** production `wseffect.com` and clean consumer directory. **Command:** test live HTTP contract and run registry install/build below. **Mode:** read. **Approval gate:** successful safeguarded deploy. **Verification:** every route/status/header and both starter builds pass. **Rollback:** roll production back per action 1; do not change npm dist-tags for a site rollback.

- [ ] **Step 1: Deploy** with `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm deploy:site`; verify deploy SHA, Worker version and smoke output. If any gate fails, do not deploy.
- [ ] **Step 2: Run live smoke contract** for a hashed asset present under `/_astro/` (immutable headers), `/` and docs (`no-cache`), `/version.json` SHA, sitemap/robots, Markdown negotiation with `Vary: Accept`, unknown extensionless 404, missing `.js` 404, old retained chunk, and `www` 301 path/query preservation.
- [ ] **Step 3: Fresh-directory acceptance** outside all repos: run `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm add @wsagency/wseffect-app@next @wsagency/wseffect-foldkit@next @wsagency/wseffect-foldkit-ui@next @wsagency/wseffect-themes@next @wsagency/wseffect-vite-plugin@next effect@4.0.7 @effect/platform-browser@4.0.7 vite@8.3.4 vite-plugin-pwa@2.0.0`; follow minimal and full starter files, run `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm exec wseffect-codegen --check .` where shown, plus dev server and `TMPDIR="$HOME/.cache/wseffect-work/release-web/tmp" mise exec node@24.21.0 pnpm@11.5.0 -- pnpm build`; confirm dependencies resolve from npm with no workspace/local paths. Expected: both starter paths build and visible sample works.
- [ ] **Step 4: Record** SHA, Worker version, smoke headers/statuses, registry-resolved dependency tree and starter outputs in release record. No new deploy until any observed failure is fixed and the complete local check is rerun.

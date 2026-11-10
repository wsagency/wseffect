# wseffect RC.1 public-launch continuation

Status: proposed written amendment; broad public-launch scope already selected by the owner.

## Intent and inherited contract

Complete the public launch for developers evaluating and building with wseffect, using subagents. This amends `2026-10-28-wseffect-public-release-design.md`, not replaces it. All its acceptance criteria, full sitemap, HTTP contracts, security gates, attribution requirements and operational approvals remain binding. The complete website implementation remains the existing `../plans/2026-10-28-wseffect-web.md` tasks 1–15.

## Changes from the earlier design

- Coordinate all five packages on `0.1.0-rc.1`; use this exact version for the next release, website and both starters wherever the earlier documents specify RC.0. Preserve RC.0 tags and records.
- Retain `next` and explicitly align `latest` for each package. No new speculative runtime APIs: the release completes the already approved launch.
- Work in the isolated `release/0.1.0-rc.1` checkout based on current canonical main. Leave the original checkout's dirty Effect changes untouched. Existing Effect 4.0.7 pins and public peers `^4.0.5` remain.
- Website stays a separate public `wsagency/wseffect-web` repository. Package publication and registry integrity verification precede website dependency installation and acceptance; no local package substitutions.
- Exact planned tooling versions must exist before installation. An unavailable pin is a decision blocker, not permission to substitute silently.

## Delivery boundaries and execution

1. Package candidate: coordinated manifests/internal references, release notes and current runbook examples. Reuse release scripts and guards; never weaken clean main/origin, history-review or integrity gates.
2. Registry release: integrate the reviewed candidate, run checks, owner history-audit signoff, fresh annotated tag/build/pack/dry runs, live npm web 2FA, sequential graph-order publication and verification of all five packages.
3. Complete website: shared static renderer and single Theme/portal root; generated published export coverage and schema Props; all authored/reference routes; attributed examples; minimal/full downloadable registry starters; search, sitemap, robots, 404 and Markdown twins.
4. Hosting: Worker response contract, current plus three prior asset trees, clean-main locked deploy with fresh checks and Wrangler-only credential injection; public repository settings and separately authorized Cloudflare/DNS bootstrap.
5. Acceptance: ordered local website checks, all three browser engines and axe, live HTTP contract, and clean-directory developer installation/build of both actual starter downloads.

Subagents own disjoint files. Package metadata and release documentation can proceed independently. After the registry prerequisite, website infrastructure, content/generation and starters are divided around the existing plan's explicit interfaces; shared root configuration has one integration owner. A separate reviewer checks the integrated changes. Checks run after each integration, not concurrently in editing agents.

## Clarification: static docs and search

Keep documentation pages JavaScript-free unless explicitly interactive. Provide Pagefind's interactive search on an explicit search route linked from static navigation; demo routes alone load the wseffect runtime. This preserves search accessibility without silently making every docs page interactive.

## Failure and evidence policy

Do not mark npm artifacts published because a tag or local archive exists. Do not mark history reviewed because a report exists. Stop on a partial publish and record exactly which packages/tags succeeded; recovery uses a higher coordinated RC. Cloudflare deployment and DNS writes retain their separate authorization gates. Missing credentials use the secure secret mechanism, never chat or repository files.

Completion requires the original design's entire end-to-end launch contract, not a scaffold or reduced page set. External blockers must be stated with evidence; no unverifiable published, deployed or passing claims.

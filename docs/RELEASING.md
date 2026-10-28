# Publishing wseffect packages

This runbook publishes the five `@wsagency/wseffect-*` packages as one coordinated release. The publishing operator is **klukacin**. The initial release is `0.1.0-rc.0`; every RC uses npm's `next` tag and the `latest` tag is explicitly advanced to that same RC until the stable `0.1.0` release.

## Before tagging

Run all commands from a clean checkout of `origin/main`, with the project's pinned Node/pnpm versions. **Start one interactive mise-controlled shell and keep it open through registry verification** so the shared archive and publish paths remain defined. Do not run pnpm or Node from the workstation's system PATH (which may select another Node version):

```sh
mise exec node@24.21.0 pnpm@11.5.0 -- bash
```

In that shell, initialize the external paths once, then run the preparation checks:

Before any GitHub mirror push, release tag, or package publish, the independent history auditor must complete the history audit and save its report outside Git at `"$HOME/.cache/wseffect-work/history-audit/REPORT.md"`. The publishing owner, **klukacin**, must read the report and verify it covers every ref, secrets, and internal-only content. Only after that review, run preflight with `--history-audit-reviewed` to explicitly confirm the owner-approved audit. Preflight refuses by default without that flag; never copy the report into the repository.

```sh
export TMPDIR="$HOME/.cache/wseffect-work/release-packages/tmp"
mkdir -p "$TMPDIR"
archives_dir="$TMPDIR/archives"
release_dir="$HOME/.cache/wseffect-work/release-publish-0.1.0-rc.0"
git fetch origin --prune
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
pnpm install --frozen-lockfile
pnpm check
node scripts/check-repo.ts --release-version 0.1.0-rc.0
pnpm release:preflight -- --version 0.1.0-rc.0 --history-audit-reviewed
```

Before 2026-10-29T03:00Z, keep the temporary exact Effect 4.0.7 `minimumReleaseAgeExclude` entries in the root and `tests/consumer/fixtures/effect-4.0.7/pnpm-workspace.yaml` as-is. Preflight now automatically refuses if any `effect` or `@effect/*` entry remains in `minimumReleaseAgeExclude` in the root or any consumer fixture workspace; after the window, remove the temporary entries, reinstall with `pnpm install --frozen-lockfile`, then rerun `pnpm check`, release manifest tests, consumer tests, and release preflight before tagging.

Do not tag if the checkout is dirty, stale, on a named branch other than `main`, any Effect exclusion remains, any check fails, metadata or version validation fails, the graph is unexpected, or the registry checks reveal a package name conflict. Correct the source and repeat the gates. No credentials belong in the repository, shell profile, or release package directory.

## Tag and build from a detached worktree

After the coordinated checks pass, create the annotated release tag at the reviewed `origin/main` commit. Sign it if the owner has a signing key; otherwise use an annotated unsigned tag.

```sh
git tag -a v0.1.0-rc.0 -m 'wseffect 0.1.0-rc.0'
# If signing is configured, create the annotated tag with -s instead of -a.
git worktree add --detach "$HOME/.cache/wseffect-work/release-0.1.0-rc.0" v0.1.0-rc.0
```

From that fresh detached worktree, in the same mise shell, install frozen dependencies, build and run the full checks; then pack and inspect the graph-derived archives:

```sh
cd "$HOME/.cache/wseffect-work/release-0.1.0-rc.0"
pnpm install --frozen-lockfile
pnpm build
pnpm check
node scripts/check-repo.ts --release-version 0.1.0-rc.0
pnpm release:preflight -- --version 0.1.0-rc.0 --history-audit-reviewed
pnpm release:pack -- --out "$archives_dir"
```

The clean detached checkout is accepted only when its HEAD equals fetched `origin/main`; other detached commits and named branches other than `main` are refused. Use the order printed by preflight/pack output. Packing emits one `{package, archive, sha256, integrity}` entry per package in computed graph order and writes the persistent record to `"$HOME/.cache/wseffect-work/release-records/0.1.0-rc.0.json"` (outside every Git tree). To choose another location pass `--record <path>`; an existing record is protected unless `--force-record` is explicitly given. The record includes the version, Git SHA, timestamp, and ordered archive data; retain it as the canonical checksum record. Confirm five archives and inspect every archive: check its embedded name/version and repository, exports and targets, required notices/licenses/UPSTREAM files, rewritten internal references at exactly `0.1.0-rc.0`, no workspace/file/link dependencies, no unintended test artifacts, and no secrets or host paths. On any inspection failure, stop and prepare a corrected higher RC; do not publish a questionable archive.

Run `npm publish --dry-run <archive> --access public --tag next --registry=https://registry.npmjs.org/` for each archive before any real publish. A dry-run failure is a stop condition; fix the source, produce a higher RC and repeat checks, tag and build from a fresh worktree.

## Publish

After all dry runs pass, copy the finalized `.tgz` archives and persistent checksum release record into `"$release_dir"`, which was set in the mise shell before the detached worktree was created. Verify copied hashes against the release record. Both `release_dir` and `archives_dir` are outside the detached Git worktree. Create a temporary npm userconfig outside every repository; do not reuse or expose a persistent npm config.

```sh
mkdir -p "$release_dir"
if git -C "$release_dir" rev-parse --is-inside-work-tree; then
  echo "Publish directory is inside a Git working tree; stop." >&2
  exit 1
fi
cp "$archives_dir"/*.tgz "$release_dir/"
cp "$HOME/.cache/wseffect-work/release-records/0.1.0-rc.0.json" "$release_dir/"
npmrc="$release_dir/npmrc"
: > "$npmrc"
chmod 600 "$npmrc"
export NPM_CONFIG_USERCONFIG="$npmrc"
npm login --auth-type=web
```

Complete npm's web login as **klukacin** and approve live 2FA prompts. Keep the owner available for live approvals throughout the sequential publish and dist-tag operations. Do not put OTPs or credentials in command history, logs, or files. Publish each archive **sequentially in the computed order printed by the pack output**, using the exact command below for each file:

```sh
npm publish "$archive" --access public --tag next --registry=https://registry.npmjs.org/
npm dist-tag add '<package>@0.1.0-rc.0' latest --registry=https://registry.npmjs.org/
```

Replace `<package>` and `$archive` with the package name and matching archive from the pack record. Run the `dist-tag add` command after every RC publish so `latest` points to each package's current RC until `0.1.0`; `--tag next` alone does not move `latest`. Never publish in parallel. Stop immediately on the first publish or dist-tag error; do not continue to the next package until the discrepancy is understood.

After all five sequential publish/dist-tag pairs, verify registry metadata and integrity with the read-only release verifier and allow for registry propagation:

```sh
pnpm release:verify -- --version 0.1.0-rc.0 --record "$HOME/.cache/wseffect-work/release-records/0.1.0-rc.0.json"
```

Wait and retry verification if version, integrity, `next`, or `latest` has not propagated. Treat a persistent mismatch as a stop condition; do not pin consumers or proceed to website release until all five packages verify. Log out and clean up the temporary userconfig and credentials when finished. Preserve `"$HOME/.cache/wseffect-work/release-records/0.1.0-rc.0.json"` as the permanent release record; remove only the temporary publish directory:

```sh
npm logout --registry=https://registry.npmjs.org/
rm -rf "$release_dir"
unset NPM_CONFIG_USERCONFIG
```

This is a local publish and **does not provide npm provenance**. No provenance claim should be made for these archives.

## Recovery and stop conditions

Stop before publishing for any dirty/stale checkout, wrong branch or commit, failed check/build/preflight, unexpected graph, missing or invalid archive, failed dry run, or failed interactive login. During publication stop on the first failure or registry inconsistency and record exactly which packages and tags are public. Do not reflexively unpublish: once public, assess impact and registry policy first. Recovery for a package or metadata correction is a coordinated **higher RC** across the five packages (for example `0.1.0-rc.1`), followed by a fresh clean check, annotated tag/worktree, graph-derived pack and inspection, dry runs, and sequential publish/tag verification. Carefully advance `next` and `latest` to the corrected RC for every package; never imply the incomplete RC set was complete.

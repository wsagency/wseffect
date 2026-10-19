# Implementation plan issues

## 2026-10-19 — Node test files included in the Vitest root run

- **Issue:** Lane 0.1 and 0.2 define `scripts/*.test.ts` using `node:test` and require `node --test scripts/*.test.ts`, while the root `pnpm test` script runs Vitest. Vitest's root discovery included these files and failed each with `No test suite found`, even though the required Node test commands passed.
- **Evidence:** `pnpm check` reached the test stage and reported `scripts/check-repo.test.ts`, `scripts/check-update-coverage.test.ts`, and `scripts/resolve-effect-latest.test.ts` as failed suites with `No test suite found`.
- **Proposed fix / applied:** Exclude `scripts/**/*.test.ts` from Vitest discovery, run them with `node --test` in the root `pnpm test` script, then run the plan's update-coverage checker. This preserves both test frameworks and runs the Node tests in CI.

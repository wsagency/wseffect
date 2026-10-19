# Radix2Solid benchmark app

This private Solid 2 app is the BENCH-3 comparison target. Its `packs/` dependencies are built by `scripts/prepare-library.ts` from the clean public repository checkout pinned in `library-source.json`; do not replace them with npm releases or snapshot-built archives.

```sh
node bench/radix2solid/scripts/prepare-library.ts --write
pnpm install
pnpm --filter radix2solid-bench build
node bench/radix2solid/scripts/prepare-library.ts --verify
```

The app follows the gallery routes and exposes the same `data-perf` hooks for virtual-list, form, and menus scenarios. Development and preview servers use ports 4510 and 4511 (the contract test reserves an available port in 4500–4599).

# Radix2Solid benchmark app

This private Solid 2 app is the BENCH-3 comparison target. Its `packs/` dependencies are built by `scripts/prepare-library.ts` from the clean public repository checkout pinned in `library-source.json`; do not replace them with npm releases or snapshot-built archives.

```sh
node bench/radix2solid/scripts/prepare-library.ts --write
pnpm install
pnpm --filter radix2solid-bench build
node bench/radix2solid/scripts/prepare-library.ts --verify
```

The app follows the gallery routes and exposes the same `data-perf` hooks for virtual-list, form, and menus scenarios. Development and preview use an available port by default; set `RADIX2SOLID_DEV_PORT` or `RADIX2SOLID_PREVIEW_PORT` to reserve a specific port.
SP2 visual captures use `sp2-capture-matrix.json` as the shared Gallery/Solid pairing contract. Run `pnpm --dir bench/radix2solid run capture:sp2` to capture the Solid baseline into `$WSEFFECT_SCRATCH_DIR/captures` (or the system temp fallback). After the Gallery routes are integrated, run `pnpm --dir bench/radix2solid run compare-sp2 -- --gallery-url=http://127.0.0.1:4173`; the command captures both sides and writes a reporting-only numeric comparison artifact beside the screenshots. Set `RADIX2SOLID_PREVIEW_PORT` if the default Solid preview port 4178 is occupied.
Regenerate the matrix from the exact pinned component prop definitions with `pnpm --dir bench/radix2solid run generate:sp2-matrix`. The generator fetches/reads the source checkout at the recorded commit under `$WSEFFECT_SCRATCH_DIR` (or the system temp fallback), extracts every declared `variant` domain, and writes explicit per-component props/state captures. Runtime visual examples still resolve only from the verified packed tarballs.

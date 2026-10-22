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
The capture harness injects the same vendored Noto Sans test stylesheet into Solid and Gallery pages, waits for its face to load, and records its family/file/license in the matrix. Its comparator permits per-channel RGB noise up to 2 anywhere, and up to 20 only on a one-pixel edge mask formed from the union of both images; all other differences count against the mismatch limits.

### Symmetric component crops

Each paired capture places only the component under test inside `data-sp2-capture-target`; the route headings, gallery shell, and benchmark shell are excluded. Solid and Gallery use the same target geometry: 480px wide, at least 160px tall, 24px padding, and the current theme’s `--gray-2` surface (with `#f6f7f9` fallback). The harness takes viewport screenshots clipped to the shared union of both target boxes and their visible portaled-panel boxes, preserving complete panels while excluding surrounding page content.
Before each open/hover capture, the harness measures the default Solid target and pins both capture targets at those viewport coordinates before rendering the interactive state; this lets each portal calculate its position against its final trigger geometry. It raises floating panel layers above the target surface and waits for positioned panels on both pages without changing comparator tolerances.


For keyboard-focused states, Gallery and Solid both focus the first slider for `Slider`, first radio for `RadioGroup`, the overview link for `TabNav`, or the first button otherwise. This includes `range-keyboard-focus` slider captures.

The DataTable capture is intentionally paired with Solid’s Table reference: the comparison covers visual treatment only, not equivalent component structure or behavior.

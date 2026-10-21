# WSEffect main vs Radix2Solid

## Scope and method

This comparison measures WSEffect main at `200a6a5fcb86f23846e490faddf07c3e67e2e313` against the pinned Radix2Solid fixture at `383676172abb84b4a1d2e54a087d290437ee8848`. It covers `vl-cell`, `vl-filter`, `vl-sort`, `vl-select`, `form-field`, `menus-tick`, `theme-appearance`, `theme-accent`, `shared-date`, `dialog-open`, `dropdown-open`, `nav-cold`, and `nav-prefetch` at 1× and 4× CPU throttle. Each app/scenario/rate cell uses five ABAB blocks (10 measured sessions per app); each A/A band uses 10 adjacent same-app pairs. Event Timing and trace scripting medians follow [GATE-P1 §12.1](../superpowers/specs/2026-10-19-wseffect-foundation-design.md#121-perf-gate-p1). Event Timing is quantized at a 16ms observation threshold; scripting is the shared CDP timeline's scripting duration.

Noise-screen bands are the larger of the two apps' nearest-rank p95 absolute A/A deltas for each metric. A winner is named only if the absolute median gap is greater than that band; `—` means neither app clears the screen. This is an empirical noise screen, not a formal significance test. Results show `Event Timing / scripting` in milliseconds; the A/A column is `ET / scripting` band in milliseconds.

Environment: Node `v24.21.0`, pnpm `11.5.0`, Chromium `156.0.8078.4`, AMD Ryzen 9 9955HX 16-Core Processor. The throttle self-test measured `4.020×`; it passed without retry. The linked JSON preserves the recovered medians, A/A bands, noise verdicts, size classifications, load summaries, and environment. Its note records that the original raw-session JSON was no longer present after the required repository check, so per-session samples, request classifications, and navigation traces could not be retained.

Host load averages (1/5/15 minutes) were `4.01 / 4.14 / 4.43` at start and `4.87 / 4.98 / 5.08` at finish. Across measured ABAB sessions, the min–max load ranges were `3.55–7.23 / 4.62–5.80 / 4.65–5.37`. The table below gives each scenario's mean before/after load across both apps' 10 measured sessions at that rate, in 1/5/15-minute order. Despite the expectation of a busy shared host, the captured load stayed well below 15–25; treat results as directional. Per-session load samples could not be recovered with the raw artifact.

## Timing results

### 1× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script |
|---|---:|---:|---:|---|
| `vl-cell` | 16 / 2.191 | 16 / 0.418 | 0 / 3.039 | — / — |
| `vl-filter` | 16 / 2.306 | 16 / 4.980 | 8 / 6.443 | — / — |
| `vl-sort` | 20 / 2.609 | 16 / 1.914 | 8 / 6.529 | — / — |
| `vl-select` | 16 / 2.035 | 16 / 0.177 | 0 / 2.176 | — / — |
| `form-field` | 16 / 1.814 | 16 / 0.511 | 0 / 1.240 | — / radix2solid |
| `menus-tick` | 16 / 1.664 | 16 / 0.262 | 40 / 6.601 | — / — |
| `theme-appearance` | 24 / 2.074 | 16 / 2.366 | 16 / 2.438 | — / — |
| `theme-accent` | 24 / 2.170 | 16 / 1.847 | 16 / 1.955 | — / — |
| `shared-date` | 16 / 1.396 | 16 / 0.230 | 8 / 0.976 | — / radix2solid |
| `dialog-open` | 24 / 4.973 | 16 / 3.938 | 0 / 0.900 | radix2solid / radix2solid |
| `dropdown-open` | 16 / 6.627 | 16 / 7.322 | 16 / 2.605 | — / — |
| `nav-cold` | 16 / 2.218 | 16 / 1.792 | 0 / 0.319 | — / radix2solid |
| `nav-prefetch` | 16 / 2.117 | 16 / 1.855 | 0 / 0.522 | — / — |

### 4× CPU throttle

| Scenario | Wseffect ET/script | Radix2Solid ET/script | A/A p95 band ET/script | Noise-screen winner ET/script |
|---|---:|---:|---:|---|
| `vl-cell` | 16 / 8.319 | 16 / 1.805 | 0 / 3.327 | — / radix2solid |
| `vl-filter` | 32 / 25.762 | 28 / 20.645 | 8 / 10.038 | — / — |
| `vl-sort` | 32 / 22.825 | 24 / 7.935 | 8 / 5.758 | — / radix2solid |
| `vl-select` | 24 / 7.436 | 16 / 0.794 | 8 / 1.708 | — / radix2solid |
| `form-field` | 16 / 5.628 | 16 / 2.106 | 8 / 2.167 | — / radix2solid |
| `menus-tick` | 16 / 5.722 | 16 / 1.039 | 0 / 1.711 | — / radix2solid |
| `theme-appearance` | 24 / 8.203 | 16 / 9.906 | 8 / 1.502 | — / wseffect |
| `theme-accent` | 24 / 8.652 | 16 / 7.764 | 16 / 8.353 | — / — |
| `shared-date` | 16 / 4.258 | 20 / 0.777 | 16 / 4.469 | — / — |
| `dialog-open` | 32 / 19.138 | 24 / 16.433 | 16 / 6.566 | — / — |
| `dropdown-open` | 32 / 19.610 | 40 / 31.674 | 8 / 30.690 | — / — |
| `nav-cold` | 24 / 8.019 | 16 / 7.888 | 8 / 4.367 | — / — |
| `nav-prefetch` | 24 / 7.976 | 16 / 7.688 | 0 / 5.431 | radix2solid / — |

### Per-interaction host load averages

Each value is the mean of all measured ABAB session before/after samples for both apps, expressed as 1-minute / 5-minute / 15-minute load average. The machine-wide session samples are preserved in the JSON artifact.

| Scenario | 1× load | 4× load |
|---|---:|---:|
| `vl-cell` | 6.77 / 4.84 / 4.66 | 5.61 / 5.36 / 5.03 |
| `vl-filter` | 6.83 / 5.15 / 4.77 | 5.18 / 5.28 / 5.02 |
| `vl-sort` | 5.45 / 4.99 / 4.73 | 4.81 / 5.17 / 4.99 |
| `vl-select` | 5.99 / 5.21 / 4.82 | 5.25 / 5.26 / 5.04 |
| `form-field` | 4.91 / 5.03 / 4.79 | 5.81 / 5.42 / 5.11 |
| `menus-tick` | 4.44 / 4.88 / 4.75 | 5.03 / 5.26 / 5.07 |
| `theme-appearance` | 4.36 / 4.79 / 4.72 | 5.65 / 5.45 / 5.16 |
| `theme-accent` | 4.53 / 4.70 / 4.69 | 5.25 / 5.42 / 5.18 |
| `shared-date` | 5.73 / 5.03 / 4.81 | 5.62 / 5.47 / 5.22 |
| `dialog-open` | 5.71 / 5.12 / 4.85 | 6.41 / 5.73 / 5.32 |
| `dropdown-open` | 5.20 / 5.13 / 4.88 | 6.19 / 5.70 / 5.34 |
| `nav-cold` | 5.51 / 5.23 / 4.94 | 4.12 / 5.03 / 5.13 |
| `nav-prefetch` | 4.89 / 5.13 / 4.92 | 4.67 / 4.98 / 5.10 |

## Sizes

Sizes are transferred bytes by the repository's `pnpm gate:report` classifiers. First-visit and speculative rows include request counts; shell raw bytes are uncompressed totals. Page-chunk bytes come from the same build manifests and size-gate classification.

| Gate / asset | Wseffect | Radix2Solid |
|---|---:|---:|
| GATE-S1 shell (transfer; raw) | 72,582 B; 259,654 B | 33,205 B; 100,037 B |
| GATE-S2 first visit (bytes; requests) | 160,104 B; 16 | 87,006 B; 8 |
| GATE-S4 speculative prefetch (bytes; requests) | 0 B; 0 | 0 B; 0 |
| `styles.css` | 41,520 B | 50,595 B |

### Wseffect page chunks

| Page chunk | Bytes |
|---|---:|
| `browser` | 2,600 |
| `buttons` | 344 |
| `capabilities` | 586 |
| `cards` | 331 |
| `dialog` | 612 |
| `dropdownMenu` | 651 |
| `form` | 522 |
| `island` | 1,895 |
| `layout` | 388 |
| `menus` | 744 |
| `persistence` | 2,115 |
| `sharedA` | 537 |
| `sharedB` | 382 |
| `signals` | 2,121 |
| `tabs` | 593 |
| `textField` | 353 |
| `theme` | 1,105 |
| `typography` | 329 |
| `validation` | 1,205 |
| `virtualList` | 6,101 |

### Radix2Solid page chunks

| Page chunk | Bytes |
|---|---:|
| `buttons` | 282 |
| `cards` | 230 |
| `dialog` | 2,349 |
| `dropdown-menu` | 373 |
| `form` | 147 |
| `layout` | 1,338 |
| `menus` | 149 |
| `shared-a` | 150 |
| `shared` | 416 |
| `tabs` | 1,808 |
| `text-field` | 326 |
| `theme` | 642 |
| `typography` | 255 |
| `virtual-list` | 153 |

## Changes since the 2026-10-20 comparison

The previous report covered merge result `0687682` plus partial follow-ups. This run uses current main `200a6a5`. Changes since then include `ba11911`'s intent-only persistent-navigation prefetch (speculative requests now yield to route loads and user input), `ffd69d7`'s framework boot runtime via `@wsagency/wseffect-app/runtime` with helpers left lazy, app capabilities, the persistent-state fix, and lazy gallery capability pages.

Navigation is now a normal intent-prefetch user flow, not an isolated cold-cache benchmark. The older report found Wseffect's `/menus` route chunk had already been fetched before the measured `nav-cold` click, making that result non-cold and unlike Radix. In the current run, both apps' navigation medians are at or near the Event Timing floor at 1×; at 4× Wseffect is 24ms / 8.019ms (`nav-cold`) and 24ms / 7.976ms (`nav-prefetch`), compared with Radix2Solid's 16ms / 7.888ms and 16ms / 7.688ms. These are descriptive of the current navigation policy and do not establish a causal effect of one commit.

Compared with the prior report's Wseffect first-visit `156,484 B / 16 requests`, first visit is now `160,104 B / 16 requests` (+3,620 B). The runtime split makes `framework-BegffQB6.js` a mandatory boot request (67,138 B) while component helpers stay lazy; shell is now 72,582 B transferred (259,654 B raw), down from the previous 98,881 B transfer. Speculative transfer fell from `29,070 B / 12 requests` to zero, consistent with intent-only prefetch. Radix2Solid's pinned sizes remain measured at fixture commit `383676172`.

## Conclusion and cautions

Only differences clearing the A/A noise screen are: at 1×, Radix2Solid scripting for `form-field`, `shared-date`, `dialog-open`, and `nav-cold`, plus both `dialog-open` metrics; at 4×, Radix2Solid scripting for `vl-cell`, `vl-sort`, `vl-select`, `form-field`, and `menus-tick`, Wseffect scripting for `theme-appearance`, and Radix2Solid Event Timing for `nav-prefetch`. Every other displayed metric is within the measured band.

The Event Timing floor is 16ms, so many apparent ties are not useful for ranking. Two A/A bands are unusually broad: 40ms Event Timing for 1× `menus-tick` and 30.690ms scripting for 4× `dropdown-open`; these reflect high within-app paired variation and suppress a winner. Trace scripting also contains zero-valued samples in several scenarios, retained as collected in the artifact. The captured host load was around 4–7 (not the expected 15–25), so the result is directional; do not over-interpret small gaps or treat the screen as a significance test.

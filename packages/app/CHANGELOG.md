# Changelog

## 0.1.0-rc.0

- Persist and sync values in the supplied Schema codec's encoded form, and validate decoded migration results with the current codec.
- Keep generated page-registry imports isolated behind `@wsagency/wseffect-app/runtime` so lazy capability helpers remain in their lazy chunks.
- Retry navigation loads that overlap failed page prefetches, and group shared dependencies in a stable app chunk.
- Exclude registry page chunks from modulepreload lists to prevent duplicate WebKit requests while retaining shared chunk and CSS preloads.
- Schedule viewport prefetches against idle deadlines, pause them for recent user input and active route loads, and keep route navigation intent-only.
- Keep signal schema decoding within Effect's baseline `SchemaParser` closure; parse SDK multiline JSON and all SSE line endings, invalidate failed EventSource sessions, and buffer patches without loss.
- Document app capabilities, platform and lifecycle caveats, measured helper budgets, and Foldkit's typed `Route.query(Schema)` pattern.

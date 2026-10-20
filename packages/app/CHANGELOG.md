# Changelog
## Unreleased

- Retry navigation loads that overlap failed page prefetches, and group shared dependencies in a stable app chunk.
- Exclude registry page chunks from modulepreload lists to prevent duplicate WebKit requests while retaining shared chunk and CSS preloads.
- Schedule viewport prefetches against idle deadlines, pause them for recent user input and active route loads, and keep route navigation intent-only.
- Keep signal schema decoding within Effect's baseline `SchemaParser` closure; parse SDK multiline JSON and all SSE line endings, invalidate failed EventSource sessions, and buffer patches without loss.

## 0.0.0

- Initial release of the WSEffect app framework.

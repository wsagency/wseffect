# Changelog
## Unreleased

- Retry navigation loads that overlap failed page prefetches, and group shared dependencies in a stable app chunk.
- Exclude registry page chunks from modulepreload lists to prevent duplicate WebKit requests while retaining shared chunk and CSS preloads.

## 0.0.0

- Initial release of the WSEffect app framework.

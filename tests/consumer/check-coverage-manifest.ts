export type CoverageManifest = Readonly<Record<string, string | ReadonlyArray<string>>>

export function checkCoverageManifest(
  manifest: CoverageManifest,
  publicSurface: ReadonlyArray<string>,
  passedChecks: ReadonlyArray<string>,
): string[] {
  const errors: string[] = []
  const publicItems = new Set(publicSurface)
  for (const item of publicItems) {
    if (!Object.hasOwn(manifest, item)) errors.push(`${item}: public item is missing from coverage-manifest.json`)
  }
  for (const [item, checks] of Object.entries(manifest)) {
    if (!publicItems.has(item)) errors.push(`${item}: coverage manifest item is not public`)
    const required = typeof checks === 'string' ? [checks] : checks
    if (!Array.isArray(required) || required.length === 0) {
      errors.push(`${item}: coverage manifest entry must list at least one check`)
    } else {
      for (const check of required) {
        if (!passedChecks.includes(check)) errors.push(`${item}: check ${check} did not pass`)
      }
    }
  }
  return errors
}

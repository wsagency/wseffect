export function checkTreeShaking(bundleText: string, marker: string): string[] {
  return bundleText.includes(marker) ? [`tree-shaking: unused export marker ${marker} is present`] : []
}

import axe from 'axe-core'
import type { Page } from '@playwright/test'

export interface AccessibilityViolation {
  readonly id: string
  readonly impact: string | null
  readonly description: string
  readonly nodes: number
  readonly diagnostics: ReadonlyArray<Readonly<{ target: ReadonlyArray<string>; failureSummary: string | null }>>
}

export async function accessibilityViolations(page: Page): Promise<ReadonlyArray<AccessibilityViolation>> {
  await page.addScriptTag({ content: axe.source })
  return page.evaluate(async () => {
    const axe = (window as Window & { axe: { run: (context: Document) => Promise<{ violations: Array<{
      id: string
      impact: string | null
      description: string
      nodes: ReadonlyArray<Readonly<{ target: ReadonlyArray<string>; failureSummary: string | null }>>
    }> }> } }).axe
    const results = await axe.run(document)
    return results.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.length,
      diagnostics: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }))
  })
}

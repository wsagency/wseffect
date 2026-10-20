import { APP_CAPABILITIES } from './app-capabilities.ts'

export interface AppCapabilitySizeResult {
  readonly ok: boolean
  readonly errors: ReadonlyArray<string>
}

export interface AppCapabilityManifestEntry {
  readonly file: string
  readonly imports?: ReadonlyArray<string>
  readonly dynamicImports?: ReadonlyArray<string>
}

export function appCapabilityManifestClosures(manifest: Readonly<Record<string, AppCapabilityManifestEntry>>, entryKey: string): {
  readonly eager: ReadonlySet<string>
  readonly dynamic: ReadonlySet<string>
} {
  const entry = manifest[entryKey]
  if (!entry) throw new Error(`App capability manifest entry not found: ${entryKey}`)
  const eager = new Set<string>()
  const visitStatic = (key: string): void => {
    if (eager.has(key)) return
    const chunk = manifest[key]
    if (!chunk) throw new Error(`App capability manifest references missing static chunk: ${key}`)
    eager.add(key)
    for (const imported of chunk.imports ?? []) visitStatic(imported)
  }
  visitStatic(entryKey)
  const dynamic = new Set<string>()
  const visitDynamic = (key: string): void => {
    const chunk = manifest[key]
    if (!chunk) throw new Error(`App capability manifest references missing dynamic chunk: ${key}`)
    if (dynamic.has(key)) return
    dynamic.add(key)
    for (const imported of chunk.dynamicImports ?? []) visitDynamic(imported)
  }
  for (const key of eager) for (const imported of manifest[key]!.dynamicImports ?? []) visitDynamic(imported)
  return { eager, dynamic }
}

export function checkAppCapabilitySizes(input: {
  readonly helper: string
  readonly helperOnlyBytes: number
  readonly eagerReachable: boolean
}): AppCapabilitySizeResult {
  const capability = APP_CAPABILITIES.find((entry) => entry.helper === input.helper)
  if (!capability) throw new Error(`Unknown app capability helper: ${input.helper}`)
  const errors: string[] = []
  if (!Number.isFinite(input.helperOnlyBytes) || input.helperOnlyBytes < 0) {
    errors.push(`helper-only Brotli bytes must be a non-negative finite number; received ${input.helperOnlyBytes}`)
  } else if (input.helperOnlyBytes > capability.budgetBytes) {
    errors.push(`${input.helper} helper-only Brotli-q11 size ${input.helperOnlyBytes} B exceeds ${capability.budgetBytes} B`)
  }
  if (input.eagerReachable) errors.push(`${input.helper} is eagerly reachable; helper imports must remain independently lazy`)
  return { ok: errors.length === 0, errors }
}

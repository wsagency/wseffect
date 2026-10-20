export interface AppCapability {
  readonly helper: string
  readonly exports: ReadonlyArray<string>
  readonly budgetBytes: number
  readonly allowedExtraEffectModules: ReadonlyArray<string>
}

export const APP_CAPABILITIES: ReadonlyArray<AppCapability> = [
  { helper: 'signals', exports: ['signalSubscription'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'validation', exports: ['projectConstraintValidity'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'persistence', exports: ['persist'], budgetBytes: 1_536, allowedExtraEffectModules: ['persistence/KeyValueStore.js'] },
  { helper: 'breakpoints', exports: ['breakpointSubscription'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'locale', exports: ['makeLocale', 'LocaleService'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'clipboard', exports: ['clipboardCommand'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'scroll', exports: ['scrollIntoViewCommand'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'resize', exports: ['resizeObserverMount'], budgetBytes: 1_536, allowedExtraEffectModules: [] },
  { helper: 'island', exports: ['Island'], budgetBytes: 4_608, allowedExtraEffectModules: [] },
]

const UNEXPECTED_MODULE_GUIDANCE = 'DEP-1: B is the packed consumer entry closure with an empty helper page; B+H is the same build with exactly one helper imported only by its lazy page. Compare B+H Effect modules to B; the Gallery framework map is historical only, not the production baseline. When decoding is required, use the public SchemaParser.decodeUnknownExit API; never import runtime Schema from the effect package root. Root Schema runtime use adds DateTime.js, Tuple.js, encoding/EncodingError.js, http/internal/urlParams.js, and internal/redacted.js beyond B. Keep browser-helper Effect module deltas at zero and allow only persistence/KeyValueStore.js for Persistence. Inspect source-map importers and remove the cause; never suppress this diff.'

export interface CapabilityAvailability {
  readonly available: ReadonlyArray<AppCapability>
  readonly missing: ReadonlyArray<string>
}

export function resolveAppCapabilityAvailability(input: {
  readonly exportedNames: ReadonlySet<string>
  readonly requireAll?: boolean
}): CapabilityAvailability {
  const available: AppCapability[] = []
  const missing: string[] = []
  for (const capability of APP_CAPABILITIES) {
    const absent = capability.exports.filter((name) => !input.exportedNames.has(name))
    if (absent.length === 0) available.push(capability)
    else missing.push(`${capability.helper}: ${absent.join(', ')}`)
  }
  if (input.requireAll && missing.length > 0) {
    throw new Error(`App capability exports missing (requireAll): ${missing.map((item) => `${item} — helper not exported yet`).join('; ')}`)
  }
  return { available, missing }
}

export interface AppCapabilityModulesResult {
  readonly ok: boolean
  readonly unexpected: ReadonlyArray<string>
}

export function checkAppCapabilityModules(input: {
  readonly helper: string
  readonly modules: ReadonlyArray<string>
  readonly baseline: ReadonlyArray<string>
}): AppCapabilityModulesResult {
  const capability = APP_CAPABILITIES.find((entry) => entry.helper === input.helper)
  if (!capability) throw new Error(`Unknown app capability helper: ${input.helper}`)
  const baseline = new Set(input.baseline.map(normalizeEffectModule))
  const allowed = new Set(capability.allowedExtraEffectModules)
  const unexpected = [...new Set(input.modules.map(normalizeEffectModule))]
    .filter((module) => !baseline.has(module) && !allowed.has(module))
    .sort()
  return { ok: unexpected.length === 0, unexpected }
}

export function formatAppCapabilityModuleFailure(helper: string, unexpected: ReadonlyArray<string>): string {
  return `${helper} adds unexpected Effect modules: ${unexpected.join(', ')}. ${UNEXPECTED_MODULE_GUIDANCE}`
}

export function effectModulesFromSourceMap(sources: ReadonlyArray<string>): string[] {
  return [...new Set(sources.filter(isEffectModule).map(normalizeEffectModule))].sort()
}

export function checkUnusedAppCapabilityModules(input: {
  readonly helper: string
  readonly modules: ReadonlyArray<string>
}): ReadonlyArray<string> {
  if (!APP_CAPABILITIES.some((entry) => entry.helper === input.helper)) throw new Error(`Unknown app capability helper: ${input.helper}`)
  return [...new Set(input.modules.filter((source) => APP_CAPABILITIES.some((entry) => entry.helper !== input.helper
    && source.endsWith(`/dist/${entry.helper}.js`))))].sort()
}

function normalizeEffectModule(source: string): string {
  const normalized = source.replaceAll('\\', '/')
  const marker = '/effect/dist/'
  const index = normalized.lastIndexOf(marker)
  return index >= 0 ? normalized.slice(index + marker.length) : normalized.startsWith('effect/dist/') ? normalized.slice('effect/dist/'.length) : normalized
}

function isEffectModule(source: string): boolean {
  const normalized = source.replaceAll('\\', '/')
  return normalized.includes('/effect/dist/') || normalized.startsWith('effect/dist/')
}

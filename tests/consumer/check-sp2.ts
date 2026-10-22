import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'


export async function checkPackedSp2Artifacts(themesPackage: string): Promise<void> {
  const [license, upstream, packageFiles] = await Promise.all([
    readFile(join(themesPackage, 'LICENSE'), 'utf8'),
    readFile(join(themesPackage, 'UPSTREAM.md'), 'utf8'),
    readdir(themesPackage),
  ])
  if (!packageFiles.includes('LICENSE') || !packageFiles.includes('UPSTREAM.md')) {
    throw new Error('packed themes package must include LICENSE and UPSTREAM.md')
  }
  const normalizedLicense = license.toLowerCase()
  const normalizedUpstream = upstream.toLowerCase()
  for (const notice of ['Radix2Solid', 'Radix Themes', 'Radix Colors']) {
    const normalizedNotice = notice.toLowerCase()
    if (!normalizedLicense.includes(normalizedNotice) || !normalizedUpstream.includes(normalizedNotice)) {
      throw new Error(`packed themes package is missing the ${notice} license/provenance notice`)
    }
  }
  const cssDirectory = join(themesPackage, 'dist/styles/css')
  const cssFiles = (await readdir(cssDirectory)).filter(file => file.endsWith('.css'))
  if (cssFiles.length === 0) throw new Error('packed themes package has no component CSS artifacts')
  for (const file of cssFiles) {
    const css = await readFile(join(cssDirectory, file), 'utf8')
    if (!css.trim()) throw new Error(`packed themes CSS is empty: ${file}`)
  }
}

export function checkPrimitiveTreeShaking(sources: ReadonlyArray<string>): string[] {
  const normalized = sources.map((source) => source.replaceAll('\\', '/'))
  const primitiveModules = normalized.filter((source) => source.includes('/wseffect-primitives/dist/'))
  const unrelated = primitiveModules.filter((source) => !source.endsWith('/wseffect-primitives/dist/checkbox-group.js'))
  const errors: string[] = []
  if (!primitiveModules.some((source) => source.endsWith('/wseffect-primitives/dist/checkbox-group.js'))) {
    errors.push('primitive tree-shaking bundle does not include checkbox-group.js')
  }
  if (unrelated.length) errors.push(`primitive tree-shaking bundle includes unrelated modules: ${unrelated.join(', ')}`)
  return errors
}

export function disallowedEffectModules(sources: ReadonlyArray<string>): string[] {
  return [...new Set(sources.map((source) => source.replaceAll('\\', '/')))]
    .filter((source) => source.includes('/effect/dist/'))
    .sort()
}

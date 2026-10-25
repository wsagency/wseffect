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

export function checkFoldkitUiTreeShaking(sources: ReadonlyArray<string>): string[] {
  const normalized = sources.map((source) => source.replaceAll('\\', '/'))
  const uiModules = normalized.filter((source) => source.includes('/wseffect-foldkit-ui/dist/'))
  const checkboxGroupModules = uiModules.filter((source) =>
    source.includes('/dist/checkboxGroup/') || source.endsWith('/dist/checkboxGroup.js'))
  const unrelated = uiModules.filter((source) =>
    !source.includes('/dist/checkboxGroup/')
    && !source.endsWith('/dist/checkboxGroup.js')
    && !source.includes('/dist/checkbox/')
    && !source.endsWith('/dist/checkbox.js'))
  const errors: string[] = []
  if (checkboxGroupModules.length === 0) {
    errors.push('packed SP2 Foldkit UI tree-shaking bundle does not include checkboxGroup')
  }
  if (unrelated.length) {
    errors.push(`packed SP2 Foldkit UI tree-shaking bundle includes unrelated modules: ${unrelated.join(', ')}`)
  }
  return errors
}

export function checkNoPrimitivePackageReferences(references: ReadonlyArray<string>): string[] {
  return references
    .filter((reference) => reference.includes('wseffect-primitives'))
    .map((reference) => `packed consumer contains removed package reference: ${reference}`)
}

export function disallowedEffectModules(sources: ReadonlyArray<string>): string[] {
  return [...new Set(sources.map((source) => source.replaceAll('\\', '/')))]
    .filter((source) => source.includes('/effect/dist/'))
    .sort()
}

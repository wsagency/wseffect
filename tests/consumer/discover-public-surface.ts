import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

export type PackageExport = { readonly default?: string; readonly import?: string; readonly types?: string }
export type PackageExports = Readonly<Record<string, PackageExport>>
function exportTarget(entry: PackageExport, packageName: string, subpath: string): string {
  const target = entry.default ?? entry.import
  if (!target) throw new Error(`${packageName}:${subpath} is missing a default or import target`)
  return target
}

export function extractExportNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/\bexport\s+(?:(?:declare|type)\s+)*(?:const|let|var|function|class|enum|namespace|interface|type)\s+([\w$]+)/g)) names.add(match[1])
  if (/\bexport\s+default\b/.test(source)) names.add('default')
  for (const match of source.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of match[1].split(',')) {
      const name = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/).at(-1)?.trim()
      if (name) names.add(name)
    }
  }
  for (const match of source.matchAll(/\bexport\s+\*\s+as\s+([\w$]+)/g)) names.add(match[1])
  return [...names].sort()
}

export function discoverPublicItems(
  packageName: string,
  exports: PackageExports,
  distFiles: ReadonlyArray<string>,
  moduleExports: Readonly<Record<string, ReadonlyArray<string>>>,
  typeExports: Readonly<Record<string, ReadonlyArray<string>>> = {},
): string[] {
  const items = new Set<string>()
  for (const [subpath, entry] of Object.entries(exports)) {
    items.add(`subpath:${packageName}:${subpath}`)
    const target = exportTarget(entry, packageName, subpath).replaceAll('\\', '/').replace(/^\.\//, '')
    const wildcard = target.indexOf('*')
    const matches = distFiles.filter((file) => wildcard < 0
      ? file === target
      : file.startsWith(target.slice(0, wildcard)) && file.endsWith(target.slice(wildcard + 1)))
    const isCss = target.endsWith('.css') || subpath.endsWith('.css') || (wildcard >= 0 && /\/(?:styles|tokens|layout|css)\//.test(target))
    let declarationExports: ReadonlyArray<string> = []
    if (entry.types) {
      const typesTarget = entry.types.replaceAll('\\', '/').replace(/^\.\//, '')
      const names = typeExports[typesTarget]
      if (!names) throw new Error(`${packageName}:${subpath} does not resolve to a declaration module`)
      declarationExports = names
    }
    if (isCss) {
      if (matches.length === 0) throw new Error(`${packageName}:${subpath} does not resolve to a CSS file`)
      const targetPrefix = wildcard < 0 ? '' : target.slice(0, wildcard)
      const targetSuffix = wildcard < 0 ? '' : target.slice(wildcard + 1)
      for (const file of matches) {
        const wildcardValue = wildcard < 0 ? '' : file.slice(targetPrefix.length, targetSuffix ? -targetSuffix.length : undefined)
        const concreteSubpath = subpath.includes('*') ? subpath.replace('*', wildcardValue) : subpath
        items.add(`subpath:${packageName}:${concreteSubpath}`)
        items.add(`css:${packageName}:${file}`)
        for (const name of declarationExports) items.add(`type:${packageName}:${concreteSubpath}:${name}`)
      }
    } else if (target.endsWith('.js')) {
      const names = moduleExports[target]
      if (!names) throw new Error(`${packageName}:${subpath} does not resolve to a JavaScript module`)
      for (const name of names) items.add(`export:${packageName}:${subpath}:${name}`)
      for (const name of declarationExports) items.add(`type:${packageName}:${subpath}:${name}`)
    } else {
      if (matches.length === 0) throw new Error(`${packageName}:${subpath} does not resolve to a default target`)
      items.add(`subpath:${packageName}:${subpath}`)
      for (const name of declarationExports) items.add(`type:${packageName}:${subpath}:${name}`)
    }
  }
  return [...items].sort()
}

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = []
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      else found.push(path)
    }
  }
  await visit(directory)
  return found
}

export async function discoverPackagePublicSurface(packageDir: string, packageName: string): Promise<string[]> {
  const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8')) as { exports: PackageExports }
  const distDir = resolve(packageDir, 'dist')
  const files = await filesUnder(distDir)
  const relativeFiles = files.map((path) => relative(packageDir, path).split(sep).join('/'))
  const modules = new Map(files.filter((path) => path.endsWith('.js')).map((path) => [relative(packageDir, path).split(sep).join('/'), path]))
  const declarations = new Map(files.filter((path) => path.endsWith('.d.ts')).map((path) => [relative(packageDir, path).split(sep).join('/'), path]))
  const moduleExports: Record<string, string[]> = {}
  const typeExports: Record<string, string[]> = {}
  async function collectExports(path: string, visited: Set<string>, output: Set<string>): Promise<void> {
    if (visited.has(path)) return
    visited.add(path)
    const source = await readFile(path, 'utf8')
    for (const name of extractExportNames(source)) output.add(name)
    for (const [, , specifier] of source.matchAll(/\bexport\s+(?:type\s+)?\*\s+from\s*(['"])([^'"]+)\1/g)) {
      if (!specifier.startsWith('.')) continue
      const declaration = path.endsWith('.d.ts')
      const resolvedSpecifier = declaration ? specifier.replace(/\.js$/, '.d.ts') : specifier
      const child = resolve(dirname(path), resolvedSpecifier)
      const childKey = relative(packageDir, child).split(sep).join('/')
      if (!declaration || declarations.has(childKey)) await collectExports(child, visited, output)
    }
  }
  for (const [subpath, entry] of Object.entries(packageJson.exports)) {
    const target = exportTarget(entry, packageName, subpath).replaceAll('\\', '/').replace(/^\.\//, '')
    if (target.endsWith('.js') && !target.includes('*')) {
      const modulePath = modules.get(target)
      if (modulePath) {
        const names = new Set<string>()
        await collectExports(modulePath, new Set(), names)
        moduleExports[target] = [...names]
      }
    }
    if (entry.types) {
      const typesTarget = entry.types.replaceAll('\\', '/').replace(/^\.\//, '')
      const declarationPath = declarations.get(typesTarget)
      if (declarationPath) {
        const names = new Set<string>()
        await collectExports(declarationPath, new Set(), names)
        typeExports[typesTarget] = [...names]
      }
    }
  }
  return discoverPublicItems(packageName, packageJson.exports, relativeFiles, moduleExports, typeExports)
}

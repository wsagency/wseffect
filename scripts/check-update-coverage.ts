import { readFile, readdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface FunctionCoverage {
  readonly f: Record<string, number>
  readonly fnMap: Record<string, { readonly name: string }>
}
type CoverageMap = Record<string, FunctionCoverage>

export function findUpdateModules(files: string[]): string[] {
  const updates: string[] = []
  for (const path of files) {
    const source = readFileSync(path, 'utf8')
    if (
      /\bexport\s+(?:const|function)\s+update\b/.test(source)
      || /\bexport\s*\{[^}]*\bupdate\b[^}]*\}/s.test(source)
      || /\bexport\s+(?:const|function)\s+make\w*Update\b/.test(source)
      || /\bexport\s+(?:const|function)\s+bindKit\b/.test(source)
      || /\bUpdate\.(?:Return|ReturnWithOutMessage)\b/.test(source)
    ) {
      updates.push(path)
    }
  }
  return updates
}

export function uncoveredFunctions(coverage: CoverageMap, modules: string[]): string[] {
  const results: string[] = []
  const coverageByPath = new Map(Object.entries(coverage).map(([path, fileCoverage]) => [resolve(path), fileCoverage]))
  for (const modulePath of modules) {
    const fileCoverage = coverageByPath.get(resolve(modulePath))
    const displayPath = relative(process.cwd(), modulePath)
    if (!fileCoverage) {
      results.push(`${displayPath}:missing coverage`)
      continue
    }
    for (const [id, count] of Object.entries(fileCoverage.f)) {
      if (count === 0) results.push(`${displayPath}:${fileCoverage.fnMap[id]?.name ?? `function ${id}`}`)
    }
  }
  return results
}

export async function findCoverageFiles(directory: string): Promise<string[]> {
  const matches: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return matches
    throw error
  }
  for (const entry of entries) {
    if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git')) continue
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) matches.push(...await findCoverageFiles(path))
    else if (entry.name === 'coverage-final.json') matches.push(path)
  }
  return matches
}

async function findSourceFiles(directory: string): Promise<string[]> {
  const matches: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return matches
    throw error
  }
  for (const entry of entries) {
    if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git')) continue
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) matches.push(...await findSourceFiles(path))
    else if (entry.name.endsWith('.ts')) matches.push(path)
  }
  return matches
}

// Vendored Menu and Listbox state machines contain many untouched callbacks,
// so do not require file-wide function coverage. Their local context, anchor,
// mode, and multi-child changes have focused behavior coverage in
// foldkit-ui/src/menu/context*.test.ts, listboxSelect/selectPosition.test.ts,
// and listbox/single.test.ts.
const absorbedUpdateSources = [
  '/packages/foldkit-ui/src/menu/context.ts',
  '/packages/foldkit-ui/src/tooltip/group.ts',
  '/packages/foldkit-ui/src/slider/range.ts',
  '/packages/foldkit-ui/src/anchor/anchor.ts',
  '/packages/foldkit-ui/src/listboxSelect/index.ts',
  '/packages/foldkit-ui/src/virtualList/index.ts',
  '/packages/foldkit-ui/src/checkboxGroup/index.ts',
]

export function isUpdateCoverageSource(path: string): boolean {
  if (
    path.includes('/packages/foldkit-ui/')
    && !absorbedUpdateSources.some(source => path.endsWith(source))
  ) return false
  return path.includes('/src/')
    && !path.endsWith('.test.ts')
    && !path.includes('/src/test/')
    && !path.includes('/packages/foldkit/src/')
    && !path.includes('/packages/vite-plugin/')
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const coverageFiles = await findCoverageFiles(root)
  const sourceFiles = (await findSourceFiles(resolve(root, 'packages'))).filter(isUpdateCoverageSource)
  const updateModules = findUpdateModules(sourceFiles)
  const coverage: CoverageMap = {}
  for (const coveragePath of coverageFiles) {
    Object.assign(coverage, JSON.parse(await readFile(coveragePath, 'utf8')) as CoverageMap)
  }
  const errors = uncoveredFunctions(coverage, updateModules)
  if (errors.length > 0) {
    console.error(`uncovered update functions:\n${errors.join('\n')}`)
    process.exitCode = 1
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

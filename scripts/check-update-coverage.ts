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
    if (/\bexport\s+(?:const|function)\s+update\b/.test(source) || /\bexport\s*\{[^}]*\bupdate\b[^}]*\}/s.test(source)) {
      updates.push(path)
    }
  }
  return updates
}

export function uncoveredFunctions(coverage: CoverageMap, modules: string[]): string[] {
  const results: string[] = []
  const moduleSet = new Set(modules.map((path) => resolve(path)))
  for (const [path, fileCoverage] of Object.entries(coverage)) {
    if (!moduleSet.has(resolve(path))) continue
    const displayPath = relative(process.cwd(), path)
    for (const [id, count] of Object.entries(fileCoverage.f)) {
      if (count === 0) results.push(`${displayPath}:${fileCoverage.fnMap[id]?.name ?? `function ${id}`}`)
    }
  }
  return results
}

async function findCoverageFiles(directory: string): Promise<string[]> {
  const matches: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return matches
    throw error
  }
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) matches.push(...await findCoverageFiles(path))
    else if (entry.name === 'coverage-final.json') matches.push(path)
  }
  return matches
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const coverageFiles = await findCoverageFiles(root)
  const errors: string[] = []
  for (const coveragePath of coverageFiles) {
    const coverage = JSON.parse(await readFile(coveragePath, 'utf8')) as CoverageMap
    const modules = findUpdateModules(Object.keys(coverage).filter((path) => path.endsWith('.ts') && fileExists(path)))
    errors.push(...uncoveredFunctions(coverage, modules))
  }
  if (errors.length > 0) {
    console.error(`uncovered update functions:\n${errors.join('\n')}`)
    process.exitCode = 1
  }
}

function fileExists(path: string): boolean {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

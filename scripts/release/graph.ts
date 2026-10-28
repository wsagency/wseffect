import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type PackageManifest = {
  name: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export type ReleaseEdge = { from: string; to: string }

export function releaseOrder(
  manifests: ReadonlyArray<PackageManifest>,
): { order: string[]; edges: ReleaseEdge[] } {
  const names = new Set<string>()
  for (const manifest of manifests) {
    if (names.has(manifest.name)) throw new Error(`Duplicate package manifest: ${manifest.name}`)
    names.add(manifest.name)
  }

  const edges: ReleaseEdge[] = []
  const outgoing = new Map<string, Set<string>>()
  const incomingCount = new Map<string, number>()
  for (const name of names) {
    outgoing.set(name, new Set())
    incomingCount.set(name, 0)
  }

  for (const manifest of manifests) {
    for (const dependencies of [manifest.dependencies, manifest.peerDependencies]) {
      for (const [dependency, version] of Object.entries(dependencies ?? {})) {
        if (version !== 'workspace:*') continue
        if (!names.has(dependency)) {
          throw new Error(`Missing internal package ${dependency} required by ${manifest.name}`)
        }
        const dependents = outgoing.get(dependency)!
        if (dependents.has(manifest.name)) continue
        dependents.add(manifest.name)
        incomingCount.set(manifest.name, incomingCount.get(manifest.name)! + 1)
        edges.push({ from: dependency, to: manifest.name })
      }
    }
  }

  edges.sort((left, right) => (left.from < right.from ? -1 : left.from > right.from ? 1 : left.to < right.to ? -1 : left.to > right.to ? 1 : 0))

  const ready = [...names].filter((name) => incomingCount.get(name) === 0).sort()
  const order: string[] = []
  while (ready.length > 0) {
    const name = ready.shift()!
    order.push(name)
    for (const dependent of [...outgoing.get(name)!].sort()) {
      const remaining = incomingCount.get(dependent)! - 1
      incomingCount.set(dependent, remaining)
      if (remaining === 0) {
        ready.push(dependent)
        ready.sort()
      }
    }
  }

  if (order.length !== manifests.length) {
    const cycle = [...names].filter((name) => incomingCount.get(name)! > 0).sort()
    throw new Error(`Dependency cycle among packages: ${cycle.join(', ')}`)
  }
  return { order, edges }
}

const packagePaths = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin']

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const manifests = await Promise.all(packagePaths.map(async (directory) => {
    const text = await readFile(resolve(root, 'packages', directory, 'package.json'), 'utf8')
    return JSON.parse(text) as PackageManifest
  }))
  const result = releaseOrder(manifests)
  console.log('Edges:')
  for (const edge of result.edges) console.log(`  ${edge.from} -> ${edge.to}`)
  console.log('Order:')
  for (const name of result.order) console.log(`  ${name}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

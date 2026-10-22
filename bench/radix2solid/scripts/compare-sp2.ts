export type PixelImage = { width: number; height: number; data: Uint8Array }
export type SemanticPair = { id: string; state: string; props: unknown; theme?: string }
export type PixelComparison = { status: 'PASSED' | 'FAILED'; accepted: boolean; changedPixels: number; changedPercent: number; largestRegionPixels: number; largestRegionPercent: number; sizeMismatch?: { left: { width: number; height: number }; right: { width: number; height: number } } }

const PIXEL_NOISE_DELTA = 2
const EDGE_ANTIALIAS_DELTA = 20

function withinChannelDelta(a: PixelImage, b: PixelImage, pixel: number, delta: number): boolean {
  const offset = pixel * 4
  return Math.abs(a.data[offset]! - b.data[offset]!) <= delta && Math.abs(a.data[offset + 1]! - b.data[offset + 1]!) <= delta && Math.abs(a.data[offset + 2]! - b.data[offset + 2]!) <= delta
}

function equalPixel(a: PixelImage, b: PixelImage, pixel: number): boolean {
  return withinChannelDelta(a, b, pixel, PIXEL_NOISE_DELTA)
}

function isEdge(image: PixelImage, x: number, y: number): boolean {
  const offset = (y * image.width + x) * 4
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]] as const) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= image.width || ny < 0 || ny >= image.height) continue
    const other = (ny * image.width + nx) * 4
    if (Math.abs(image.data[offset]! - image.data[other]!) + Math.abs(image.data[offset + 1]! - image.data[other + 1]!) + Math.abs(image.data[offset + 2]! - image.data[other + 2]!) > 48) return true
  }
  return false
}

export function comparePixels(left: PixelImage, right: PixelImage): PixelComparison {
  if (left.width !== right.width || left.height !== right.height) return {
    status: 'FAILED',
    accepted: false,
    changedPixels: 0,
    changedPercent: 0,
    largestRegionPixels: 0,
    largestRegionPercent: 0,
    sizeMismatch: {
      left: { width: left.width, height: left.height },
      right: { width: right.width, height: right.height },
    },
  }
  if (left.data.length !== right.data.length) throw new Error('capture pixel data lengths do not match')
  const { width, height } = left
  const total = width * height
  const edgeMask = new Uint8Array(total)
  for (let pixel = 0; pixel < total; pixel += 1) {
    const x = pixel % width
    const y = Math.floor(pixel / width)
    if (isEdge(left, x, y) || isEdge(right, x, y)) edgeMask[pixel] = 1
  }
  const changed = new Uint8Array(total)
  let changedPixels = 0
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (equalPixel(left, right, pixel)) continue
    if (edgeMask[pixel] && withinChannelDelta(left, right, pixel, EDGE_ANTIALIAS_DELTA)) continue
    changed[pixel] = 1
    changedPixels += 1
  }
  const visited = new Uint8Array(total)
  let largestRegionPixels = 0
  for (let start = 0; start < total; start += 1) {
    if (!changed[start] || visited[start]) continue
    const pending = [start]
    visited[start] = 1
    let size = 0
    while (pending.length > 0) {
      const pixel = pending.pop()!
      size += 1
      const x = pixel % width
      const y = Math.floor(pixel / width)
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx
        const ny = y + dy
        const next = ny * width + nx
        if ((dx !== 0 || dy !== 0) && nx >= 0 && nx < width && ny >= 0 && ny < height && changed[next] && !visited[next]) {
          visited[next] = 1
          pending.push(next)
        }
      }
    }
    largestRegionPixels = Math.max(largestRegionPixels, size)
  }
  const changedPercent = changedPixels * 100 / total
  const largestRegionPercent = largestRegionPixels * 100 / total
  const accepted = changedPercent <= 0.5 && largestRegionPercent <= 0.25
  return { status: accepted ? 'PASSED' : 'FAILED', accepted, changedPixels, changedPercent, largestRegionPixels, largestRegionPercent }
}

export function validatePairs<T extends SemanticPair>(pairs: ReadonlyArray<T>): void {
  const ids: Record<string, true> = {}
  for (const pair of pairs) {
    if (ids[pair.id]) throw new Error(`duplicate capture id: ${pair.id}`)
    ids[pair.id] = true
    if (!pair.state || pair.props === undefined) throw new Error(`capture ${pair.id} has incomplete semantic state/props`)
  }
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    return `{${fields.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function validateSemanticPair(left: SemanticPair, right: SemanticPair): void {
  if (left.id !== right.id || left.state !== right.state || left.theme !== right.theme || stableJson(left.props) !== stableJson(right.props)) {
    throw new Error(`semantic mismatch for capture ${left.id}`)
  }
}

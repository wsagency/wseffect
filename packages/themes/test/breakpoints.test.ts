import { describe, expect, it } from 'vitest'
import { BREAKPOINTS } from '../src/breakpoints.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('shared breakpoint tokens', () => {
  it('matches the shared ordered public thresholds and custom media CSS', async () => {
    expect(BREAKPOINTS).toEqual([
      { name: 'xs', minWidth: 520 },
      { name: 'sm', minWidth: 768 },
      { name: 'md', minWidth: 1024 },
      { name: 'lg', minWidth: 1280 },
      { name: 'xl', minWidth: 1640 },
    ])
    const css = await readFile(resolve(import.meta.dirname, '../src/styles/breakpoints.css'), 'utf8')
    expect(css).toBe('@custom-media --xs (min-width: 520px);\n@custom-media --sm (min-width: 768px);\n@custom-media --md (min-width: 1024px);\n@custom-media --lg (min-width: 1280px);\n@custom-media --xl (min-width: 1640px);\n')
  })
})

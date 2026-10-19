import { describe, expect, it } from 'vitest'
import { validateManifest } from '@wsagency/wseffect-app/vite'
import { manifest } from '../vite.config.js'

describe('gallery manifest', () => {
  it('satisfies the PWA manifest contract', () => {
    expect(validateManifest(manifest)).toEqual([])
  })
})

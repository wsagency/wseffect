import { describe, expect, it } from 'vitest'
import { classTable } from '../src/props/classTable.js'
import { responsiveClasses } from '../src/props/responsive.js'
import { paddingPropDefs } from '../src/props/padding.props.js'

describe('responsive prop classes', () => {
  it('reuses the frozen empty result for undefined values', () => {
    const first = responsiveClasses(paddingPropDefs.p, undefined)
    const second = responsiveClasses(paddingPropDefs.p, undefined)
    expect(second).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.classes)).toBe(true)
    expect(Object.isFrozen(first.style)).toBe(true)
  })
  it('maps enum values to their precomputed base class', () => {
    expect(responsiveClasses(paddingPropDefs.p, '4')).toEqual({ classes: ['rt-r-p-4'], style: {} })
  })

  it('maps responsive enum values to breakpoint-prefixed classes', () => {
    expect(responsiveClasses(paddingPropDefs.p, { initial: '2', md: '4' })).toEqual({
      classes: ['rt-r-p-2', 'md:rt-r-p-4'],
      style: {},
    })
  })

  it('maps arbitrary values to a custom property class', () => {
    expect(responsiveClasses(paddingPropDefs.p, '13px')).toEqual({
      classes: ['rt-r-p'],
      style: { '--p': '13px' },
    })
  })

  it('maps responsive arbitrary values to breakpoint custom properties', () => {
    expect(responsiveClasses(paddingPropDefs.p, { sm: '13px' })).toEqual({
      classes: ['sm:rt-r-p'],
      style: { '--p-sm': '13px' },
    })
  })

  it('maps px arbitrary values to both CSS properties', () => {
    expect(responsiveClasses(paddingPropDefs.px, '13px')).toEqual({
      classes: ['rt-r-px'],
      style: { '--pl': '13px', '--pr': '13px' },
    })
  })

  it('maps responsive px arbitrary values to both breakpoint custom properties', () => {
    expect(responsiveClasses(paddingPropDefs.px, { md: '13px' })).toEqual({
      classes: ['md:rt-r-px'],
      style: { '--pl-md': '13px', '--pr-md': '13px' },
    })
  })

  it('freezes precomputed class maps', () => {
    const variants = classTable('rt-variant-', ['solid', 'soft'] as const)
    expect(variants).toEqual({ solid: 'rt-variant-solid', soft: 'rt-variant-soft' })
    expect(Object.isFrozen(variants)).toBe(true)
    expect(variants.solid).toBe(variants.solid)
  })
})

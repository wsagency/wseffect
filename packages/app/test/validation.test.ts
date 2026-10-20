import { describe, expect, it } from 'vitest'
import { projectConstraintValidity } from '../src/validation.js'

describe('projectConstraintValidity', () => {
  it('projects valid-invalid-valid transitions while preserving existing descriptions', () => {
    const input = document.createElement('input')
    input.setAttribute('aria-describedby', 'help error')

    expect(projectConstraintValidity(input, 'error', { _tag: 'Valid' })._tag).toBe('Success')
    expect(input.validationMessage).toBe('')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBe('help')

    expect(projectConstraintValidity(input, 'error', { _tag: 'Invalid', message: 'Required' })._tag).toBe('Success')
    expect(input.validationMessage).toBe('Required')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('help error')

    expect(projectConstraintValidity(input, 'error', { _tag: 'Valid' })._tag).toBe('Success')
    expect(input.validationMessage).toBe('')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBe('help')
  })

  it('returns a typed error for controls outside the supported native control set', () => {
    const div = document.createElement('div')
    const result = projectConstraintValidity(div as never, 'error', { _tag: 'Invalid', message: 'Bad' })
    expect(result._tag).toBe('Failure')
    if (result._tag === 'Failure') expect(result.failure).toEqual({ _tag: 'InvalidControl' })
  })
})

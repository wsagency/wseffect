import { expect, test } from '@playwright/test'
import { projectConstraintValidity } from '../../src/validation.js'

 test('nativeValidityAndErrorAssociationFollowModelResult', async ({ page }) => {
  await page.setContent('<input id="field" aria-describedby="help"><span id="error"></span>')
  const state = await page.evaluate((project) => {
    const input = document.querySelector('#field') as HTMLInputElement
    const Result = {
      fail: (failure: unknown) => ({ _tag: 'Failure', failure }),
      succeed: (success: unknown) => ({ _tag: 'Success', success }),
    }
    const apply = new Function('Result', `return (${project})`)(Result) as typeof projectConstraintValidity
    apply(input, 'error', { _tag: 'Invalid', message: 'Required' })
    const invalid = { valid: input.checkValidity(), message: input.validationMessage, describedBy: input.getAttribute('aria-describedby') }
    apply(input, 'error', { _tag: 'Valid' })
    return { invalid, valid: input.checkValidity(), finalDescribedBy: input.getAttribute('aria-describedby') }
  }, projectConstraintValidity.toString())

  expect(state.invalid).toEqual({ valid: false, message: 'Required', describedBy: 'help error' })
  expect(state.valid).toBe(true)
  expect(state.finalDescribedBy).toBe('help')
})

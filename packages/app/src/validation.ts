import { Result } from 'effect'

export type ValidationResult = { readonly _tag: 'Valid' } | { readonly _tag: 'Invalid'; readonly message: string }
export type ValidationProjectionError = { readonly _tag: 'InvalidControl' }

export function projectConstraintValidity(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  errorId: string,
  result: ValidationResult,
): Result.Result<void, ValidationProjectionError> {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) {
    return Result.fail({ _tag: 'InvalidControl' })
  }

  if (result._tag === 'Invalid') {
    control.setCustomValidity(result.message)
    control.setAttribute('aria-invalid', 'true')
    const describedBy = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    if (!describedBy.includes(errorId)) describedBy.push(errorId)
    control.setAttribute('aria-describedby', describedBy.join(' '))
  } else {
    control.setCustomValidity('')
    control.removeAttribute('aria-invalid')
    const describedBy = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== errorId)
    if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '))
    else control.removeAttribute('aria-describedby')
  }

  return Result.succeed(undefined)
}

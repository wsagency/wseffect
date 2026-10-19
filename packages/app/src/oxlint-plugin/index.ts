import { noEffectPromiseInCommand } from './rules/noEffectPromiseInCommand.js'
import { noPageInputsInModel } from './rules/noPageInputsInModel.js'
import { noTopLevelSideEffectsInPages } from './rules/noTopLevelSideEffectsInPages.js'

export default {
  meta: { name: 'wseffect' },
  rules: {
    'no-effect-promise-in-command': noEffectPromiseInCommand,
    'no-top-level-side-effects-in-pages': noTopLevelSideEffectsInPages,
    'no-page-inputs-in-model': noPageInputsInModel,
  },
}

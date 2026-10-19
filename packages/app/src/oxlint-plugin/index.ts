import { noEffectPromiseInCommand } from './rules/noEffectPromiseInCommand.js'

export default {
  meta: { name: 'wseffect' },
  rules: {
    'no-effect-promise-in-command': noEffectPromiseInCommand,
  },
}

import { Effect, Schema } from 'effect'
import { Command, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { projectConstraintValidity, type ValidationResult } from '@wsagency/wseffect-app'
import { Heading } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({ name: Schema.String, result: Schema.String })
export const Message = defineMessageUnion({
  NameChanged: { value: Schema.String },
  Validate: {},
  ValidationProjected: { result: Schema.String },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const project = (result: ValidationResult): Command.Command<Message, never> => ({
  name: 'ProjectNativeValidation',
  effect: Effect.sync(() => {
    const control = typeof document === 'undefined' ? null : document.getElementById('validation-name')
    if (!(control instanceof HTMLInputElement)) return Message.ValidationProjected({ result: 'Invalid control' })
    const projected = projectConstraintValidity(control, 'validation-error', result)
    if (projected._tag === 'Failure') return Message.ValidationProjected({ result: 'Invalid control' })
    return Message.ValidationProjected({ result: result._tag === 'Valid' ? 'Valid' : result.message })
  }),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { name: '', result: 'Not validated' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    NameChanged: ({ value }) => ({ model: { ...model, name: value } }),
    Validate: () => ({
      model,
      commands: [project(model.name.trim() ? { _tag: 'Valid' } : { _tag: 'Invalid', message: 'Enter a name' })],
    }),
    ValidationProjected: ({ result }) => ({ model: { ...model, result } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Native constraint validation'], h),
    h.label([h.For('validation-name')], ['Name']),
    h.input([
      h.Id('validation-name'), h.Type('text'), h.Value(model.name),
      h.OnInput((value) => Message.NameChanged({ value })),
      ...(model.result === 'Valid' ? [h.AriaInvalid(false)] : []),
    ]),
    h.p([h.Id('validation-error'), h.AriaLive('polite')], [model.result === 'Valid' ? '' : model.result === 'Not validated' ? '' : model.result]),
    h.button([h.Id('validation-submit'), h.OnClick(Message.Validate())], ['Validate']),
    h.output([h.Id('validation-result')], [model.result]),
  ])),
})

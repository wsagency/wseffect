import '@wsagency/wseffect-themes/tokens/colors/red.css'
import '@wsagency/wseffect-themes/tokens/colors/green.css'
import { Effect, Schema } from 'effect'
import * as Stream from 'effect/Stream'
import { Command, Mount, Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { projectConstraintValidity, type ValidationResult } from '@wsagency/wseffect-app'
import { Button, Flex, Heading, Text, TextField } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({ name: Schema.String, result: Schema.String, error: Schema.String })
export const Message = defineMessageUnion({
  NameChanged: { value: Schema.String },
  Validate: {},
  ValidationProjected: { result: Schema.String, error: Schema.String },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const project = (result: ValidationResult, reportedResult?: string): Command.Command<Message, never> => ({
  name: 'ProjectNativeValidation',
  effect: Effect.sync(() => {
    const control = typeof document === 'undefined' ? null : document.getElementById('validation-name')
    if (!(control instanceof HTMLInputElement)) return Message.ValidationProjected({ result: 'Invalid control', error: '' })
    const projected = projectConstraintValidity(control, 'name-error', result)
    if (projected._tag === 'Failure') return Message.ValidationProjected({ result: 'Invalid control', error: '' })
    return Message.ValidationProjected({
      result: reportedResult ?? (result._tag === 'Valid' ? 'Valid' : 'Invalid (native checkValidity: false)'),
      error: result._tag === 'Invalid' ? result.message : '',
    })
  }),
})
const validationMount = (model: Model): Mount.MountAction<Message> => ({
  name: 'GalleryValidationProjection',
  f: () => Stream.fromEffect(project(
    model.result === 'Not validated' || model.result === 'Valid'
      ? { _tag: 'Valid' }
      : { _tag: 'Invalid', message: model.error },
    model.result,
  ).effect),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { name: '', result: 'Not validated', error: '' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    NameChanged: ({ value }) => model.result === 'Not validated' || model.result === 'Valid'
      ? { model: { ...model, name: value } }
      : {
          model: { ...model, name: value, result: 'Not validated', error: '' },
          commands: [project({ _tag: 'Valid' }, 'Not validated')],
        },
    Validate: () => {
      const result: ValidationResult = model.name.trim()
        ? { _tag: 'Valid' }
        : { _tag: 'Invalid', message: 'Enter a name' }
      return { model, commands: [project(result)] }
    },
    ValidationProjected: ({ result, error }) => ({ model: { ...model, result, error } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => {
    const invalid = model.result !== 'Not validated' && model.result !== 'Valid'
    return h.div([h.Class('capability-stack')], [
      Heading.view({ as: 'h1' }, ['Native constraint validation'], h),
      Flex.view({ direction: 'column', gap: '2' }, [
        h.div([h.Class('capability-field')], [
          TextField.view({
            id: 'validation-name',
            label: 'Name',
            type: 'text',
            value: model.name,
            invalid,
            onInput: (value) => Message.NameChanged({ value }),
            inputAttributes: [
              h.AriaInvalid(invalid),
              ...(invalid ? [h.AriaDescribedBy('name-error')] : []),
              h.OnMount(validationMount(model)),
            ],
          }, [], h),
        ]),
        ...(invalid ? [h.p([h.Id('name-error'), h.AriaLive('polite')], [
          Text.view({ as: 'span', color: 'red' }, [model.error], h),
        ])] : []),
        h.div([h.Id('validation-submit')], [
          Button.view({ type: 'button', onClick: Message.Validate() }, ['Validate'], h),
        ]),
        h.div([h.Id('validation-result'), h.AriaLive('polite')], [
          Text.view({ as: 'p', color: invalid ? 'red' : model.result === 'Valid' ? 'green' : 'gray' }, [model.result], h),
        ]),
      ], h),
    ])
  }),
})

const Message = defineMessageUnion({ Saved: { date: Schema.String }, Set: { value: Schema.String, d: Schema.String } })
const page = Submodel.defineView((model, { selectedDate }, h) =>
  h.button([], [h.OnClick(Message.Saved({ date: selectedDate }))]),
)
const inputPage = Submodel.defineView((model, inputs, h) =>
  h.input([h.OnInput((v) => Message.Set({ v, d: inputs.selectedDate }))]),
)
const PageMessage = defineMessageUnion({ Saved: { date: Schema.String } })
Submodel.defineView((model, inputs, html) =>
  html.button([], [html.OnClick(PageMessage.Saved({ date: inputs.selectedDate }))]),
)
const view = (model, inputs, html) =>
  html.button([], [html.OnClick(PageMessage.Saved({ date: inputs.selectedDate }))])
Submodel.defineView(view)

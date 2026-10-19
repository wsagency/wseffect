const page = Submodel.defineView((model, { selectedDate }, h) =>
  h.button([], [h.OnClick(Message.Saved({ date: selectedDate }))]),
)
const inputPage = Submodel.defineView((model, inputs, h) =>
  h.input([h.OnInput((v) => Message.Set({ v, d: inputs.selectedDate }))]),
)

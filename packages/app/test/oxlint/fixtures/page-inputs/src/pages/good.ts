const page = Submodel.defineView((model, { selectedDate }, h) =>
  h.div([], [String(selectedDate)]),
)

# Changelog

## Unreleased

- Implement parent-controlled CheckboxGroup views and stable-ID RangeSlider interactions.
- Adapt Foldkit Listbox for item-aligned Select placement and provide message-free SelectPosition mounting.
- Implement ContextMenu invocation/source lifetime handling and TooltipGroup delay coordination.
- Match Select popup spacing and selected-item indicators with the pinned Radix2Solid behavior.
- Render RangeSlider thumbs over a shared track with a selected-range fill while keeping per-thumb controls.
- Match RangeSlider thumb positions to the pinned slider's in-bounds offsets.
- Dismiss ContextMenu on outside presses in the capture phase with post-commit focus restoration, and suppress touch-originated native context menus only after the 600 ms long-press activation.

import { view as checkboxGroupView } from '@wsagency/wseffect-foldkit-ui/checkboxGroup'
import { createContextMenu } from '@wsagency/wseffect-foldkit-ui/menu'
import { init as initTooltipGroup } from '@wsagency/wseffect-foldkit-ui/tooltip/group'
import { Range } from '@wsagency/wseffect-foldkit-ui/slider'
import { createSelect as createListboxSelect } from '@wsagency/wseffect-foldkit-ui/listboxSelect'
import { view as nativeSelectView } from '@wsagency/wseffect-foldkit-ui/select'
import type { CompletedDelayClearSearch } from '@wsagency/wseffect-foldkit-ui/menu'
import { init as initVirtualList, renderedRange } from '@wsagency/wseffect-foldkit-ui/virtualList'

const contextMenu = createContextMenu<string>()
const tooltipGroup = initTooltipGroup()
const popupSelect = createListboxSelect<string>()
const virtualListRange = renderedRange(
  initVirtualList({ id: 'consumer-virtual-list', rowHeightPx: 24, initialContainerHeight: 24 }),
  { items: ['row-a'], itemToKey: String, itemToRowHeightPx: () => 24 },
)
export type MenuSearchCompletion = CompletedDelayClearSearch

if (
  typeof Range.init !== 'function' ||
  typeof popupSelect.view !== 'function' ||
  typeof nativeSelectView !== 'function'
) {
  throw new Error('Both popup listboxSelect and native select APIs must import independently')
}
if (virtualListRange.startIndex !== 0 || virtualListRange.endIndex !== 1) {
  throw new Error('Packed VirtualList rendered-range helper must include its visible item')
}

console.log(checkboxGroupView, contextMenu.openAt, tooltipGroup, Range, popupSelect, nativeSelectView)

import { view as checkboxGroupView } from '@wsagency/wseffect-foldkit-ui/checkboxGroup'
import { createContextMenu } from '@wsagency/wseffect-foldkit-ui/menu'
import { init as initTooltipGroup } from '@wsagency/wseffect-foldkit-ui/tooltip/group'
import { Range } from '@wsagency/wseffect-foldkit-ui/slider'
import { createSelect as createListboxSelect } from '@wsagency/wseffect-foldkit-ui/listboxSelect'
import { view as nativeSelectView } from '@wsagency/wseffect-foldkit-ui/select'
import type { CompletedDelayClearSearch } from '@wsagency/wseffect-foldkit-ui/menu'

const contextMenu = createContextMenu<string>()
const tooltipGroup = initTooltipGroup()
const popupSelect = createListboxSelect<string>()
export type MenuSearchCompletion = CompletedDelayClearSearch

if (
  typeof Range.init !== 'function' ||
  typeof popupSelect.view !== 'function' ||
  typeof nativeSelectView !== 'function'
) {
  throw new Error('Both popup listboxSelect and native select APIs must import independently')
}

console.log(checkboxGroupView, contextMenu.openAt, tooltipGroup, Range, popupSelect, nativeSelectView)

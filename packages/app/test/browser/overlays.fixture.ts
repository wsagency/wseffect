import '@wsagency/wseffect-themes/styles.css'
import { Option, Schema } from 'effect'
import { Runtime } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Popover from '@wsagency/wseffect-themes/components/popover'
import * as Tooltip from '@wsagency/wseffect-themes/components/tooltip'
import * as HoverCard from '@wsagency/wseffect-themes/components/hover-card'
import * as ContextMenu from '@wsagency/wseffect-themes/components/context-menu'
import * as AlertDialog from '@wsagency/wseffect-themes/components/alert-dialog'
import * as Theme from '@wsagency/wseffect-themes/components/theme'

const Menu = ContextMenu.create<'inspect'>()
const menuConfig: ContextMenu.Config<'inspect'> = {
  id: 'overlay-context-menu', sourceId: 'overlay-context-menu-source', sourceToken: 'overlay-context-menu-token', longPressMs: 600,
  items: [{ value: 'inspect', textValue: 'Inspect', isDisabled: false, content: null }], toItem: () => null,
}
const Model = Schema.Struct({ popover: Popover.Model, tooltip: Tooltip.Model, hoverCard: HoverCard.Model, contextMenu: ContextMenu.Model, alertDialog: AlertDialog.Model })
const Message = defineMessageUnion({
  PopoverEvent: { message: Popover.Message }, TooltipEvent: { message: Tooltip.Message },
  HoverCardEvent: { message: HoverCard.Message }, ContextMenuEvent: { message: ContextMenu.Message },
  AlertDialogEvent: { message: AlertDialog.Message },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const foldPopover = Popover.fold<Model, Message, never>({ read: model => Option.some(model.popover), write: (model, popover) => ({ ...model, popover }), toParentMessage: message => Message.PopoverEvent({ message }), foldOutMessage: () => _model => ({ model: _model }) })
const foldTooltip = Tooltip.fold<Model, Message, never>({ read: model => Option.some(model.tooltip), write: (model, tooltip) => ({ ...model, tooltip }), toParentMessage: message => Message.TooltipEvent({ message }), foldOutMessage: () => _model => ({ model: _model }) })
const foldHoverCard = HoverCard.fold<Model, Message, never>({ read: model => Option.some(model.hoverCard), write: (model, hoverCard) => ({ ...model, hoverCard }), toParentMessage: message => Message.HoverCardEvent({ message }), foldOutMessage: () => _model => ({ model: _model }) })
const foldContextMenu = Menu.fold<Model, Message, never>({ read: model => Option.some(model.contextMenu), write: (model, contextMenu) => ({ ...model, contextMenu }), toParentMessage: message => Message.ContextMenuEvent({ message }), foldOutMessage: () => _model => ({ model: _model }) })
const foldAlertDialog = AlertDialog.fold<Model, Message, never>({ read: model => Option.some(model.alertDialog), write: (model, alertDialog) => ({ ...model, alertDialog }), toParentMessage: message => Message.AlertDialogEvent({ message }), foldOutMessage: () => _model => ({ model: _model }) })

Runtime.run(Runtime.makeElement({
  Model,
  container: document.getElementById('runtime'),
  init: () => ({ model: { popover: Popover.init({ id: 'overlay-popover' }), tooltip: Tooltip.init({ id: 'overlay-tooltip' }), hoverCard: HoverCard.init(), contextMenu: Menu.init(menuConfig), alertDialog: AlertDialog.init({ id: 'overlay-alert-dialog' }) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    PopoverEvent: ({ message }) => foldPopover(model, message),
    TooltipEvent: ({ message }) => foldTooltip(model, message),
    HoverCardEvent: ({ message }) => foldHoverCard(model, message),
    ContextMenuEvent: ({ message }) => foldContextMenu(model, message),
    AlertDialogEvent: ({ message }) => foldAlertDialog(model, message),
  }),
  view: (model, h) => Theme.view({ isRoot: true, settings: { appearance: 'light', accentColor: 'indigo', radius: 'medium' } }, [
    Popover.embed(h, { slotId: 'overlay-popover', model: model.popover, toParentMessage: message => Message.PopoverEvent({ message }), viewInputs: { trigger: ['Open popover'], content: ['Popover content'], ariaLabel: 'Popover' } }),
    Tooltip.embed(h, { slotId: 'overlay-tooltip', model: model.tooltip, toParentMessage: message => Message.TooltipEvent({ message }), viewInputs: { trigger: ['Hover for tooltip'], content: ['Tooltip content'] } }),
    h.button([h.Type('button'), h.Id('overlay-alert-dialog-open'), h.OnClick(Message.AlertDialogEvent({ message: AlertDialog.Message.RequestedOpen() }))], ['Open alert dialog']),
    AlertDialog.embed(h, { slotId: 'overlay-alert-dialog', model: model.alertDialog, toParentMessage: message => Message.AlertDialogEvent({ message }), title: 'Delete item?', description: 'This cannot be undone.', cancelLabel: 'Cancel' }),
    HoverCard.embed(h, { slotId: 'overlay-hover-card', id: 'overlay-hover-card', model: model.hoverCard, toParentMessage: message => Message.HoverCardEvent({ message }), viewInputs: { id: 'overlay-hover-card', trigger: ['Hover for card'], content: ['Hover card content'] } }),
    Menu.embed(h, {
      slotId: 'overlay-context-menu',
      model: model.contextMenu,
      config: {
        ...menuConfig,
        items: [{ value: 'inspect', textValue: 'Inspect', isDisabled: false, content: h.span([], ['Inspect']) }],
      },
      toParentMessage: message => Message.ContextMenuEvent({ message }),
    }),
  ], h),
}))

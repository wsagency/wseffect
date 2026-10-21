import type * as Mount from 'foldkit/mount'

export type Config = {
  panelId: string
  triggerId: string
  selectedItemId: string
  activeItemId?: string
}
export type Message = { _tag: 'Positioned' } | { _tag: 'PositionFailed' }
export declare function mount(config: Config): Mount.MountAction<Message>

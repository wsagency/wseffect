import { Sp2Page } from './sp2-shared'
import type { AppPageProps } from '../types'

const TITLES: Record<string, string> = {
  accessibility: 'Accessibility', 'layout-extra': 'Layout extras', avatar: 'Avatar', feedback: 'Feedback',
  'typography-extra': 'Typography extras', 'icon-button': 'Icon button', links: 'Links',
  'scroll-area': 'Scroll area', data: 'Data', 'forms-extra': 'Forms extras', select: 'Select',
  'range-slider': 'Range slider', 'tab-nav': 'Tab navigation', 'alert-dialog': 'Alert dialog',
  popover: 'Popover', 'hover-card': 'Hover card', tooltip: 'Tooltip', 'context-menu': 'Context menu',
  'theme-panel': 'Theme panel', 'data-table': 'Data table',
}

export default function Sp2Route(props: AppPageProps) {
  const family = window.location.pathname.slice(1)
  return <Sp2Page {...props} family={family} title={TITLES[family] ?? family} />
}

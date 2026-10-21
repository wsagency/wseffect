import { createSignal, For, lazy, Loading, onCleanup, Show, type Component } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import { Button, Text, Theme } from '@wsagency/radix2solid-themes'
import type { AppPageProps, Appearance, Accent, Gray, Radius, Scaling } from './types'

const pages = {
  layout: lazy(() => import('./pages/layout')),
  typography: lazy(() => import('./pages/typography')),
  buttons: lazy(() => import('./pages/buttons')),
  cards: lazy(() => import('./pages/cards')),
  'text-field': lazy(() => import('./pages/text-field')),
  dialog: lazy(() => import('./pages/dialog')),
  'dropdown-menu': lazy(() => import('./pages/dropdown-menu')),
  tabs: lazy(() => import('./pages/tabs')),
  theme: lazy(() => import('./pages/theme')),
  shared: lazy(() => import('./pages/shared')),
  'shared-a': lazy(() => import('./pages/shared-a')),
  'virtual-list': lazy(() => import('./pages/virtual-list')),
  form: lazy(() => import('./pages/form')),
  menus: lazy(() => import('./pages/menus')),
  accessibility: lazy(() => import('./pages/sp2')),
  'layout-extra': lazy(() => import('./pages/sp2')),
  avatar: lazy(() => import('./pages/sp2')),
  feedback: lazy(() => import('./pages/sp2')),
  'typography-extra': lazy(() => import('./pages/sp2')),
  'icon-button': lazy(() => import('./pages/sp2')),
  links: lazy(() => import('./pages/sp2')),
  'scroll-area': lazy(() => import('./pages/sp2')),
  data: lazy(() => import('./pages/sp2')),
  'forms-extra': lazy(() => import('./pages/sp2')),
  select: lazy(() => import('./pages/sp2')),
  'range-slider': lazy(() => import('./pages/sp2')),
  'tab-nav': lazy(() => import('./pages/sp2')),
  'alert-dialog': lazy(() => import('./pages/sp2')),
  popover: lazy(() => import('./pages/sp2')),
  'hover-card': lazy(() => import('./pages/sp2')),
  tooltip: lazy(() => import('./pages/sp2')),
  'context-menu': lazy(() => import('./pages/sp2')),
  'theme-panel': lazy(() => import('./pages/sp2')),
  'data-table': lazy(() => import('./pages/sp2')),
} satisfies Record<string, Component<AppPageProps>>

type Route = keyof typeof pages | 'home'
const links: ReadonlyArray<{ readonly id: string; readonly href: string; readonly label: string; readonly route: Route }> = [
  { id: 'layout', href: '/layout', label: 'Layout', route: 'layout' },
  { id: 'typography', href: '/typography', label: 'Typography', route: 'typography' },
  { id: 'buttons', href: '/buttons', label: 'Buttons', route: 'buttons' },
  { id: 'cards', href: '/cards', label: 'Cards', route: 'cards' },
  { id: 'textField', href: '/text-field', label: 'Text field', route: 'text-field' },
  { id: 'dialog', href: '/dialog', label: 'Dialog', route: 'dialog' },
  { id: 'dropdownMenu', href: '/dropdown-menu', label: 'Dropdown menu', route: 'dropdown-menu' },
  { id: 'tabs', href: '/tabs', label: 'Tabs', route: 'tabs' },
  { id: 'theme', href: '/theme', label: 'Theme', route: 'theme' },
  { id: 'shared', href: '/shared', label: 'Shared date', route: 'shared' },
  { id: 'sharedA', href: '/shared-a', label: 'Shared A', route: 'shared-a' },
  { id: 'virtualList', href: '/virtual-list', label: 'Virtual list', route: 'virtual-list' },
  { id: 'form', href: '/form', label: 'Form', route: 'form' },
  { id: 'menus', href: '/menus', label: 'Menus', route: 'menus' },
  { id: 'accessibility', href: '/accessibility', label: 'Accessibility', route: 'accessibility' },
  { id: 'layoutExtra', href: '/layout-extra', label: 'Layout extra', route: 'layout-extra' },
  { id: 'avatar', href: '/avatar', label: 'Avatar', route: 'avatar' },
  { id: 'feedback', href: '/feedback', label: 'Feedback', route: 'feedback' },
  { id: 'typographyExtra', href: '/typography-extra', label: 'Typography extra', route: 'typography-extra' },
  { id: 'iconButton', href: '/icon-button', label: 'Icon button', route: 'icon-button' },
  { id: 'links', href: '/links', label: 'Links', route: 'links' },
  { id: 'scrollArea', href: '/scroll-area', label: 'Scroll area', route: 'scroll-area' },
  { id: 'data', href: '/data', label: 'Data', route: 'data' },
  { id: 'formsExtra', href: '/forms-extra', label: 'Forms extra', route: 'forms-extra' },
  { id: 'select', href: '/select', label: 'Select', route: 'select' },
  { id: 'rangeSlider', href: '/range-slider', label: 'Range slider', route: 'range-slider' },
  { id: 'tabNav', href: '/tab-nav', label: 'Tab navigation', route: 'tab-nav' },
  { id: 'alertDialog', href: '/alert-dialog', label: 'Alert dialog', route: 'alert-dialog' },
  { id: 'popover', href: '/popover', label: 'Popover', route: 'popover' },
  { id: 'hoverCard', href: '/hover-card', label: 'Hover card', route: 'hover-card' },
  { id: 'tooltip', href: '/tooltip', label: 'Tooltip', route: 'tooltip' },
  { id: 'contextMenu', href: '/context-menu', label: 'Context menu', route: 'context-menu' },
  { id: 'themePanel', href: '/theme-panel', label: 'Theme panel', route: 'theme-panel' },
  { id: 'dataTable', href: '/data-table', label: 'Data table', route: 'data-table' },
]

function routeForPath(pathname: string): Route {
  return links.find(link => link.href === pathname)?.route ?? 'home'
}

function shiftDate(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export default function App() {
  const [route, setRoute] = createSignal<Route>(routeForPath(window.location.pathname))
  const [sharedDate, setSharedDate] = createSignal('2026-01-01')
  const [sharedNote, setSharedNote] = createSignal<string | undefined>()
  const [appearance, setAppearance] = createSignal<Appearance>(new URLSearchParams(window.location.search).get('appearance') === 'dark' ? 'dark' : 'light')
  const [accent, setAccent] = createSignal<Accent>('indigo')
  const [gray, setGray] = createSignal<Gray>('gray')
  const [radius, setRadius] = createSignal<Radius>('medium')
  const [scaling, setScaling] = createSignal<Scaling>('100%')
  const onPopState = () => setRoute(routeForPath(window.location.pathname))
  window.addEventListener('popstate', onPopState)
  onCleanup(() => window.removeEventListener('popstate', onPopState))

  const pageProps: AppPageProps = {
    sharedDate,
    previousDate: () => setSharedDate(value => shiftDate(value, -1)),
    nextDate: () => setSharedDate(value => shiftDate(value, 1)),
    sharedNote,
    addSharedNote: () => setSharedNote('Shared note'),
    appearance,
    setAppearance,
    accent,
    setAccent,
    gray,
    setGray,
    radius,
    setRadius,
    scaling,
    setScaling,
  }

  function navigate(event: MouseEvent, link: (typeof links)[number]) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState(null, '', link.href)
    setRoute(link.route)
  }

  return <Theme appearance={appearance()} accentColor={accent()} grayColor={gray()} radius={radius()} scaling={scaling()}>
    <div class="app-shell" data-testid="app-shell">
      <header class="topbar">
        <h1><a href="/" id="link-home" onClick={event => { event.preventDefault(); window.history.pushState(null, '', '/'); setRoute('home') }}>Radix2Solid benchmark</a></h1>
        <Text id="date-shell">{sharedDate()}</Text>
        <label>Date <input id="date-input" data-perf="shared-date" type="date" aria-label="Shared date" value={sharedDate()} onInput={event => setSharedDate(event.currentTarget.value)} /></label>
        <div class="date-submodel"><Text id="date-submodel">{sharedDate()}</Text><Button id="date-submodel-next" type="button" variant="outline" onClick={() => setSharedDate(value => shiftDate(value, 1))}>Next day</Button></div>
        <Text id="build-id">radix2solid</Text>
      </header>
      <nav class="route-nav" aria-label="Gallery routes">
        <For each={links}>{link => <a id={`link-${link.id}`} href={link.href} data-perf={link.route === 'menus' ? 'nav-cold' : link.route === 'dialog' ? 'nav-prefetch' : undefined} aria-current={route() === link.route ? 'page' : undefined} onClick={event => navigate(event, link)}>{link.label}</a>}</For>
      </nav>
      <Show when={route() === 'home'} fallback={
        <Loading on={route()} fallback={<section class="panel" data-testid="route-loading"><h2>Loading page</h2></section>}>
          <Dynamic component={pages[route() as keyof typeof pages]} {...pageProps} />
        </Loading>
      }>
        <main class="page-content" data-page="home"><section class="panel"><h2>Radix2Solid component benchmark</h2><p>Choose a route to explore the foundation components and performance fixtures.</p></section></main>
      </Show>
    </div>
  </Theme>
}

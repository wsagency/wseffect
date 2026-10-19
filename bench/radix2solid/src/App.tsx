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
  const [appearance, setAppearance] = createSignal<Appearance>('light')
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
        <label>Date <input id="date-input" type="date" aria-label="Shared date" value={sharedDate()} onInput={event => setSharedDate(event.currentTarget.value)} /></label>
        <div class="date-submodel"><Text id="date-submodel">{sharedDate()}</Text><Button id="date-submodel-next" type="button" variant="outline" onClick={() => setSharedDate(value => shiftDate(value, 1))}>Next day</Button></div>
        <Text id="build-id">radix2solid</Text>
      </header>
      <nav class="route-nav" aria-label="Gallery routes">
        <For each={links}>{link => <a id={`link-${link.id}`} href={link.href} aria-current={route() === link.route ? 'page' : undefined} onClick={event => navigate(event, link)}>{link.label}</a>}</For>
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

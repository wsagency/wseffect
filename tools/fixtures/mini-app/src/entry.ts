import { Runtime } from 'foldkit'
import { Model, Message, init, update, type PageView } from './main'
import { view as virtualListView } from './pages/virtual-list'
import './styles.css'

const route = location.pathname.replace(/\/+$/, '') || '/'
// Route-selected imports keep the two secondary pages out of the initial shell.
const pageView: PageView = route === '/form'
  ? (await import('./pages/form')).view
  : route === '/menus'
    ? (await import('./pages/menus')).view
    : virtualListView

const container = document.getElementById('root')
if (container === null) throw new Error('mini-app root element is missing')

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view: (model, h) => pageView(model, h, Message),
  container,
})
Runtime.run(application)

if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js')

import { render } from '@solidjs/web'
import App from './App'
import './app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root application mount.')
render(() => <App />, root)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(error => {
    console.error('Radix2Solid benchmark service worker registration failed', error)
  })
}

import { createSignal } from 'solid-js'
import { Heading, TextField } from '@wsagency/radix2solid-themes'

export default function TextFieldPage() {
  const [value, setValue] = createSignal('Radix2Solid')
  return <main class="page-content" data-page="textField"><section class="bench-section"><Heading as="h2">Text field</Heading><TextField.Root aria-label="Showcase text field" value={value()} onInput={event => setValue(event.currentTarget.value)} /></section></main>
}

import { createSignal } from 'solid-js'
import { Heading, Tabs } from '@wsagency/radix2solid-themes'

export default function TabsPage() {
  const [value, setValue] = createSignal('overview')
  return <main class="page-content" data-page="tabs"><section class="bench-section"><Heading as="h2">Tabs</Heading>
    <Tabs.Root value={value()} onValueChange={setValue}><Tabs.List aria-label="Benchmark tabs"><Tabs.Trigger value="overview">Overview</Tabs.Trigger><Tabs.Trigger value="details">Details</Tabs.Trigger></Tabs.List><Tabs.Content value="overview">Overview panel.</Tabs.Content><Tabs.Content value="details">Details panel.</Tabs.Content></Tabs.Root>
  </section></main>
}

import { For } from 'solid-js'
import { Heading, Select } from '@wsagency/radix2solid-themes'

const options = Array.from({ length: 1000 }, (_, index) => ({
  value: index === 0 ? 'indigo' : index === 1 ? 'blue' : `color-${index + 1}`,
  label: index === 0 ? 'Indigo' : index === 1 ? 'Blue' : `Color ${String(index + 1).padStart(4, '0')}`,
}))

export default function PerfSelectPage() {
  return <main class="page-content" data-page="perf-select"><section class="bench-section">
    <Heading as="h2">Select</Heading>
    <div data-perf="select-open">
      <Select.Root size="2" value="indigo" onValueChange={() => undefined}>
        <Select.Trigger variant="surface" placeholder="Choose a color" />
        <Select.Content variant="solid" position="popper">
          <For each={options}>{(option, index) => <Select.Item value={option.value} textValue={option.label} data-perf={index() === 1 ? 'select-choose' : undefined}>{option.label}</Select.Item>}</For>
        </Select.Content>
      </Select.Root>
    </div>
  </section></main>
}

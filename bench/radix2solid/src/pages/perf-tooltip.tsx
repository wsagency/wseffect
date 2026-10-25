import { Button, Heading, Tooltip } from '@wsagency/radix2solid-themes'

export default function PerfTooltipPage() {
  return <main class="page-content" data-page="perf-tooltip"><section class="bench-section">
    <Heading as="h2">Tooltip</Heading>
    <Button type="button" data-perf="tooltip-open">Previous control</Button>
    <div data-perf="tooltip-close">
      <Tooltip content="Save your changes" aria-label="Save changes help">
        {target => target(Button, { type: 'button', children: 'Save' })}
      </Tooltip>
    </div>
    <Button type="button">Continue</Button>
  </section></main>
}

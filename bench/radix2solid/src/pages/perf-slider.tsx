import { Heading, Slider } from '@wsagency/radix2solid-themes'

export default function PerfSliderPage() {
  return <main class="page-content" data-page="perf-slider"><section class="bench-section">
    <Heading as="h2">Range slider</Heading>
    <div data-perf="slider-drag">
      <Slider aria-label="Range slider" min={0} max={100} step={1} size="2" variant="surface" color="indigo" value={[48, 72]} onValueChange={() => undefined} />
    </div>
    <p>Use the arrow keys to adjust either value; Home and End move to the bounds.</p>
  </section></main>
}

import { Badge, Button, Card, Heading, Text } from '@wsagency/radix2solid-themes'
import type { AppPageProps } from '../types'

export function Sp2Page(props: AppPageProps & { family: string; title: string; children?: never }) {
  const selected = () => props.sharedDate() === '2026-01-01'
  return <main class="page-content" data-page={props.family} data-sp2-family={props.family}>
    <section class="bench-section">
      <Heading as="h2">{props.title}</Heading>
      <div class="demo-grid">
        <Card size="2" variant="surface">
          <div class="demo-row"><Badge color="indigo" variant="soft">Default</Badge><Text>Fixed sample content</Text></div>
          <div class="demo-row"><Button size="2" variant="solid" data-capture-focus="true">Primary action</Button><Button size="2" variant="outline">Secondary action</Button></div>
        </Card>
        <Card size="2" variant="surface">
          <Heading as="h3">{props.title} example</Heading>
          <Text>Stable fixture data · {props.sharedDate()}</Text>
          <div class="demo-row"><Button size="2" variant={selected() ? 'soft' : 'outline'} onClick={props.nextDate}>Change state</Button><Text>{selected() ? 'Selected' : 'Not selected'}</Text></div>
        </Card>
      </div>
    </section>
  </main>
}

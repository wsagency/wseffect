import { Button, Heading } from '@wsagency/radix2solid-themes'

export default function ButtonsPage() {
  return <main class="page-content" data-page="buttons">
    <section class="bench-section"><Heading as="h2">Buttons</Heading><div class="demo-row"><Button type="button">Solid</Button><Button type="button" variant="outline">Outline</Button><Button type="button" variant="soft">Soft</Button></div></section>
  </main>
}

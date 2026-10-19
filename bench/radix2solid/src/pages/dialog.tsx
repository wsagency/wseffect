import { Button, Dialog, Heading } from '@wsagency/radix2solid-themes'

export default function DialogPage() {
  return <main class="page-content" data-page="dialog"><section class="bench-section"><Heading as="h2">Dialog</Heading>
    <Dialog.Root><span data-perf="dialog-open" style={{ display: 'contents' }}><Dialog.Trigger>{target => target(Button, { type: 'button', children: 'Open dialog' })}</Dialog.Trigger></span>
      <Dialog.Content><Dialog.Title>Benchmark dialog</Dialog.Title><Dialog.Description>A modal dialog for the comparison app.</Dialog.Description><Dialog.Close>{target => target(Button, { type: 'button', children: 'Close dialog' })}</Dialog.Close></Dialog.Content>
    </Dialog.Root>
  </section></main>
}

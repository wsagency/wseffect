import { Button, DropdownMenu, Heading } from '@wsagency/radix2solid-themes'

export default function DropdownMenuPage() {
  return <main class="page-content" data-page="dropdownMenu"><section class="bench-section"><Heading as="h2">Dropdown menu</Heading>
    <DropdownMenu.Root><DropdownMenu.Trigger>{target => target(Button, { type: 'button', children: 'Open menu' })}</DropdownMenu.Trigger>
      <DropdownMenu.Content><DropdownMenu.Label>Actions</DropdownMenu.Label><DropdownMenu.Item>View details</DropdownMenu.Item><DropdownMenu.Item>Copy record</DropdownMenu.Item></DropdownMenu.Content>
    </DropdownMenu.Root>
  </section></main>
}

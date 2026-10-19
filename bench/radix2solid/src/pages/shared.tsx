import { Button, Card, Heading, Text } from '@wsagency/radix2solid-themes'
import type { AppPageProps } from '../types'

export function SharedA(props: AppPageProps) {
  return <Card class="panel" id="date-page-sharedA"><Heading as="h2">Shared date A</Heading><Text>Shared date: {props.sharedDate()}</Text>
    <Button id="sharedA-prev" type="button" variant="outline" onClick={props.previousDate}>Previous day</Button>
    <Text id="sharedA-note">{props.sharedNote() ?? '(none)'}</Text>
    <Button id="sharedA-add-note" type="button" onClick={props.addSharedNote}>Add note</Button>
  </Card>
}

export function SharedB(props: AppPageProps) {
  return <Card class="panel" id="date-page-sharedB"><Heading as="h2">Shared date B</Heading><Text>Shared date: {props.sharedDate()}</Text></Card>
}

export default function SharedPage(props: AppPageProps) {
  return <main class="page-content" data-page="shared"><SharedA {...props} /><SharedB {...props} /></main>
}

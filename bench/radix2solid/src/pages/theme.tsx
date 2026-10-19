import { For } from 'solid-js'
import { Heading } from '@wsagency/radix2solid-themes'
import type { AppPageProps, Accent, Appearance, Gray, Radius, Scaling } from '../types'

const accents: Accent[] = ['indigo', 'blue', 'tomato', 'grass']
const grays: Gray[] = ['gray', 'mauve', 'slate', 'sage']
const radii: Radius[] = ['none', 'small', 'medium', 'large', 'full']
const scalings: Scaling[] = ['90%', '95%', '100%', '105%', '110%']

export default function ThemePage(props: AppPageProps) {
  return <main class="page-content" data-page="theme"><section class="bench-section"><Heading as="h2">Theme settings</Heading><div class="demo-row">
    <label>Appearance <select data-perf="theme-appearance" aria-label="Theme appearance" value={props.appearance()} onChange={event => props.setAppearance(event.currentTarget.value as Appearance)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label>Accent <select data-perf="theme-accent" aria-label="Theme accent" value={props.accent()} onChange={event => props.setAccent(event.currentTarget.value as Accent)}><For each={accents}>{value => <option value={value}>{value}</option>}</For></select></label>
    <label>Gray <select aria-label="Theme gray" value={props.gray()} onChange={event => props.setGray(event.currentTarget.value as Gray)}><For each={grays}>{value => <option value={value}>{value}</option>}</For></select></label>
    <label>Radius <select aria-label="Theme radius" value={props.radius()} onChange={event => props.setRadius(event.currentTarget.value as Radius)}><For each={radii}>{value => <option value={value}>{value}</option>}</For></select></label>
    <label>Scaling <select aria-label="Theme scaling" value={props.scaling()} onChange={event => props.setScaling(event.currentTarget.value as Scaling)}><For each={scalings}>{value => <option value={value}>{value}</option>}</For></select></label>
  </div></section></main>
}

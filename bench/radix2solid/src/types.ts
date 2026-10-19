import type { Accessor, Setter } from 'solid-js'

export type Appearance = 'light' | 'dark'
export type Accent = 'indigo' | 'blue' | 'tomato' | 'grass'
export type Gray = 'gray' | 'mauve' | 'slate' | 'sage'
export type Radius = 'none' | 'small' | 'medium' | 'large' | 'full'
export type Scaling = '90%' | '95%' | '100%' | '105%' | '110%'

export type AppPageProps = {
  readonly sharedDate: Accessor<string>
  readonly previousDate: () => void
  readonly nextDate: () => void
  readonly sharedNote: Accessor<string | undefined>
  readonly addSharedNote: () => void
  readonly appearance: Accessor<Appearance>
  readonly setAppearance: Setter<Appearance>
  readonly accent: Accessor<Accent>
  readonly setAccent: Setter<Accent>
  readonly gray: Accessor<Gray>
  readonly setGray: Setter<Gray>
  readonly radius: Accessor<Radius>
  readonly setRadius: Setter<Radius>
  readonly scaling: Accessor<Scaling>
  readonly setScaling: Setter<Scaling>
}

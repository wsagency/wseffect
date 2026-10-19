import { SharedA } from './shared'
import type { AppPageProps } from '../types'

export default function SharedAOnlyPage(props: AppPageProps) {
  return <main class="page-content" data-page="sharedA"><SharedA {...props} /></main>
}

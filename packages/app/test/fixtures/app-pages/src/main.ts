import { pages } from './pages.gen'
import { sharedContract } from './sharedContract'

document.documentElement.dataset.buildId = __WSEFFECT_BUILD_ID__
document.documentElement.dataset.shared = sharedContract.name
export const buildId = __WSEFFECT_BUILD_ID__
export { pages }

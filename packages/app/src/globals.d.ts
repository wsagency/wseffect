declare const __WSEFFECT_BUILD_ID__: string
declare const __WSEFFECT_PWA__: boolean

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    readonly immediate?: boolean
    readonly onOfflineReady?: () => void
    readonly onNeedRefresh?: () => void
    readonly onRegisterError?: (error: unknown) => void
    readonly onRegisteredSW?: (url: string, registration?: ServiceWorkerRegistration) => void
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

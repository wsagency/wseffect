import type { Plugin } from 'vite'

export function frameworkChunking(): Plugin {
  return {
    name: 'wseffect:framework-chunk',
    config() {
      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [{
                  name: 'framework',
                  test: /node_modules|[\\/]packages[\\/](app|themes)[\\/]|@wsagency[\\/]wseffect-/,
                }],
              },
            },
          },
        },
      }
    },
  }
}

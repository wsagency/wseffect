import { defineConfig } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit()],
  build: {
    manifest: true,
    sourcemap: process.env.SOURCEMAP === 'on',
    target: 'esnext',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'framework',
              test: /node_modules[\\/]|@wsagency[\\/]wseffect-/,
            },
          ],
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 4530, strictPort: true },
  preview: { host: '127.0.0.1', port: 4531, strictPort: true },
})

import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '')

  return {
    envDir: repoRoot,
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT || 5174),
      strictPort: true,
    },
  }
})

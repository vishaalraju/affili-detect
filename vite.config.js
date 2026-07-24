import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // A relative base keeps the built app working on GitHub Pages project URLs.
  base: './',
  plugins: [react()],
})

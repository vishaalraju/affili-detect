import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // A relative base keeps the built app working on GitHub Pages project URLs.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy FastAPI vision backend — avoids ERR_CONNECTION_REFUSED & CORS issues
      '/vision-api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vision-api/, ''),
        configure: (proxy) => {
          proxy.on('error', () => {
            // Silently fail — WebcamScanner falls back to local COCO-SSD
          });
        }
      }
    }
  }
})

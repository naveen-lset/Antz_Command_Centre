import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* V1 owns 5199, V2 5200, V3 5201, V4 5202 — one port per version, so all four can
     run at once and a stray `npm run dev` can never land on the wrong one.
     `strictPort` makes a clash fail loudly instead of sliding to the next port. */
  server: { port: 5202, strictPort: true },
})

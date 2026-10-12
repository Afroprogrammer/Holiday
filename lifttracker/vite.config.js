import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// BASE_PATH is the URL path the app is served under. GitHub Pages serves this
// repository at /Holiday/, so the publish workflow sets it; locally it is /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LiftTracker',
        short_name: 'LiftTracker',
        description: 'Personal workout logger for a fixed 4-day push/pull program.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        background_color: '#1a1e22',
        theme_color: '#1a1e22',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the app shell so the app opens with no connection.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})

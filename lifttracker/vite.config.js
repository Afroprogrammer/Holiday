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
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LiftTracker',
        short_name: 'LiftTracker',
        description: 'Personal workout logger for a fixed 4-day push/pull program.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        // The id must be the absolute deployed path, or Chrome treats a
        // Pages install under /Holiday/ as a different app.
        id: process.env.BASE_PATH ?? '/',
        scope: './',
        categories: ['health', 'fitness'],
        screenshots: [
          { src: 'screenshot-home.png', sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: 'Home' },
          { src: 'screenshot-workout.png', sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: 'Workout' },
        ],
        background_color: '#0a1020',
        theme_color: '#0a1020',
        // Chrome on Android only offers "Install app" when a PNG icon of at
        // least 192 px is listed; the SVG alone does not qualify.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Cache the app shell so the app opens with no connection.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        importScripts: ['sw-notify.js'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})

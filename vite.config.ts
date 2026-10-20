import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Privacy Chat',
        short_name: 'PChat',
        description: 'Private peer-to-peer chat, calls and file sharing.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f3ee',
        theme_color: '#0f6b63',
        categories: ['social', 'communication'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'], cleanupOutdatedCaches: true }
    })
  ],
  build: { target: 'es2022', sourcemap: false }
});

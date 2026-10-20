import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Privacy Chat',
        short_name: 'Privacy Chat',
        description: 'Peer-to-peer chat, calls and file sharing.',
        display: 'standalone',
        background_color: '#f5f3ee',
        theme_color: '#0f6b63',
        icons: []
      },
      workbox: { globPatterns: ['**/*.{js,css,html}'] }
    })
  ],
  build: { target: 'es2022', sourcemap: false }
});

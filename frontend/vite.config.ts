import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['aes-192.png', 'aes-512.jpg'],
        manifest: {
          name: 'My-Notion',
          short_name: 'My-Notion',
          description: 'Personal productivity and study assistant',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          theme_color: '#152138',
          background_color: '#152138',
          icons: [
            {
              src: '/aes-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/aes-512.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    }
  };
});

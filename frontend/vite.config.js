// boleta_project/frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Carga las variables del archivo .env.local
  const env = loadEnv(mode, process.cwd(), '');

  // Usa la variable VITE_API_URL o un valor por defecto
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api';

  // Limpia la URL base para el proxy (quita "/api" si está presente)
  const proxyTarget = apiUrl.replace(/\/api\/?$/, '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        manifest: {
          name: 'V&C Cotizaciones ERP',
          short_name: 'V&C ERP',
          description: 'Sistema Industrial de Gestión de Cotizaciones',
          theme_color: '#0ea5e9',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    assetsInclude: ["**/*.xls", "**/*.xlsx"],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: "0.0.0.0", // escucha en todas las interfaces de red
      port: 5173,
      allowedHosts: true, // permite cualquier host en desarrollo local
      strictPort: false,
      open: false,
      fs: {
        strict: false,
      },
      proxy: {
        '/api': {
          target: proxyTarget, // backend Django dinámico desde .env
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
          },
        },
      },
    },
    base: './',
  };
});

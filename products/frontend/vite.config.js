import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'public/panel.html'),
        overlay: resolve(__dirname, 'public/overlay.html'),
        config: resolve(__dirname, 'public/config.html'),
      },
    },
  },
  server: {
    open: 'public/panel.html',
    proxy: {
      '/api': import.meta.env.VITE_BACKEND_URL,
    },
  },
});

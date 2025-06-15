import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'panel.html'),
        overlay: resolve(__dirname, 'overlay.html'),
        config: resolve(__dirname, 'config.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});

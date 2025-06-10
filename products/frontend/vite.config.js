import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        overlay: 'src/overlay/main.jsx',
        panel: 'src/panel/main.jsx'
      }
    }
  }
});


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
    watch: {
      // Watch the shared package dist folder for changes
      ignored: ['!**/packages/shared/dist/**'],
    },
  },
  optimizeDeps: {
    // Exclude workspace package from pre-bundling so it reloads on changes
    exclude: ['@wizard-zone/shared'],
  },
  resolve: {
    alias: {
      // Point directly to dist for better change detection
      '@wizard-zone/shared': path.resolve(__dirname, '../packages/shared/dist'),
    },
  },
  build: {
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
});

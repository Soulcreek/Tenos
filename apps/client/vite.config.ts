import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@massless/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/colyseus': {
        target: 'ws://localhost:2567',
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
});

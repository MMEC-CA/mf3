import { defineConfig } from 'vite';

export default defineConfig({
  root: '_site/mf3',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    environment: 'jsdom',
  },
});

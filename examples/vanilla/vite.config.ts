import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@headless-form/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  server: {
    fs: {
      // The MDX docs live at the monorepo root (`/docs`), outside this example's
      // own directory — allow Vite to read them for the `?raw` glob import.
      allow: [resolve(__dirname, '../..')],
    },
  },
});

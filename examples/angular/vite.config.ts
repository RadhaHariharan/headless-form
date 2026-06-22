import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@headless-form/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@headless-form/angular': resolve(__dirname, '../../packages/angular/src/public-api.ts'),
    },
  },
  esbuild: {
    target: 'ES2022',
  },
});

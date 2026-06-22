import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@headless-form/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@headless-form/react': resolve(__dirname, '../../packages/react/src/index.ts'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
});

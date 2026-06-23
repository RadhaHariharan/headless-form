import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@headlesskit/state-management'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})

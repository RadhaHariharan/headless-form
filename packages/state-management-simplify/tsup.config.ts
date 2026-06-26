import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // .d.ts files are emitted separately via `tsc --emitDeclarationOnly` (see
  // package.json's `build` script) instead of tsup's bundled single-file dts —
  // tsup's dts bundling flattens everything into one file, which breaks the
  // `declare module '../vanilla.js'` mutator augmentations in middleware/*.ts
  // (there's no real `vanilla.js` module left to attach them to once
  // flattened). Emitting one .d.ts per source file keeps those relative
  // augmentations valid.
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
})

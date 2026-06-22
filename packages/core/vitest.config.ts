import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      exclude: [
        // Barrel re-export files contain no executable logic
        'src/index.ts',
        'src/types/index.ts',
        'src/utils/index.ts',
        'src/store/index.ts',
        'src/resolvers/index.ts',
        'src/validators/index.ts',
        'src/field-validators/index.ts',
        // Pure type declaration files
        'src/types/**/*.ts',
        'src/field-validators/types.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});

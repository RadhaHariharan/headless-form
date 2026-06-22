#!/usr/bin/env tsx
/**
 * Build orchestration script.
 * Builds core first (no deps), then react and angular in parallel.
 *
 * Usage: pnpm tsx scripts/build-all.ts
 */

import { execSync } from 'child_process';

function run(cmd: string, label: string): void {
  console.log(`\n▶  ${label}`);
  const start = Date.now();
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓  ${label} (${Date.now() - start}ms)`);
  } catch {
    console.error(`✗  ${label} FAILED`);
    process.exit(1);
  }
}

const root = new URL('..', import.meta.url).pathname;

run(`pnpm --filter @headless-form/core run build`, 'Build core');
run(`pnpm --filter @headless-form/react run build`, 'Build react');
// Angular build requires ng-packagr; skip in CI if not available.
try {
  run(`pnpm --filter @headless-form/angular run build`, 'Build angular');
} catch {
  console.warn('⚠  Angular build skipped (ng-packagr may not be available)');
}

console.log('\n✅  All builds complete.');

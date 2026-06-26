import { describe, expect, it } from 'vitest';
import { safeStringify } from './safe-stringify.js';

describe('safeStringify', () => {
  it('pretty-prints plain objects', () => {
    expect(safeStringify({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('falls back to String() for circular references', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(safeStringify(circular)).toBe(String(circular));
  });

  it('falls back to String() for values JSON.stringify returns undefined for', () => {
    expect(safeStringify(undefined)).toBe('undefined');
  });
});

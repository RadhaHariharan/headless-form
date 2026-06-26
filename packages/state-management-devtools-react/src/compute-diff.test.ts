import { describe, expect, it } from 'vitest';
import { computeDiff, countChanges } from './compute-diff.js';

describe('computeDiff', () => {
  it('marks added, removed, and unchanged top-level fields', () => {
    const nodes = computeDiff({ a: 1, b: 2 }, { a: 1, c: 3 });
    const byKey = Object.fromEntries(nodes.map((node) => [node.key, node]));

    expect(byKey.a?.status).toBe('unchanged');
    expect(byKey.b?.status).toBe('removed');
    expect(byKey.c?.status).toBe('added');
  });

  it('marks a changed primitive field without children', () => {
    const nodes = computeDiff({ count: 1 }, { count: 2 });
    expect(nodes).toEqual([{ key: 'count', status: 'changed', prevValue: 1, nextValue: 2 }]);
  });

  it('recurses into nested objects, producing children for a changed nested field', () => {
    const nodes = computeDiff({ nav: { index: 1 } }, { nav: { index: 0 } });
    expect(nodes[0]?.status).toBe('changed');
    expect(nodes[0]?.children).toEqual([{ key: 'index', status: 'changed', prevValue: 1, nextValue: 0 }]);
  });

  it('falls back to a single root node when either value is a primitive', () => {
    expect(computeDiff(1, 2)).toEqual([{ key: '(root)', status: 'changed', prevValue: 1, nextValue: 2 }]);
    expect(computeDiff(1, 1)).toEqual([{ key: '(root)', status: 'unchanged', prevValue: 1, nextValue: 1 }]);
  });
});

describe('countChanges', () => {
  it('counts added/removed/changed fields recursively, ignoring unchanged ones', () => {
    const nodes = computeDiff({ a: 1, nav: { index: 1, extra: true } }, { a: 1, nav: { index: 0 } });
    // "nav" itself changed (1), plus its children: "index" changed and "extra" removed (2) = 3.
    expect(countChanges(nodes)).toBe(3);
  });

  it('returns 0 when nothing changed', () => {
    expect(countChanges(computeDiff({ a: 1 }, { a: 1 }))).toBe(0);
  });
});

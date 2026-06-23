import { describe, it, expect } from 'vitest';
import { pathToArray } from './path-to-array.js';
import { getPath } from './get-path.js';
import { setPath } from './set-path.js';
import { clone } from './clone.js';
import { deepEqual } from './deep-equal.js';
import { getInputOnChange } from './get-input-on-change.js';
import { shouldValidateOnChange } from './should-validate-on-change.js';
import { getDataPath } from './get-data-path.js';
import { insertAt, removeAt, replaceAt, reorder } from './list-handlers.js';

// ── pathToArray ───────────────────────────────────────────────────────────────

describe('pathToArray', () => {
  it('splits a dot-notation path', () => {
    expect(pathToArray('a.b.c')).toEqual(['a', 'b', 'c']);
  });
  it('handles a single segment', () => {
    expect(pathToArray('name')).toEqual(['name']);
  });
  it('handles numeric segments', () => {
    expect(pathToArray('items.0.name')).toEqual(['items', '0', 'name']);
  });
});

// ── getPath ───────────────────────────────────────────────────────────────────

describe('getPath', () => {
  it('reads a top-level key', () => {
    expect(getPath({ a: 1 }, 'a')).toBe(1);
  });
  it('reads a nested key', () => {
    expect(getPath({ user: { name: 'Jane' } }, 'user.name')).toBe('Jane');
  });
  it('reads an array element', () => {
    expect(getPath({ items: ['x', 'y'] }, 'items.1')).toBe('y');
  });
  it('returns undefined for missing key', () => {
    expect(getPath({}, 'missing')).toBeUndefined();
  });
  it('handles null intermediate', () => {
    expect(getPath({ a: null }, 'a.b')).toBeUndefined();
  });
});

// ── setPath ───────────────────────────────────────────────────────────────────

describe('setPath', () => {
  it('sets a top-level key', () => {
    expect(setPath({ a: 1 }, 'a', 2)).toEqual({ a: 2 });
  });
  it('does not mutate the original', () => {
    const original = { a: { b: 1 } };
    setPath(original, 'a.b', 99);
    expect(original.a.b).toBe(1);
  });
  it('sets in an array', () => {
    expect(setPath({ items: ['a', 'b'] }, 'items.0', 'z')).toEqual({ items: ['z', 'b'] });
  });
  it('creates missing intermediate objects', () => {
    expect(setPath({}, 'a.b', 1)).toEqual({ a: { b: 1 } });
  });
});

// ── clone ─────────────────────────────────────────────────────────────────────

describe('clone', () => {
  it('produces a deep copy', () => {
    const obj = { a: { b: 1 } };
    const copy = clone(obj);
    copy.a.b = 99;
    expect(obj.a.b).toBe(1);
  });
  it('clones arrays', () => {
    const arr = [1, 2, 3];
    const copy = clone(arr);
    copy[0] = 99;
    expect(arr[0]).toBe(1);
  });
});

// ── deepEqual ─────────────────────────────────────────────────────────────────

describe('deepEqual', () => {
  it('equal primitives', () => expect(deepEqual(1, 1)).toBe(true));
  it('unequal primitives', () => expect(deepEqual(1, 2)).toBe(false));
  it('equal objects', () => expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true));
  it('unequal objects', () => expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false));
  it('equal arrays', () => expect(deepEqual([1, 2], [1, 2])).toBe(true));
  it('unequal array lengths', () => expect(deepEqual([1], [1, 2])).toBe(false));
  it('null === null', () => expect(deepEqual(null, null)).toBe(true));
  it('null !== undefined', () => expect(deepEqual(null, undefined)).toBe(false));
  it('equal dates', () => {
    expect(deepEqual(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(true);
  });
  it('unequal dates', () => {
    expect(deepEqual(new Date('2024-01-01'), new Date('2025-01-01'))).toBe(false);
  });
  it('array vs object', () => expect(deepEqual([], {})).toBe(false));
  it('extra key', () => expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false));
  it('missing key in b', () => expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false));
});

// ── getInputOnChange ──────────────────────────────────────────────────────────

describe('getInputOnChange', () => {
  it('reads event.target.value for text input', () => {
    expect(getInputOnChange({ target: { type: 'text', value: 'hi' } })).toBe('hi');
  });
  it('reads event.target.checked for checkbox', () => {
    expect(getInputOnChange({ target: { type: 'checkbox', checked: true } })).toBe(true);
  });
  it('returns boolean as-is', () => {
    expect(getInputOnChange(true)).toBe(true);
    expect(getInputOnChange(false)).toBe(false);
  });
  it('returns raw value as-is', () => {
    expect(getInputOnChange('raw')).toBe('raw');
    expect(getInputOnChange(42)).toBe(42);
  });
  it('returns null as-is', () => {
    expect(getInputOnChange(null)).toBeNull();
  });
  it('returns undefined as-is', () => {
    expect(getInputOnChange(undefined)).toBeUndefined();
  });
});

// ── shouldValidateOnChange ────────────────────────────────────────────────────

describe('shouldValidateOnChange', () => {
  it('true enables all', () => expect(shouldValidateOnChange(true, 'email')).toBe(true));
  it('false disables all', () => expect(shouldValidateOnChange(false, 'email')).toBe(false));
  it('undefined disables', () => expect(shouldValidateOnChange(undefined, 'email')).toBe(false));
  it('array includes path', () => expect(shouldValidateOnChange(['email', 'name'], 'email')).toBe(true));
  it('array excludes path', () => expect(shouldValidateOnChange(['email'], 'name')).toBe(false));
});

// ── getDataPath ───────────────────────────────────────────────────────────────

describe('getDataPath', () => {
  it('returns path when no form name', () => {
    expect(getDataPath('user.name')).toBe('user.name');
  });
  it('returns formName/path when form name provided', () => {
    expect(getDataPath('user.name', 'signup')).toBe('signup/user.name');
  });
});

// ── list handlers ─────────────────────────────────────────────────────────────

describe('insertAt', () => {
  it('appends when no index', () => expect(insertAt([1, 2], 3)).toEqual([1, 2, 3]));
  it('inserts at index', () => expect(insertAt([1, 2, 3], 99, 1)).toEqual([1, 99, 2, 3]));
  it('appends when index >= length', () => expect(insertAt([1], 2, 10)).toEqual([1, 2]));
});

describe('removeAt', () => {
  it('removes at index', () => expect(removeAt([1, 2, 3], 1)).toEqual([1, 3]));
  it('removes first', () => expect(removeAt([1, 2, 3], 0)).toEqual([2, 3]));
  it('removes last', () => expect(removeAt([1, 2, 3], 2)).toEqual([1, 2]));
});

describe('replaceAt', () => {
  it('replaces at index', () => expect(replaceAt([1, 2, 3], 1, 99)).toEqual([1, 99, 3]));
});

describe('reorder', () => {
  it('moves item from→to', () => expect(reorder([1, 2, 3], { from: 0, to: 2 })).toEqual([2, 3, 1]));
  it('no-op when from===to', () => expect(reorder([1, 2, 3], { from: 1, to: 1 })).toEqual([1, 2, 3]));
});

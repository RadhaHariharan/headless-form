import { describe, it, expect } from 'vitest';
import { isNotEmpty } from './is-not-empty.js';
import { isEmail } from './is-email.js';
import { matches } from './matches.js';
import { matchesField } from './matches-field.js';
import { isInRange } from './is-in-range.js';
import { hasLength } from './has-length.js';
import { isJSONString } from './is-json-string.js';
import { isNotEmptyHTML } from './is-not-empty-html.js';

// ── isNotEmpty ────────────────────────────────────────────────────────────────

describe('isNotEmpty', () => {
  const rule = isNotEmpty('Required');

  it('rejects empty string', () => expect(rule('', {}, '')).toBe('Required'));
  it('rejects whitespace-only string', () => expect(rule('   ', {}, '')).toBe('Required'));
  it('rejects null', () => expect(rule(null, {}, '')).toBe('Required'));
  it('rejects undefined', () => expect(rule(undefined, {}, '')).toBe('Required'));
  it('rejects false', () => expect(rule(false, {}, '')).toBe('Required'));
  it('rejects empty array', () => expect(rule([], {}, '')).toBe('Required'));
  it('accepts non-empty string', () => expect(rule('hello', {}, '')).toBeNull());
  it('accepts non-empty array', () => expect(rule([1], {}, '')).toBeNull());
  it('accepts true', () => expect(rule(true, {}, '')).toBeNull());

  it('returns null error when no error arg provided', () => {
    const noError = isNotEmpty();
    expect(noError('', {}, '')).toBeNull();
  });
});

// ── isEmail ───────────────────────────────────────────────────────────────────

describe('isEmail', () => {
  const rule = isEmail('Invalid email');

  it('accepts valid email', () => expect(rule('user@example.com', {}, '')).toBeNull());
  it('accepts subdomain email', () => expect(rule('a.b+tag@x.co.uk', {}, '')).toBeNull());
  it('rejects missing @', () => expect(rule('notanemail', {}, '')).toBe('Invalid email'));
  it('rejects missing TLD', () => expect(rule('user@domain', {}, '')).toBe('Invalid email'));
  it('rejects non-string', () => expect(rule(42, {}, '')).toBe('Invalid email'));

  it('returns null error when no error arg provided', () => {
    const noError = isEmail();
    expect(noError('bad', {}, '')).toBeNull();
  });
});

// ── matches ───────────────────────────────────────────────────────────────────

describe('matches', () => {
  const rule = matches(/^\d{4}$/, 'Must be 4 digits');

  it('accepts matching string', () => expect(rule('1234', {}, '')).toBeNull());
  it('rejects non-matching string', () => expect(rule('abc', {}, '')).toBe('Must be 4 digits'));
  it('rejects non-string', () => expect(rule(1234, {}, '')).toBe('Must be 4 digits'));
});

// ── matchesField ──────────────────────────────────────────────────────────────

describe('matchesField', () => {
  const rule = matchesField('password', 'Passwords must match');

  it('accepts when values are equal', () => {
    expect(rule('secret', { password: 'secret' }, 'confirmPassword')).toBeNull();
  });

  it('rejects when values differ', () => {
    expect(rule('wrong', { password: 'secret' }, 'confirmPassword')).toBe('Passwords must match');
  });

  it('works with nested other-field path', () => {
    const nested = matchesField('user.password', 'No match');
    expect(nested('abc', { user: { password: 'abc' } }, 'confirm')).toBeNull();
  });
});

// ── isInRange ─────────────────────────────────────────────────────────────────

describe('isInRange', () => {
  it('accepts value within range', () => {
    expect(isInRange({ min: 0, max: 10 }, 'Out of range')(5, {}, '')).toBeNull();
  });

  it('accepts value at min bound', () => {
    expect(isInRange({ min: 0 }, 'err')(0, {}, '')).toBeNull();
  });

  it('accepts value at max bound', () => {
    expect(isInRange({ max: 100 }, 'err')(100, {}, '')).toBeNull();
  });

  it('rejects value below min', () => {
    expect(isInRange({ min: 5 }, 'Too low')(-1, {}, '')).toBe('Too low');
  });

  it('rejects value above max', () => {
    expect(isInRange({ max: 10 }, 'Too high')(11, {}, '')).toBe('Too high');
  });

  it('rejects non-number', () => {
    expect(isInRange({ min: 0, max: 10 }, 'err')('five', {}, '')).toBe('err');
  });

  it('rejects NaN', () => {
    expect(isInRange({ min: 0 }, 'err')(Number.NaN, {}, '')).toBe('err');
  });
});

// ── hasLength ─────────────────────────────────────────────────────────────────

describe('hasLength', () => {
  it('exact number — accepts matching length string', () => {
    expect(hasLength(3, 'Must be 3')('abc', {}, '')).toBeNull();
  });

  it('exact number — rejects different length', () => {
    expect(hasLength(3, 'Must be 3')('ab', {}, '')).toBe('Must be 3');
  });

  it('trims strings before measuring', () => {
    expect(hasLength(3, 'err')('  abc  ', {}, '')).toBeNull();
  });

  it('range — accepts length in range', () => {
    expect(hasLength({ min: 2, max: 5 }, 'err')('abc', {}, '')).toBeNull();
  });

  it('range — rejects too short', () => {
    expect(hasLength({ min: 4 }, 'Too short')('hi', {}, '')).toBe('Too short');
  });

  it('range — rejects too long', () => {
    expect(hasLength({ max: 3 }, 'Too long')('abcd', {}, '')).toBe('Too long');
  });

  it('works on arrays', () => {
    expect(hasLength({ min: 2 }, 'Need 2')(['a'], {}, '')).toBe('Need 2');
    expect(hasLength({ min: 2 }, 'Need 2')(['a', 'b'], {}, '')).toBeNull();
  });

  it('rejects non-string / non-array', () => {
    expect(hasLength(3, 'err')(42, {}, '')).toBe('err');
  });
});

// ── isJSONString ──────────────────────────────────────────────────────────────

describe('isJSONString', () => {
  const rule = isJSONString('Invalid JSON');

  it('accepts valid JSON object', () => expect(rule('{"a":1}', {}, '')).toBeNull());
  it('accepts valid JSON array', () => expect(rule('[1,2,3]', {}, '')).toBeNull());
  it('accepts valid JSON string literal', () => expect(rule('"hello"', {}, '')).toBeNull());
  it('rejects invalid JSON', () => expect(rule('{bad}', {}, '')).toBe('Invalid JSON'));
  it('rejects non-string', () => expect(rule(123, {}, '')).toBe('Invalid JSON'));
});

// ── isNotEmptyHTML ────────────────────────────────────────────────────────────

describe('isNotEmptyHTML', () => {
  const rule = isNotEmptyHTML('Cannot be empty');

  it('accepts HTML with real content', () => {
    expect(rule('<p>Hello</p>', {}, '')).toBeNull();
  });

  it('rejects empty paragraph', () => {
    expect(rule('<p></p>', {}, '')).toBe('Cannot be empty');
  });

  it('rejects paragraph with only a break tag', () => {
    expect(rule('<p><br></p>', {}, '')).toBe('Cannot be empty');
  });

  it('rejects whitespace-only after stripping tags', () => {
    expect(rule('<p>   </p>', {}, '')).toBe('Cannot be empty');
  });

  it('rejects non-string', () => {
    expect(rule(null, {}, '')).toBe('Cannot be empty');
  });

  it('omitting error returns null on failure', () => {
    const noError = isNotEmptyHTML();
    expect(noError('<p></p>', {}, '')).toBeNull();
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import {
  createStringValidator,
  createNumberValidator,
  createArrayValidator,
  createCheckboxValidator,
  createDateValidator,
  parseLocalDate,
  formatLocalDate,
  toValidationRule,
  humanizeFieldName,
} from './index.js';

// ─────────────────────────────────────────────────────────────────────────────
// String validator
// ─────────────────────────────────────────────────────────────────────────────

describe('createStringValidator', () => {
  describe('required', () => {
    it('rejects empty string by default', () => {
      expect(createStringValidator({})('', 'Name')).toBe('Name is required');
    });
    it('rejects whitespace-only string (trimmed)', () => {
      expect(createStringValidator({})('   ', 'Name')).toBe('Name is required');
    });
    it('rejects undefined value', () => {
      expect(createStringValidator({})(undefined as unknown as string, 'Name')).toBe('Name is required');
    });
    it('uses a custom required message with {fieldName}', () => {
      const v = createStringValidator({ messages: { required: '{fieldName} cannot be blank' } });
      expect(v('', 'Email')).toBe('Email cannot be blank');
    });
    it('returns null for empty value when required:false', () => {
      expect(createStringValidator({ required: false })('', 'Name')).toBeNull();
    });
    it('still validates non-empty value when required:false', () => {
      const v = createStringValidator({ required: false, minLength: 3 });
      expect(v('ab', 'Name')).toBe('Name should be at least 3 characters long');
    });
  });

  describe('length', () => {
    it('enforces minLength against the trimmed value', () => {
      const v = createStringValidator({ minLength: 3 });
      expect(v('  ab  ', 'Name')).toBe('Name should be at least 3 characters long');
      expect(v('abc', 'Name')).toBeNull();
    });
    it('enforces maxLength against the trimmed value', () => {
      const v = createStringValidator({ maxLength: 5 });
      expect(v('abcdef', 'Name')).toBe('Name should not exceed 5 characters');
      expect(v('abcde', 'Name')).toBeNull();
    });
    it('uses custom length messages', () => {
      const v = createStringValidator({ minLength: 8, messages: { minLength: 'Too short!' } });
      expect(v('abc', 'Pwd')).toBe('Too short!');
    });
  });

  describe('allowedCharacters', () => {
    it('alphanumeric rejects symbols, accepts letters+digits', () => {
      const v = createStringValidator({ allowedCharacters: 'alphanumeric' });
      expect(v('abc123', 'Code')).toBeNull();
      expect(v('abc 123', 'Code')).toBe('Code can only contain letters and numbers');
      expect(v('abc-123', 'Code')).toBe('Code can only contain letters and numbers');
    });
    it('alphanumeric with allowSpaces accepts spaces and notes them in the message', () => {
      const v = createStringValidator({ allowedCharacters: 'alphanumeric', allowSpaces: true });
      expect(v('abc 123', 'Code')).toBeNull();
      expect(v('abc_123', 'Code')).toBe('Code can only contain letters and numbers and spaces');
    });
    it('alphabetic accepts only letters', () => {
      const v = createStringValidator({ allowedCharacters: 'alphabetic' });
      expect(v('abcDEF', 'Name')).toBeNull();
      expect(v('abc1', 'Name')).toBe('Name can only contain letters');
    });
    it('alphabetic with allowSpaces', () => {
      const v = createStringValidator({ allowedCharacters: 'alphabetic', allowSpaces: true });
      expect(v('John Doe', 'Name')).toBeNull();
    });
    it('numeric accepts only digits', () => {
      const v = createStringValidator({ allowedCharacters: 'numeric' });
      expect(v('12345', 'Pin')).toBeNull();
      expect(v('12a45', 'Pin')).toBe('Pin can only contain numbers');
    });
    it('numeric with allowSpaces', () => {
      const v = createStringValidator({ allowedCharacters: 'numeric', allowSpaces: true });
      expect(v('12 34', 'Pin')).toBeNull();
    });
    it('custom uses the provided pattern', () => {
      const v = createStringValidator({
        allowedCharacters: 'custom',
        customPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        messages: { allowedCharacters: 'Invalid email' },
      });
      expect(v('user@example.com', 'Email')).toBeNull();
      expect(v('nope', 'Email')).toBe('Invalid email');
    });
    it('custom throws when no customPattern is supplied (lazily, on a non-empty value)', () => {
      const v = createStringValidator({ allowedCharacters: 'custom' });
      expect(() => v('abc', 'X')).toThrow('Custom pattern must be provided when using custom allowed characters');
    });
  });

  describe('allowSpecialChars', () => {
    it('rejects special chars when false and allowedCharacters is unset', () => {
      const v = createStringValidator({ allowSpecialChars: false });
      expect(v('hello!', 'Name')).toBe('Name cannot contain special characters');
      expect(v('hello world', 'Name')).toBeNull();
    });
    it('is ignored when allowedCharacters is set', () => {
      const v = createStringValidator({ allowSpecialChars: false, allowedCharacters: 'alphanumeric' });
      // alphanumeric check governs; "!" fails there with the character-class message
      expect(v('hello!', 'Name')).toBe('Name can only contain letters and numbers');
    });
  });

  describe('start/end patterns', () => {
    it('shouldNotStartWith (regex)', () => {
      const v = createStringValidator({ shouldNotStartWith: /^[0-9]/ });
      expect(v('1abc', 'User')).toBe('User cannot start with special characters or numbers');
      expect(v('abc1', 'User')).toBeNull();
    });
    it('shouldNotStartWith (string, treated as a char class, escaped)', () => {
      const v = createStringValidator({ shouldNotStartWith: '.#' });
      expect(v('.abc', 'User')).not.toBeNull();
      expect(v('#abc', 'User')).not.toBeNull();
      expect(v('abc', 'User')).toBeNull();
    });
    it('shouldStartWith (regex) requires the prefix', () => {
      const v = createStringValidator({ shouldStartWith: /^[A-Z]/, messages: { shouldStartWith: 'Capitalize' } });
      expect(v('abc', 'User')).toBe('Capitalize');
      expect(v('Abc', 'User')).toBeNull();
    });
    it('shouldStartWith (string, escaped literally)', () => {
      const v = createStringValidator({ shouldStartWith: 'AB-' });
      expect(v('AB-123', 'Code')).toBeNull();
      expect(v('XY-123', 'Code')).toBe('Code must start with the required format');
    });
    it('shouldNotEndWith (regex)', () => {
      const v = createStringValidator({ shouldNotEndWith: /-$/ });
      expect(v('slug-', 'Slug')).toBe('Slug cannot end with special characters');
      expect(v('slug', 'Slug')).toBeNull();
    });
    it('shouldNotEndWith (string char class)', () => {
      const v = createStringValidator({ shouldNotEndWith: '-_' });
      expect(v('slug_', 'Slug')).not.toBeNull();
      expect(v('slug', 'Slug')).toBeNull();
    });
    it('shouldEndWith (regex)', () => {
      const v = createStringValidator({ shouldEndWith: /\d{2}$/ });
      expect(v('AB-12', 'Code')).toBeNull();
      expect(v('AB-1x', 'Code')).toBe('Code must end with the required format');
    });
    it('shouldEndWith (string, escaped literally)', () => {
      const v = createStringValidator({ shouldEndWith: '.00' });
      expect(v('12.00', 'Price')).toBeNull();
      expect(v('1200', 'Price')).toBe('Price must end with the required format');
    });
  });

  describe('contains', () => {
    it('mustContain (regex)', () => {
      const v = createStringValidator({ mustContain: /\d/ });
      expect(v('abc1', 'Pwd')).toBeNull();
      expect(v('abc', 'Pwd')).toBe('Pwd must include the required format');
    });
    it('mustContain (string, escaped literally)', () => {
      const v = createStringValidator({ mustContain: 'a.b' });
      expect(v('xa.by', 'X')).toBeNull();
      expect(v('aXbY', 'X')).toBe('X must include the required format'); // "." is literal, not wildcard
    });
    it('mustNotContain (regex)', () => {
      const v = createStringValidator({ mustNotContain: /\s/ });
      expect(v('no-spaces', 'X')).toBeNull();
      expect(v('has space', 'X')).toBe('X contains invalid characters or format');
    });
    it('mustNotContain (string, escaped literally)', () => {
      const v = createStringValidator({ mustNotContain: 'a.b' });
      expect(v('xa.by', 'X')).toBe('X contains invalid characters or format');
      expect(v('aXbY', 'X')).toBeNull(); // "." is literal, not a wildcard
    });
    it('mustContain respects caseSensitive:false (uses processed value)', () => {
      const v = createStringValidator({ caseSensitive: false, mustContain: 'abc' });
      expect(v('XABCY', 'X')).toBeNull();
    });
  });

  describe('forbiddenWords', () => {
    it('rejects a forbidden substring (case-sensitive default)', () => {
      const v = createStringValidator({ forbiddenWords: ['admin'] });
      expect(v('superadmin', 'User')).toBe('User contains inappropriate content');
      expect(v('superADMIN', 'User')).toBeNull(); // case-sensitive: no match
    });
    it('matches case-insensitively when caseSensitive:false', () => {
      const v = createStringValidator({ caseSensitive: false, forbiddenWords: ['Spam'] });
      expect(v('this is SPAM', 'Comment')).toBe('Comment contains inappropriate content');
    });
    it('uses a custom forbiddenWords message', () => {
      const v = createStringValidator({ forbiddenWords: ['x'], messages: { forbiddenWords: 'Bad word' } });
      expect(v('axb', 'C')).toBe('Bad word');
    });
  });

  describe('customValidation', () => {
    it('runs last and returns its error', () => {
      const v = createStringValidator({ customValidation: (val) => (val === 'taken' ? 'Already taken' : null) });
      expect(v('taken', 'User')).toBe('Already taken');
      expect(v('free', 'User')).toBeNull();
    });
    it('receives the trimmed value', () => {
      const seen: string[] = [];
      const v = createStringValidator({ customValidation: (val) => { seen.push(val); return null; } });
      v('  hi  ', 'X');
      expect(seen).toEqual(['hi']);
    });
  });

  it('returns null for a fully valid value', () => {
    const v = createStringValidator({ minLength: 3, maxLength: 20, allowedCharacters: 'alphanumeric' });
    expect(v('Iamneo123', 'Username')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Number validator
// ─────────────────────────────────────────────────────────────────────────────

describe('createNumberValidator', () => {
  it('required: rejects null/undefined/empty-string', () => {
    const v = createNumberValidator({});
    expect(v(null, 'Age')).toBe('Please enter age');
    expect(v(undefined, 'Age')).toBe('Please enter age');
    expect(v('', 'Age')).toBe('Please enter age');
  });
  it('required:false returns null for empty', () => {
    expect(createNumberValidator({ required: false })('', 'Age')).toBeNull();
    expect(createNumberValidator({ required: false })(null, 'Age')).toBeNull();
  });
  it('required:false returns null for whitespace string', () => {
    expect(createNumberValidator({ required: false })('   ', 'Age')).toBeNull();
  });
  it('required:true rejects whitespace string', () => {
    expect(createNumberValidator({})('   ', 'Age')).toBe('Please enter age');
  });
  it('parses numeric strings', () => {
    expect(createNumberValidator({ min: 10 })('15', 'Age')).toBeNull();
    expect(createNumberValidator({ min: 10 })('5', 'Age')).toBe('Age must be at least 10');
  });
  it('coerces non-string/number via Number()', () => {
    expect(createNumberValidator({})(true as unknown as number, 'X')).toBeNull(); // Number(true) === 1
    expect(createNumberValidator({})([] as unknown as number, 'X')).toBeNull(); // Number([]) === 0
  });
  it('invalidNumber for NaN', () => {
    expect(createNumberValidator({})('abc', 'Age')).toBe('Age must be a valid number');
    expect(createNumberValidator({})({} as unknown as number, 'Age')).toBe('Age must be a valid number');
  });
  it('min/max', () => {
    const v = createNumberValidator({ min: 0, max: 120 });
    expect(v(-1, 'Age')).toBe('Age must be at least 0');
    expect(v(121, 'Age')).toBe('Age must not exceed 120');
    expect(v(50, 'Age')).toBeNull();
  });
  it('integer', () => {
    const v = createNumberValidator({ integer: true });
    expect(v(3.5, 'N')).toBe('N must be a whole number');
    expect(v(3, 'N')).toBeNull();
  });
  it('positive / negative', () => {
    expect(createNumberValidator({ positive: true })(0, 'N')).toBe('N must be positive');
    expect(createNumberValidator({ positive: true })(1, 'N')).toBeNull();
    expect(createNumberValidator({ negative: true })(0, 'N')).toBe('N must be negative');
    expect(createNumberValidator({ negative: true })(-1, 'N')).toBeNull();
  });
  it('multipleOf', () => {
    const v = createNumberValidator({ multipleOf: 5 });
    expect(v(7, 'N')).toBe('N must be a multiple of 5');
    expect(v(10, 'N')).toBeNull();
  });
  it('precision', () => {
    const v = createNumberValidator({ precision: 2 });
    expect(v(1.234, 'Price')).toBe('Price can have at most 2 decimal places');
    expect(v(1.23, 'Price')).toBeNull();
    expect(v(1, 'Price')).toBeNull();
  });
  it('forbiddenValues', () => {
    const v = createNumberValidator({ forbiddenValues: [13, 666] });
    expect(v(13, 'N')).toBe('N cannot have this value');
    expect(v(12, 'N')).toBeNull();
  });
  it('customValidation', () => {
    const v = createNumberValidator({ customValidation: (n) => (n === 42 ? 'No 42' : null) });
    expect(v(42, 'N')).toBe('No 42');
    expect(v(7, 'N')).toBeNull();
  });
  it('honors custom messages with {fieldName}', () => {
    const v = createNumberValidator({ min: 1, messages: { min: '{fieldName} too small' } });
    expect(v(0, 'Qty')).toBe('Qty too small');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Array validator
// ─────────────────────────────────────────────────────────────────────────────

describe('createArrayValidator', () => {
  it('required: rejects empty/no selection', () => {
    expect(createArrayValidator({})([], 'Skills')).toBe('Please select skills');
    expect(createArrayValidator({})(null, 'Skills')).toBe('Please select skills');
  });
  it('required:false returns null for empty', () => {
    expect(createArrayValidator({ required: false })([], 'Skills')).toBeNull();
  });
  it('empty + minItems yields the minItems message (not required)', () => {
    const v = createArrayValidator({ minItems: 2 });
    expect(v([], 'Skills')).toBe('Skills must have at least 2 items');
  });
  it('invalidArray for non-array, non-empty value', () => {
    expect(createArrayValidator({})('nope' as unknown as unknown[], 'Skills')).toBe('Skills must be an array of selections');
  });
  it('minItems pluralization (1 → item)', () => {
    expect(createArrayValidator({ minItems: 1 })([], 'X')).toBe('X must have at least 1 item');
  });
  it('maxItems with pluralization', () => {
    expect(createArrayValidator({ maxItems: 1 })([1, 2], 'X')).toBe('X cannot have more than 1 item');
    expect(createArrayValidator({ maxItems: 2 })([1, 2, 3], 'X')).toBe('X cannot have more than 2 items');
  });
  it('uniqueItems', () => {
    const v = createArrayValidator({ uniqueItems: true });
    expect(v(['a', 'a'], 'Tags')).toBe('Tags cannot contain duplicate selections');
    expect(v(['a', 'b'], 'Tags')).toBeNull();
  });
  it('allowedValues lists invalid selections', () => {
    const v = createArrayValidator({ allowedValues: ['JS', 'TS'] });
    expect(v(['JS', 'PHP', 'Go'], 'Skills')).toBe('Skills contains invalid selections: PHP, Go');
    expect(v(['JS'], 'Skills')).toBeNull();
  });
  it('forbiddenValues lists forbidden selections', () => {
    const v = createArrayValidator({ forbiddenValues: ['root'] });
    expect(v(['user', 'root'], 'Roles')).toBe('Roles contains forbidden selections: root');
  });
  it('customValidation', () => {
    const v = createArrayValidator({ customValidation: (a) => (a.includes('x') ? 'no x' : null) });
    expect(v(['x'], 'A')).toBe('no x');
    expect(v(['y'], 'A')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox validator
// ─────────────────────────────────────────────────────────────────────────────

describe('createCheckboxValidator', () => {
  it('coerces booleans', () => {
    expect(createCheckboxValidator({ mustBeTrue: true })(true, 'T')).toBeNull();
    expect(createCheckboxValidator({ mustBeTrue: true })(false, 'T')).toBe('T must be accepted');
  });
  it('coerces truthy strings: true/1/on (case-insensitive)', () => {
    const v = createCheckboxValidator({ mustBeTrue: true });
    expect(v('true', 'T')).toBeNull();
    expect(v('TRUE', 'T')).toBeNull();
    expect(v('1', 'T')).toBeNull();
    expect(v('On', 'T')).toBeNull();
    expect(v('no', 'T')).toBe('T must be accepted');
  });
  it('coerces numbers (1 true, others false)', () => {
    expect(createCheckboxValidator({ mustBeTrue: true })(1, 'T')).toBeNull();
    expect(createCheckboxValidator({ mustBeTrue: true })(0, 'T')).toBe('T must be accepted');
  });
  it('coerces other types via Boolean()', () => {
    expect(createCheckboxValidator({ mustBeTrue: true })({} as unknown, 'T')).toBeNull(); // truthy object
    expect(createCheckboxValidator({ mustBeTrue: true })(null, 'T')).toBe('T must be accepted');
  });
  it('mustBeFalse', () => {
    const v = createCheckboxValidator({ mustBeFalse: true });
    expect(v(true, 'Opt')).toBe('Opt must not be selected');
    expect(v(false, 'Opt')).toBeNull();
  });
  it('required (lone checkbox must be checked)', () => {
    expect(createCheckboxValidator({})(false, 'Agree')).toBe('Agree is required');
    expect(createCheckboxValidator({})(true, 'Agree')).toBeNull();
  });
  it('required is skipped when mustBeFalse is set', () => {
    expect(createCheckboxValidator({ mustBeFalse: true })(false, 'Opt')).toBeNull();
  });
  it('required:false allows unchecked', () => {
    expect(createCheckboxValidator({ required: false })(false, 'News')).toBeNull();
  });
  it('mustBeTrue takes priority over the generic required message', () => {
    const v = createCheckboxValidator({ mustBeTrue: true, messages: { mustBeTrue: 'Accept!', required: 'Req!' } });
    expect(v(false, 'T')).toBe('Accept!');
  });
  it('customValidation receives the coerced boolean', () => {
    const seen: boolean[] = [];
    const v = createCheckboxValidator({ customValidation: (b) => { seen.push(b); return null; } });
    v('on', 'T');
    expect(seen).toEqual([true]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date validator — basics
// ─────────────────────────────────────────────────────────────────────────────

describe('createDateValidator — basics', () => {
  it('required / empty', () => {
    expect(createDateValidator({})('', 'DOB')).toBe('Please select dob');
    expect(createDateValidator({})(null, 'DOB')).toBe('Please select dob');
    expect(createDateValidator({})('   ', 'DOB')).toBe('Please select dob');
  });
  it('required:false returns null for empty', () => {
    expect(createDateValidator({ required: false })('', 'DOB')).toBeNull();
    expect(createDateValidator({ required: false })(null, 'DOB')).toBeNull();
  });
  it('invalidDate for unparsable string / unsupported types', () => {
    expect(createDateValidator({})('abc', 'D')).toBe('D must be a valid date');
    expect(createDateValidator({})(true as unknown, 'D')).toBe('D must be a valid date');
    expect(createDateValidator({})({} as unknown, 'D')).toBe('D must be a valid date');
  });
  it('invalidDate includes the format hint when dateFormat is set', () => {
    expect(createDateValidator({ dateFormat: 'YYYY-MM-DD' })('abc', 'D')).toBe('D must be a valid date (Format: YYYY-MM-DD)');
  });
  it('accepts a Date instance', () => {
    expect(createDateValidator({})(new Date(2024, 0, 15), 'D')).toBeNull();
  });
  it('accepts a numeric timestamp', () => {
    expect(createDateValidator({})(Date.UTC(2024, 0, 15), 'D')).toBeNull();
  });
  it('customValidation receives the parsed Date', () => {
    const v = createDateValidator({
      customValidation: (d) => (d.getFullYear() < 2000 ? 'Too old' : null),
    });
    expect(v('1990-01-01', 'D')).toBe('Too old');
    expect(v('2020-01-01', 'D')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date validator — relative (inFuture/inPast/...DateTime) with fixed clock
// ─────────────────────────────────────────────────────────────────────────────

describe('createDateValidator — relative checks (fixed clock, UTC)', () => {
  const ORIGINAL_TZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'UTC'; });
  afterAll(() => { process.env.TZ = ORIGINAL_TZ; });

  beforeEach(() => {
    vi.useFakeTimers();
    // "now" = 2024-06-15T12:00:00Z; in UTC today = 2024-06-15
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('inFuture accepts a later day, rejects today and earlier', () => {
    const v = createDateValidator({ inFuture: true });
    expect(v('2024-06-20', 'D')).toBeNull();
    expect(v('2024-06-15', 'D')).toBe('D must be a future date'); // today is not "future"
    expect(v('2024-06-10', 'D')).toBe('D must be a future date');
  });
  it('inPast accepts an earlier day, rejects today and later', () => {
    const v = createDateValidator({ inPast: true });
    expect(v('2024-06-10', 'D')).toBeNull();
    expect(v('2024-06-15', 'D')).toBe('D must be a past date'); // today is not "past"
    expect(v('2024-06-20', 'D')).toBe('D must be a past date');
  });
  it('inFutureDateTime is strict about the current instant', () => {
    const v = createDateValidator({ inFutureDateTime: true });
    expect(v('2024-06-15T12:00:01Z', 'D')).toBeNull();
    expect(v('2024-06-15T12:00:00Z', 'D')).toBe('D must be in the future'); // exactly now
    expect(v('2024-06-15T11:59:59Z', 'D')).toBe('D must be in the future');
  });
  it('inPastDateTime is strict about the current instant', () => {
    const v = createDateValidator({ inPastDateTime: true });
    expect(v('2024-06-15T11:59:59Z', 'D')).toBeNull();
    expect(v('2024-06-15T12:00:00Z', 'D')).toBe('D must be in the past'); // exactly now
    expect(v('2024-06-15T12:00:01Z', 'D')).toBe('D must be in the past');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date validator — min/max range
// ─────────────────────────────────────────────────────────────────────────────

describe('createDateValidator — min/max range (UTC)', () => {
  const ORIGINAL_TZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'UTC'; });
  afterAll(() => { process.env.TZ = ORIGINAL_TZ; });

  it('minDate is inclusive at the start of the day', () => {
    const v = createDateValidator({ minDate: '2024-01-15' });
    expect(v('2024-01-15', 'D')).toBeNull(); // exactly min
    expect(v('2024-01-14', 'D')).toBe('D cannot be before 2024-01-15');
    expect(v('2024-01-16', 'D')).toBeNull();
  });
  it('maxDate is inclusive through the end of the day', () => {
    const v = createDateValidator({ maxDate: '2024-01-15' });
    expect(v('2024-01-15', 'D')).toBeNull(); // exactly max (start of day, within end-of-day bound)
    expect(v('2024-01-15T23:59:59', 'D')).toBeNull(); // late on the max day still passes
    expect(v('2024-01-16', 'D')).toBe('D cannot be after 2024-01-15');
  });
  it('accepts Date objects for min/max bounds', () => {
    const v = createDateValidator({ minDate: new Date(2024, 0, 10), maxDate: new Date(2024, 0, 20) });
    expect(v('2024-01-15', 'D')).toBeNull();
    expect(v('2024-01-05', 'D')).toContain('cannot be before');
    expect(v('2024-01-25', 'D')).toContain('cannot be after');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseLocalDate / formatLocalDate — cross-timezone correctness
// ─────────────────────────────────────────────────────────────────────────────

const ZONES = [
  { name: 'UTC', tz: 'UTC' },
  { name: 'America/New_York (UTC-5/-4)', tz: 'America/New_York' },
  { name: 'Asia/Kolkata (UTC+5:30)', tz: 'Asia/Kolkata' },
  { name: 'Pacific/Kiritimati (UTC+14)', tz: 'Pacific/Kiritimati' },
  { name: 'Pacific/Pago_Pago (UTC-11)', tz: 'Pacific/Pago_Pago' },
];

describe.each(ZONES)('local-date semantics in $name', ({ tz }) => {
  const ORIGINAL_TZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = tz; });
  afterAll(() => { process.env.TZ = ORIGINAL_TZ; });

  it('parseLocalDate keeps the calendar day for a bare YYYY-MM-DD', () => {
    const d = parseLocalDate('2024-01-15');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15); // would be 14 in UTC-N zones if parsed as UTC midnight
    expect(d.getHours()).toBe(0); // local midnight
  });

  it('formatLocalDate round-trips a bare date back to the same string', () => {
    expect(formatLocalDate(parseLocalDate('2024-01-15'))).toBe('2024-01-15');
    expect(formatLocalDate(parseLocalDate('2024-12-31'))).toBe('2024-12-31');
  });

  it('maxDate boundary uses the LOCAL day in every timezone', () => {
    // The classic UTC pitfall: new Date("2024-01-15") is UTC midnight, which is the
    // previous local day west of Greenwich. parseLocalDate avoids that, so the value
    // on its own max day is accepted everywhere.
    const v = createDateValidator({ maxDate: '2024-01-15' });
    expect(v('2024-01-15', 'D')).toBeNull();
    expect(v('2024-01-16', 'D')).toBe('D cannot be after 2024-01-15');
  });

  it('minDate boundary uses the LOCAL day in every timezone', () => {
    const v = createDateValidator({ minDate: '2024-01-15' });
    expect(v('2024-01-15', 'D')).toBeNull();
    expect(v('2024-01-14', 'D')).toBe('D cannot be before 2024-01-15');
  });

  it('a string with an explicit Z is an absolute instant (not shifted by parseLocalDate)', () => {
    const d = parseLocalDate('2024-01-15T00:00:00Z');
    expect(d.getTime()).toBe(Date.UTC(2024, 0, 15, 0, 0, 0));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseLocalDate — direct unit behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('parseLocalDate', () => {
  it('returns a Date instance unchanged', () => {
    const d = new Date(2024, 5, 1, 9, 30);
    expect(parseLocalDate(d)).toBe(d);
  });
  it('treats a numeric timestamp as an absolute instant', () => {
    const ts = Date.UTC(2024, 0, 1);
    expect(parseLocalDate(ts).getTime()).toBe(ts);
  });
  it('trims surrounding whitespace before parsing a bare date', () => {
    const prev = process.env.TZ;
    process.env.TZ = 'America/New_York';
    expect(formatLocalDate(parseLocalDate('  2024-01-15  '))).toBe('2024-01-15');
    process.env.TZ = prev;
  });
  it('returns an Invalid Date for unparsable strings', () => {
    expect(isNaN(parseLocalDate('not-a-date').getTime())).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// humanizeFieldName
// ─────────────────────────────────────────────────────────────────────────────

describe('humanizeFieldName', () => {
  it('uses the last path segment', () => {
    expect(humanizeFieldName('user.email')).toBe('Email');
    expect(humanizeFieldName('a.b.c')).toBe('C');
  });
  it('strips array indices', () => {
    expect(humanizeFieldName('items.0.qty')).toBe('Qty');
    expect(humanizeFieldName('rows.12.name')).toBe('Name');
  });
  it('splits camelCase and title-cases', () => {
    expect(humanizeFieldName('firstName')).toBe('First Name');
    expect(humanizeFieldName('dateOfBirth')).toBe('Date Of Birth');
  });
  it('replaces underscores and dashes with spaces', () => {
    expect(humanizeFieldName('postal_code')).toBe('Postal code');
    expect(humanizeFieldName('home-phone')).toBe('Home phone');
  });
  it('handles a plain single-word path', () => {
    expect(humanizeFieldName('email')).toBe('Email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toValidationRule — bridge field validators into a form's `validate`
// ─────────────────────────────────────────────────────────────────────────────

describe('toValidationRule', () => {
  it('adapts a field validator into a (value, values, path) rule', () => {
    const rule = toValidationRule(createStringValidator({ minLength: 3 }), 'Name');
    expect(rule('ab', {}, 'name')).toBe('Name should be at least 3 characters long');
    expect(rule('abc', {}, 'name')).toBeNull();
  });
  it('infers fieldName from the path when not provided', () => {
    const rule = toValidationRule(createNumberValidator({ min: 18 }));
    expect(rule(15, {}, 'user.age')).toBe('Age must be at least 18');
    expect(rule(20, {}, 'user.age')).toBeNull();
  });
  it('infers a humanized name from a nested/array path', () => {
    const rule = toValidationRule(createStringValidator({ minLength: 2 }));
    expect(rule('x', {}, 'items.0.productName')).toBe('Product Name should be at least 2 characters long');
  });
  it('works with the date validator and explicit name', () => {
    const rule = toValidationRule(createDateValidator({ required: true }), 'Birth date');
    expect(rule('', {}, 'dob')).toBe('Please select birth date');
  });
  it('returns null (valid) and is shaped like a ValidationRule', () => {
    const rule = toValidationRule(createCheckboxValidator({ mustBeTrue: true }), 'Terms');
    expect(rule(true, {}, 'terms')).toBeNull();
    expect(rule(false, {}, 'terms')).toBe('Terms must be accepted');
  });
});

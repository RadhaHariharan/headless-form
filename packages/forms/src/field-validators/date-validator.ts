import type { FieldValidatorFunction } from './types.js';

/** Configuration for {@link createDateValidator}. */
export interface DateValidationRule {
  /**
   * Human-readable format hint, e.g. `'YYYY-MM-DD'`. Used only to enrich the `invalidDate`
   * error message — parsing itself is handled by {@link parseLocalDate} (no custom-format
   * parsing is performed).
   */
  dateFormat?: string;
  /** Earliest allowed date (inclusive). Compared at the start of the local day. */
  minDate?: string | Date;
  /** Latest allowed date (inclusive). Compared at the end of the local day. */
  maxDate?: string | Date;
  /** Must be strictly after today (tomorrow or later), compared at local day granularity. */
  inFuture?: boolean;
  /** Must be strictly before today (yesterday or earlier), compared at local day granularity. */
  inPast?: boolean;
  /** Must be strictly after the current moment (date + time). */
  inFutureDateTime?: boolean;
  /** Must be strictly before the current moment (date + time). */
  inPastDateTime?: boolean;
  /** Whether the field is required. @defaultValue `true` */
  required?: boolean;
  /** Custom validation run last; receives the parsed `Date`. */
  customValidation?: (value: Date) => string | null;
  /** Custom error messages. Each supports the `{fieldName}` placeholder. */
  messages?: {
    required?: string;
    invalidDate?: string;
    minDate?: string;
    maxDate?: string;
    inFuture?: string;
    inPast?: string;
    inFutureDateTime?: string;
    inPastDateTime?: string;
  };
}

/**
 * Parse a date input into a **local** `Date`.
 *
 * @remarks
 * A bare `YYYY-MM-DD` string is constructed from local calendar parts via
 * `new Date(year, month - 1, day)` — i.e. **local midnight**. This deliberately differs
 * from `new Date("YYYY-MM-DD")`, which the spec parses as **UTC midnight**; in negative-UTC
 * timezones that would shift the date back by one calendar day. Strings that carry an
 * explicit time and/or timezone (e.g. `2024-01-15T08:00:00Z`), `Date` instances, and
 * numeric timestamps are passed through to the native `Date` constructor unchanged, so
 * their absolute instant is preserved.
 *
 * @param value - A date string, `Date`, or timestamp.
 * @returns A `Date` (may be `Invalid Date` if the input is unparsable).
 */
export function parseLocalDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(value.trim());
  }
  return new Date(value);
}

/**
 * Format a `Date` as a **local** `YYYY-MM-DD` string (used in error messages).
 *
 * @param date - The date to format.
 * @returns The local calendar date as `YYYY-MM-DD`.
 */
export function formatLocalDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Creates a reusable date field validator.
 *
 * @remarks
 * Uses the native `Date` object with **local-timezone** semantics for bare calendar dates
 * (see {@link parseLocalDate}). Range checks (`minDate`/`maxDate`) and relative checks
 * (`inFuture`/`inPast`) operate at local-day granularity; `inFutureDateTime`/`inPastDateTime`
 * compare the exact instant against `Date.now()`.
 *
 * @param rules - Validation configuration.
 * @returns A `FieldValidatorFunction<unknown>`.
 *
 * @example
 * ```ts
 * const dob = createDateValidator({ maxDate: '2024-01-01', inPast: true });
 * dob('1990-05-20', 'Date of birth'); // null
 * dob('2999-01-01', 'Date of birth'); // "Date of birth cannot be after 2024-01-01"
 * ```
 */
export function createDateValidator(rules: DateValidationRule): FieldValidatorFunction<unknown> {
  return function validateDate(value: unknown, fieldName: string): string | null {
    const getMessage = (
      messageKey: keyof NonNullable<DateValidationRule['messages']>,
      defaultMessage: string,
    ): string => {
      const message = rules.messages?.[messageKey] || defaultMessage;
      return message.replace(/\{fieldName\}/g, fieldName);
    };

    // Required / empty
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    if (rules.required !== false && isEmpty) {
      return getMessage('required', `Please select ${fieldName.toLowerCase()}`);
    }
    if (isEmpty && rules.required === false) {
      return null;
    }

    // Parse
    let dateValue: Date;
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string') {
      dateValue = parseLocalDate(value);
    } else if (typeof value === 'number') {
      dateValue = new Date(value);
    } else {
      // Unsupported type (object/boolean/etc.) — not a valid date.
      dateValue = new Date(NaN);
    }

    if (isNaN(dateValue.getTime())) {
      const formatHint = rules.dateFormat ? ` (Format: ${rules.dateFormat})` : '';
      return getMessage('invalidDate', `${fieldName} must be a valid date${formatHint}`);
    }

    // Today at local start-of-day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // minDate (inclusive, start of local day)
    if (rules.minDate) {
      const minDate = parseLocalDate(rules.minDate);
      minDate.setHours(0, 0, 0, 0);
      if (dateValue.getTime() < minDate.getTime()) {
        return getMessage('minDate', `${fieldName} cannot be before ${formatLocalDate(minDate)}`);
      }
    }

    // maxDate (inclusive, end of local day)
    if (rules.maxDate) {
      const maxDate = parseLocalDate(rules.maxDate);
      maxDate.setHours(23, 59, 59, 999);
      if (dateValue.getTime() > maxDate.getTime()) {
        return getMessage('maxDate', `${fieldName} cannot be after ${formatLocalDate(maxDate)}`);
      }
    }

    // inFuture (tomorrow or later, local day granularity)
    if (rules.inFuture) {
      const checkDate = new Date(dateValue);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate.getTime() <= today.getTime()) {
        return getMessage('inFuture', `${fieldName} must be a future date`);
      }
    }

    // inPast (yesterday or earlier, local day granularity)
    if (rules.inPast) {
      const checkDate = new Date(dateValue);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate.getTime() >= today.getTime()) {
        return getMessage('inPast', `${fieldName} must be a past date`);
      }
    }

    // inFutureDateTime (strictly after now)
    if (rules.inFutureDateTime) {
      if (dateValue.getTime() <= Date.now()) {
        return getMessage('inFutureDateTime', `${fieldName} must be in the future`);
      }
    }

    // inPastDateTime (strictly before now)
    if (rules.inPastDateTime) {
      if (dateValue.getTime() >= Date.now()) {
        return getMessage('inPastDateTime', `${fieldName} must be in the past`);
      }
    }

    // Custom
    if (rules.customValidation) {
      const customResult = rules.customValidation(dateValue);
      if (customResult) return customResult;
    }

    return null;
  };
}

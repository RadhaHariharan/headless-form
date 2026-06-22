import type { FieldValidatorFunction } from './types.js';

/** Configuration for {@link createNumberValidator}. */
export interface NumberValidationRule {
  /** Minimum allowed value (inclusive). */
  min?: number;
  /** Maximum allowed value (inclusive). */
  max?: number;
  /** Require an integer (no fractional part). */
  integer?: boolean;
  /** Require a strictly positive number (`> 0`). */
  positive?: boolean;
  /** Require a strictly negative number (`< 0`). */
  negative?: boolean;
  /** Require the value to be a multiple of this number. */
  multipleOf?: number;
  /** Maximum number of decimal places allowed. */
  precision?: number;
  /** Values that are explicitly disallowed. */
  forbiddenValues?: number[];
  /** Whether the field is required. @defaultValue `true` */
  required?: boolean;
  /** Custom validation run last; receives the parsed number. */
  customValidation?: (value: number) => string | null;
  /** Custom error messages. Each supports the `{fieldName}` placeholder. */
  messages?: {
    required?: string;
    min?: string;
    max?: string;
    integer?: string;
    positive?: string;
    negative?: string;
    multipleOf?: string;
    precision?: string;
    forbiddenValues?: string;
    invalidNumber?: string;
  };
}

/**
 * Creates a reusable number field validator.
 *
 * Accepts numbers or numeric strings (parsed with `parseFloat`). Empty values are treated
 * as "missing" for the required check. Returns a human-readable error string or `null`.
 *
 * @param rules - Validation configuration.
 * @returns A `FieldValidatorFunction<unknown>`.
 *
 * @example
 * ```ts
 * const age = createNumberValidator({ min: 0, max: 120, integer: true });
 * age(25, 'Age');     // null
 * age(-5, 'Age');     // "Age must be at least 0"
 * age('abc', 'Age');  // "Age must be a valid number"
 * ```
 */
export function createNumberValidator(rules: NumberValidationRule): FieldValidatorFunction<unknown> {
  return function validateNumber(value: unknown, fieldName: string): string | null {
    const getMessage = (
      messageKey: keyof NonNullable<NumberValidationRule['messages']>,
      defaultMessage: string,
    ): string => {
      const message = rules.messages?.[messageKey] || defaultMessage;
      return message.replace(/\{fieldName\}/g, fieldName);
    };

    // Required
    if (rules.required !== false && (value === null || value === undefined || value === '')) {
      return getMessage('required', `Please enter ${fieldName.toLowerCase()}`);
    }
    if ((value === null || value === undefined || value === '') && rules.required === false) {
      return null;
    }

    // Coerce to number
    let numValue: number;
    if (typeof value === 'string') {
      if (value.trim() === '') {
        if (rules.required !== false) {
          return getMessage('required', `Please enter ${fieldName.toLowerCase()}`);
        }
        return null;
      }
      numValue = parseFloat(value.trim());
    } else if (typeof value === 'number') {
      numValue = value;
    } else {
      numValue = Number(value);
    }

    // Type
    if (isNaN(numValue)) {
      return getMessage('invalidNumber', `${fieldName} must be a valid number`);
    }

    // Range
    if (rules.min !== undefined && numValue < rules.min) {
      return getMessage('min', `${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && numValue > rules.max) {
      return getMessage('max', `${fieldName} must not exceed ${rules.max}`);
    }

    // Integer
    if (rules.integer && !Number.isInteger(numValue)) {
      return getMessage('integer', `${fieldName} must be a whole number`);
    }

    // Sign
    if (rules.positive && numValue <= 0) {
      return getMessage('positive', `${fieldName} must be positive`);
    }
    if (rules.negative && numValue >= 0) {
      return getMessage('negative', `${fieldName} must be negative`);
    }

    // Multiple
    if (rules.multipleOf && numValue % rules.multipleOf !== 0) {
      return getMessage('multipleOf', `${fieldName} must be a multiple of ${rules.multipleOf}`);
    }

    // Precision
    if (rules.precision !== undefined) {
      const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
      if (decimalPlaces > rules.precision) {
        return getMessage('precision', `${fieldName} can have at most ${rules.precision} decimal places`);
      }
    }

    // Forbidden values
    if (rules.forbiddenValues && rules.forbiddenValues.includes(numValue)) {
      return getMessage('forbiddenValues', `${fieldName} cannot have this value`);
    }

    // Custom
    if (rules.customValidation) {
      const customResult = rules.customValidation(numValue);
      if (customResult) return customResult;
    }

    return null;
  };
}

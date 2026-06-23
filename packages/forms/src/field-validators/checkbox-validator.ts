import type { FieldValidatorFunction } from './types.js';

/** Configuration for {@link createCheckboxValidator}. */
export interface BooleanValidationRule {
  /** The box must be checked (e.g. accept terms). Takes priority over `required`. */
  mustBeTrue?: boolean;
  /** The box must be unchecked (e.g. an opt-out that must stay off). */
  mustBeFalse?: boolean;
  /** Whether the field is required (must be checked). @defaultValue `true` */
  required?: boolean;
  /** Custom validation run last; receives the coerced boolean. */
  customValidation?: (value: boolean) => string | null;
  /** Custom error messages. Each supports the `{fieldName}` placeholder. */
  messages?: {
    required?: string;
    mustBeTrue?: string;
    mustBeFalse?: string;
    invalidBoolean?: string;
  };
}

/**
 * Creates a reusable checkbox / boolean field validator.
 *
 * Coerces common checkbox representations to a boolean: real booleans pass through;
 * the strings `'true'`, `'1'`, `'on'` (case-insensitive) are truthy; the number `1` is
 * truthy; everything else falls back to `Boolean(value)`.
 *
 * @param rules - Validation configuration.
 * @returns A `FieldValidatorFunction<unknown>`.
 *
 * @example
 * ```ts
 * const terms = createCheckboxValidator({ mustBeTrue: true });
 * terms(true, 'Terms');  // null
 * terms(false, 'Terms'); // "Terms must be accepted"
 * terms('on', 'Terms');  // null
 * ```
 */
export function createCheckboxValidator(rules: BooleanValidationRule): FieldValidatorFunction<unknown> {
  return function validateCheckbox(value: unknown, fieldName: string): string | null {
    const getMessage = (
      messageKey: keyof NonNullable<BooleanValidationRule['messages']>,
      defaultMessage: string,
    ): string => {
      const message = rules.messages?.[messageKey] || defaultMessage;
      return message.replace(/\{fieldName\}/g, fieldName);
    };

    // Coerce to boolean
    let boolValue: boolean;
    if (typeof value === 'boolean') {
      boolValue = value;
    } else if (typeof value === 'string') {
      boolValue = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'on';
    } else if (typeof value === 'number') {
      boolValue = value === 1;
    } else {
      boolValue = Boolean(value);
    }

    // mustBeTrue first (specific message wins over generic required)
    if (rules.mustBeTrue && !boolValue) {
      return getMessage('mustBeTrue', `${fieldName} must be accepted`);
    }
    // mustBeFalse
    if (rules.mustBeFalse && boolValue) {
      return getMessage('mustBeFalse', `${fieldName} must not be selected`);
    }
    // Required (skipped when mustBeFalse is set — unchecked is the valid state there)
    if (rules.required !== false && !rules.mustBeFalse && !boolValue) {
      return getMessage('required', `${fieldName} is required`);
    }

    // Custom
    if (rules.customValidation) {
      const customResult = rules.customValidation(boolValue);
      if (customResult) return customResult;
    }

    return null;
  };
}

import type { FieldValidatorFunction } from './types.js';

/** Configuration for {@link createArrayValidator}. */
export interface ArrayValidationRule {
  /** Minimum number of items. */
  minItems?: number;
  /** Maximum number of items. */
  maxItems?: number;
  /** Reject duplicate items. */
  uniqueItems?: boolean;
  /** Whitelist of permitted item values. */
  allowedValues?: unknown[];
  /** Blacklist of forbidden item values. */
  forbiddenValues?: unknown[];
  /** Whether the field is required. @defaultValue `true` */
  required?: boolean;
  /** Custom validation run last; receives the array. */
  customValidation?: (value: unknown[]) => string | null;
  /** Custom error messages. Each supports the `{fieldName}` placeholder. */
  messages?: {
    required?: string;
    minItems?: string;
    maxItems?: string;
    uniqueItems?: string;
    allowedValues?: string;
    forbiddenValues?: string;
    invalidArray?: string;
  };
}

/**
 * Creates a reusable array / multi-select field validator.
 *
 * @param rules - Validation configuration.
 * @returns A `FieldValidatorFunction<unknown>`.
 *
 * @remarks
 * When a `minItems` rule is present, an empty value is deferred to the count check so it
 * yields the more specific "must have at least N items" message instead of the generic
 * required message.
 *
 * @example
 * ```ts
 * const skills = createArrayValidator({ minItems: 1, maxItems: 5, uniqueItems: true });
 * skills(['JS', 'TS'], 'Skills'); // null
 * skills([], 'Skills');           // "Skills must have at least 1 item"
 * ```
 */
export function createArrayValidator(rules: ArrayValidationRule): FieldValidatorFunction<unknown> {
  return function validateArray(value: unknown, fieldName: string): string | null {
    const getMessage = (
      messageKey: keyof NonNullable<ArrayValidationRule['messages']>,
      defaultMessage: string,
    ): string => {
      const message = rules.messages?.[messageKey] || defaultMessage;
      return message.replace(/\{fieldName\}/g, fieldName);
    };

    const isEmpty = !value || (Array.isArray(value) && value.length === 0);

    // Required (deferred to count check when minItems is set)
    if (rules.required !== false && isEmpty && rules.minItems === undefined) {
      return getMessage('required', `Please select ${fieldName.toLowerCase()}`);
    }
    if (isEmpty && rules.required === false) {
      return null;
    }

    // Type
    if (!Array.isArray(value)) {
      return getMessage('invalidArray', `${fieldName} must be an array of selections`);
    }

    // Count
    if (rules.minItems !== undefined && value.length < rules.minItems) {
      const itemText = rules.minItems === 1 ? 'item' : 'items';
      return getMessage('minItems', `${fieldName} must have at least ${rules.minItems} ${itemText}`);
    }
    if (rules.maxItems !== undefined && value.length > rules.maxItems) {
      const itemText = rules.maxItems === 1 ? 'item' : 'items';
      return getMessage('maxItems', `${fieldName} cannot have more than ${rules.maxItems} ${itemText}`);
    }

    // Unique
    if (rules.uniqueItems) {
      const uniqueItems = [...new Set(value)];
      if (uniqueItems.length !== value.length) {
        return getMessage('uniqueItems', `${fieldName} cannot contain duplicate selections`);
      }
    }

    // Allowed values
    if (rules.allowedValues && rules.allowedValues.length > 0) {
      const invalidItems = value.filter((item) => !rules.allowedValues!.includes(item));
      if (invalidItems.length > 0) {
        return getMessage('allowedValues', `${fieldName} contains invalid selections: ${invalidItems.join(', ')}`);
      }
    }

    // Forbidden values
    if (rules.forbiddenValues && rules.forbiddenValues.length > 0) {
      const forbiddenItems = value.filter((item) => rules.forbiddenValues!.includes(item));
      if (forbiddenItems.length > 0) {
        return getMessage('forbiddenValues', `${fieldName} contains forbidden selections: ${forbiddenItems.join(', ')}`);
      }
    }

    // Custom
    if (rules.customValidation) {
      const customResult = rules.customValidation(value);
      if (customResult) return customResult;
    }

    return null;
  };
}

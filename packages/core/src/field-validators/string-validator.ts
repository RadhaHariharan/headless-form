import type { FieldValidatorFunction } from './types.js';

/**
 * Configuration for {@link createStringValidator}.
 *
 * @remarks
 * Renamed from the original `ValidationRule` to avoid colliding with core's exported
 * `ValidationRule` (the form-rule function type).
 */
export interface StringValidationRule {
  /** Minimum required length (after trimming). */
  minLength?: number;
  /** Maximum allowed length (after trimming). */
  maxLength?: number;
  /**
   * Restricts input to a character class:
   * - `'alphanumeric'` — letters and digits
   * - `'alphabetic'` — letters only
   * - `'numeric'` — digits only
   * - `'custom'` — uses {@link StringValidationRule.customPattern}
   */
  allowedCharacters?: 'alphanumeric' | 'alphabetic' | 'numeric' | 'custom';
  /** Custom pattern, required when `allowedCharacters` is `'custom'`. */
  customPattern?: RegExp;
  /** Pattern/characters the value must NOT start with. */
  shouldNotStartWith?: string | RegExp;
  /** Pattern/characters the value must NOT end with. */
  shouldNotEndWith?: string | RegExp;
  /** Pattern/characters the value MUST start with. */
  shouldStartWith?: string | RegExp;
  /** Pattern/characters the value MUST end with. */
  shouldEndWith?: string | RegExp;
  /** Whether the field is required. @defaultValue `true` */
  required?: boolean;
  /** Custom validation run last; receives the trimmed value. Return an error string or `null`. */
  customValidation?: (value: string) => string | null;
  /** Whether comparisons are case-sensitive. @defaultValue `true` */
  caseSensitive?: boolean;
  /** Whether spaces are allowed (affects `allowedCharacters`). @defaultValue `false` */
  allowSpaces?: boolean;
  /** Whether special characters are allowed (only when `allowedCharacters` is unset). @defaultValue `true` */
  allowSpecialChars?: boolean;
  /** Words/phrases that may not appear anywhere in the value. */
  forbiddenWords?: string[];
  /** Pattern/string that must be present. */
  mustContain?: string | RegExp;
  /** Pattern/string that must not be present. */
  mustNotContain?: string | RegExp;
  /** Custom error messages. Each supports the `{fieldName}` placeholder. */
  messages?: {
    required?: string;
    minLength?: string;
    maxLength?: string;
    allowedCharacters?: string;
    shouldNotStartWith?: string;
    shouldNotEndWith?: string;
    shouldStartWith?: string;
    shouldEndWith?: string;
    mustContain?: string;
    mustNotContain?: string;
    forbiddenWords?: string;
    allowSpecialChars?: string;
  };
}

/** Escapes a string for safe use inside a `RegExp`. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a reusable string field validator.
 *
 * The returned function validates a value against the configured rules and returns a
 * human-readable error string, or `null` when valid. Validation order is: required →
 * length → character class → special chars → start/end → contains → forbidden words →
 * custom.
 *
 * @param rules - Validation configuration.
 * @returns A `FieldValidatorFunction` `(value, fieldName) => string | null`.
 *
 * @throws {Error} When `allowedCharacters` is `'custom'` but no `customPattern` is given —
 *   thrown lazily, only when a non-empty value reaches the character-class check.
 *
 * @example
 * ```ts
 * const username = createStringValidator({
 *   minLength: 3,
 *   maxLength: 20,
 *   allowedCharacters: 'alphanumeric',
 *   shouldNotStartWith: /^[0-9]/,
 * });
 * username('Iamneo123', 'Username'); // null
 * username('jo', 'Username');        // "Username should be at least 3 characters long"
 * ```
 */
export function createStringValidator(rules: StringValidationRule): FieldValidatorFunction<string> {
  return function validate(value: string, fieldName: string): string | null {
    const processedValue = rules.caseSensitive === false ? value?.toLowerCase() : value;
    const trimmedValue = value?.trim();

    const getMessage = (
      messageKey: keyof NonNullable<StringValidationRule['messages']>,
      defaultMessage: string,
    ): string => {
      const message = rules.messages?.[messageKey] || defaultMessage;
      return message.replace(/\{fieldName\}/g, fieldName);
    };

    // Required
    if (rules.required !== false && (!trimmedValue || trimmedValue.length === 0)) {
      return getMessage('required', `${fieldName} is required`);
    }
    if (!trimmedValue && rules.required === false) {
      return null;
    }

    // Length
    if (rules.minLength !== undefined && trimmedValue.length < rules.minLength) {
      return getMessage('minLength', `${fieldName} should be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength !== undefined && trimmedValue.length > rules.maxLength) {
      return getMessage('maxLength', `${fieldName} should not exceed ${rules.maxLength} characters`);
    }

    // Character class
    if (rules.allowedCharacters) {
      let pattern: RegExp;
      let charTypeDescription: string;
      switch (rules.allowedCharacters) {
        case 'alphanumeric':
          pattern = rules.allowSpaces ? /^[a-zA-Z0-9\s]+$/ : /^[a-zA-Z0-9]+$/;
          charTypeDescription = 'letters and numbers';
          break;
        case 'alphabetic':
          pattern = rules.allowSpaces ? /^[a-zA-Z\s]+$/ : /^[a-zA-Z]+$/;
          charTypeDescription = 'letters';
          break;
        case 'numeric':
          pattern = rules.allowSpaces ? /^[0-9\s]+$/ : /^[0-9]+$/;
          charTypeDescription = 'numbers';
          break;
        case 'custom':
          if (!rules.customPattern) {
            throw new Error('Custom pattern must be provided when using custom allowed characters');
          }
          pattern = rules.customPattern;
          charTypeDescription = 'valid characters';
          break;
      }
      if (!pattern.test(trimmedValue)) {
        const spaceText = rules.allowSpaces ? ' and spaces' : '';
        return getMessage('allowedCharacters', `${fieldName} can only contain ${charTypeDescription}${spaceText}`);
      }
    }

    // Special characters (only when allowedCharacters is unset)
    if (rules.allowSpecialChars === false && !rules.allowedCharacters) {
      if (/[^a-zA-Z0-9\s]/.test(trimmedValue)) {
        return getMessage('allowSpecialChars', `${fieldName} cannot contain special characters`);
      }
    }

    // Start patterns
    if (rules.shouldNotStartWith) {
      const startPattern =
        typeof rules.shouldNotStartWith === 'string'
          ? new RegExp(`^[${escapeRegExp(rules.shouldNotStartWith)}]`)
          : rules.shouldNotStartWith;
      if (startPattern.test(trimmedValue)) {
        return getMessage('shouldNotStartWith', `${fieldName} cannot start with special characters or numbers`);
      }
    }
    if (rules.shouldStartWith) {
      const startPattern =
        typeof rules.shouldStartWith === 'string'
          ? new RegExp(`^${escapeRegExp(rules.shouldStartWith)}`)
          : rules.shouldStartWith;
      if (!startPattern.test(trimmedValue)) {
        return getMessage('shouldStartWith', `${fieldName} must start with the required format`);
      }
    }

    // End patterns
    if (rules.shouldNotEndWith) {
      const endPattern =
        typeof rules.shouldNotEndWith === 'string'
          ? new RegExp(`[${escapeRegExp(rules.shouldNotEndWith)}]$`)
          : rules.shouldNotEndWith;
      if (endPattern.test(trimmedValue)) {
        return getMessage('shouldNotEndWith', `${fieldName} cannot end with special characters`);
      }
    }
    if (rules.shouldEndWith) {
      const endPattern =
        typeof rules.shouldEndWith === 'string'
          ? new RegExp(`${escapeRegExp(rules.shouldEndWith)}$`)
          : rules.shouldEndWith;
      if (!endPattern.test(trimmedValue)) {
        return getMessage('shouldEndWith', `${fieldName} must end with the required format`);
      }
    }

    // Content requirements
    if (rules.mustContain) {
      const containPattern =
        typeof rules.mustContain === 'string'
          ? new RegExp(escapeRegExp(rules.mustContain))
          : rules.mustContain;
      if (!containPattern.test(processedValue)) {
        return getMessage('mustContain', `${fieldName} must include the required format`);
      }
    }
    if (rules.mustNotContain) {
      const notContainPattern =
        typeof rules.mustNotContain === 'string'
          ? new RegExp(escapeRegExp(rules.mustNotContain))
          : rules.mustNotContain;
      if (notContainPattern.test(processedValue)) {
        return getMessage('mustNotContain', `${fieldName} contains invalid characters or format`);
      }
    }

    // Forbidden words
    if (rules.forbiddenWords && rules.forbiddenWords.length > 0) {
      const checkValue = rules.caseSensitive === false ? trimmedValue.toLowerCase() : trimmedValue;
      const forbiddenWords =
        rules.caseSensitive === false
          ? rules.forbiddenWords.map((word) => word.toLowerCase())
          : rules.forbiddenWords;
      for (const word of forbiddenWords) {
        if (checkValue.includes(word)) {
          return getMessage('forbiddenWords', `${fieldName} contains inappropriate content`);
        }
      }
    }

    // Custom
    if (rules.customValidation) {
      const customResult = rules.customValidation(trimmedValue);
      if (customResult) {
        return customResult;
      }
    }

    return null;
  };
}

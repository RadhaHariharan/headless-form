/**
 * Shared types for the field-validator toolkit.
 *
 * Field validators are standalone, configurable validator factories — distinct from the
 * form-rule helpers (`isNotEmpty`, `isEmail`, …). Each factory takes a config object and
 * returns a `FieldValidatorFunction` that you can call directly, or drop into a form's
 * `validate` rules by adapting the signature (see the docs for `wrapFieldValidator`).
 *
 * @see ../../../docs/17-field-validators.mdx
 */

/**
 * The function returned by every `create*Validator` factory.
 *
 * @param value - The value to validate. String validators expect a `string`; the other
 *   validators accept `unknown` and coerce/normalise internally.
 * @param fieldName - Human-readable field name, interpolated into error messages and any
 *   `{fieldName}` placeholders in custom messages.
 * @returns `null` when the value is valid, otherwise a human-readable error string.
 */
export type FieldValidatorFunction<TValue = string> = (
  value: TValue,
  fieldName: string,
) => string | null;

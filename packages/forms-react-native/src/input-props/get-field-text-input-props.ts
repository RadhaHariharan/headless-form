import type { UseFieldReturnType } from '@headlesskit/forms-react';
import type { GetTextInputPropsResult } from './get-text-input-props.js';

/**
 * Like `getTextInputProps`, but for a `useField` result instead of a full form + path.
 *
 * @param field - The object returned by `useField`.
 * @returns Props to spread onto a `<TextInput>`.
 *
 * @example
 * ```tsx
 * const field = useField({ initialValue: '' });
 * const { error, ...inputProps } = getFieldTextInputProps(field);
 *
 * return (
 *   <>
 *     <TextInput key={field.key} {...inputProps} />
 *     {error && <Text>{error}</Text>}
 *   </>
 * );
 * ```
 */
export function getFieldTextInputProps<Value, TError>(
  field: UseFieldReturnType<Value, TError>,
): GetTextInputPropsResult<TError> {
  const { value, defaultValue, onChange, onFocus, onBlur, error } = field.getInputProps();

  return {
    value: value as string | undefined,
    defaultValue: defaultValue as string | undefined,
    onChangeText: (text: string) => onChange(text),
    onFocus,
    onBlur,
    error,
  };
}

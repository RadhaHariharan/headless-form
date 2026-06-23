import type { UseFieldReturnType } from '@headlesskit/forms-react';
import type { GetSwitchPropsResult } from './get-switch-props.js';

/**
 * Like `getSwitchProps`, but for a `useField` result instead of a full form + path.
 *
 * @param field - The object returned by `useField` (should be configured with `type: 'checkbox'`).
 * @returns Props to spread onto a `<Switch>`.
 *
 * @example
 * ```tsx
 * const field = useField({ initialValue: false, type: 'checkbox' });
 * <Switch {...getFieldSwitchProps(field)} />
 * ```
 */
export function getFieldSwitchProps<TError>(
  field: UseFieldReturnType<boolean, TError>,
): GetSwitchPropsResult {
  const { checked, defaultChecked, onChange } = field.getInputProps();

  return {
    value: Boolean(checked ?? defaultChecked),
    onValueChange: (next: boolean) => onChange(next),
  };
}

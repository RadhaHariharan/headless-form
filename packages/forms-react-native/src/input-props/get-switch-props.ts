import type { DeepKeys, FormStoreApi } from '@headlesskit/forms';

/**
 * The props produced by {@link getSwitchProps}, matching React Native's `<Switch>`.
 */
export interface GetSwitchPropsResult {
  /** Always present — `<Switch>` has no uncontrolled `defaultValue` concept. */
  value: boolean;
  /** Receives the raw boolean directly — React Native's `onValueChange`. */
  onValueChange: (value: boolean) => void;
}

/**
 * Like `form.getInputProps(path, { type: 'checkbox' })`, but shaped for React Native's
 * `<Switch>` — always controlled (`value` / `onValueChange`), since `Switch` has no
 * uncontrolled mode the way a DOM checkbox does with `defaultChecked`.
 *
 * @param form - A form store (from `useForm` or `createFormStore`).
 * @param path - Dot-notation path of the boolean field.
 * @returns Props to spread onto a `<Switch>`.
 *
 * @example
 * ```tsx
 * <Switch {...getSwitchProps(form, 'subscribed')} />
 * ```
 */
export function getSwitchProps<Values, TransformedValues, TError, K extends DeepKeys<Values>>(
  form: FormStoreApi<Values, TransformedValues, TError>,
  path: K,
): GetSwitchPropsResult {
  const { checked, defaultChecked, onChange } = form.getInputProps(path, {
    type: 'checkbox',
    withError: false,
    withFocus: false,
  });

  return {
    value: Boolean(checked ?? defaultChecked),
    onValueChange: (next: boolean) => onChange(next),
  };
}

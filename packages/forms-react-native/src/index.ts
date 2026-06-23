// Re-export the full React API — useForm, useField, createFormContext, and all core types.
export * from '@headlesskit/forms-react';

// React Native-shaped prop adapters.
export { getTextInputProps } from './input-props/get-text-input-props.js';
export type {
  GetTextInputPropsResult,
  GetTextInputPropsOptions,
} from './input-props/get-text-input-props.js';

export { getFieldTextInputProps } from './input-props/get-field-text-input-props.js';

export { getSwitchProps } from './input-props/get-switch-props.js';
export type { GetSwitchPropsResult } from './input-props/get-switch-props.js';

export { getFieldSwitchProps } from './input-props/get-field-switch-props.js';

export { getSubmitHandler } from './handlers/get-submit-handler.js';

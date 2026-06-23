/**
 * Builds the `data-path` attribute value written to DOM input elements by `getInputProps`.
 *
 * @remarks
 * When the form has a `name`, the attribute is `${name}/${path}` so that multiple named forms
 * on the same page do not collide when `getInputNode` queries the DOM.
 * When no name is given, the attribute is just `path`.
 *
 * @param path - Dot-notation field path.
 * @param formName - Optional form name registered via the `name` option.
 * @returns The `data-path` attribute string.
 *
 * @example
 * ```ts
 * getDataPath('user.name');           // 'user.name'
 * getDataPath('user.name', 'signup'); // 'signup/user.name'
 * ```
 */
export function getDataPath(path: string, formName?: string): string {
  return formName ? `${formName}/${path}` : path;
}

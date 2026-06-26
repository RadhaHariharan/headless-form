/**
 * Adapted from React: https://github.com/facebook/react/blob/master/packages/shared/formatProdErrorMessage.js
 *
 * Do not require this module directly! Use normal throw error calls. These messages will be replaced with error codes
 * during build.
 * @param {number} code
 */
export function formatProdErrorMessage(code: number) {
  return (
    `Minified error #${code}; ` +
    'use the non-minified dev environment for the full message. '
  )
}
